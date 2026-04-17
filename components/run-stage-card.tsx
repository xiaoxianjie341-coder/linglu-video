"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { RunStageState } from "../lib/run-stage-mapping";
import { ChevronDownIcon, ChevronRightIcon } from "./product-icons";

interface RunStageCardProps {
  title: string;
  description: string;
  state: RunStageState;
  error?: string | null;
  isFinal?: boolean;
  children?: ReactNode;
}

const stateLabelMap: Record<RunStageState, string> = {
  completed: "已完成",
  active: "思考中...",
  failed: "失败",
  blocked: "已暂停",
  pending: "等待中",
};

const stateClassMap: Record<RunStageState, string> = {
  completed: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  active: "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
  failed: "bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  blocked: "bg-[color:var(--paper-soft)] text-[color:var(--ink-500)]",
  pending: "bg-[color:var(--paper-soft)] text-[color:var(--ink-500)]",
};

export function RunStageCard({
  title,
  description,
  state,
  error,
  isFinal = false,
  children,
}: RunStageCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    state === "active" || state === "failed" || (isFinal && state === "completed")
  );

  useEffect(() => {
    if (state === "active" || state === "failed") {
      setIsExpanded(true);
    } else if (state === "completed") {
      if (isFinal) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    }
  }, [state, isFinal]);

  return (
    <article className="flex gap-3">
      <div className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--accent-strong)]" />
      <div className="min-w-0 max-w-[920px] flex-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 outline-none group text-left"
        >
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${stateClassMap[state]}`}
          >
            {state === "active" ? (
              <div className="flex gap-0.5 items-center justify-center">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.32s]"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.16s]"></span>
              </div>
            ) : null}
            {stateLabelMap[state]}
            {children ? (
              isExpanded ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )
            ) : null}
          </span>
          <span className="text-xs text-[color:var(--ink-500)] group-hover:text-[color:var(--ink-900)] transition-colors">
            {title}
          </span>
        </button>

        {isExpanded ? (
          <div className="mt-3 rounded-[24px] border border-[color:var(--line-soft)] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold text-[color:var(--ink-900)]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
              {description}
            </p>

            {error ? (
              <div className="mt-4 rounded-[20px] border border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--ink-900)]">
                {error}
              </div>
            ) : null}

            {children ? <div className="mt-5">{children}</div> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
