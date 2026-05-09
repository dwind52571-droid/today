import { NextResponse } from "next/server";
import { callDeepSeekJson } from "@/lib/ai/deepseek";

type WorkoutEstimate = {
  calories: number;
  activity: string;
  durationMinutes: number;
  met: number;
  source: "ai" | "local";
  confidence: "high" | "medium" | "low";
};

const activityMet = [
  { match: ["running", "run"], label: "Running", met: 9.8 },
  { match: ["walking", "walk"], label: "Walking", met: 3.5 },
  { match: ["cycling", "cycle", "bike"], label: "Cycling", met: 7.5 },
  { match: ["gym", "lift", "weights"], label: "Gym", met: 6.0 },
  { match: ["yoga"], label: "Yoga", met: 3.0 },
];

function formatActivity(activity: string) {
  const trimmed = activity.trim();
  if (!trimmed) return "Movement";

  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function calculateCalories(met: number, weightKg: number, durationMinutes: number) {
  return Math.max(0, Math.round(met * weightKg * (durationMinutes / 60)));
}

function fallbackMet(activity: string) {
  const text = activity.toLowerCase();
  const match = activityMet.find((item) => item.match.some((term) => text.includes(term)));

  return {
    activity: match?.label ?? formatActivity(activity),
    met: match?.met ?? 5.0,
    confidence: match ? ("high" as const) : ("low" as const),
  };
}

function parseMet(text: string): { met: number; confidence: "medium" | "low" } | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { met?: unknown; confidence?: unknown };
    const met = Number(parsed.met);
    if (!Number.isFinite(met) || met <= 0) return null;

    return {
      met: Math.min(20, Math.max(1, met)),
      confidence: parsed.confidence === "medium" ? "medium" : "low",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    activity?: unknown;
    durationMinutes?: unknown;
    weightKg?: unknown;
  } | null;

  const activity = String(body?.activity ?? "").trim();
  const durationMinutes = Math.min(
    300,
    Math.max(1, Math.round(Number(body?.durationMinutes ?? 0))),
  );
  const weightKg = Number(body?.weightKg);

  if (!activity || !Number.isFinite(durationMinutes) || !Number.isFinite(weightKg) || weightKg <= 0) {
    return NextResponse.json(
      { message: "Activity, duration, and weight are required." },
      { status: 400 },
    );
  }

  const fallback = fallbackMet(activity);
  if (fallback.confidence === "high") {
    return NextResponse.json({
      activity: fallback.activity,
      durationMinutes,
      met: fallback.met,
      calories: calculateCalories(fallback.met, weightKg, durationMinutes),
      source: "local",
      confidence: fallback.confidence,
    } satisfies WorkoutEstimate);
  }

  const outputText = await callDeepSeekJson([
    {
      role: "system",
      content:
        "You estimate MET values for exercise activities. Return only valid JSON. Do not include markdown or commentary.",
    },
    {
      role: "user",
      content: `Estimate the MET value for this activity. Return only JSON with this exact shape: {"met":5.0,"confidence":"medium"}. If the activity is ambiguous, use confidence low. Activity: ${activity}.`,
    },
  ]);
  const aiMet = parseMet(String(outputText ?? ""));
  const met = aiMet?.met ?? fallback.met;

  return NextResponse.json({
    activity: formatActivity(activity),
    durationMinutes,
    met,
    calories: calculateCalories(met, weightKg, durationMinutes),
    source: aiMet ? "ai" : "local",
    confidence: aiMet?.confidence ?? fallback.confidence,
  } satisfies WorkoutEstimate);
}
