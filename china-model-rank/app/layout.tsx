import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { absoluteUrl, siteName } from "@/lib/site";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: "中国大模型排行榜 2026 | 通义、DeepSeek、Kimi、豆包等模型评分对比",
    template: "%s | 中国大模型排行榜"
  },
  description: "面向普通用户的中国大模型排行榜，查看通义、DeepSeek、Kimi、豆包、文心、智谱等模型的排名、评分、公司、适用场景和用户评价来源。",
  keywords: [
    "中国大模型排行榜",
    "国产大模型排名",
    "DeepSeek 排名",
    "通义千问评分",
    "Kimi 评价",
    "豆包大模型",
    "文心一言",
    "AI 模型对比"
  ],
  alternates: {
    canonical: absoluteUrl("/")
  },
  openGraph: {
    title: "中国大模型排行榜 2026",
    description: "查看中国厂商大模型排名、评分、公司和公开用户评价来源。",
    url: absoluteUrl("/"),
    siteName,
    locale: "zh_CN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "中国大模型排行榜 2026",
    description: "查看中国厂商大模型排名、评分、公司和公开用户评价来源。"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  }
};

const navItems = [
  { href: "/", label: "榜单" },
  { href: "/compare", label: "对比" },
  { href: "/methodology", label: "评分方法" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <GoogleAnalytics />
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-coal text-lg font-black text-paper shadow-ledger transition group-hover:rotate-[-8deg]">
              模
            </span>
            <span>
              <span className="block font-display text-xl font-black tracking-tight">中国大模型榜单</span>
              <span className="ink-label">公开评分与口碑来源</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-ink/10 bg-bone/70 p-1 shadow-insetLine backdrop-blur md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">{children}</main>
      </body>
    </html>
  );
}
