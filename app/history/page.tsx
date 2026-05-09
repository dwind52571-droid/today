"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HomeIcon,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCachedJson } from "@/lib/client/data-cache";
import { useTodayStore } from "@/store/useTodayStore";

type DailyRecord = {
  date: string;
  weightKg: number | null;
  caloriesEaten: number;
  caloriesBurned: number;
  estimatedDailyBurn: number | null;
  netCalories: number | null;
};

type HistoryResponse = {
  records: DailyRecord[];
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    ...(style === "long" ? { year: "numeric" } : {}),
  }).format(parseDate(date));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function netCalories(record: DailyRecord) {
  return record.netCalories;
}

function formatNetCalories(record: DailyRecord) {
  const net = netCalories(record);
  if (net === null) {
    return "--";
  }

  const sign = net > 0 ? "+" : net < 0 ? "-" : "";

  return `${sign}${Math.abs(net).toLocaleString("en-US")} kcal`;
}

function netCaloriesClass(record: DailyRecord) {
  const net = netCalories(record);

  if (net === null) {
    return "text-secondary";
  }

  return net <= 0 ? "text-primary" : "text-[#FF9F0A]";
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      date: day,
      key: dateKey(day),
      isCurrentMonth: day.getMonth() === month,
    };
  });
}

function BottomNavigation() {
  const openAddSheet = useTodayStore((state) => state.openAddSheet);
  const language = useTodayStore((state) => state.language);
  const copy =
    language === "zh"
      ? { home: "首页", stats: "统计", history: "历史", profile: "个人" }
      : { home: "Home", stats: "Stats", history: "History", profile: "Profile" };
  const items = [
    { label: copy.home, href: "/", icon: HomeIcon, active: false },
    { label: copy.stats, href: "/stats", icon: BarChart3, active: false },
    { label: copy.history, href: "/history", icon: Clock3, active: true },
    { label: copy.profile, href: "/profile", icon: UserRound, active: false },
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
          onClick={openAddSheet}
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

function CalendarModal({
  isOpen,
  recordsByDate,
  selectedRecord,
  onSelectRecord,
  onClose,
}: {
  isOpen: boolean;
  recordsByDate: Map<string, DailyRecord>;
  selectedRecord: DailyRecord | null;
  onSelectRecord: (record: DailyRecord) => void;
  onClose: () => void;
}) {
  const [monthDate, setMonthDate] = useState(() => {
    const selectedDate = selectedRecord ? parseDate(selectedRecord.date) : new Date();
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });
  const recordDates = useMemo(
    () => Array.from(recordsByDate.values()).map((record) => parseDate(record.date)),
    [recordsByDate],
  );
  const firstRecordMonth = useMemo(() => {
    if (!recordDates.length) {
      return new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    }

    const firstDate = new Date(Math.min(...recordDates.map((date) => date.getTime())));
    return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  }, [monthDate, recordDates]);
  const lastRecordMonth = useMemo(() => {
    if (!recordDates.length) {
      return new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    }

    const lastDate = new Date(Math.max(...recordDates.map((date) => date.getTime())));
    return new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  }, [monthDate, recordDates]);
  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const canGoPrevious = monthDate.getTime() > firstRecordMonth.getTime();
  const canGoNext = monthDate.getTime() < lastRecordMonth.getTime();
  const goToMonth = (amount: number) => {
    const nextMonth = addMonths(monthDate, amount);
    const latestRecordInMonth = Array.from(recordsByDate.values())
      .filter((record) => {
        const date = parseDate(record.date);
        return (
          date.getFullYear() === nextMonth.getFullYear() &&
          date.getMonth() === nextMonth.getMonth()
        );
      })
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];

    setMonthDate(nextMonth);
    if (latestRecordInMonth) {
      onSelectRecord(latestRecordInMonth);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end bg-muted/55 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
        >
          <motion.section
            className="relative max-h-[86dvh] w-full overflow-y-auto rounded-t-[30px] border border-border bg-card/96 px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_70px_rgba(0,0,0,0.48)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            initial={{ y: 34, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 34, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            aria-label="History calendar"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto h-1 w-11 rounded-full bg-muted-foreground/25" />

            <button
              type="button"
              aria-label="Close calendar"
              onClick={onClose}
              className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full bg-muted text-foreground/85 transition active:scale-95"
            >
              <X className="size-5" strokeWidth={1.8} />
            </button>

            <div className="mt-8 grid grid-cols-[44px_1fr_44px] items-center">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!canGoPrevious}
                onClick={() => goToMonth(-1)}
                className="flex size-10 items-center justify-center rounded-full text-foreground/78 transition active:scale-95 disabled:text-foreground/18"
              >
                <ChevronLeft className="size-6" strokeWidth={1.8} />
              </button>
              <h2 className="text-center text-[34px] font-semibold leading-none text-foreground">
                {formatMonth(monthDate)}
              </h2>
              <button
                type="button"
                aria-label="Next month"
                disabled={!canGoNext}
                onClick={() => goToMonth(1)}
                className="flex size-10 items-center justify-center rounded-full text-foreground/78 transition active:scale-95 disabled:text-foreground/18"
              >
                <ChevronRight className="size-6" strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-9 grid grid-cols-7 text-center">
              {weekdays.map((weekday) => (
                <p key={weekday} className="text-[14px] font-medium text-secondary">
                  {weekday}
                </p>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-7 gap-y-4 text-center">
              {days.map((day) => {
                const record = recordsByDate.get(day.key);
                const selected = selectedRecord?.date === day.key;
                const isAvailable = Boolean(record);

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={!record}
                    onClick={() => {
                      if (record) {
                        onSelectRecord(record);
                      }
                    }}
                    aria-label={record ? formatDate(record.date, "long") : undefined}
                    className="relative mx-auto flex size-10 items-center justify-center rounded-full text-[21px] font-medium transition disabled:pointer-events-none"
                    style={{
                      color: isAvailable
                        ? "var(--foreground)"
                        : day.isCurrentMonth
                          ? "rgba(142,142,147,0.48)"
                          : "rgba(142,142,147,0.28)",
                      backgroundColor: selected ? "rgba(50,215,75,0.82)" : "transparent",
                    }}
                  >
                    {day.date.getDate()}
                    {isAvailable && !selected ? (
                      <span className="absolute bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#32D74B]" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-border pt-7">
              {selectedRecord ? (
                <>
                  <p className="text-[30px] font-semibold leading-none text-foreground">
                    {formatDate(selectedRecord.date)}
                  </p>
                  <div className="mt-6 flex items-end justify-between gap-6">
                    <p className="text-[36px] font-light leading-none text-foreground">
                      {selectedRecord.weightKg === null
                        ? "--"
                        : selectedRecord.weightKg.toFixed(1)}
                      <span className="ml-1.5 text-[22px] font-medium text-foreground/82">kg</span>
                    </p>
                    <p
                      className={`pb-1 text-right text-[21px] font-medium leading-none ${netCaloriesClass(selectedRecord)}`}
                    >
                      {formatNetCalories(selectedRecord)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[21px] font-medium text-secondary">No data yet</p>
              )}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function HistoryPage() {
  const language = useTodayStore((state) => state.language);
  const { data: historyResponse } = useCachedJson<HistoryResponse>({
    key: "history",
    url: "/api/history",
    fallbackData: { records: [] },
  });
  const records = useMemo(
    () =>
      [...historyResponse.records].sort(
        (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime(),
      ),
    [historyResponse.records],
  );
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null);
  const activeRecord = selectedRecord
    ? records.find((record) => record.date === selectedRecord.date) ?? records[0] ?? null
    : records[0] ?? null;

  const timelineRecords = records.slice(0, 30);
  const recordsByDate = useMemo(
    () => new Map(records.map((record) => [record.date, record])),
    [records],
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      <motion.div
        className="flex flex-1 flex-col overflow-hidden pb-[96px] pt-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[52px] font-semibold leading-none tracking-normal text-foreground">
              {language === "zh" ? "历史" : "History"}
            </h1>
          </div>

          <button
            type="button"
            aria-label="Open calendar"
            onClick={() => {
              if (records.length) {
                setCalendarOpen(true);
              }
            }}
            disabled={!records.length}
            className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-muted active:scale-95 disabled:opacity-35"
          >
            <CalendarDays className="size-7" strokeWidth={1.8} />
          </button>
        </header>

        <section
          className="mt-9 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Last 30 days"
        >
          <div className="relative pl-9">
            <div className="absolute left-[10px] top-3 h-[calc(100%-1.5rem)] w-px bg-border" />

            {timelineRecords.length ? (
              timelineRecords.map((record, index) => (
                <motion.article
                  key={record.date}
                  className="relative border-b border-border py-5 first:pt-0 last:border-b-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index * 0.018, 0.28) }}
                >
                  <span className="absolute -left-[33px] top-7 size-3 rounded-full border-2 border-[#8E8E93] bg-background" />
                  <p className="text-[22px] font-medium leading-none text-foreground">
                    {formatDate(record.date)}
                  </p>
                  <div className="mt-4 flex items-baseline justify-between gap-6">
                    <p className="text-[30px] font-light leading-none text-foreground">
                      {record.weightKg === null ? "--" : record.weightKg.toFixed(1)}
                      <span className="ml-1.5 text-[20px] font-medium text-foreground/82">kg</span>
                    </p>
                    <p
                      className={`shrink-0 text-right text-[21px] font-medium leading-none ${netCaloriesClass(record)}`}
                    >
                      {formatNetCalories(record)}
                    </p>
                  </div>
                </motion.article>
              ))
            ) : (
              <motion.div
                className="relative py-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
              >
                <span className="absolute -left-[33px] top-7 size-3 rounded-full border-2 border-[#8E8E93] bg-background" />
                <p className="text-[22px] font-medium leading-none text-foreground">
                  No data yet
                </p>
                <p className="mt-4 text-[19px] font-medium leading-tight text-secondary">
                  Your history will appear here.
                </p>
              </motion.div>
            )}
          </div>
        </section>
      </motion.div>

      <BottomNavigation />
      {records.length ? (
        <CalendarModal
	          isOpen={calendarOpen}
	          recordsByDate={recordsByDate}
	          selectedRecord={activeRecord}
          onSelectRecord={setSelectedRecord}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}
    </>
  );
}
