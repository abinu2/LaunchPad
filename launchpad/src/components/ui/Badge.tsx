import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-white/80 border border-white/10",
  success: "bg-green-500/15 text-green-400 border border-green-500/20",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  danger: "bg-red-500/15 text-red-400 border border-red-500/20",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  neutral: "bg-white/5 text-white/40 border border-white/8",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
