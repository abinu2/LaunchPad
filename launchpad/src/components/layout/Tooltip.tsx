"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "right" | "top";
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({ children, content, side = "right", delay = 300, disabled = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const show = () => {
    if (disabled || !content) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  const positionClasses = side === "right"
    ? "left-full top-1/2 ml-3 -translate-y-1/2"
    : "bottom-full left-1/2 mb-3 -translate-x-1/2";

  return (
    <div
      className="relative flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && !disabled && content && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, x: side === "right" ? -8 : 0, y: side === "right" ? 0 : 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: side === "right" ? -8 : 0, y: side === "right" ? 0 : 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={`sidebar-tooltip pointer-events-none absolute z-50 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-normal tracking-wide text-[--color-text-primary] ${positionClasses}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
