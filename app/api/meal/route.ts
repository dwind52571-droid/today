import { NextResponse } from "next/server";
import { estimateMealCalories, type PortionSize } from "@/lib/foodReferenceLibrary";

type MealRequest = {
  name?: unknown;
  description?: unknown;
  portionSize?: unknown;
};

async function readRequest(request: Request): Promise<MealRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await request.json().catch(() => ({}))) ?? {}) as MealRequest;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return {};

  return {
    name: formData.get("name") ?? formData.get("description"),
    portionSize: formData.get("portionSize"),
  };
}

function normalizePortionSize(value: unknown): PortionSize | "" {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "small" || text === "medium" || text === "large" ? text : "";
}

export async function POST(request: Request) {
  const body = await readRequest(request);
  const foodDescription = String(body.name ?? body.description ?? "").trim();

  const estimate = estimateMealCalories({
    foodDescription,
    portionSize: normalizePortionSize(body.portionSize),
  });

  if (!estimate.matched) {
    const status = estimate.reason === "empty" ? 400 : 200;
    return NextResponse.json(
      {
        matched: false,
        reason: estimate.reason,
        message: estimate.message,
        calories: null,
        items: [],
        source: "local",
      },
      { status },
    );
  }

  return NextResponse.json({
    matched: true,
    calories: estimate.calories,
    items: [
      {
        name: estimate.displayName,
        calories: estimate.calories,
      },
    ],
    source: "local",
    confidence: "reference",
    food: {
      id: estimate.food.id,
      name: estimate.food.name,
      kcalPer100g: estimate.food.kcalPer100g,
    },
    grams: estimate.grams,
    portionSize: estimate.portionSize,
    portionMode: estimate.portionMode,
  });
}
