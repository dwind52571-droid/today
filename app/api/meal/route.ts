import { NextResponse } from "next/server";
import { callDeepSeekJson } from "@/lib/ai/deepseek";

type MealEstimate = {
  calories: number;
  items: { name: string; calories?: number }[];
  source: "ai" | "local";
  confidence: "high" | "medium" | "low";
};

type MealRequest = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
};

const foodCatalog = [
  { match: ["chicken rice", "海南鸡饭"], name: "Chicken Rice", serving: 620, per100g: 190 },
  { match: ["rice", "米饭", "饭"], name: "Rice", serving: 205, per100g: 130 },
  { match: ["egg", "eggs", "鸡蛋"], name: "Egg", serving: 78, per100g: 155 },
  { match: ["banana", "香蕉"], name: "Banana", serving: 105, per100g: 89 },
  { match: ["latte", "拿铁"], name: "Latte", serving: 160, per100g: 45 },
  { match: ["milk tea", "奶茶"], name: "Milk Tea", serving: 320, per100g: 65 },
  { match: ["coffee", "咖啡"], name: "Coffee", serving: 20, per100g: 2 },
  { match: ["salmon", "三文鱼"], name: "Salmon", serving: 280, per100g: 208 },
  { match: ["salad", "沙拉"], name: "Salad", serving: 180, per100g: 80 },
  { match: ["noodle", "noodles", "面"], name: "Noodles", serving: 430, per100g: 138 },
  { match: ["bread", "toast", "面包"], name: "Bread", serving: 90, per100g: 265 },
  { match: ["apple", "苹果"], name: "Apple", serving: 95, per100g: 52 },
];

function parseQuantity(value: unknown) {
  const number = Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function normalizeUnit(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function estimateCatalogCalories(name: string, quantity: number, unit: string) {
  const text = name.toLowerCase();
  const match = foodCatalog.find((food) => food.match.some((term) => text.includes(term)));

  if (!match) {
    return {
      label: name || "Meal",
      calories: Math.round(450 * quantity),
      confidence: "low" as const,
    };
  }

  if (["g", "gram", "grams", "克"].includes(unit)) {
    return {
      label: match.name,
      calories: Math.round((match.per100g * quantity) / 100),
      confidence: "medium" as const,
    };
  }

  if (["kg", "kilogram", "kilograms", "公斤"].includes(unit)) {
    return {
      label: match.name,
      calories: Math.round(match.per100g * quantity * 10),
      confidence: "medium" as const,
    };
  }

  return {
    label: match.name,
    calories: Math.round(match.serving * quantity),
    confidence: unit ? ("medium" as const) : ("low" as const),
  };
}

function fallbackEstimate(name: string, quantity: number, unit: string): MealEstimate {
  const estimate = estimateCatalogCalories(name, quantity, unit);

  return {
    calories: estimate.calories,
    items: [{ name: estimate.label, calories: estimate.calories }],
    source: "local",
    confidence: estimate.confidence,
  };
}

function parseEstimate(text: string): MealEstimate | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<MealEstimate>;
    if (!Number.isFinite(parsed.calories)) return null;

    return {
      calories: Math.max(0, Math.round(Number(parsed.calories))),
      items: Array.isArray(parsed.items)
        ? parsed.items
            .filter((item) => item?.name)
            .slice(0, 5)
            .map((item) => ({
              name: String(item.name),
              calories: Number.isFinite(item.calories)
                ? Math.max(0, Math.round(Number(item.calories)))
                : undefined,
            }))
        : [],
      source: "ai",
      confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low",
    };
  } catch {
    return null;
  }
}

async function readRequest(request: Request): Promise<MealRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await request.json().catch(() => ({}))) ?? {}) as MealRequest;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return {};

  return {
    name: formData.get("name") ?? formData.get("description"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
  };
}

export async function POST(request: Request) {
  const body = await readRequest(request);
  const name = String(body.name ?? "").trim();
  const quantity = parseQuantity(body.quantity);
  const unit = normalizeUnit(body.unit);

  if (!name) {
    return NextResponse.json({ message: "Food name is required." }, { status: 400 });
  }

  const fallback = fallbackEstimate(name, quantity, unit);
  const outputText = await callDeepSeekJson([
    {
      role: "system",
      content:
        "You estimate calories for a simple food log. Return only valid JSON. Do not include markdown or commentary.",
    },
    {
      role: "user",
      content: `Estimate calories for this food. Return only JSON with this exact shape: {"calories":320,"items":[{"name":"Rice","calories":205}],"confidence":"medium"}. Use quantity=1 when quantity is missing. Be conservative and mark confidence low for ambiguous foods. Food: ${name}. Quantity: ${quantity}. Unit: ${unit || "serving"}.`,
    },
  ]);

  return NextResponse.json(parseEstimate(String(outputText ?? "")) ?? fallback);
}
