"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Activity,
  BarChart3,
  Bike,
  Camera,
  Check,
  Clock3,
  Dumbbell,
  HomeIcon,
  Mic,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  revalidateCachedJson,
  setCachedData,
  useCachedJson,
} from "@/lib/client/data-cache";
import { useTodayStore } from "@/store/useTodayStore";

const accent = "#32D74B";
const quickSuggestions = ["Chicken Rice", "Latte", "Banana", "Eggs"];
const workoutSuggestions = ["Running", "Walking", "Gym", "Cycling", "Yoga", "Custom"];
const durationOptions = [15, 30, 45, 60];

type MealEstimate = {
  calories: number;
  items: { name: string; calories?: number }[];
};

type WorkoutEstimate = {
  calories: number;
  activity: string;
  durationMinutes: number;
};

type HomeData = {
  latestWeight: { weight: number; created_at: string } | null;
  eaten: number;
  burned: number;
  estimatedDailyBurn: number | null;
  net: number | null;
};

const fallbackHomeData: HomeData = {
  latestWeight: null,
  eaten: 0,
  burned: 0,
  estimatedDailyBurn: null,
  net: null,
};

function AnimatedWeight({ weightKg }: { weightKg: number }) {
  const value = useMotionValue(weightKg - 1.6);
  const spring = useSpring(value, { stiffness: 80, damping: 22, mass: 0.5 });
  const display = useTransform(spring, (latest) => latest.toFixed(1));

  useEffect(() => {
    value.set(weightKg);
  }, [value, weightKg]);

  return <motion.span>{display}</motion.span>;
}

function RollingWeight({ weightKg }: { weightKg: number | null }) {
  return weightKg === null ? <span>--</span> : <AnimatedWeight weightKg={weightKg} />;
}

function AddWorkoutSheet({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workout, setWorkout] = useState("");
  const [duration, setDuration] = useState<number | "custom">(45);
  const [customDuration, setCustomDuration] = useState("");
  const [customActivityOpen, setCustomActivityOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "estimating" | "result" | "saving" | "error">("idle");
  const [estimate, setEstimate] = useState<WorkoutEstimate | null>(null);

  const durationMinutes =
    duration === "custom" ? Number(customDuration) : duration;
  const canEstimate = workout.trim().length > 1 && Number.isFinite(durationMinutes) && durationMinutes > 0;

  useEffect(() => {
    if (!isOpen) return;

    if (!canEstimate) return;

    const timeout = window.setTimeout(async () => {
      setStatus("estimating");
      setEstimate(null);

      try {
        const response = await fetch("/api/workout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activity: workout.trim(),
            durationMinutes,
          }),
        });

        if (!response.ok) {
          throw new Error("Workout estimate failed.");
        }

        const data = (await response.json()) as WorkoutEstimate;
        setEstimate(data);
        setStatus("result");
      } catch {
        setStatus("error");
      }
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [canEstimate, durationMinutes, isOpen, workout]);

  const chooseWorkout = (activity: string) => {
    if (activity === "Custom") {
      setCustomActivityOpen(true);
      setWorkout("");
      resetResult();
      return;
    }

    setCustomActivityOpen(false);
    setWorkout(activity);
    resetResult();
  };

  const resetResult = () => {
    if (status !== "idle") {
      setStatus("idle");
      setEstimate(null);
    }
  };

  const saveWorkout = async () => {
    if (!estimate) return;

    setStatus("saving");
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity: estimate.activity,
          duration: estimate.durationMinutes,
          caloriesBurned: estimate.calories,
        }),
      });

      if (!response.ok) {
        throw new Error("Workout save failed.");
      }

      onSaved();
      onClose();
    } catch {
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/40 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.section
            className="relative max-h-[94dvh] w-full overflow-y-auto rounded-t-[30px] border border-border bg-card/96 px-6 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_70px_rgba(0,0,0,0.48)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            initial={{ y: 34, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 34, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Add workout"
          >
            <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-muted-foreground/25" />

            <button
              type="button"
              aria-label="Close add workout"
              onClick={onClose}
              className="absolute left-6 top-7 flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:bg-muted"
            >
              <X className="size-5" strokeWidth={1.8} />
            </button>

            <div className="space-y-4">
              <div className="pl-8 pt-1">
                <h2 className="text-[22px] font-semibold leading-tight tracking-normal text-foreground">
                  Add workout
                </h2>
              </div>

              <div className="flex min-h-[104px] items-start rounded-[22px] border border-border bg-muted px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.16)]">
                <Activity className="mr-4 mt-5 size-6 shrink-0 text-[#32D74B]" strokeWidth={2.1} />
                <textarea
                  value={workout}
                  onChange={(event) => {
                    setWorkout(event.target.value);
                    setCustomActivityOpen(false);
                    resetResult();
                  }}
                  placeholder="Type your workout..."
                  rows={2}
                  className="max-h-24 min-h-[88px] flex-1 resize-none bg-transparent py-4 text-[19px] leading-7 text-foreground outline-none placeholder:text-secondary/78"
                />
                <Mic className="ml-3 mt-5 size-5 shrink-0 text-foreground/45" strokeWidth={1.8} />
              </div>

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
                          resetResult();
                        }}
                        className="h-10 rounded-full border px-4 text-[14px] font-medium transition active:scale-[0.98]"
                        style={{
                          borderColor: selected ? accent : "var(--border)",
                          background: selected ? "rgba(50,215,75,0.08)" : "var(--muted)",
                          color: selected ? accent : "color-mix(in srgb, var(--foreground) 78%, transparent)",
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
                      resetResult();
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition active:scale-[0.98]"
                    style={{
                      borderColor: duration === "custom" ? accent : "var(--border)",
                      background:
                        duration === "custom" ? "rgba(50,215,75,0.08)" : "var(--muted)",
                      color: duration === "custom" ? accent : "color-mix(in srgb, var(--foreground) 78%, transparent)",
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
                          resetResult();
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

              <section className="space-y-2" aria-label="Recent activities">
                <p className="text-[15px] font-medium text-foreground/90">Recent activities</p>
                <div className="flex flex-wrap gap-2">
                  {workoutSuggestions.map((activity) => {
                    const selected =
                      activity === "Custom"
                        ? customActivityOpen
                        : workout.trim().toLowerCase() === activity.toLowerCase();
                    const Icon =
                      activity === "Cycling"
                        ? Bike
                        : activity === "Gym"
                          ? Dumbbell
                          : activity === "Custom"
                            ? Pencil
                          : Activity;
                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => chooseWorkout(activity)}
                        className="flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-[0.98]"
                        style={{
                          borderColor: selected
                            ? activity === "Custom"
                              ? "var(--border)"
                              : accent
                            : "var(--muted)",
                          background: selected
                            ? activity === "Custom"
                              ? "var(--muted)"
                              : "rgba(50,215,75,0.08)"
                            : "var(--muted)",
                          color: selected
                            ? activity === "Custom"
                              ? "color-mix(in srgb, var(--foreground) 78%, transparent)"
                              : accent
                            : "color-mix(in srgb, var(--foreground) 72%, transparent)",
                        }}
                      >
                        <Icon
                          className="size-4"
                          strokeWidth={2.1}
                          style={{
                            color: selected
                              ? activity === "Custom"
                                ? "color-mix(in srgb, var(--foreground) 62%, transparent)"
                                : accent
                              : "color-mix(in srgb, var(--foreground) 62%, transparent)",
                          }}
                        />
                        {activity}
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
                          value={workout}
                          onChange={(event) => {
                            setWorkout(event.target.value);
                            resetResult();
                          }}
                          placeholder="Activity name"
                          className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-foreground outline-none placeholder:text-secondary/75"
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>

              <AnimatePresence mode="wait">
                {status === "estimating" ? (
                  <motion.div
                    key="loading"
                    className="border-t border-border pt-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-[13px] font-medium text-secondary/85">Estimating burn...</p>
                    <div className="mt-3 h-9 w-36 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full w-20 bg-muted-foreground/20"
                        animate={{ x: [-80, 180] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                ) : status === "result" && estimate ? (
                  <motion.div
                    key="result"
                    className="border-t border-border pt-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    aria-label="AI estimated burn result"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[13px] font-medium text-secondary/85">Estimated burn</p>
                        <p className="mt-1 text-[34px] font-semibold leading-none text-[#32D74B]/90">
                          {estimate.calories}
                          <span className="ml-1 text-[15px] font-medium text-[#32D74B]/70">
                            kcal
                          </span>
                        </p>
                        <p className="mt-3 text-[15px] font-medium text-foreground/85">
                          {estimate.activity}
                          <span className="px-2 text-[#32D74B]">•</span>
                          {estimate.durationMinutes} min
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveWorkout()}
                        className="mt-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98]"
                      >
                        <Check className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
                        Save
                      </button>
                    </div>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    key="error"
                    className="rounded-[18px] border border-border bg-muted p-6 text-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-[17px] font-semibold text-foreground">
                      Couldn&apos;t estimate workout burn.
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-secondary">Try again.</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AddMealSheet({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "result" | "saving" | "error">("idle");
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const resetPhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(null);
    setPhotoPreview(null);
    setEstimate(null);
    setStatus("idle");
  };

  const selectPhoto = (file: File | undefined) => {
    if (!file) return;
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setEstimate(null);
    setStatus("idle");
  };

  const analyzeMeal = async (mealText = description) => {
    if (!mealText.trim() && !photo) return;

    setStatus("analyzing");
    setEstimate(null);

    const formData = new FormData();
    formData.append("description", mealText.trim());
    if (photo) {
      formData.append("image", photo);
    }

    try {
      const response = await fetch("/api/meal", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Meal analysis failed.");
      }

      const data = (await response.json()) as MealEstimate;
      setEstimate(data);
      setStatus("result");
    } catch {
      setStatus("error");
    }
  };

  const chooseSuggestion = (suggestion: string) => {
    setDescription(suggestion);
    void analyzeMeal(suggestion);
  };

  const saveMeal = async () => {
    if (!estimate) return;

    setStatus("saving");
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: (estimate.items[0]?.name ?? description.trim()) || "Meal",
          calories: estimate.calories,
        }),
      });

      if (!response.ok) {
        throw new Error("Meal save failed.");
      }

      onSaved();
      onClose();
    } catch {
      setStatus("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/40 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.section
            className="relative w-full rounded-t-[30px] border border-border bg-card/96 px-6 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_70px_rgba(0,0,0,0.48)]"
            initial={{ y: 34, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 34, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Add meal"
          >
            <div className="mx-auto mb-6 h-1 w-11 rounded-full bg-muted-foreground/25" />

            <button
              type="button"
              aria-label="Close add meal"
              onClick={onClose}
              className="absolute left-6 top-7 flex size-9 items-center justify-center rounded-full text-foreground/80 transition hover:bg-muted"
            >
              <X className="size-5" strokeWidth={1.8} />
            </button>

            <div className="space-y-6">
              <h2 className="pl-8 pt-1 text-[22px] font-semibold leading-tight tracking-normal text-foreground">
                Add meal
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                capture="environment"
                className="hidden"
                onChange={(event) => selectPhoto(event.target.files?.[0])}
              />

              {photoPreview ? (
                <div className="relative overflow-hidden rounded-[16px] border border-border">
                  <div
                    aria-label="Selected meal photo"
                    className="h-[216px] w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${photoPreview})` }}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={resetPhoto}
                    className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-muted/45 text-foreground backdrop-blur-md"
                  >
                    <X className="size-5" strokeWidth={1.8} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto flex h-12 items-center gap-2.5 rounded-full border border-border bg-muted px-4 text-[#32D74B] transition active:scale-[0.98]"
                  aria-label="Take a photo"
                >
                  <Camera className="size-5" strokeWidth={1.9} />
                  <span className="text-[14px] font-medium text-foreground/75">Add photo</span>
                </button>
              )}

              <div className="flex min-h-[132px] items-start rounded-[22px] border border-border bg-muted px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.16)]">
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    if (status !== "idle") {
                      setStatus("idle");
                      setEstimate(null);
                    }
                  }}
                  placeholder={photoPreview ? "Add a few words, if helpful..." : "Chicken rice and egg..."}
                  rows={3}
                  className="max-h-32 min-h-[108px] flex-1 resize-none bg-transparent py-5 text-[18px] leading-7 text-foreground outline-none placeholder:text-secondary/75"
                />
                <Mic className="ml-3 mt-5 size-5 shrink-0 text-foreground/45" strokeWidth={1.8} />
              </div>

              <div className="space-y-2">
                <p className="text-[13px] font-medium text-secondary/85">Recent</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => chooseSuggestion(suggestion)}
                      className="shrink-0 rounded-full bg-muted px-3.5 py-2 text-[13px] font-medium text-foreground/65 transition active:scale-[0.98]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {status === "analyzing" ? (
                  <motion.div
                    key="loading"
                    className="flex h-[178px] flex-col items-center justify-center rounded-[16px] border border-border bg-muted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="relative size-[76px] rounded-full border border-[#32D74B]/20">
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#32D74B]"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
                      />
                    </div>
                    <p className="mt-5 text-[18px] font-medium text-foreground">Analyzing meal...</p>
                    <p className="mt-2 text-[14px] font-medium text-secondary">
                      This may take a few seconds
                    </p>
                  </motion.div>
                ) : status === "result" && estimate ? (
                  <motion.div
                    key="result"
                    className="border-t border-border pt-5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[13px] font-medium text-secondary/85">Estimated</p>
                        <p className="mt-1 text-[38px] font-semibold leading-none text-[#32D74B]/90">
                          {estimate.calories}
                          <span className="ml-1 text-[15px] font-medium text-[#32D74B]/70">
                            kcal
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveMeal()}
                        className="mt-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 text-[14px] font-medium text-foreground/80 transition active:scale-[0.98]"
                      >
                        <Check className="size-4 text-[#32D74B]/85" strokeWidth={2.2} />
                        Save
                      </button>
                    </div>
                    <div className="mt-5 space-y-2.5">
                      {estimate.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-4">
                          <p className="text-[15px] font-medium text-foreground/85">{item.name}</p>
                          {item.calories ? (
                            <p className="shrink-0 text-[14px] font-medium text-secondary">
                              {item.calories} kcal
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    key="error"
                    className="rounded-[16px] border border-border bg-muted p-5 text-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-[17px] font-semibold text-foreground">
                      Couldn&apos;t estimate calories.
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-secondary">
                      Try another photo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="mt-5 rounded-full bg-muted px-9 py-3 text-[15px] font-semibold text-foreground"
                    >
                      Try Again
                    </button>
                  </motion.div>
                ) : photoPreview || description.trim() ? (
                  <motion.button
                    key="analyze"
                    type="button"
                    onClick={() => void analyzeMeal()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#32D74B] text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sparkles className="size-4 fill-black" strokeWidth={2} />
                    Analyze Meal
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AddWeightSheet({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (weightKg: number) => Promise<void>;
}) {
  const [weight, setWeight] = useState("");
  const [savedVisible, setSavedVisible] = useState(false);
  const [saveError, setSaveError] = useState("");

  const weightValue = Number(weight);
  const canSave = Number.isFinite(weightValue) && weightValue >= 20 && weightValue <= 400;

  const closeSheet = () => {
    setSavedVisible(false);
    setSaveError("");
    onClose();
  };

  const saveWeight = async () => {
    if (!canSave) return;

    const savedWeight = Number(weightValue.toFixed(1));
    setSaveError("");

    try {
      await onSaved(savedWeight);
      setSavedVisible(true);
      window.setTimeout(closeSheet, 700);
    } catch {
      setSaveError("Save failed.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/45 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.section
            className="relative h-[62dvh] w-full rounded-t-[30px] border border-border bg-card/96 px-7 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5"
            initial={{ y: 34, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 34, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Add weight"
          >
            <div className="mx-auto mb-7 h-1 w-11 rounded-full bg-muted-foreground/28" />

            <button
              type="button"
              aria-label="Close add weight"
              onClick={closeSheet}
              className="absolute left-6 top-7 flex size-9 items-center justify-center rounded-full text-foreground/85 transition active:bg-muted"
            >
              <X className="size-6" strokeWidth={1.7} />
            </button>

            <div className="flex h-full flex-col items-center">
              <motion.header
                className="pt-10 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  Add weight
                </h2>
              </motion.header>

              <section className="flex flex-1 flex-col items-center justify-center pb-4" aria-label="Weight input">
                <div className="relative mx-auto flex max-w-[370px] justify-center">
                  <input
                    type="number"
	                    value={weight}
	                    onChange={(event) => {
	                      setWeight(event.target.value);
	                      setSavedVisible(false);
                        setSaveError("");
	                    }}
                    min="20"
                    max="400"
                    step="0.1"
                    inputMode="decimal"
                    aria-label="Weight in kilograms"
                    className="w-full appearance-none bg-transparent text-center text-[84px] font-semibold leading-none tracking-[-0.07em] text-foreground outline-none placeholder:text-foreground/25 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder="0.0"
                  />
                </div>
                <p className="mt-1 text-center text-[18px] font-medium leading-none text-secondary">
                  kg
                </p>
              </section>

              <div className="pb-6 text-center">
	                <motion.button
	                  type="button"
	                  onClick={saveWeight}
	                  disabled={!canSave}
	                  className="mx-auto flex h-10 items-center justify-center rounded-full bg-muted px-7 text-[15px] font-semibold text-foreground/88 transition disabled:opacity-45 active:bg-muted/80"
	                  whileTap={{ scale: 0.99 }}
	                >
	                  Save
	                </motion.button>
	
	                <AnimatePresence mode="wait">
	                  {savedVisible ? (
	                    <motion.p
	                      key="weight-saved"
	                      className="mt-4 text-center text-[14px] font-medium text-secondary"
	                      initial={{ opacity: 0, y: 6 }}
	                      animate={{ opacity: 1, y: 0 }}
	                      exit={{ opacity: 0, y: -6 }}
	                      transition={{ duration: 0.24 }}
	                    >
	                      Saved
	                    </motion.p>
	                  ) : null}
	                </AnimatePresence>
                  {saveError ? (
                    <p className="mt-4 text-center text-[14px] font-medium text-secondary">
                      {saveError}
                    </p>
                  ) : null}
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AddActionSheet({
  isOpen,
  onClose,
  onAddMeal,
  onAddWorkout,
  onAddWeight,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: () => void;
  onAddWorkout: () => void;
  onAddWeight: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40 mx-auto flex w-full max-w-[430px] items-end bg-muted/35 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full px-4 pb-[calc(18px+env(safe-area-inset-bottom))]"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="rounded-[22px] border border-border bg-card/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={onAddMeal}
                className="flex h-15 w-full items-center gap-4 rounded-[16px] px-4 text-left transition active:bg-muted"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-[#32D74B]/15 text-[#32D74B]">
                  <Camera className="size-5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-[17px] font-semibold text-foreground">Add Meal</span>
                  <span className="mt-0.5 block text-[13px] font-medium text-secondary">
                    Photo or natural text
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={onAddWeight}
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
                onClick={onAddWorkout}
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BottomNavigation({ onAdd }: { onAdd: () => void }) {
  const language = useTodayStore((state) => state.language);
  const copy =
    language === "zh"
      ? { home: "首页", stats: "统计", history: "历史", profile: "个人" }
      : { home: "Home", stats: "Stats", history: "History", profile: "Profile" };
  const items = [
    { label: copy.home, href: "/", icon: HomeIcon, active: true },
    { label: copy.stats, href: "/stats", icon: BarChart3 },
    { label: copy.history, href: "/history", icon: Clock3 },
    { label: copy.profile, href: "/profile", icon: UserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-border bg-background/90 px-5 pt-3 backdrop-blur-xl">
      <div className="grid h-[76px] grid-cols-5 items-start pb-[env(safe-area-inset-bottom)]">
        {items.slice(0, 2).map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1.5 text-[12px] font-medium ${item.active ? "text-primary" : "text-secondary"}`}
          >
            <item.icon className="size-6" strokeWidth={item.active ? 2.6 : 2} />
            <span>{item.label}</span>
          </Link>
        ))}

        <button
          type="button"
          aria-label="Add"
          onClick={onAdd}
          className="mx-auto -mt-6 flex size-[66px] items-center justify-center rounded-full bg-[#32D74B]/90 text-primary-foreground shadow-[0_6px_14px_rgba(0,0,0,0.22)]"
        >
          <Plus className="size-8" strokeWidth={2.25} />
        </button>

        {items.slice(2).map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1.5 text-[12px] font-medium text-secondary"
          >
            <item.icon className="size-6" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function Home() {
  const language = useTodayStore((state) => state.language);
  const openAddSheet = useTodayStore((state) => state.openAddSheet);
  const { data: homeData, revalidate: refreshHomeData } = useCachedJson<HomeData>({
    key: "home",
    url: "/api/home",
    fallbackData: fallbackHomeData,
  });
  const currentWeight = homeData.latestWeight?.weight ?? null;

  const updateCurrentWeight = async (weightKg: number) => {
    const response = await fetch("/api/weight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weightKg }),
    });

    if (!response.ok) {
      throw new Error("Weight save failed.");
    }

    const data = (await response.json()) as { weight_kg: number };
    setCachedData("weight", data);
    void revalidateCachedJson<HomeData>("home", "/api/home");
    await refreshHomeData();
  };

  const hasCalorieModel = homeData.net !== null;
  const hasCalorieEntries =
    hasCalorieModel || Boolean(homeData.eaten || homeData.burned);
  const todayLabel = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <>
      <motion.div
        className="flex min-h-dvh flex-col pb-[116px] pt-14"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
      >
        <header className="space-y-2">
          <h1 className="text-[64px] font-bold leading-[0.96] text-foreground">Today.</h1>
          <p className="text-[22px] font-medium leading-tight text-secondary">
            {todayLabel}
          </p>
          <p className="pt-3 text-[25px] font-medium leading-tight text-[#32D74B]/85">
            {language === "zh" ? "继续保持。" : "Keep going."}
          </p>
        </header>

        <section className="mt-14" aria-label="Weight">
          <div className="flex items-end gap-4">
            <p className="text-[126px] font-semibold leading-[0.78] text-foreground">
              <RollingWeight weightKg={currentWeight} />
            </p>
            <p className="pb-1 text-[31px] font-medium leading-none text-secondary">
              kg
            </p>
          </div>
          <p className="mt-7 text-[22px] font-medium leading-none text-secondary">
            {currentWeight === null ? (
              "No weight yet"
            ) : (
              "No comparison yet"
            )}
          </p>
        </section>

        <section
          className="mt-13 px-1"
          aria-label="Net calories"
        >
          <p className="text-[21px] font-medium leading-none text-secondary">Net</p>
          <p className="mt-4 text-[52px] font-medium leading-none text-foreground">
            {homeData.net === null ? "--" : homeData.net}{" "}
            <span className="text-[27px] text-[#32D74B]/80">kcal</span>
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 pt-1">
            <p className="text-[26px] font-medium leading-none text-foreground">
              {hasCalorieEntries ? homeData.eaten : "--"}
              <span className="mt-1 block text-[17px] font-medium text-secondary">
                eaten
              </span>
            </p>
            <p className="text-[26px] font-medium leading-none text-foreground">
              {hasCalorieEntries ? homeData.burned : "--"}
              <span className="mt-1 block text-[17px] font-medium text-secondary">
                burned
              </span>
            </p>
          </div>
        </section>

      </motion.div>

      <BottomNavigation onAdd={openAddSheet} />
    </>
  );
}
