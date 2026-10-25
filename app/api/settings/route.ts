import { NextRequest, NextResponse } from "next/server";

import {
  loadAssumptions,
  saveAssumptions,
} from "@/lib/db/load";
import type { Assumptions } from "@/lib/calc/types";

export async function GET() {
  try {
    const assumptions = await loadAssumptions();

    return NextResponse.json(
      {
        success: true,
        settings: assumptions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Settings GET error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Request body must be an object." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    if (
      !Array.isArray(input.billableCategories) ||
      !input.billableCategories.every(
        (category) =>
          typeof category === "string" && category.trim().length > 0,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "billableCategories must be an array of non-empty strings.",
        },
        { status: 400 },
      );
    }

    if (input.billableCategories.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one billable category is required.",
        },
        { status: 400 },
      );
    }

    if (
      typeof input.monthlyOverhead !== "number" ||
      !Number.isFinite(input.monthlyOverhead) ||
      input.monthlyOverhead < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "monthlyOverhead must be a non-negative number.",
        },
        { status: 400 },
      );
    }

    const settings: Assumptions = {
      billableCategories: [
        ...new Set(
          (input.billableCategories as string[]).map((category) =>
            category.trim(),
          ),
        ),
      ],
      monthlyOverhead: input.monthlyOverhead,
    };

    await saveAssumptions(settings);

    return NextResponse.json(
      {
        success: true,
        message: "Settings updated successfully.",
        settings,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Settings PUT error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to save settings." },
      { status: 500 },
    );
  }
}