"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative inline-flex items-center gap-1 rounded-2xl bg-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5",
        "px-4 py-1.5 rounded-xl text-sm font-medium",
        "text-sousou-neutral",
        "data-[selected]:text-sousou-secondary data-[selected]:bg-card data-[selected]:shadow-sm",
        "outline-none transition-colors",
        "focus-visible:ring-3 focus-visible:ring-primary/30",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      className={cn("outline-none mt-4", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTab, TabsPanel };
