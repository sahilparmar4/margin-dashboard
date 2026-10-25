import { NextRequest, NextResponse } from "next/server";

import { buildCostModel } from "@/lib/calc/model";
import {
    employeeCategoryMatrix,
    productivity,
} from "@/lib/calc/reports";
import { loadAssumptions, loadDataset } from "@/lib/db/load";
import type { Filter } from "@/lib/calc/types";
import { searchAndSort } from "@/lib/utils/list-query";

export async function GET(request: NextRequest) {
    try {
        const params = request.nextUrl.searchParams;
        const employeeNo = params.get("employeeNo");

        const filter: Filter = {};

        if (params.has("year")) {
            const year = Number(params.get("year"));

            if (!Number.isInteger(year) || year < 1) {
                return NextResponse.json(
                    { success: false, error: "Invalid year." },
                    { status: 400 },
                );
            }

            filter.year = year;
        }

        if (params.has("month")) {
            const month = Number(params.get("month"));

            if (!Number.isInteger(month) || month < 1 || month > 12) {
                return NextResponse.json(
                    { success: false, error: "Month must be between 1 and 12." },
                    { status: 400 },
                );
            }

            filter.month = month;
        }

        if (employeeNo !== null && !employeeNo.trim()) {
            return NextResponse.json(
                { success: false, error: "employeeNo cannot be empty." },
                { status: 400 },
            );
        }

        const [dataset, assumptions] = await Promise.all([
            loadDataset(),
            loadAssumptions(),
        ]);

        const model = buildCostModel(dataset, assumptions);
        const employees = productivity(model, filter);
        const matrix = employeeCategoryMatrix(model, filter);

        const search = params.get("search");
        const sortBy = params.get("sortBy");
        const sortOrder = params.get("sortOrder");

        const sortableFields = [
            "employeeNo",
            "name",
            "department",
            "designation",
            "hours",
            "cost",
            "productivity",
        ] as const;

        if (
            sortBy &&
            !sortableFields.some((field) => field === sortBy)
        ) {
            return NextResponse.json(
                { success: false, error: "Invalid sortBy field." },
                { status: 400 },
            );
        }

        if (
            sortOrder &&
            !["asc", "desc"].includes(sortOrder.toLowerCase())
        ) {
            return NextResponse.json(
                { success: false, error: "sortOrder must be 'asc' or 'desc'." },
                { status: 400 },
            );
        }

        const filteredEmployees = searchAndSort(
            employees as unknown as Record<string, unknown>[],
            {
                search,
                sortBy,
                sortOrder,
                searchFields: [
                    "employeeNo",
                    "name",
                    "department",
                    "designation",
                ],
                sortableFields: sortableFields as unknown as (
                    keyof Record<string, unknown>
                )[],
            },
        );

        if (employeeNo !== null) {
            const employee = employees.find(
                (item) => item.employeeNo === employeeNo,
            );

            if (!employee) {
                return NextResponse.json(
                    { success: false, error: "Employee not found for the selected period." },
                    { status: 404 },
                );
            }

            const categoryBreakdown = matrix.rows.find(
                (row) => row.employeeNo === employeeNo,
            );

            return NextResponse.json(
                {
                    success: true,
                    employee,
                    categoryBreakdown: categoryBreakdown
                        ? {
                            categories: matrix.categories,
                            hours: categoryBreakdown.hours,
                            total: categoryBreakdown.total,
                        }
                        : { categories: [], hours: [], total: 0 },
                },
                { headers: { "Cache-Control": "no-store" } },
            );
        }

        return NextResponse.json(
            {
                success: true,
                count: employees.length,
                employees,
                categories: matrix.categories,
                filters: filter,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Employees API error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to load employee data." },
            { status: 500 },
        );
    }
}