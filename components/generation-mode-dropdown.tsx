"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_IMAGE_COUNT } from "../lib/image-generation";
import type { GenerationMode } from "../lib/schemas";
import {
  CheckIcon,
  ChevronDownIcon,
  ImageIcon,
  VideoIcon,
} from "./product-icons";

const GENERATION_MODE_OPTIONS = [
  {
    value: "video",
    label: "视频生成",
    description: "从一句话扩到分镜与视频",
    icon: VideoIcon,
  },
  {
    value: "image",
    label: "图片生成",
    description: `先出 ${DEFAULT_IMAGE_COUNT} 张可挑选的图片素材`,
    icon: ImageIcon,
  },
] as const satisfies Array<{
  value: GenerationMode;
  label: string;
  description: string;
  icon: typeof VideoIcon;
}>;

export function getGenerationModeLabel(mode: GenerationMode): string {
  return (
    GENERATION_MODE_OPTIONS.find((option) => option.value === mode)?.label ??
    "视频生成"
  );
}

interface GenerationModeDropdownProps {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  variant?: "hero" | "panel";
  ariaLabel: string;
}

export function GenerationModeDropdown({
  value,
  onChange,
  variant = "panel",
  ariaLabel,
}: GenerationModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOption = useMemo(
    () =>
      GENERATION_MODE_OPTIONS.find((option) => option.value === value) ??
      GENERATION_MODE_OPTIONS[0],
    [value],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const CurrentIcon = currentOption.icon;
  const isHero = variant === "hero";

  return (
    <div
      ref={containerRef}
      className={`relative ${isHero ? "inline-flex" : "inline-block"}`}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={
          isHero
            ? `inline-flex items-center text-[color:var(--accent-strong)] transition hover:opacity-80 ${
                isOpen ? "opacity-0" : "opacity-100"
              }`
            : `inline-flex items-center gap-2 rounded-[14px] border px-3.5 py-2.5 text-sm transition ${
                isOpen
                  ? "border-[color:var(--accent-strong)] bg-white text-[color:var(--ink-900)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  : "border-[color:var(--line-soft)] bg-[linear-gradient(180deg,#f5f7fb,#eef3f8)] text-[color:var(--ink-900)]"
              }`
        }
      >
        {isHero ? null : (
          <CurrentIcon className="h-4 w-4 text-[color:var(--accent-strong)]" />
        )}
        <span className={isHero ? "font-semibold" : "font-medium"}>
          {currentOption.label}
        </span>
        <ChevronDownIcon
          className={`transition ${
            isHero
              ? `ml-1.5 h-6 w-6 text-[color:var(--accent-strong)] ${
                  isOpen ? "rotate-180" : ""
                }`
              : `h-4 w-4 text-[color:var(--ink-500)] ${
                  isOpen ? "rotate-180" : ""
                }`
          }`}
        />
      </button>

      {isOpen ? (
        isHero ? (
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <div
              role="menu"
              className="flex w-max min-w-[280px] flex-col items-center rounded-[32px] bg-white/95 px-6 py-4 shadow-[0_32px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                maskComposite: "intersect",
              }}
            >
              <div
                className="flex flex-col items-center gap-5 transition-transform duration-300 ease-out py-8"
                style={{
                  transform:
                    value === GENERATION_MODE_OPTIONS[0].value
                      ? "translateY(40px)"
                      : "translateY(-40px)",
                }}
              >
                {GENERATION_MODE_OPTIONS.map((option) => {
                  const active = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      aria-label={`切换到${option.label}`}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`text-center text-4xl sm:text-5xl font-semibold leading-[60px] tracking-tight transition-colors duration-300 ${
                        active
                          ? "text-[color:var(--accent-strong)] opacity-100"
                          : "text-[color:var(--ink-400)] opacity-100 hover:text-[color:var(--ink-600)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+12px)] z-20 w-[248px] rounded-[24px] border border-[color:var(--line-soft)] bg-white/96 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <p className="px-2 pb-3 text-xs font-medium tracking-[0.08em] text-[color:var(--ink-500)]">
              创作类型
            </p>
            {GENERATION_MODE_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  aria-label={`切换到${option.label}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left transition ${
                    active
                      ? "bg-[color:var(--paper-soft)] text-[color:var(--ink-900)]"
                      : "text-[color:var(--ink-700)] hover:bg-[color:var(--paper-soft)]"
                  }`}
                >
                  <OptionIcon className="h-4 w-4 shrink-0 text-[color:var(--accent-strong)]" />
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {option.label}
                  </span>
                  {active ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-[color:var(--ink-900)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
