import type { RuntimePreflight } from "../lib/schemas";

interface HomeHeroProps {
  preflight: RuntimePreflight;
}

export function HomeHero({ preflight }: HomeHeroProps) {
  return (
    <section className="px-2 pt-10 pb-2 text-center sm:pt-16">
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[color:var(--ink-900)] sm:text-5xl">
        把一句灵感
        <span className="mx-2 text-[color:var(--accent-strong)]">变成视频</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-700)] sm:text-base">
        写下一句话或贴一个链接，剩下的交给我们。
      </p>
      {!preflight.canGenerate ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--line-soft)] bg-white/72 px-4 py-2 text-xs text-[color:var(--ink-700)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--danger)]" />
          {preflight.blockingReason || "当前还不能开始生成"}
        </div>
      ) : null}
    </section>
  );
}
