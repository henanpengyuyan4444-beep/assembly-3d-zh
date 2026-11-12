"use client";

import { useEffect, useState } from "react";
import { demoManual, manualPages } from "@/data/manual-pages";

const DEMO_ON = process.env.NEXT_PUBLIC_MANUAL_DEMO === "1";

/**
 * 原页对照：把当前步的 3D 动画和原说明书同一页并排给用户看。
 * 用户信的是原厂那张图，3D 只负责把图讲清楚。
 */
export default function ManualPage({ slug, index }: { slug: string; index: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const entry = manualPages[slug] ?? (DEMO_ON ? demoManual : null);
  const ref = entry?.stepPages[index] ?? null;
  if (!entry || !ref) return null;

  const isDemo = !manualPages[slug];

  return (
    <>
      <figure className="manual-ref">
        <cite>
          原说明书 · 第 {ref.page} 页
          {isDemo ? <em>示例</em> : null}
        </cite>
        <button type="button" onClick={() => setOpen(true)} aria-label={`放大第 ${ref.page} 页`}>
          <img src={ref.src} alt={`${entry.brand} ${entry.name} 说明书第 ${ref.page} 页`} loading="lazy" />
        </button>
        <span>点开对照原页</span>
      </figure>

      {open ? (
        <div className="manual-zoom" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <img src={ref.src} alt={`原说明书第 ${ref.page} 页`} />
          <button type="button" onClick={() => setOpen(false)}>
            关闭
          </button>
        </div>
      ) : null}
    </>
  );
}
