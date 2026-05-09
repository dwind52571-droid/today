import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileRequest = {
  display_name?: unknown;
  gender?: unknown;
  date_of_birth?: unknown;
  height_cm?: unknown;
  activity_level?: unknown;
  language?: unknown;
  theme?: unknown;
};

const profileSelect =
  "id, display_name, gender, date_of_birth, height_cm, activity_level, language, theme, created_at, updated_at";

function normalizeLanguage(value: unknown) {
  return value === "zh" ? "zh" : "en";
}

function normalizeTheme(value: unknown) {
  return value === "light" ? "light" : "dark";
}

function normalizeGender(value: unknown) {
  return value === "male" || value === "female" ? value : null;
}

function normalizeDateOfBirth(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeHeightCm(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const heightCm = Number(value);
  return Number.isInteger(heightCm) && heightCm > 0 ? heightCm : null;
}

function normalizeActivityLevel(value: unknown) {
  return value === "sedentary" ||
    value === "light" ||
    value === "moderate" ||
    value === "active"
    ? value
    : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Sign in to read profile." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(
    !error && data
      ? data
      : {
          display_name: user.email ?? null,
          gender: null,
          date_of_birth: null,
          height_cm: null,
          activity_level: null,
          language: "en",
          theme: "dark",
        },
  );
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as ProfileRequest | null;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Sign in to update profile." },
      { status: 401 },
    );
  }

  const displayName =
    body?.display_name === undefined
      ? undefined
      : String(body.display_name ?? "").trim() || null;
  const gender =
    body?.gender === undefined ? undefined : normalizeGender(body.gender);
  const dateOfBirth =
    body?.date_of_birth === undefined
      ? undefined
      : normalizeDateOfBirth(body.date_of_birth);
  const heightCm =
    body?.height_cm === undefined ? undefined : normalizeHeightCm(body.height_cm);
  const activityLevel =
    body?.activity_level === undefined
      ? undefined
      : normalizeActivityLevel(body.activity_level);
  const language =
    body?.language === undefined ? undefined : normalizeLanguage(body.language);
  const theme = body?.theme === undefined ? undefined : normalizeTheme(body.theme);

  const update = {
    user_id: user.id,
    ...(displayName !== undefined ? { display_name: displayName } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(dateOfBirth !== undefined ? { date_of_birth: dateOfBirth } : {}),
    ...(heightCm !== undefined ? { height_cm: heightCm } : {}),
    ...(activityLevel !== undefined ? { activity_level: activityLevel } : {}),
    ...(language !== undefined ? { language } : {}),
    ...(theme !== undefined ? { theme } : {}),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(update, { onConflict: "user_id" })
    .select(profileSelect)
    .single();

  if (error) {
    console.error("Supabase profile upsert failed", error);
    return NextResponse.json({ message: "Save failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
