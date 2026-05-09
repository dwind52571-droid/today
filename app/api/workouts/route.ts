import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WorkoutRequest = {
  activity?: unknown;
  duration?: unknown;
  caloriesBurned?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WorkoutRequest | null;
  const activity = String(body?.activity ?? "").trim();
  const duration = Math.max(1, Math.round(Number(body?.duration)));
  const caloriesBurned = Math.max(0, Math.round(Number(body?.caloriesBurned)));

  if (!activity || !Number.isFinite(duration) || !Number.isFinite(caloriesBurned)) {
    return NextResponse.json(
      { message: "Activity, duration, and calories are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to save workouts." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      activity,
      duration,
      calories_burned: caloriesBurned,
    })
    .select("id, activity, duration, calories_burned, created_at")
    .single();

  if (error) {
    console.error("Supabase workout insert failed", error);
    return NextResponse.json({ message: "Save failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
