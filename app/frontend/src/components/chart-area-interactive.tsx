import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "../lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

export interface ChartAreaPoint {
  date: string;
  opened: number;
  resolved: number;
}

interface ChartAreaInteractiveProps {
  data?: ChartAreaPoint[];
  title?: string;
  description?: string;
  compact?: boolean;
}

const defaultData: ChartAreaPoint[] = [
  { date: "2026-04-15", opened: 12, resolved: 8 },
  { date: "2026-04-16", opened: 10, resolved: 9 },
  { date: "2026-04-17", opened: 14, resolved: 11 },
  { date: "2026-04-18", opened: 8, resolved: 10 },
  { date: "2026-04-19", opened: 16, resolved: 12 },
  { date: "2026-04-20", opened: 13, resolved: 14 },
  { date: "2026-04-21", opened: 15, resolved: 13 },
  { date: "2026-04-22", opened: 11, resolved: 15 },
  { date: "2026-04-23", opened: 18, resolved: 12 },
  { date: "2026-04-24", opened: 17, resolved: 16 },
  { date: "2026-04-25", opened: 14, resolved: 17 },
  { date: "2026-04-26", opened: 9, resolved: 13 },
  { date: "2026-04-27", opened: 12, resolved: 15 },
  { date: "2026-04-28", opened: 10, resolved: 18 },
  { date: "2026-04-29", opened: 13, resolved: 16 },
];

const ranges = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "14d", label: "14 days", days: 14 },
  { value: "30d", label: "30 days", days: 30 },
];

const chartConfig = {
  opened: {
    label: "Opened",
    color: "rgb(var(--primary-rgb))",
  },
  resolved: {
    label: "Resolved",
    color: "rgb(var(--chart-3-rgb))",
  },
} satisfies ChartConfig;

function formatTick(value: unknown) {
  const rawValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChartAreaInteractive({
  data = defaultData,
  title = "Issue flow",
  description = "Opened and resolved issues in the selected workspace scope.",
  compact = false,
}: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = useState("14d");
  const currentRange = ranges.find((range) => range.value === timeRange) || ranges[1];

  const filteredData = useMemo(() => {
    if (!data.length) return data;
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const referenceDate = new Date(sorted[sorted.length - 1]?.date || Date.now());
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() - currentRange.days + 1);
    return sorted.filter((point) => new Date(point.date) >= startDate);
  }, [currentRange.days, data]);

  return (
    <section
      data-slot="card"
      className={cn(
        "min-w-0 rounded-md border border-border bg-card shadow-none",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-sm font-semibold text-text-primary">{title}</h2>
          <p className="m-0 mt-1 max-w-[46rem] text-[12px] leading-5 text-text-secondary">
            {description}
          </p>
        </div>
        <div data-slot="toggle-group" className="hidden rounded-md border border-border bg-muted p-0.5 sm:inline-flex">
          {ranges.map((range) => (
            <button
              key={range.value}
              type="button"
              className={cn(
                "h-7 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors",
                timeRange === range.value && "bg-background text-foreground shadow-sm",
              )}
              aria-pressed={timeRange === range.value}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
        <label className="sm:hidden">
          <span className="sr-only">Select chart range</span>
          <select
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground"
          >
            {ranges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ChartContainer
        config={chartConfig}
        className={cn("mt-3 w-full", compact ? "h-32" : "h-48")}
      >
          <AreaChart data={filteredData} margin={{ left: -16, right: 4, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="openedIssues" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-opened)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-opened)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="resolvedIssues" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-resolved)" stopOpacity={0.24} />
                <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatTick}
            />
            <YAxis
              width={28}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(value) => formatTick(value)} />}
              labelFormatter={formatTick}
            />
            <Area
              dataKey="opened"
              name="Opened"
              type="monotone"
              fill="url(#openedIssues)"
              stroke="var(--color-opened)"
              strokeWidth={1.6}
            />
            <Area
              dataKey="resolved"
              name="Resolved"
              type="monotone"
              fill="url(#resolvedIssues)"
              stroke="var(--color-resolved)"
              strokeWidth={1.6}
            />
          </AreaChart>
      </ChartContainer>
    </section>
  );
}
