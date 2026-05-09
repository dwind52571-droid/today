import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MealRequest = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  calories?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MealRequest | null;
  const name = String(body?.name ?? "").trim();
  const quantity = String(body?.quantity ?? "").trim() || null;
  const unit = String(body?.unit ?? "").trim() || null;
  const calories = Math.max(0, Math.round(Number(body?.calories)));

  if (!name || !Number.isFinite(calories)) {
    return NextResponse.json({ message: "Meal name and calories are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to save meals." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      name,
      quantity,
      unit,
      calories,
    })
    .select("id, name, quantity, unit, calories, created_at")
    .single();

  if (error) {
    console.error("Supabase meal insert failed", error);
    return NextResponse.json({ message: "Save failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
