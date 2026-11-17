"use client";

import React, { createContext, useContext, useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
  id: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <TabsContext.Provider value={{ value, onValueChange, id }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative flex items-center border-b border-white/[0.09] gap-1 overflow-x-auto no-scrollbar",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabTrigger({
  value,
  children,
  badge,
  icon,
  className,
}: {
  value: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used inside Tabs");

  const isSelected = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors select-none cursor-pointer",
        isSelected
          ? "text-[#F4F7FB] font-semibold"
          : "text-[#718096] hover:text-[#A3AFBF] hover:bg-white/[0.02] rounded-t-lg",
        className
      )}
    >
      {icon}
      <span>{children}</span>
      {badge}

      {isSelected && (
        <motion.div
          layoutId={`tab-underline-${ctx.id}`}
          className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#3B82F6] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </button>
  );
}

export function TabContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;

  return (
    <div role="tabpanel" className={cn("pt-4 focus:outline-none", className)}>
      {children}
    </div>
  );
}
