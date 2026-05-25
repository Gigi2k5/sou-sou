"use client";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "@/lib/format";

export type RangeKey = "week" | "month" | "3months";

export interface DateRange {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
}

export function buildRange(key: RangeKey): DateRange {
  const now = new Date();
  if (key === "week") {
    return {
      key,
      label: "cette semaine",
      from: startOfWeek(now),
      to: endOfDay(now),
    };
  }
  if (key === "3months") {
    return {
      key,
      label: "3 derniers mois",
      from: startOfMonth(addMonths(now, -2)),
      to: endOfMonth(now),
    };
  }
  return {
    key: "month",
    label: "ce mois",
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

export function RangeTabs({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(String(v) as RangeKey)}
    >
      <TabsList>
        <TabsTab value="week">Semaine</TabsTab>
        <TabsTab value="month">Mois</TabsTab>
        <TabsTab value="3months">3 mois</TabsTab>
      </TabsList>
    </Tabs>
  );
}
