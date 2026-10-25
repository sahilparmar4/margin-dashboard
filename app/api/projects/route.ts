import { NextRequest, NextResponse } from "next/server";

import { buildCostModel } from "@/lib/calc/model";
import { projectDetail, projectList } from "@/lib/calc/reports";
import { loadAssumptions, loadDataset } from "@/lib/db/load";
import { searchAndSort } from "@/lib/utils/list-query";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  try {

    const [dataset, assumptions] = await Promise.all([
      loadDataset(),
      loadAssumptions(),
    ]);

    const model = buildCostModel(dataset, assumptions);

    // Return details for a specific project when projectId is provided.
    if (projectId !== null) {
      if (!projectId.trim()) {
        return NextResponse.json(
          { success: false, error: "projectId cannot be empty." },
          { status: 400 },
        );
      }

      const project = projectDetail(model, projectId);

      if (!project) {
        return NextResponse.json(
          { success: false, error: "Project not found." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          project,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Return the list of projects when no projectId is provided.
    const allProjects = projectList(model);
    const params = request.nextUrl.searchParams;
    const search = params.get("search");
    const sortBy = params.get("sortBy");
    const sortOrder = params.get("sortOrder");

    const sortableFields = [
      "name",
      "refCode",
      "category",
      "status",
      "revenue",
      "cost",
      "profit",
      "margin",
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

    const projects = searchAndSort(
      allProjects as unknown as Record<string, unknown>[],
      {
        search,
        sortBy,
        sortOrder,
        searchFields: [
          "name",
          "refCode",
          "category",
          "status",
        ],
        sortableFields: sortableFields as unknown as (
          keyof Record<string, unknown>
        )[],
      },
    );

    return NextResponse.json(
      {
        success: true,
        count: projects.length,
        projects,
        gaps: model.gaps,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Projects API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load project data.",
      },
      { status: 500 },
    );
  }
}