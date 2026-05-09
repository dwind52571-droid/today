import { NextResponse } from "next/server";
import {
  calculateEstimatedDailyBurn,
  calculateNetCalories,
} from "@/lib/health/calories";
import { addDays, dateKey, lastNDaysRange, parseDateKey } from "@/lib/health/date";
import { createClient } from "@/lib/supabase/server";

type MetricKey = "weight" | "calories" | "burn";

function labelForDate(key: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parseDateKey(key));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to read stats." }, { status: 401 });
  }

  const range = lastNDaysRange(7);
  const dayKeys = Array.from({ length: 7 }, (_, index) =>
    dateKey(addDays(range.start, index)),
  );

  const [
    weightsResult,
    latestWeightResult,
    profileResult,
    mealsResult,
    workoutsResult,
  ] = await Promise.all([
    supabase
      .from("weights")
      .select("weight, created_at")
      .eq("user_id", user.id)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("weights")
      .select("weight")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("gender, date_of_birth, height_cm, activity_level")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("meals")
      .select("calories, created_at")
      .eq("user_id", user.id)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso),
    supabase
      .from("workouts")
      .select("calories_burned, created_at")
      .eq("user_id", user.id)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso),
  ]);

  if (
    weightsResult.error ||
    latestWeightResult.error ||
    profileResult.error ||
    mealsResult.error ||
    workoutsResult.error
  ) {
    return NextResponse.json({
      data: {
        weight: [],
        calories: [],
        burn: [],
      },
    });
  }

  const weightByDay = new Map<string, number>();
  for (const row of weightsResult.data ?? []) {
    weightByDay.set(dateKey(new Date(row.created_at)), Number(row.weight));
  }

  const eatenByDay = new Map<string, number>();
  for (const row of mealsResult.data ?? []) {
    const key = dateKey(new Date(row.created_at));
    eatenByDay.set(key, (eatenByDay.get(key) ?? 0) + Number(row.calories ?? 0));
  }

  const burnedByDay = new Map<string, number>();
  for (const row of workoutsResult.data ?? []) {
    const key = dateKey(new Date(row.created_at));
    burnedByDay.set(
      key,
      (burnedByDay.get(key) ?? 0) + Number(row.calories_burned ?? 0),
    );
  }

  const latestWeight = latestWeightResult.data
    ? Number(latestWeightResult.data.weight)
    : null;
  const estimatedDailyBurn = calculateEstimatedDailyBurn(
    profileResult.data ?? null,
    latestWeight,
  );
  const netByDay = new Map<string, number>();

  if (estimatedDailyBurn !== null && (eatenByDay.size > 0 || burnedByDay.size > 0)) {
    for (const key of dayKeys) {
      const net = calculateNetCalories(
        eatenByDay.get(key) ?? 0,
        estimatedDailyBurn,
        burnedByDay.get(key) ?? 0,
      );

      if (net !== null) {
        netByDay.set(key, net);
      }
    }
  }

  const buildData = (values: Map<string, number>, includeZeroDays: boolean) =>
    values.size === 0
      ? []
      : dayKeys
          .filter((key) => includeZeroDays || values.has(key))
          .map((key) => ({
            label: labelForDate(key),
            value: values.get(key) ?? 0,
          }));

  const data: Record<MetricKey, Array<{ label: string; value: number }>> = {
    weight: buildData(weightByDay, false),
    calories: buildData(netByDay, true),
    burn: buildData(burnedByDay, true),
  };

  return NextResponse.json({ data });
}
