import { NextRequest, NextResponse } from "next/server";

import { buildCostModel } from "@/lib/calc/model";
import {
    departmentDetail,
    departmentList,
} from "@/lib/calc/reports";
import { loadAssumptions, loadDataset } from "@/lib/db/load";
import type { Filter } from "@/lib/calc/types";
import { searchAndSort } from "@/lib/utils/list-query";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    try {
        const department = params.get("department");

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

        if (department !== null && !department.trim()) {
            return NextResponse.json(
                { success: false, error: "Department cannot be empty." },
                { status: 400 },
            );
        }

        const [dataset, assumptions] = await Promise.all([
            loadDataset(),
            loadAssumptions(),
        ]);

        const model = buildCostModel(dataset, assumptions);

        if (department !== null) {
            const departments = departmentList(model, filter);
            const exists = departments.some(
                (item) => item.department === department,
            );

            if (!exists) {
                return NextResponse.json(
                    { success: false, error: "Department not found for the selected period." },
                    { status: 404 },
                );
            }

            const employees = departmentDetail(model, department, filter);

            return NextResponse.json(
                {
                    success: true,
                    department,
                    count: employees.length,
                    employees,
                    filters: filter,
                },
                { headers: { "Cache-Control": "no-store" } },
            );
        }
        const allDepartments = departmentList(model, filter);

        const search = params.get("search");
        const sortBy = params.get("sortBy");
        const sortOrder = params.get("sortOrder");

        const sortableFields = [
            "department",
            "hours",
            "cost",
            "people",
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

        const departments = searchAndSort(
            allDepartments as unknown as Record<string, unknown>[],
            {
                search,
                sortBy,
                sortOrder,
                searchFields: ["department"],
                sortableFields: sortableFields as unknown as (
                    keyof Record<string, unknown>
                )[],
            },
        );

        return NextResponse.json(
            {
                success: true,
                count: departments.length,
                departments,
                filters: filter,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Departments API error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to load department data." },
            { status: 500 },
        );
    }
}