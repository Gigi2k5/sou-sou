"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2 text-sm",
        "text-left transition-colors outline-none",
        "data-[placeholder]:text-muted-foreground",
        "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 text-sousou-neutral" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6} className="outline-none z-50">
        <SelectPrimitive.Popup
          className={cn(
            "min-w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] overflow-auto",
            "rounded-2xl border border-border/60 bg-card shadow-xl shadow-sousou-secondary/10",
            "p-1.5 outline-none",
            "transition-all duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:-translate-y-1",
            "data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2 text-sm",
        "outline-none transition-colors",
        "data-[highlighted]:bg-sousou-primary-50 data-[highlighted]:text-sousou-primary-700",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="ml-auto">
        <Check className="size-4 text-sousou-primary" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="flex-1">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

const SelectValue = SelectPrimitive.Value;

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
