import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WeightRequest = {
  weightKg?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WeightRequest | null;
  const weightKg = Number(body?.weightKg);

  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) {
    return NextResponse.json({ message: "A valid weight is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to save today's weight." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("weights")
    .insert({
      user_id: user.id,
      weight: Number(weightKg.toFixed(1)),
    })
    .select("id, weight, created_at")
    .single();

  if (error) {
    console.error("Supabase weight insert failed", error);
    return NextResponse.json({ message: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    weight_kg: data.weight,
    created_at: data.created_at,
  });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to read weight." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("weights")
    .select("id, weight, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ weight_kg: null });
  }

  return NextResponse.json({
    id: data?.id ?? null,
    weight_kg: data?.weight ?? null,
    created_at: data?.created_at ?? null,
  });
}
