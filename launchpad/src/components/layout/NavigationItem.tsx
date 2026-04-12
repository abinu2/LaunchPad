"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Tooltip } from "./Tooltip";

export interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  section: "main" | "footer";
  disabled?: boolean;
  badge?: { text: string; color: "danger" | "warning" | "success" | "primary" | "neutral" } | null;
  href?: string;
}

const badgeStyles: Record<string, string> = {
  danger:  "border-red-500/20 bg-red-500/[0.12] text-red-400",
  warning: "border-amber-500/20 bg-amber-500/[0.12] text-amber-400",
  success: "border-emerald-500/20 bg-emerald-500/[0.12] text-emerald-400",
  primary: "border-[--color-primary]/20 bg-[--color-primary]/[0.12] text-[--color-primary]",
  neutral: "border-white/10 bg-white/[0.045] text-[--color-text-secondary]",
};

interface Props {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

export function NavigationItem({ item, isActive, isExpanded, onClick, buttonRef }: Props) {
  const Icon = item.icon;
  const badgeClass = badgeStyles[item.badge?.color ?? "neutral"];

  const button = (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={() => !item.disabled && onClick?.()}
      disabled={item.disabled}
      aria-label={item.label}
      aria-disabled={item.disabled || undefined}
      aria-current={isActive ? "page" : undefined}
      whileHover={item.disabled ? undefined : { x: 4 }}
      whileTap={item.disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={[
        "btn-ripple focus-ring-control group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-l-[3px] px-3 py-3 text-left transition-all duration-200",
        isExpanded ? "justify-start" : "justify-center",
        isActive
          ? "border-[--color-primary] bg-white/[0.07] text-[--color-text-primary] shadow-[0_10px_24px_rgba(0,0,0,0.18),0_0_18px_rgba(0,207,49,0.1)]"
          : "border-transparent bg-transparent text-[--color-text-secondary] hover:border-[--color-primary]/60 hover:bg-white/[0.045] hover:text-[--color-text-primary]",
        item.disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <motion.div
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ duration: 0.2 }}
        className="relative shrink-0"
      >
        <Icon className="h-5 w-5" />
        {!isExpanded && item.badge && (
          <>
            <span className="animate-ping-slow absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[--color-primary]/45" />
            <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border ${badgeClass}`} />
          </>
        )}
      </motion.div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="label"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex min-w-0 flex-1 items-center justify-between gap-3"
          >
            <p className={`truncate text-sm tracking-[-0.01em] ${isActive ? "font-medium" : "font-normal"}`}>
              {item.shortLabel ?? item.label}
            </p>
            {item.badge && (
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-normal uppercase tracking-[0.04em] ${badgeClass}`}>
                {item.badge.text}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <Tooltip content={item.label} side="right" delay={300} disabled={isExpanded}>
      {button}
    </Tooltip>
  );
}
