import Link from "next/link";
import type { ReactNode } from "react";
import {
  HistoryIcon,
  HomeIcon,
  SettingsIcon,
  SparkLogoIcon,
} from "./product-icons";

const navItems = [
  { id: "create", href: "/", label: "灵感", Icon: HomeIcon },
  { id: "history", href: "/history", label: "任务", Icon: HistoryIcon },
  { id: "settings", href: "/settings", label: "设置", Icon: SettingsIcon },
] as const;

export type AppShellNavId = (typeof navItems)[number]["id"];

interface AppShellProps {
  activeNav: AppShellNavId;
  children: ReactNode;
}

export function AppShell({ activeNav, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[84px] border-r border-[color:var(--line-soft)] bg-white/76 backdrop-blur lg:flex lg:flex-col lg:items-center">
        <Link
          href="/"
          className="mt-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--paper-soft)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          aria-label="Linglu Video 首页"
        >
          <SparkLogoIcon className="h-6 w-6" />
        </Link>

        <nav className="mt-12 flex flex-1 flex-col items-center gap-5">
          {navItems.map((item) => {
            const isActive = item.id === activeNav;
            const Icon = item.Icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex w-[58px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs transition ${
                  isActive
                    ? "bg-[color:var(--paper-soft)] text-[color:var(--ink-900)] shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                    : "text-[color:var(--ink-500)] hover:bg-white/70 hover:text-[color:var(--ink-900)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      <div className="border-b border-[color:var(--line-soft)] bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <SparkLogoIcon className="h-8 w-8" />
            <span className="text-sm font-semibold text-[color:var(--ink-900)]">
              Linglu Video
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm ${
                  item.id === activeNav
                    ? "bg-[color:var(--paper-soft)] text-[color:var(--ink-900)]"
                    : "text-[color:var(--ink-500)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:pl-[84px]">
        <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
