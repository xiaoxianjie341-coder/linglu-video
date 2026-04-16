import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

const navItems = [
  { href: "/", label: "工作台" },
  { href: "/history", label: "历史记录" },
  { href: "/settings", label: "设置" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
          <header className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                ClawVid
              </p>
              <h1 className="text-lg font-semibold text-zinc-100">
                AI 视频工作台
              </h1>
            </div>

            <nav className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 p-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
