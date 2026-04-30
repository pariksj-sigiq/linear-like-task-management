import type { ReactNode } from "react";
import { CheckCircle2, CircleDot, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "../lib/utils";

type Trend = "up" | "down" | "neutral";

export interface SectionCardItem {
  label: string;
  value: string | number;
  description?: string;
  detail?: string;
  badge?: string;
  trend?: Trend;
  icon?: ReactNode;
}

interface SectionCardsProps {
  cards?: SectionCardItem[];
  className?: string;
}

const defaultCards: SectionCardItem[] = [
  {
    label: "Assigned",
    value: 18,
    description: "Issues in your visible queue",
    detail: "Across active teams",
    badge: "Live",
    trend: "neutral",
  },
  {
    label: "In progress",
    value: 7,
    description: "Started work needing follow-up",
    detail: "Includes review and QA",
    badge: "+3",
    trend: "up",
  },
  {
    label: "Backlog",
    value: 24,
    description: "Queued work without movement",
    detail: "Sorted by priority",
    badge: "-2",
    trend: "down",
  },
  {
    label: "Done",
    value: 12,
    description: "Closed in the selected scope",
    detail: "Recent cycle activity",
    badge: "OK",
    trend: "neutral",
  },
];

function cardIcon(card: SectionCardItem) {
  if (card.icon) return card.icon;
  if (card.trend === "up") return <TrendingUpIcon className="size-3.5" aria-hidden="true" />;
  if (card.trend === "down") return <TrendingDownIcon className="size-3.5" aria-hidden="true" />;
  return <CircleDot className="size-3.5" aria-hidden="true" />;
}

function trendLabel(trend: Trend | undefined) {
  if (trend === "up") return "Increasing";
  if (trend === "down") return "Decreasing";
  return "Stable";
}

export function SectionCards({ cards = defaultCards, className }: SectionCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {cards.map((card) => (
        <Card
          key={card.label}
          className="min-w-0 rounded-md border-border bg-card py-2 text-sm shadow-none"
        >
          <CardHeader className="gap-0 px-3">
            <CardDescription className="truncate text-[11px] font-medium uppercase text-muted-foreground">
              {card.label}
            </CardDescription>
            <CardTitle className="mt-1 flex items-baseline gap-2 text-xl font-semibold leading-none text-foreground tabular-nums">
              {card.value}
              {card.badge ? (
                <Badge variant="outline" className="h-5 gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground" title={trendLabel(card.trend)}>
                  {cardIcon(card)}
                  {card.badge}
                </Badge>
              ) : null}
            </CardTitle>
            {!card.badge ? (
              <CardAction className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              </CardAction>
            ) : null}
          </CardHeader>
          {(card.description || card.detail) && (
            <CardFooter className="mt-2 min-w-0 flex-col items-start gap-0.5 border-t border-border px-3 pt-2">
              {card.description && (
                <div className="truncate text-[12px] font-medium text-foreground">
                  {card.description}
                </div>
              )}
              {card.detail && (
                <div className="truncate text-[11px] text-muted-foreground">
                  {card.detail}
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
