"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Clock3,
  HomeIcon,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCachedJson } from "@/lib/client/data-cache";
import { useTodayStore } from "@/store/useTodayStore";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const accent = "#32D74B";
const secondaryAccent = "#FF9F0A";

type MetricKey = "weight" | "calories" | "burn";

type StatPoint = {
  label: string;
  value: number;
};

type MetricConfig = {
  label: string;
  unit: string;
  current: number | null;
  changeUnit: string;
  change: number | null;
  trend: "down" | "up";
  decimals: number;
  data: StatPoint[];
};

type StatsResponse = {
  data: Record<MetricKey, StatPoint[]>;
};

const metrics: MetricKey[] = ["weight", "calories", "burn"];
const subscribeToClient = () => () => {};

const metricConfig: Record<MetricKey, MetricConfig> = {
  weight: {
    label: "Weight",
    unit: "kg",
    current: null,
    changeUnit: "this month",
    change: null,
    trend: "down",
    decimals: 1,
    data: [],
  },
  calories: {
    label: "Calories",
    unit: "kcal",
    current: null,
    changeUnit: "this month",
    change: null,
    trend: "down",
    decimals: 0,
    data: [],
  },
  burn: {
    label: "Burn",
    unit: "kcal",
    current: null,
    changeUnit: "this month",
    change: null,
    trend: "up",
    decimals: 0,
    data: [],
  },
};

function formatValue(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function StatsTooltip({
  active,
  payload,
  decimals,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: StatPoint }>;
  decimals: number;
  unit: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-[14px] border border-border bg-card/92 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <p className="text-[13px] font-medium leading-none text-foreground/92">
        {point.label}
      </p>
      <p className="mt-2 text-[16px] font-semibold leading-none text-foreground">
        {formatValue(point.value, decimals)} {unit}
      </p>
    </div>
  );
}

function BottomNavigation({ onAdd }: { onAdd: () => void }) {
  const language = useTodayStore((state) => state.language);
  const copy =
    language === "zh"
      ? { home: "首页", stats: "统计", history: "历史", profile: "个人" }
      : { home: "Home", stats: "Stats", history: "History", profile: "Profile" };
  const items = [
    { label: copy.home, href: "/", icon: HomeIcon, active: false },
    { label: copy.stats, href: "/stats", icon: BarChart3, active: true },
    { label: copy.history, href: "/history", icon: Clock3, active: false },
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

export default function StatsPage() {
  const openAddSheet = useTodayStore((state) => state.openAddSheet);
  const language = useTodayStore((state) => state.language);
  const [metric, setMetric] = useState<MetricKey>("weight");
  const { data: statsResponse } = useCachedJson<StatsResponse>({
    key: "stats",
    url: "/api/stats",
    fallbackData: {
      data: {
        weight: [],
        calories: [],
        burn: [],
      },
    },
  });
  const statsData = statsResponse.data;
  const chartReady = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  const config = useMemo<MetricConfig>(() => {
    const data = statsData[metric] ?? [];
    const first = data[0]?.value;
    const last = data[data.length - 1]?.value;
    const change =
      typeof first === "number" && typeof last === "number" && data.length > 1
        ? Math.abs(last - first)
        : null;

    return {
      ...metricConfig[metric],
      current: typeof last === "number" ? last : null,
      change,
      data,
    };
  }, [metric, statsData]);
  const data = config.data;
  const summary = useMemo(() => {
    if (!data.length) {
      return { lowest: null, average: null, change: null };
    }

    const values = data.map((point) => point.value);
    const lowest = Math.min(...values);
    const average =
      values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
    const change = data[data.length - 1].value - data[0].value;

    return { lowest, average, change };
  }, [data]);
  const chartColor = metric === "calories" ? secondaryAccent : accent;
  const changePrefix = config.trend === "down" ? "↓" : "↑";
  const hasData = data.length > 0 && config.current !== null;

  return (
    <>
      <motion.div
        className="flex flex-1 flex-col overflow-hidden pb-[96px] pt-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
      >
        <header>
          <h1 className="text-[52px] font-semibold leading-none tracking-normal text-foreground">
            {language === "zh" ? "统计" : "Stats"}
          </h1>
        </header>

        <section className="mt-8" aria-label="Data type">
          <div className="grid grid-cols-3 border-b border-border">
            {metrics.map((key) => {
              const selected = key === metric;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMetric(key)}
                  className={`relative h-11 text-center text-[19px] font-medium transition ${
                    selected ? "text-foreground" : "text-secondary"
                  }`}
                >
                  {metricConfig[key].label}
                  {selected ? (
                    <motion.span
                      layoutId="metric-underline"
                      className="absolute bottom-[-1px] left-0 right-0 mx-auto h-px w-[72%]"
                      style={{ backgroundColor: chartColor }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.section
            key={`${metric}-value`}
            className="mt-8"
            aria-label="Current value"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-end gap-3">
              <p className="text-[78px] font-light leading-[0.86] tracking-normal text-foreground">
                {config.current === null ? "--" : formatValue(config.current, config.decimals)}
              </p>
              <p className="pb-1 text-[27px] font-medium leading-none text-secondary">
                {config.unit}
              </p>
            </div>
            <p
              className="mt-5 flex items-center gap-2 text-[20px] font-medium leading-none text-[#32D74B]/82"
            >
              {config.change === null ? (
                <span className="text-secondary">No data yet</span>
              ) : (
                <>
                  <span className="text-[25px] leading-none">{changePrefix}</span>
                  <span>
                    {formatValue(config.change, config.decimals)} {config.changeUnit}
                  </span>
                </>
              )}
            </p>
          </motion.section>
        </AnimatePresence>

        <section
          className="mt-7 h-[clamp(180px,28dvh,238px)]"
          aria-label={`${config.label} chart`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={metric}
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {chartReady && hasData ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart
                    data={data}
                    margin={{ top: 24, right: 14, bottom: 20, left: 8 }}
                  >
                    <XAxis dataKey="label" hide />
                    <YAxis
                      hide
                      domain={["dataMin - 0.4", "dataMax + 0.4"]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "var(--border)",
                        strokeWidth: 1,
                      }}
                      content={<StatsTooltip decimals={config.decimals} unit={config.unit} />}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartColor}
                      strokeWidth={1.8}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "var(--foreground)",
                        stroke: chartColor,
                        strokeWidth: 0,
                      }}
                      isAnimationActive
                      animationBegin={80}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center border-y border-border/70 text-[17px] font-medium text-secondary">
                  No data yet
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <section
          className="mt-7 grid grid-cols-3 gap-4"
          aria-label="Summary stats"
        >
          <div className="min-w-0">
            <p className="text-[17px] font-medium leading-none text-secondary">Lowest</p>
            <p className="mt-4 flex items-baseline whitespace-nowrap text-[30px] font-light leading-none text-foreground">
              {summary.lowest === null ? "--" : formatValue(summary.lowest, config.decimals)}
              <span className="ml-1.5 text-[15px] font-medium text-secondary">
                {config.unit}
              </span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[17px] font-medium leading-none text-secondary">Average</p>
            <p className="mt-4 flex items-baseline whitespace-nowrap text-[30px] font-light leading-none text-foreground">
              {summary.average === null ? "--" : formatValue(summary.average, config.decimals)}
              <span className="ml-1.5 text-[15px] font-medium text-secondary">
                {config.unit}
              </span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[17px] font-medium leading-none text-secondary">Change</p>
            <p
              className="mt-4 flex items-baseline whitespace-nowrap text-[30px] font-light leading-none text-[#32D74B]/82"
            >
              {summary.change === null ? (
                "--"
              ) : (
                <>
                  <span className="mr-1 text-[26px] leading-none">
                    {summary.change < 0 ? "↓" : "↑"}
                  </span>
                  {formatValue(Math.abs(summary.change), config.decimals)}
                </>
              )}
              <span className="ml-1.5 text-[15px] font-medium text-secondary">
                {config.unit}
              </span>
            </p>
          </div>
        </section>
      </motion.div>

      <BottomNavigation onAdd={openAddSheet} />
    </>
  );
}
