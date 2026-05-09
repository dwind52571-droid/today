import { create } from "zustand";

export type Language = "en" | "zh";
export type Theme = "dark" | "light";

type TodayState = {
  hasHydrated: boolean;
  addSheetOpen: boolean;
  dataVersion: number;
  language: Language;
  theme: Theme;
  setHasHydrated: (value: boolean) => void;
  openAddSheet: () => void;
  closeAddSheet: () => void;
  bumpDataVersion: () => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
};

export const useTodayStore = create<TodayState>()(
  (set) => ({
    hasHydrated: true,
    addSheetOpen: false,
    dataVersion: 0,
    language: "en",
    theme: "dark",
    setHasHydrated: (value) => set({ hasHydrated: value }),
    openAddSheet: () => set({ addSheetOpen: true }),
    closeAddSheet: () => set({ addSheetOpen: false }),
    bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
    setLanguage: (language) => set({ language }),
    setTheme: (theme) => set({ theme }),
  }),
);
