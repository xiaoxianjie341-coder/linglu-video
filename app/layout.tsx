import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Linglu Video",
  description: "Linglu 的本地视频生成工作台。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
