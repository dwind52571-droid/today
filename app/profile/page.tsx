"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  Clock3,
  Flame,
  Globe2,
  HomeIcon,
  Moon,
  Plus,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  invalidateCachedData,
  revalidateCachedJson,
  setCachedData,
  useCachedJson,
} from "@/lib/client/data-cache";
import {
  calculateEstimatedDailyBurn,
  type ActivityLevel,
  type DailyBurnProfile,
  type Gender,
} from "@/lib/health/calories";
import { createClient } from "@/lib/supabase/client";
import { useTodayStore } from "@/store/useTodayStore";

type SettingKey = "language" | "appearance";
type LeaderboardMetric = "weight" | "netCalories" | "workoutBurn";
type Appearance = "Dark" | "Light";
type Language = "English" | "中文";

type ProfileData = {
  display_name: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  language: "en" | "zh";
  theme: "dark" | "light";
  show_on_leaderboard: boolean;
};

type WeightData = {
  weight_kg: number | null;
};

type PersonalData = DailyBurnProfile;

type LeaderboardRow = {
  rank: number;
  userId: string;
  emailPrefix: string;
  value: number;
};

type LeaderboardData = {
  date: string;
  weight: LeaderboardRow[];
  netCalories: LeaderboardRow[];
  workoutBurn: LeaderboardRow[];
};

type PersonalDraft = {
  gender: Gender;
  date_of_birth: string;
  height_cm: string;
  activity_level: ActivityLevel;
};

const defaultPersonalData: PersonalData = {
  gender: null,
  date_of_birth: null,
  height_cm: null,
  activity_level: null,
};

const fallbackProfileData: ProfileData = {
  display_name: null,
  gender: null,
  date_of_birth: null,
  height_cm: null,
  activity_level: null,
  language: "en",
  theme: "dark",
  show_on_leaderboard: false,
};

const fallbackWeightData: WeightData = {
  weight_kg: null,
};

const fallbackLeaderboardData: LeaderboardData = {
  date: "",
  weight: [],
  netCalories: [],
  workoutBurn: [],
};

const settingCopy: Record<
  SettingKey,
  {
    title: Record<Language, string>;
    description: Record<Language, string>;
  }
> = {
  language: {
    title: {
      English: "Language",
      中文: "语言",
    },
    description: {
      English: "Choose the language for the main labels.",
      中文: "选择主要标签的语言。",
    },
  },
  appearance: {
    title: {
      English: "Appearance",
      中文: "外观",
    },
    description: {
      English: "Choose a simple light or dark surface.",
      中文: "选择浅色或深色界面。",
    },
  },
};

const text = {
  English: {
    profile: "Profile",
    estimatedDailyBurn: "Estimated Daily Burn",
    dailyBurnLabel: "Estimated daily burn",
    enterPersonalData: "Enter personal data",
    addWeightToCalculate: "Add weight to calculate",
    edit: "Edit",
    gender: "Gender",
    male: "Male",
    female: "Female",
    dateOfBirth: "Date of birth",
    heightCm: "Height cm",
    activityLevel: "Activity level",
    sedentary: "Sedentary",
    light: "Light",
    moderate: "Moderate",
    active: "Active",
    save: "Save",
    language: "Language",
    appearance: "Appearance",
    home: "Home",
    stats: "Stats",
    history: "History",
    dark: "Dark",
    lightMode: "Light",
    logout: "Logout",
    leaderboard: "Leaderboard",
    showMeOnLeaderboard: "Show me on leaderboard",
    noRankingsYet: "No rankings yet",
    weight: "Weight",
    netCalories: "Net Calories",
    workoutBurn: "Workout Burn",
  },
  中文: {
    profile: "个人",
    estimatedDailyBurn: "预估每日消耗",
    dailyBurnLabel: "预估每日消耗",
    enterPersonalData: "填写个人数据",
    addWeightToCalculate: "添加体重后计算",
    edit: "编辑",
    gender: "性别",
    male: "男",
    female: "女",
    dateOfBirth: "出生日期",
    heightCm: "身高 cm",
    activityLevel: "活动水平",
    sedentary: "久坐",
    light: "轻度",
    moderate: "中等",
    active: "活跃",
    save: "保存",
    language: "语言",
    appearance: "外观",
    home: "首页",
    stats: "统计",
    history: "历史",
    dark: "深色",
    lightMode: "浅色",
    logout: "退出登录",
    leaderboard: "排行榜",
    showMeOnLeaderboard: "显示在排行榜",
    noRankingsYet: "No rankings yet",
    weight: "体重",
    netCalories: "净热量",
    workoutBurn: "运动消耗",
  },
};

function hasPersonalData(data: PersonalData) {
  return Boolean(
    data.gender &&
      data.date_of_birth &&
      data.height_cm &&
      data.activity_level,
  );
}

function personalDataToDraft(data: PersonalData): PersonalDraft {
  return {
    gender: data.gender ?? "male",
    date_of_birth: data.date_of_birth ?? "",
    height_cm: data.height_cm ? String(data.height_cm) : "",
    activity_level: data.activity_level ?? "sedentary",
  };
}

function BottomNavigation({
  language,
  onAdd,
}: {
  language: Language;
  onAdd: () => void;
}) {
  const copy = text[language];
  const items = [
    { label: copy.home, href: "/", icon: HomeIcon, active: false },
    { label: copy.stats, href: "/stats", icon: BarChart3, active: false },
    { label: copy.history, href: "/history", icon: Clock3, active: false },
    { label: copy.profile, href: "/profile", icon: UserRound, active: true },
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
            className={`flex flex-col items-center gap-1.5 text-[12px] font-medium ${item.active ? "text-primary" : "text-secondary"}`}
          >
            <item.icon className="size-6" strokeWidth={item.active ? 2.6 : 2} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function SettingSheet({
  setting,
  appearance,
  language,
  onAppearanceChange,
  onLanguageChange,
  onClose,
}: {
  setting: SettingKey | null;
  appearance: Appearance;
  language: Language;
  onAppearanceChange: (appearance: Appearance) => void;
  onLanguageChange: (language: Language) => void;
  onClose: () => void;
}) {
  const copy = text[language];

  return (
    <AnimatePresence>
      {setting ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/35 backdrop-blur-sm"
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
              className="rounded-[24px] border border-border bg-card/96 px-5 pb-5 pt-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold leading-tight text-foreground">
                    {settingCopy[setting].title[language]}
                  </h2>
                  <p className="mt-2 max-w-[300px] text-[15px] font-medium leading-5 text-secondary">
                    {settingCopy[setting].description[language]}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close setting"
                  onClick={onClose}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/75 transition active:scale-95"
                >
                  <X className="size-5" strokeWidth={1.8} />
                </button>
              </div>

              {setting === "appearance" ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["Dark", "Light"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onAppearanceChange(option)}
                      className={`h-12 rounded-full border text-[16px] font-semibold transition active:scale-[0.98] ${
                        option === appearance
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-foreground/72"
                      }`}
                    >
                      {option === "Dark" ? copy.dark : copy.lightMode}
                    </button>
                  ))}
                </div>
              ) : null}

              {setting === "language" ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["English", "中文"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onLanguageChange(option)}
                      className={`h-12 rounded-full border text-[16px] font-semibold transition active:scale-[0.98] ${
                        option === language
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-foreground/72"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LeaderboardSheet({
  open,
  language,
  data,
  onClose,
}: {
  open: boolean;
  language: Language;
  data: LeaderboardData;
  onClose: () => void;
}) {
  const copy = text[language];
  const [activeMetric, setActiveMetric] = useState<LeaderboardMetric>("weight");
  const tabs: Array<{ key: LeaderboardMetric; label: string; unit: string }> = [
    { key: "weight", label: copy.weight, unit: "kg" },
    { key: "netCalories", label: copy.netCalories, unit: "kcal" },
    { key: "workoutBurn", label: copy.workoutBurn, unit: "kcal" },
  ];
  const activeTab = tabs.find((tab) => tab.key === activeMetric) ?? tabs[0];
  const rows = data[activeMetric];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/35 backdrop-blur-sm"
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
              className="rounded-[24px] border border-border bg-card/96 px-5 pb-5 pt-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold leading-tight text-foreground">
                    {copy.leaderboard}
                  </h2>
                  <p className="mt-2 text-[15px] font-medium leading-5 text-secondary">
                    Yesterday
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close leaderboard"
                  onClick={onClose}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/75 transition active:scale-95"
                >
                  <X className="size-5" strokeWidth={1.8} />
                </button>
              </div>

              <div className="grid grid-cols-3 border-b border-border">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveMetric(tab.key)}
                    className={`relative h-11 text-center text-[14px] font-medium transition ${
                      tab.key === activeMetric ? "text-foreground" : "text-secondary"
                    }`}
                  >
                    {tab.label}
                    {tab.key === activeMetric ? (
                      <motion.span
                        layoutId="leaderboard-metric-underline"
                        className="absolute bottom-[-1px] left-0 right-0 mx-auto h-px w-[72%] bg-[#32D74B]"
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="mt-5 min-h-[190px]">
                {rows.length ? (
                  <div>
                    {rows.map((row) => (
                      <div
                        key={`${activeMetric}-${row.userId}`}
                        className="flex h-12 items-center border-b border-border last:border-b-0"
                      >
                        <span className="w-11 text-[16px] font-medium text-secondary">
                          #{row.rank}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[17px] font-medium text-foreground">
                          {row.emailPrefix}
                        </span>
                        <span className="text-[16px] font-medium text-foreground">
                          {row.value.toLocaleString("en-US")}
                          <span className="ml-1 text-[13px] font-medium text-secondary">
                            {activeTab.unit}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[190px] items-center justify-center rounded-[18px] border border-border bg-muted">
                    <p className="text-[15px] font-medium text-secondary">
                      {copy.noRankingsYet}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PersonalDataSheet({
  open,
  draft,
  language,
  onDraftChange,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: PersonalDraft;
  language: Language;
  onDraftChange: (draft: PersonalDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const copy = text[language];
  const genderOptions: Gender[] = ["male", "female"];
  const activityOptions: ActivityLevel[] = [
    "sedentary",
    "light",
    "moderate",
    "active",
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/35 backdrop-blur-sm"
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
              className="rounded-[24px] border border-border bg-card/96 px-5 pb-5 pt-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[22px] font-semibold leading-tight text-foreground">
                  {copy.estimatedDailyBurn}
                </h2>
                <button
                  type="button"
                  aria-label="Close personal data"
                  onClick={onClose}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/75 transition active:scale-95"
                >
                  <X className="size-5" strokeWidth={1.8} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-secondary">
                    {copy.gender}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {genderOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          onDraftChange({ ...draft, gender: option })
                        }
                        className={`h-11 rounded-full border text-[15px] font-semibold transition active:scale-[0.98] ${
                          option === draft.gender
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-foreground/72"
                        }`}
                      >
                        {copy[option]}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-secondary">
                    {copy.dateOfBirth}
                  </span>
                  <input
                    type="date"
                    value={draft.date_of_birth}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        date_of_birth: event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-2xl border border-border bg-muted px-4 text-[16px] font-medium text-foreground outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-secondary">
                    {copy.heightCm}
                  </span>
                  <input
                    value={draft.height_cm}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        height_cm: event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 3),
                      })
                    }
                    inputMode="numeric"
                    className="h-12 w-full rounded-2xl border border-border bg-muted px-4 text-[16px] font-medium text-foreground outline-none"
                    placeholder="175"
                  />
                </label>

                <div>
                  <p className="mb-2 text-[13px] font-medium text-secondary">
                    {copy.activityLevel}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {activityOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          onDraftChange({ ...draft, activity_level: option })
                        }
                        className={`h-11 rounded-full border text-[15px] font-semibold transition active:scale-[0.98] ${
                          option === draft.activity_level
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-foreground/72"
                        }`}
                      >
                        {copy[option]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSave}
                  className="h-12 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground transition active:scale-[0.98]"
                >
                  {copy.save}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: profileData } = useCachedJson<ProfileData>({
    key: "profile",
    url: "/api/profile",
    fallbackData: fallbackProfileData,
  });
  const { data: weightData } = useCachedJson<WeightData>({
    key: "weight",
    url: "/api/weight",
    fallbackData: fallbackWeightData,
  });
  const { data: leaderboardData } = useCachedJson<LeaderboardData>({
    key: "leaderboard",
    url: "/api/leaderboard",
    fallbackData: fallbackLeaderboardData,
  });
  const personalData = useMemo<PersonalData>(
    () => ({
      gender: profileData.gender,
      date_of_birth: profileData.date_of_birth,
      height_cm: profileData.height_cm,
      activity_level: profileData.activity_level,
    }),
    [
      profileData.activity_level,
      profileData.date_of_birth,
      profileData.gender,
      profileData.height_cm,
    ],
  );
  const [personalDraft, setPersonalDraft] = useState<PersonalDraft>(
    personalDataToDraft(defaultPersonalData),
  );
  const latestWeight =
    typeof weightData.weight_kg === "number" ? weightData.weight_kg : null;
  const [personalSheetOpen, setPersonalSheetOpen] = useState(false);
  const [activeSetting, setActiveSetting] = useState<SettingKey | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const storedTheme = useTodayStore((state) => state.theme);
  const storedLanguage = useTodayStore((state) => state.language);
  const setStoredTheme = useTodayStore((state) => state.setTheme);
  const setStoredLanguage = useTodayStore((state) => state.setLanguage);
  const openAddSheet = useTodayStore((state) => state.openAddSheet);
  const appearance: Appearance = storedTheme === "light" ? "Light" : "Dark";
  const language: Language = storedLanguage === "zh" ? "中文" : "English";
  const copy = text[language];
  const isPersonalDataComplete = hasPersonalData(personalData);
  const estimatedDailyBurn = useMemo(
    () => calculateEstimatedDailyBurn(personalData, latestWeight),
    [personalData, latestWeight],
  );

  const saveProfile = async (body: Record<string, unknown>) => {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase auth getUser failed", {
        message: userError.message,
        status: userError.status,
      });
    }

    if (!user) {
      console.error("Profile save failed", "Not authenticated");
      return false;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        ...body,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Supabase profile upsert failed", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    const nextProfileData = {
      ...profileData,
      ...body,
    } as ProfileData;
    setCachedData("profile", nextProfileData);
    invalidateCachedData(["home", "stats", "history"]);
    void revalidateCachedJson("home", "/api/home");
    void revalidateCachedJson("stats", "/api/stats");
    void revalidateCachedJson("history", "/api/history");
    void revalidateCachedJson("leaderboard", "/api/leaderboard");

    return true;
  };

  const savePersonalData = async () => {
    const heightCm = Number(personalDraft.height_cm);

    if (
      !personalDraft.date_of_birth ||
      !Number.isInteger(heightCm) ||
      heightCm <= 0
    ) {
      return;
    }

    const nextPersonalData = {
      gender: personalDraft.gender,
      date_of_birth: personalDraft.date_of_birth,
      height_cm: heightCm,
      activity_level: personalDraft.activity_level,
    };

    const saved = await saveProfile(nextPersonalData);

    if (saved) {
      setCachedData("profile", {
        ...profileData,
        ...nextPersonalData,
      });
      setPersonalSheetOpen(false);
    }
  };

  const openPersonalSheet = () => {
    setPersonalDraft(personalDataToDraft(personalData));
    setPersonalSheetOpen(true);
  };

  const toggleLeaderboardVisibility = async () => {
    await saveProfile({
      show_on_leaderboard: !profileData.show_on_leaderboard,
    });
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCachedData("profile", fallbackProfileData);
    setCachedData("weight", fallbackWeightData);
    invalidateCachedData(["home", "stats", "history"]);
    setPersonalDraft(personalDataToDraft(defaultPersonalData));
    setStoredLanguage("en");
    setStoredTheme("dark");
    router.replace("/onboarding");
    router.refresh();
  };

  const settings = [
    {
      key: "language" as const,
      label: copy.language,
      value: language,
      icon: Globe2,
    },
    {
      key: "appearance" as const,
      label: copy.appearance,
      value: appearance === "Dark" ? copy.dark : copy.lightMode,
      icon: Moon,
    },
  ];

  return (
    <>
      <motion.div
        className="flex flex-1 flex-col bg-background pb-[112px] pt-10 text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
      >
        <header>
          <h1 className="text-[52px] font-semibold leading-none tracking-normal text-foreground">
            {copy.profile}
          </h1>
        </header>

        <section className="mt-14" aria-label={copy.estimatedDailyBurn}>
          <button
            type="button"
            onClick={openPersonalSheet}
            className="flex min-h-[132px] w-full items-center gap-7 py-5 text-left transition active:scale-[0.99]"
          >
            <Flame
              className="size-8 shrink-0 text-[#32D74B]/70"
              strokeWidth={1.55}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[17px] font-medium leading-none text-secondary">
                  {copy.dailyBurnLabel}
                </p>
                {isPersonalDataComplete ? (
                  <span className="text-[14px] font-medium leading-none text-secondary">
                    {copy.edit}
                  </span>
                ) : null}
              </div>

              {!isPersonalDataComplete ? (
                <p className="mt-5 text-[28px] font-semibold leading-none text-foreground">
                  {copy.enterPersonalData}
                </p>
              ) : latestWeight === null ? (
                <p className="mt-5 text-[28px] font-semibold leading-none text-foreground">
                  {copy.addWeightToCalculate}
                </p>
              ) : (
                <div className="mt-5 flex items-baseline">
                  <span className="text-[56px] font-extralight leading-[0.86] tracking-normal text-foreground">
                    {estimatedDailyBurn?.toLocaleString("en-US") ?? "--"}
                  </span>
                  <span className="ml-2.5 text-[23px] font-medium leading-none text-secondary">
                    kcal
                  </span>
                </div>
              )}
            </div>
          </button>
        </section>

        <section className="mt-12" aria-label="Minimal settings list">
          <div className="border-y border-border">
            {settings.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSetting(item.key)}
                className="flex h-[68px] w-full items-center border-b border-border text-left transition last:border-b-0"
              >
                <item.icon
                  className="mr-5 size-5 shrink-0 text-[#32D74B]/65"
                  strokeWidth={1.55}
                />
                <span className="min-w-0 flex-1 text-[18px] font-medium leading-none text-foreground">
                  {item.label}
                </span>
                {item.value ? (
                  <span className="mr-3 text-[15px] font-medium leading-none text-secondary">
                    {item.value}
                  </span>
                ) : null}
                <ChevronRight
                  className="size-4 shrink-0 text-secondary/72"
                  strokeWidth={1.8}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              className="flex h-[68px] w-full items-center text-left transition"
            >
              <Trophy
                className="mr-5 size-5 shrink-0 text-[#32D74B]/65"
                strokeWidth={1.55}
              />
              <span className="min-w-0 flex-1 text-[18px] font-medium leading-none text-foreground">
                {copy.leaderboard}
              </span>
              <span
                role="switch"
                aria-checked={profileData.show_on_leaderboard}
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleLeaderboardVisibility();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  void toggleLeaderboardVisibility();
                }}
                className={`mr-3 flex h-7 w-12 shrink-0 cursor-pointer rounded-full border p-0.5 transition ${
                  profileData.show_on_leaderboard
                    ? "border-primary bg-primary/25"
                    : "border-border bg-muted"
                }`}
              >
                <span
                  className={`block size-5 rounded-full bg-foreground transition ${
                    profileData.show_on_leaderboard ? "translate-x-5" : ""
                  }`}
                />
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-secondary/72"
                strokeWidth={1.8}
              />
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-auto h-[58px] border-t border-border text-right text-[17px] font-medium text-secondary transition active:text-foreground"
        >
          {copy.logout}
        </button>
      </motion.div>

      <BottomNavigation language={language} onAdd={openAddSheet} />
      <PersonalDataSheet
        open={personalSheetOpen}
        draft={personalDraft}
        language={language}
        onDraftChange={setPersonalDraft}
        onClose={() => setPersonalSheetOpen(false)}
        onSave={() => void savePersonalData()}
      />
      <SettingSheet
        setting={activeSetting}
        appearance={appearance}
        language={language}
        onAppearanceChange={(nextAppearance) => {
          const nextTheme = nextAppearance === "Light" ? "light" : "dark";
          setStoredTheme(nextTheme);
          void saveProfile({ theme: nextTheme });
        }}
        onLanguageChange={(nextLanguage) => {
          const nextStoredLanguage = nextLanguage === "中文" ? "zh" : "en";
          setStoredLanguage(nextStoredLanguage);
          void saveProfile({ language: nextStoredLanguage });
        }}
        onClose={() => setActiveSetting(null)}
      />
      <LeaderboardSheet
        open={leaderboardOpen}
        language={language}
        data={leaderboardData}
        onClose={() => setLeaderboardOpen(false)}
      />
    </>
  );
}
