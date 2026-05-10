"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bike,
  Check,
  Dumbbell,
  Pencil,
  Scale,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getCachedData,
  invalidateCachedData,
  mutateCachedData,
  revalidateCachedJson,
  setCachedData,
} from "@/lib/client/data-cache";
import { createClient } from "@/lib/supabase/client";
import { useTodayStore } from "@/store/useTodayStore";

type AddMode = "menu" | "meal" | "weight" | "workout";
type WorkoutDuration = number | "custom";
type EstimateStatus = "idle" | "estimating" | "estimated";
const mealPortionOptions = ["small", "medium", "large"] as const;
type MealEstimate = {
  matched?: boolean;
  calories: number | null;
  source: "local";
  confidence?: "reference";
  message?: string;
  reason?: string;
  grams?: number;
  portionMode?: "weight" | "unit";
};
type WorkoutEstimate = {
  calories: number;
  met: number;
  source: "ai" | "local";
  confidence: "high" | "medium" | "low";
};
type HomeCacheData = {
  latestWeight: { weight: number; created_at: string } | null;
  eaten: number;
  burned: number;
  estimatedDailyBurn: number | null;
  net: number | null;
};
type StatsCacheData = {
  data: Record<"weight" | "calories" | "burn", Array<{ label: string; value: number }>>;
};
type HistoryCacheData = {
  records: Array<{
    date: string;
    weightKg: number | null;
    caloriesEaten: number;
    caloriesBurned: number;
    estimatedDailyBurn: number | null;
    netCalories: number | null;
  }>;
};
type ProfileCacheData = {
  language?: "en" | "zh";
  theme?: "dark" | "light";
};

const accent = "#32D74B";
const workoutSuggestions = ["Running", "Walking", "Gym", "Cycling", "Yoga", "Custom"];
const durationOptions = [15, 30, 45, 60];
const activityMet: Record<string, number> = {
  Running: 9.8,
  Walking: 3.5,
  Cycling: 7.5,
  Gym: 6.0,
  Yoga: 3.0,
};

function roundCalories(value: number) {
  return Math.max(0, Math.round(value));
}

function calculateWorkoutCalories(met: number, weightKg: number, durationMinutes: number) {
  return roundCalories(met * weightKg * (durationMinutes / 60));
}

function dateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function calculateNet(eaten: number, estimatedDailyBurn: number | null, burned: number) {
  return estimatedDailyBurn === null ? null : eaten - estimatedDailyBurn - burned;
}

function updateTodayStat(
  stats: StatsCacheData | undefined,
  metric: "calories" | "burn" | "weight",
  updater: (value: number) => number,
) {
  if (!stats) return undefined;

  const label = todayLabel();
  return {
    data: {
      ...stats.data,
      [metric]: stats.data[metric].map((point) =>
        point.label === label ? { ...point, value: updater(point.value) } : point,
      ),
    },
  };
}

function refreshHealthCaches() {
  invalidateCachedData(["home", "stats", "history", "profile", "weight"]);
  void revalidateCachedJson<HomeCacheData>("home", "/api/home");
  void revalidateCachedJson<StatsCacheData>("stats", "/api/stats");
  void revalidateCachedJson<HistoryCacheData>("history", "/api/history");
  void revalidateCachedJson("profile", "/api/profile");
  void revalidateCachedJson("weight", "/api/weight");
}

function GlobalAddSheet() {
  const isOpen = useTodayStore((state) => state.addSheetOpen);
  const closeAddSheet = useTodayStore((state) => state.closeAddSheet);
  const bumpDataVersion = useTodayStore((state) => state.bumpDataVersion);
  const [mode, setMode] = useState<AddMode>("menu");
  const [weight, setWeight] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealPortionSize, setMealPortionSize] =
    useState<(typeof mealPortionOptions)[number]>("medium");
  const [mealCalories, setMealCalories] = useState("");
  const [mealEstimate, setMealEstimate] = useState<MealEstimate | null>(null);
  const [mealEstimateStatus, setMealEstimateStatus] = useState<EstimateStatus>("idle");
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState<WorkoutDuration>(45);
  const [customDuration, setCustomDuration] = useState("");
  const [customActivityOpen, setCustomActivityOpen] = useState(false);
  const [workoutCalories, setWorkoutCalories] = useState("");
  const [workoutEstimate, setWorkoutEstimate] = useState<WorkoutEstimate | null>(null);
  const [workoutEstimateStatus, setWorkoutEstimateStatus] = useState<EstimateStatus>("idle");
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightLoading, setWeightLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const closeAll = () => {
    setSaving(false);
    setError("");
    setMode("menu");
    closeAddSheet();
  };

  const resetMealEstimate = () => {
    setMealEstimate(null);
    setMealEstimateStatus("idle");
    setMealCalories("");
  };

  const resetWorkoutEstimate = () => {
    setWorkoutEstimate(null);
    setWorkoutEstimateStatus("idle");
    setWorkoutCalories("");
  };

	  const saved = () => {
	    bumpDataVersion();
	    closeAll();
	  };

  const optimisticallyAddWeight = (weightKg: number) => {
    const createdAt = new Date().toISOString();
    setCachedData("weight", { weight_kg: weightKg });
    mutateCachedData<HomeCacheData>("home", (data) =>
      data
        ? {
            ...data,
            latestWeight: { weight: weightKg, created_at: createdAt },
          }
        : undefined,
    );
    mutateCachedData<StatsCacheData>("stats", (data) =>
      updateTodayStat(data, "weight", () => weightKg),
    );
    mutateCachedData<HistoryCacheData>("history", (data) => {
      if (!data) return undefined;

      const key = dateKey();
      return {
        records: data.records.map((record) =>
          record.date === key ? { ...record, weightKg: weightKg } : record,
        ),
      };
    });
  };

  const optimisticallyAddMeal = (calories: number) => {
    let estimatedDailyBurn: number | null = null;
    mutateCachedData<HomeCacheData>("home", (data) => {
      if (!data) return undefined;

      estimatedDailyBurn = data.estimatedDailyBurn;
      const eaten = data.eaten + calories;
      return {
        ...data,
        eaten,
        net: calculateNet(eaten, data.estimatedDailyBurn, data.burned),
      };
    });
    mutateCachedData<StatsCacheData>("stats", (data) =>
      updateTodayStat(data, "calories", (value) => value + calories),
    );
    mutateCachedData<HistoryCacheData>("history", (data) => {
      if (!data) return undefined;

      const key = dateKey();
      return {
        records: data.records.map((record) => {
          if (record.date !== key) return record;

          const caloriesEaten = record.caloriesEaten + calories;
          return {
            ...record,
            caloriesEaten,
            netCalories: calculateNet(
              caloriesEaten,
              record.estimatedDailyBurn ?? estimatedDailyBurn,
              record.caloriesBurned,
            ),
          };
        }),
      };
    });
  };

  const optimisticallyAddWorkout = (caloriesBurned: number) => {
    let estimatedDailyBurn: number | null = null;
    mutateCachedData<HomeCacheData>("home", (data) => {
      if (!data) return undefined;

      estimatedDailyBurn = data.estimatedDailyBurn;
      const burned = data.burned + caloriesBurned;
      return {
        ...data,
        burned,
        net: calculateNet(data.eaten, data.estimatedDailyBurn, burned),
      };
    });
    mutateCachedData<StatsCacheData>("stats", (data) =>
      updateTodayStat(data, "burn", (value) => value + caloriesBurned),
    );
    mutateCachedData<StatsCacheData>("stats", (data) =>
      updateTodayStat(data, "calories", (value) => value - caloriesBurned),
    );
    mutateCachedData<HistoryCacheData>("history", (data) => {
      if (!data) return undefined;

      const key = dateKey();
      return {
        records: data.records.map((record) => {
          if (record.date !== key) return record;

          const caloriesBurnedTotal = record.caloriesBurned + caloriesBurned;
          return {
            ...record,
            caloriesBurned: caloriesBurnedTotal,
            netCalories: calculateNet(
              record.caloriesEaten,
              record.estimatedDailyBurn ?? estimatedDailyBurn,
              caloriesBurnedTotal,
            ),
          };
        }),
      };
    });
  };

  const getAuthenticatedUser = async () => {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Supabase auth getUser failed", {
        message: error.message,
        status: error.status,
      });
    }

    if (!user) {
      throw new Error("Not authenticated");
    }

    return { supabase, user };
  };

  const saveWeight = async () => {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg)) return;

    setSaving(true);
    setError("");

    try {
      const { supabase, user } = await getAuthenticatedUser();
      const { error } = await supabase.from("weights").insert({
        user_id: user.id,
        weight: Number(weightKg.toFixed(1)),
      });

      if (error) {
        console.error("Supabase weight insert failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setSaving(false);
        setError("Save failed");
        return;
      }
    } catch (error) {
      console.error("Weight save failed", error);
      setSaving(false);
      setError("Save failed");
      return;
    }

	    setSaving(false);
	    setWeight("");
    optimisticallyAddWeight(Number(weightKg.toFixed(1)));
    refreshHealthCaches();
	    saved();
	  };

  const saveMeal = async () => {
    const calories = roundCalories(Number(mealCalories));
    if (!mealName.trim() || !Number.isFinite(calories)) return;

    setSaving(true);
    setError("");

    try {
      const { supabase, user } = await getAuthenticatedUser();
      const { error } = await supabase.from("meals").insert({
        user_id: user.id,
	        name: mealName.trim(),
	        quantity: "1",
	        unit: mealEstimate?.portionMode === "weight" ? mealPortionSize : "serving",
	        calories,
      });

      if (error) {
        console.error("Supabase meal insert failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setSaving(false);
        setError("Save failed");
        return;
      }
    } catch (error) {
      console.error("Meal save failed", error);
      setSaving(false);
      setError("Save failed");
      return;
    }

	    setSaving(false);
	    setMealName("");
    setMealPortionSize("medium");
	    setMealCalories("");
    optimisticallyAddMeal(calories);
    refreshHealthCaches();
	    saved();
	  };

  const estimateMeal = async () => {
    const name = mealName.trim();
    if (!name) return;

    setMealEstimateStatus("estimating");
    setError("");

    try {
      const response = await fetch("/api/meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          portionSize: mealPortionSize,
        }),
      });

      if (!response.ok) {
        throw new Error("Meal estimate failed.");
      }

      const data = (await response.json()) as MealEstimate;
      setMealEstimate(data);
      if (data.matched === false || data.calories === null) {
        setMealCalories("");
        setError(data.message ?? "Food not found. Please enter calories manually.");
        setMealEstimateStatus("estimated");
        return;
      }

      setMealCalories(String(roundCalories(data.calories)));
      setMealEstimateStatus("estimated");
    } catch (error) {
      console.error("Meal estimate failed", error);
      setMealEstimate(null);
      setMealEstimateStatus("idle");
      setMealCalories("");
      setError("Estimate failed. Enter calories manually.");
    }
  };

  const saveWorkout = async () => {
    const durationValue = duration === "custom" ? Number(customDuration) : duration;
    const caloriesBurned = Number(workoutCalories);
    if (!activity.trim() || !Number.isFinite(durationValue) || !Number.isFinite(caloriesBurned)) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { supabase, user } = await getAuthenticatedUser();
      const { error } = await supabase.from("workouts").insert({
        user_id: user.id,
        activity: activity.trim(),
        duration: durationValue,
        calories_burned: caloriesBurned,
      });

      if (error) {
        console.error("Supabase workout insert failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setSaving(false);
        setError("Save failed");
        return;
      }
    } catch (error) {
      console.error("Workout save failed", error);
      setSaving(false);
      setError("Save failed");
      return;
    }

	    setSaving(false);
	    setActivity("");
	    setDuration(45);
	    setCustomDuration("");
	    setCustomActivityOpen(false);
	    setWorkoutCalories("");
    optimisticallyAddWorkout(caloriesBurned);
    refreshHealthCaches();
	    saved();
	  };

  const estimateWorkout = useCallback(async (nextActivity = activity, nextDuration = duration) => {
    const activityName = nextActivity.trim();
    const durationValue = nextDuration === "custom" ? Number(customDuration) : nextDuration;

    if (!activityName || !Number.isFinite(durationValue) || durationValue <= 0) {
      return;
    }

    if (latestWeight === null) {
      setWorkoutEstimate(null);
      setWorkoutEstimateStatus("idle");
      return;
    }

    const knownMet = activityMet[activityName];
    if (knownMet) {
      const calories = calculateWorkoutCalories(knownMet, latestWeight, durationValue);
      setWorkoutEstimate({
        calories,
        met: knownMet,
        source: "local",
        confidence: "high",
      });
      setWorkoutCalories(String(calories));
      setWorkoutEstimateStatus("estimated");
      return;
    }

    setWorkoutEstimateStatus("estimating");
    setError("");

    try {
      const response = await fetch("/api/workout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity: activityName,
          durationMinutes: durationValue,
          weightKg: latestWeight,
        }),
      });

      if (!response.ok) {
        throw new Error("Workout estimate failed.");
      }

      const data = (await response.json()) as WorkoutEstimate;
      setWorkoutEstimate(data);
      setWorkoutCalories(String(roundCalories(data.calories)));
      setWorkoutEstimateStatus("estimated");
    } catch (error) {
      console.error("Workout estimate failed", error);
      const fallbackMet = 5.0;
      const calories = calculateWorkoutCalories(fallbackMet, latestWeight, durationValue);
      setWorkoutEstimate({
        calories,
        met: fallbackMet,
        source: "local",
        confidence: "low",
      });
      setWorkoutCalories(String(calories));
      setWorkoutEstimateStatus("estimated");
    }
  }, [activity, customDuration, duration, latestWeight]);

  const chooseWorkout = (nextActivity: string) => {
    setError("");
    resetWorkoutEstimate();
    if (nextActivity === "Custom") {
      setCustomActivityOpen(true);
      setActivity("");
      return;
    }

    setCustomActivityOpen(false);
    setActivity(nextActivity);
  };

  useEffect(() => {
    if (!isOpen || mode !== "workout") return;

    let active = true;
    const loadLatestWeight = async () => {
      setWeightLoading(true);
      setLatestWeight(null);

      try {
        const data =
          getCachedData<{ weight_kg: number | null }>("weight") ??
          (await revalidateCachedJson<{ weight_kg: number | null }>(
            "weight",
            "/api/weight",
          ));
        if (!data) return;

        if (active) {
          setLatestWeight(typeof data.weight_kg === "number" ? data.weight_kg : null);
        }
      } catch {
        if (active) {
          setLatestWeight(null);
        }
      } finally {
        if (active) {
          setWeightLoading(false);
        }
      }
    };

    void loadLatestWeight();

    return () => {
      active = false;
    };
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "workout") return;
    if (weightLoading) return;

    const durationValue = duration === "custom" ? Number(customDuration) : duration;
    if (!activity.trim() || !Number.isFinite(durationValue) || durationValue <= 0 || latestWeight === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void estimateWorkout();
    }, customActivityOpen ? 420 : 120);

    return () => window.clearTimeout(timeout);
  }, [
    activity,
    customActivityOpen,
    customDuration,
    duration,
    estimateWorkout,
    isOpen,
    latestWeight,
    mode,
    weightLoading,
  ]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/40 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={closeAll}
        >
          <motion.section
            className="relative max-h-[94dvh] w-full overflow-y-auto rounded-t-[30px] border border-border bg-card/96 px-6 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_70px_rgba(0,0,0,0.48)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            initial={{ y: 34, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 34, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-muted-foreground/25" />

            {mode !== "menu" ? (
              <button
                type="button"
                aria-label="Close add modal"
                onClick={closeAll}
                className="absolute left-6 top-7 flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:bg-muted"
              >
                <X className="size-5" strokeWidth={1.8} />
              </button>
            ) : null}

            {mode === "menu" ? (
              <div className="-mx-4 -mb-3 -mt-3 rounded-[22px] p-2">
                <button
                  type="button"
	                  onClick={() => {
	                    resetMealEstimate();
	                    setMode("meal");
	                  }}
                  className="flex h-15 w-full items-center gap-4 rounded-[16px] px-4 text-left transition active:bg-muted"
                >
	                  <span className="flex size-11 items-center justify-center rounded-full bg-[#32D74B]/15 text-[#32D74B]">
	                    <Utensils className="size-5" strokeWidth={2} />
	                  </span>
                  <span>
                    <span className="block text-[17px] font-semibold text-foreground">Add Meal</span>
                    <span className="mt-0.5 block text-[13px] font-medium text-secondary">
                      One food at a time
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("weight")}
                  className="flex h-15 w-full items-center gap-4 rounded-[16px] px-4 text-left transition active:bg-muted"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#32D74B]/15 text-[#32D74B]">
                    <Scale className="size-5" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-[17px] font-semibold text-foreground">Add Weight</span>
                    <span className="mt-0.5 block text-[13px] font-medium text-secondary">
                      Current weight
                    </span>
                  </span>
                </button>
                <button
                  type="button"
	                  onClick={() => {
	                    resetWorkoutEstimate();
	                    setMode("workout");
	                  }}
                  className="flex h-15 w-full items-center gap-4 rounded-[16px] px-4 text-left transition active:bg-muted"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#32D74B]/15 text-[#32D74B]">
                    <Activity className="size-5" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-[17px] font-semibold text-foreground">Add Workout</span>
                    <span className="mt-0.5 block text-[13px] font-medium text-secondary">
                      Movement and duration
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            {mode === "meal" ? (
              <div className="space-y-5">
                <h2 className="pl-8 pt-1 text-[22px] font-semibold leading-tight tracking-normal text-foreground">
                  Add meal
                </h2>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-secondary/85">Food description / note</p>
	                <div className="flex min-h-[118px] items-start rounded-[22px] border border-border bg-muted px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.16)]">
	                  <Utensils className="mr-4 mt-5 size-6 shrink-0 text-[#32D74B]" strokeWidth={2.1} />
	                  <textarea
	                    value={mealName}
	                    onChange={(event) => {
	                      setMealName(event.target.value);
	                      resetMealEstimate();
	                      setError("");
	                    }}
                    placeholder="Food description / note"
	                    rows={2}
	                    className="max-h-28 min-h-[100px] flex-1 resize-none bg-transparent py-4 text-[19px] leading-7 text-foreground outline-none placeholder:text-secondary/78"
	                  />
	                </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {mealPortionOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMealPortionSize(option);
                        resetMealEstimate();
                        setError("");
                      }}
                      className={`h-10 rounded-full border text-[14px] font-semibold capitalize transition active:scale-[0.98] ${
                        mealPortionSize === option
                          ? "border-[#32D74B]/65 bg-[#32D74B]/16 text-[#32D74B]"
                          : "border-border bg-muted text-foreground/65"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

	                {mealEstimateStatus === "estimated" || error ? (
	                  <div className="space-y-2">
	                    {mealEstimate ? (
	                      <p className="text-[13px] font-medium text-secondary/85">
	                        Local reference estimate
	                        {mealEstimate.grams ? ` · about ${mealEstimate.grams}g` : ""}
	                      </p>
	                    ) : null}
	                    <div className="flex h-11 items-center rounded-full border border-border bg-muted px-5">
	                      <input
	                        value={mealCalories}
	                        onChange={(event) => {
	                          setMealCalories(event.target.value.replace(/[^\d]/g, ""));
	                          setError("");
	                        }}
	                        inputMode="numeric"
	                        placeholder="Calories"
	                        className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-foreground outline-none placeholder:text-secondary/75"
	                      />
	                      <span className="text-[15px] font-medium text-secondary">kcal</span>
	                    </div>
	                  </div>
	                ) : null}

	                <div className="flex items-center justify-between border-t border-border pt-4">
	                  {error ? <p className="text-[13px] font-medium text-secondary">{error}</p> : <span />}
	                  {mealEstimateStatus === "estimated" || mealCalories ? (
	                    <button
	                      type="button"
	                      onClick={() => void saveMeal()}
	                      disabled={saving || !mealName.trim() || !mealCalories}
	                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98] disabled:opacity-45"
	                    >
	                      <Check className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
	                      Save
	                    </button>
	                  ) : (
	                    <button
	                      type="button"
	                      onClick={() => void estimateMeal()}
	                      disabled={saving || mealEstimateStatus === "estimating" || !mealName.trim()}
	                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98] disabled:opacity-45"
	                    >
	                      <Sparkles className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
	                      {mealEstimateStatus === "estimating" ? "Estimating" : "Estimate"}
	                    </button>
	                  )}
	                </div>
	              </div>
            ) : null}

            {mode === "weight" ? (
              <div className="space-y-5">
                <h2 className="pl-8 pt-1 text-[22px] font-semibold leading-tight tracking-normal text-foreground">
                  Add weight
                </h2>
                <div className="flex h-14 items-center rounded-[22px] border border-border bg-muted px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.16)]">
                  <input
                    value={weight}
                    onChange={(event) => {
                      setWeight(event.target.value);
                      setError("");
                    }}
                    inputMode="decimal"
                    placeholder="Weight"
                    className="min-w-0 flex-1 bg-transparent text-[19px] font-medium text-foreground outline-none placeholder:text-secondary/75"
                  />
                  <span className="text-[15px] font-medium text-secondary">kg</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  {error ? <p className="text-[13px] font-medium text-secondary">{error}</p> : <span />}
                  <button
                    type="button"
                    onClick={() => void saveWeight()}
                    disabled={saving || !weight}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98] disabled:opacity-45"
                  >
                    <Check className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "workout" ? (
              <div className="space-y-4">
                <div className="pl-8 pt-1">
                  <h2 className="text-[22px] font-semibold leading-tight tracking-normal text-foreground">
                    Add workout
                  </h2>
                </div>

	                <section className="space-y-2" aria-label="Activity">
	                  <p className="text-[15px] font-medium text-foreground/90">Activity</p>
	                  <div className="flex flex-wrap gap-2">
	                    {workoutSuggestions.map((suggestion) => {
	                      const selected =
	                        suggestion === "Custom"
	                          ? customActivityOpen
	                          : activity.trim().toLowerCase() === suggestion.toLowerCase();
	                      const Icon =
	                        suggestion === "Cycling"
	                          ? Bike
	                          : suggestion === "Gym"
	                            ? Dumbbell
	                            : suggestion === "Custom"
	                              ? Pencil
	                              : Activity;
	                      return (
	                        <button
	                          key={suggestion}
	                          type="button"
	                          onClick={() => chooseWorkout(suggestion)}
	                          className="flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-[0.98]"
	                          style={{
	                            borderColor: selected
	                              ? suggestion === "Custom"
	                                ? "var(--border)"
	                                : accent
	                              : "var(--muted)",
	                            background: selected
	                              ? suggestion === "Custom"
	                                ? "var(--muted)"
	                                : "rgba(50,215,75,0.08)"
	                              : "var(--muted)",
	                            color: selected
	                              ? suggestion === "Custom"
	                                ? "color-mix(in srgb, var(--foreground) 78%, transparent)"
	                                : accent
	                              : "color-mix(in srgb, var(--foreground) 72%, transparent)",
	                          }}
	                        >
	                          <Icon className="size-4" strokeWidth={2.1} />
	                          {suggestion}
	                        </button>
	                      );
	                    })}
	                  </div>
	                  <AnimatePresence>
	                    {customActivityOpen ? (
	                      <motion.div
	                        className="overflow-hidden"
	                        initial={{ height: 0, opacity: 0 }}
	                        animate={{ height: 44, opacity: 1 }}
	                        exit={{ height: 0, opacity: 0 }}
	                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
	                      >
	                        <div className="flex h-11 items-center rounded-full border border-border bg-muted px-5">
	                          <input
	                            value={activity}
	                            onChange={(event) => {
	                              setActivity(event.target.value);
	                              resetWorkoutEstimate();
	                              setError("");
	                            }}
	                            placeholder="Activity name"
	                            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-foreground outline-none placeholder:text-secondary/75"
	                          />
	                        </div>
	                      </motion.div>
	                    ) : null}
	                  </AnimatePresence>
	                </section>

	                <section className="space-y-2" aria-label="Duration">
	                  <p className="text-[15px] font-medium text-foreground/90">Duration</p>
                  <div className="flex flex-wrap gap-2">
                    {durationOptions.map((option) => {
                      const selected = duration === option;
                      return (
                        <button
                          key={option}
                          type="button"
	                          onClick={() => {
	                            setDuration(option);
	                            resetWorkoutEstimate();
	                            setError("");
	                          }}
                          className="h-10 rounded-full border px-4 text-[14px] font-medium transition active:scale-[0.98]"
                          style={{
                            borderColor: selected ? accent : "var(--border)",
                            background: selected ? "rgba(50,215,75,0.08)" : "var(--muted)",
                            color: selected
                              ? accent
                              : "color-mix(in srgb, var(--foreground) 78%, transparent)",
                          }}
                        >
                          {option} min
                        </button>
                      );
                    })}
                    <button
                      type="button"
	                      onClick={() => {
	                        setDuration("custom");
	                        resetWorkoutEstimate();
	                        setError("");
	                      }}
                      className="flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition active:scale-[0.98]"
                      style={{
                        borderColor: duration === "custom" ? accent : "var(--border)",
                        background:
                          duration === "custom" ? "rgba(50,215,75,0.08)" : "var(--muted)",
                        color:
                          duration === "custom"
                            ? accent
                            : "color-mix(in srgb, var(--foreground) 78%, transparent)",
                      }}
                    >
                      <Pencil className="size-4" strokeWidth={1.9} />
                      Custom
                    </button>
                  </div>
                  <AnimatePresence>
                    {duration === "custom" ? (
                      <motion.div
                        className="flex h-11 items-center rounded-full border border-border bg-muted px-5"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input
                          value={customDuration}
                          onChange={(event) => {
	                            setCustomDuration(event.target.value.replace(/\D/g, "").slice(0, 3));
	                            resetWorkoutEstimate();
	                            setError("");
	                          }}
                          inputMode="numeric"
                          placeholder="Minutes"
                          className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-foreground outline-none placeholder:text-secondary/75"
                        />
                        <span className="text-[15px] font-medium text-secondary">min</span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>

	                {weightLoading ? (
	                  <p className="text-[13px] font-medium text-secondary/85">Reading latest weight...</p>
	                ) : latestWeight === null ? (
	                  <p className="rounded-[16px] border border-border bg-muted p-4 text-[14px] font-medium text-secondary">
	                    Add weight first to estimate calories, or enter burned calories manually.
	                  </p>
	                ) : workoutEstimateStatus === "estimating" ? (
	                  <p className="text-[13px] font-medium text-secondary/85">Estimating burn...</p>
	                ) : workoutEstimate ? (
	                  <div className="border-t border-border pt-3">
	                    <p className="text-[13px] font-medium text-secondary/85">
	                      {workoutEstimate.source === "ai" ? "AI MET estimate" : "MET estimate"} · MET{" "}
	                      {workoutEstimate.met.toFixed(1)}
	                    </p>
	                    <p className="mt-1 text-[28px] font-semibold leading-none text-[#32D74B]/90">
	                      {workoutEstimate.calories}
	                      <span className="ml-1 text-[15px] font-medium text-[#32D74B]/70">kcal</span>
	                    </p>
	                  </div>
	                ) : null}

                <div className="flex h-11 items-center rounded-full border border-border bg-muted px-5">
                  <input
                    value={workoutCalories}
                    onChange={(event) => {
                      setWorkoutCalories(event.target.value.replace(/[^\d]/g, ""));
                      setError("");
                    }}
                    inputMode="numeric"
                    placeholder="Burned calories"
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-foreground outline-none placeholder:text-secondary/75"
                  />
                  <span className="text-[15px] font-medium text-secondary">kcal</span>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  {error ? <p className="text-[13px] font-medium text-secondary">{error}</p> : <span />}
                  <button
                    type="button"
                    onClick={() => void saveWorkout()}
                    disabled={saving || !activity || !workoutCalories}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98] disabled:opacity-45"
                  >
                    <Check className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
                    Save
                  </button>
                </div>
              </div>
            ) : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AppPreferences({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTodayStore((state) => state.theme);
  const setLanguage = useTodayStore((state) => state.setLanguage);
  const setTheme = useTodayStore((state) => state.setTheme);

  useEffect(() => {
    let active = true;

    const loadProfilePreferences = async () => {
      if (pathname === "/onboarding") {
        return;
      }

      try {
        const cached = getCachedData<ProfileCacheData>("profile");
        const data = cached ?? (await revalidateCachedJson<{
          display_name?: string | null;
          gender?: "male" | "female" | null;
          date_of_birth?: string | null;
          height_cm?: number | null;
          activity_level?: "sedentary" | "light" | "moderate" | "active" | null;
	          language?: "en" | "zh";
	          theme?: "dark" | "light";
        }>("profile", "/api/profile"));

        if (!data) return;

	        if (!active) return;
	        if (data.language) {
	          setLanguage(data.language);
	        }
        if (data.theme) {
          setTheme(data.theme);
        }
      } catch {
        // Preferences stay at their in-memory defaults until Supabase is available.
      }
    };

    void loadProfilePreferences();

    return () => {
      active = false;
    };
  }, [pathname, setLanguage, setTheme]);

  useEffect(() => {
    const isLight = theme === "light";
    document.documentElement.classList.toggle("dark", !isLight);
    document.documentElement.classList.toggle("light", isLight);
  }, [theme]);

  return (
    <>
      {children}
      <GlobalAddSheet />
    </>
  );
}
