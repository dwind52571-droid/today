import { NextResponse } from "next/server";
import {
  calculateEstimatedDailyBurn,
  calculateNetCalories,
} from "@/lib/health/calories";
import { dateKey, lastNDaysRange } from "@/lib/health/date";
import { createClient } from "@/lib/supabase/server";

type DailyRecord = {
  date: string;
  weightKg: number | null;
  caloriesEaten: number;
  caloriesBurned: number;
  estimatedDailyBurn: number | null;
  netCalories: number | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to read history." }, { status: 401 });
  }

  const range = lastNDaysRange(30);
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
    return NextResponse.json({ records: [] });
  }

  const latestWeight = latestWeightResult.data
    ? Number(latestWeightResult.data.weight)
    : null;
  const estimatedDailyBurn = calculateEstimatedDailyBurn(
    profileResult.data ?? null,
    latestWeight,
  );

  const records = new Map<string, DailyRecord>();
  const ensureRecord = (key: string) => {
    const existing = records.get(key);
    if (existing) return existing;

    const record = {
      date: key,
      weightKg: null,
      caloriesEaten: 0,
      caloriesBurned: 0,
      estimatedDailyBurn,
      netCalories: null,
    };
    records.set(key, record);
    return record;
  };

  for (const row of weightsResult.data ?? []) {
    const record = ensureRecord(dateKey(new Date(row.created_at)));
    record.weightKg = Number(row.weight);
  }

  for (const row of mealsResult.data ?? []) {
    const record = ensureRecord(dateKey(new Date(row.created_at)));
    record.caloriesEaten += Number(row.calories ?? 0);
  }

  for (const row of workoutsResult.data ?? []) {
    const record = ensureRecord(dateKey(new Date(row.created_at)));
    record.caloriesBurned += Number(row.calories_burned ?? 0);
  }

  for (const record of records.values()) {
    record.netCalories = calculateNetCalories(
      record.caloriesEaten,
      estimatedDailyBurn,
      record.caloriesBurned,
    );
  }

  return NextResponse.json({
    records: Array.from(records.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  });
}
