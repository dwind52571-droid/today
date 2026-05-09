import { NextResponse } from "next/server";
import {
  calculateEstimatedDailyBurn,
  calculateNetCalories,
} from "@/lib/health/calories";
import { dayRange } from "@/lib/health/date";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to read home data." }, { status: 401 });
  }

  const today = dayRange();

  const [weightResult, profileResult, mealResult, workoutResult] = await Promise.all([
    supabase
      .from("weights")
      .select("id, weight, created_at")
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
      .gte("created_at", today.startIso)
      .lt("created_at", today.endIso),
    supabase
      .from("workouts")
      .select("calories_burned, created_at")
      .eq("user_id", user.id)
      .gte("created_at", today.startIso)
      .lt("created_at", today.endIso),
  ]);

  if (
    weightResult.error ||
    profileResult.error ||
    mealResult.error ||
    workoutResult.error
  ) {
    return NextResponse.json({
      latestWeight: null,
      eaten: 0,
      burned: 0,
      estimatedDailyBurn: null,
      net: null,
    });
  }

  const eaten = (mealResult.data ?? []).reduce(
    (total, meal) => total + Number(meal.calories ?? 0),
    0,
  );
  const burned = (workoutResult.data ?? []).reduce(
    (total, workout) => total + Number(workout.calories_burned ?? 0),
    0,
  );
  const latestWeight = weightResult.data ? Number(weightResult.data.weight) : null;
  const estimatedDailyBurn = calculateEstimatedDailyBurn(
    profileResult.data ?? null,
    latestWeight,
  );

  return NextResponse.json({
    latestWeight: weightResult.data
      ? {
          id: weightResult.data.id,
          weight: latestWeight,
          created_at: weightResult.data.created_at,
        }
      : null,
    eaten,
    burned,
    estimatedDailyBurn,
    net: calculateNetCalories(eaten, estimatedDailyBurn, burned),
  });
}
