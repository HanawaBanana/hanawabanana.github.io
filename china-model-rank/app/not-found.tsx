import Link from "next/link";

export default function NotFound() {
  return (
    <section className="ledger-card p-10">
      <p className="ink-label">页面不存在</p>
      <h1 className="mt-3 font-display text-5xl font-black tracking-[-0.04em] text-coal">没有找到这个页面</h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-graphite">
        可以返回首页查看中国大模型综合排名，或进入评分方法页查看榜单计算规则。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-coal px-6 py-3 text-sm font-black text-paper transition hover:bg-cinnabar">
          返回榜单首页
        </Link>
        <Link href="/methodology" className="rounded-full border border-ink/15 bg-paper px-6 py-3 text-sm font-black text-coal transition hover:bg-coal hover:text-paper">
          查看评分方法
        </Link>
      </div>
    </section>
  );
}
