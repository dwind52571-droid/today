import { NextResponse } from "next/server";
import { addDays, dayRange, startOfLocalDay } from "@/lib/health/date";
import { createClient } from "@/lib/supabase/server";

type LeaderboardMetric = "weight" | "netCalories" | "workoutBurn";

type LeaderboardRow = {
  metric: LeaderboardMetric;
  user_id: string;
  email_prefix: string | null;
  value: number;
};

type RankedRow = {
  rank: number;
  userId: string;
  emailPrefix: string;
  value: number;
};

const metricKeys: LeaderboardMetric[] = ["weight", "netCalories", "workoutBurn"];

function rankRows(rows: LeaderboardRow[], metric: LeaderboardMetric): RankedRow[] {
  return rows
    .filter((row) => row.metric === metric && Number.isFinite(Number(row.value)))
    .sort((a, b) => Number(b.value) - Number(a.value))
    .map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      emailPrefix: row.email_prefix || "user",
      value: Math.round(Number(row.value)),
    }));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Sign in to view leaderboard." }, { status: 401 });
  }

  const yesterday = addDays(startOfLocalDay(), -1);
  const yesterdayRange = dayRange(yesterday);
  const { data, error } = await supabase.rpc("get_yesterday_leaderboard", {
    range_start: yesterdayRange.startIso,
    range_end: yesterdayRange.endIso,
  });

  if (error) {
    console.error("Leaderboard RPC failed", error);
    return NextResponse.json(
      {
        weight: [],
        netCalories: [],
        workoutBurn: [],
        date: yesterdayRange.startIso.slice(0, 10),
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as LeaderboardRow[];
  return NextResponse.json({
    date: yesterdayRange.startIso.slice(0, 10),
    ...Object.fromEntries(metricKeys.map((metric) => [metric, rankRows(rows, metric)])),
  });
}
