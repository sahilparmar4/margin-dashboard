import { NextRequest, NextResponse } from "next/server";

import { buildCostModel } from "@/lib/calc/model";
import {
    availablePeriods,
    categoryHours,
    monthlySeries,
    periodSummary,
    reconcile,
} from "@/lib/calc/reports";
import { loadAssumptions, loadDataset } from "@/lib/db/load";
import type { Filter } from "@/lib/calc/types";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const yearParam = searchParams.get("year");
        const monthParam = searchParams.get("month");

        const year =
            yearParam !== null && yearParam.trim() !== ""
                ? Number(yearParam)
                : undefined;

        const month =
            monthParam !== null && monthParam.trim() !== ""
                ? Number(monthParam)
                : undefined;

        // Validate optional filters.
        if (
            year !== undefined &&
            (!Number.isInteger(year) || year < 1900 || year > 9999)
        ) {
            return NextResponse.json(
                { error: "Invalid year. Provide a valid four-digit year." },
                { status: 400 },
            );
        }

        if (
            month !== undefined &&
            (!Number.isInteger(month) || month < 1 || month > 12)
        ) {
            return NextResponse.json(
                { error: "Invalid month. Month must be between 1 and 12." },
                { status: 400 },
            );
        }

        const filter: Filter = {
            ...(year !== undefined ? { year } : {}),
            ...(month !== undefined ? { month } : {}),
        };

        // Load the source data and current financial assumptions.
        const [dataset, assumptions] = await Promise.all([
            loadDataset(),
            loadAssumptions(),
        ]);

        // Build the existing cost model; do not duplicate its calculations.
        const model = buildCostModel(dataset, assumptions);

        const periods = availablePeriods(model);

        const hasYear =
            year === undefined || periods.years.includes(year);

        const hasMonth =
            month === undefined ||
            periods.months.some(
                (period) =>
                    period.month === month &&
                    (year === undefined || period.year === year),
            );

        if (!hasYear || !hasMonth) {
            return NextResponse.json({
                success: true,
                hasData: false,
                message: "No data available for the selected period.",
                filters: {
                    year: year ?? null,
                    month: month ?? null,
                },
                availablePeriods: periods,
            });
        }

        // Apply the selected period to summary and category reports.
        const summary = periodSummary(model, filter);
        const categories = categoryHours(model, filter);
        const reconciliation = reconcile(model, filter);

        // Monthly trends can optionally be restricted to a selected year.
        const trends = monthlySeries(model, year);

        return NextResponse.json(
            {
                success: true,
                filters: {
                    year: year ?? null,
                    month: month ?? null,
                },
                summary,
                trends,
                categories,
                reconciliation,
                availablePeriods: availablePeriods(model),
                gaps: model.gaps,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        console.error("Dashboard API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to load dashboard data.",
            },
            { status: 500 },
        );
    }
}