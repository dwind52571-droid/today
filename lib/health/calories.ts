export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type DailyBurnProfile = {
  gender: Gender | null;
  date_of_birth: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
};

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export function calculateAge(dateOfBirth: string, today = new Date()) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age > 0 ? age : null;
}

export function calculateBMR({
  gender,
  weightKg,
  heightCm,
  age,
}: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
}) {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(age)
  ) {
    return null;
  }

  return gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateEstimatedDailyBurn(
  profile: DailyBurnProfile | null,
  weightKg: number | null,
  today = new Date(),
) {
  if (
    !profile?.gender ||
    !profile.date_of_birth ||
    !profile.height_cm ||
    !profile.activity_level ||
    weightKg === null
  ) {
    return null;
  }

  const age = calculateAge(profile.date_of_birth, today);
  if (!age) {
    return null;
  }

  const bmr = calculateBMR({
    gender: profile.gender,
    weightKg,
    heightCm: profile.height_cm,
    age,
  });

  return bmr === null
    ? null
    : Math.round(bmr * activityMultipliers[profile.activity_level]);
}

export function calculateNetCalories(
  caloriesEaten: number,
  estimatedDailyBurn: number | null,
  workoutBurned: number,
) {
  if (estimatedDailyBurn === null) {
    return null;
  }

  return caloriesEaten - estimatedDailyBurn - workoutBurned;
}
