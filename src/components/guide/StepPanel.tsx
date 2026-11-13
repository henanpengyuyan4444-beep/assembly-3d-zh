"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Plan, WarnId } from "@/lib/types";
import { stepContents, tipFor } from "@/lib/plan/contents";
import { HwArt } from "../art/Hardware";
import { ToolArt, TOOL_INFO } from "../art/Tools";
import { IArrowLeft, IArrowRight, ICheck, IClock, IClose, IMic, ISparkle, WarnIcon, WARN_TEXT } from "../art/Icons";
import { TwoPeople } from "../art/Figure";
import Thumb from "../Thumb";
import { getPref, setPref } from "@/lib/store";

export function minutesLeft(plan: Plan, index: number) {
  return plan.steps.slice(index).reduce((s, x) => s + x.minutes, 0);
}

export default function StepPanel({
  plan,
  index,
  dir,
  onNext,
  onBack,
  onHover,
  offer,
}: {
  plan: Plan;
  index: number;
  dir: number;
  onNext: () => void;
  onBack: () => void;
  onHover: (ids: string[] | null) => void;
  /** Invite to turn voice on, while it is off. */
  offer?: { again: boolean; listen: boolean; onStart: () => void; onDismiss: () => void } | null;
}) {
  const s = plan.steps[index];
  const c = stepContents(plan, index);
  const last = index === plan.steps.length - 1;
  const tip = tipFor(plan, index);
  const isBig = (w: WarnId) => w === "two" || w === "tip" || w === "wall";
  const big = s.warnings.filter((w) => isBig(w) && !(w === "wall" && s.warnings.includes("tip")));
  const small = s.warnings.filter((w) => !isBig(w));
  const next = plan.steps[index + 1];
  const twoAhead = s.people === 1 ? plan.steps.slice(index + 1, index + 3).findIndex((x) => x.people === 2) : -1;
  const id = plan.spec.name + plan.spec.variant;
  const hasNeeds = c.parts.length + c.hardware.length + s.tools.length > 0;
  const left = minutesLeft(plan, index);

  return (
    <div className="pane step-pane">
      <div className="pane-scroll">
        {offer && (
          <div className="voice-offer">
            <div className="voice-offer-text">
              <b>
                {offer.again ? (
                  "再打开语音?"
                ) : (
                  <>
                    腾不出手?<span className="vo-more"> 打开语音</span>
                  </>
                )}
              </b>
              <span>{offer.listen ? "每一步都会念出来, 说“下一步”就能翻页。" : "每一步都会念出来, 点“这步做完了”继续。"}</span>
            </div>
            <button className="btn voice-offer-go" onClick={offer.onStart}>
              <IMic size={17} />
              打开
            </button>
            <button className="voice-offer-x" onClick={offer.onDismiss} aria-label="暂时不用">
              <IClose size={16} />
            </button>
          </div>
        )}
        <motion.div key={index} initial={{ opacity: 0, x: 22 * dir }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <header className="pane-head">
            <div className="step-meta">
              <span className="eyebrow">
                第 {index + 1} 步, 共 {plan.steps.length} 步
              </span>
              <span className="time-pill" title="装完整件大约还要">
                <IClock size={14} /> {left < 60 ? `还要 ${left} 分钟` : `还要 ${Math.round(left / 6) / 10} 小时`}
              </span>
            </div>
            <h2 className="step-title">{s.title}</h2>
            {s.detail && <p className="sub">{s.detail}</p>}
          </header>

          {s.repeat && s.repeat > 1 && (
            <div className="callout repeat">
              <span className="repeat-badge">{s.repeat}&times;</span>
              <span>
                这个动作要做 {s.repeat} 次 ({plan.spec.archetype === "drawers" ? "每个抽屉" : "每处"})。下面的数量是一次的。
              </span>
            </div>
          )}

          {big.map((w) => (
            <div key={w} className={"callout warn " + w}>
              {w === "two" ? <TwoPeople size={36} /> : <WarnIcon id={w} size={36} />}
              <div>
                <b>{w === "two" ? "叫上一个人" : w === "tip" ? "这一步防止倾倒" : "这一步要用电钻"}</b>
                <span>{w === "two" ? "一个人不好搬, 也不好对位。" : w === "tip" ? "孩子会爬。一定固定到墙上。" : "墙上的螺丝和膨胀管不在箱子里。"}</span>
              </div>
            </div>
          ))}

          {hasNeeds && (
            <>
              <h3 className="section-title">这一步要用</h3>
              <ul className="needs">
                {c.parts.map(({ type, count }) => (
                  <li key={type.id} onMouseEnter={() => onHover([type.id])} onMouseLeave={() => onHover(null)}>
                    <Thumb id={id} plan={plan} mode={{ kind: "part", ref: type.id }} w={96} h={68} className="need-thumb" />
                    <span className="letter sm">{type.label}</span>
                    <span className="need-name">{type.name}</span>
                    <span className="need-qty">{count}&times;</span>
                  </li>
                ))}
                {c.hardware.map(({ type, count }) => (
                  <li key={type.id} onMouseEnter={() => onHover([type.id])} onMouseLeave={() => onHover(null)}>
                    <span className="need-art">
                      <HwArt kind={type.kind} len={type.len} dia={type.dia} fit={40} />
                    </span>
                    <span className="need-name">
                      {type.notIncluded ? (type.kind === "plug" ? "膨胀管" : "墙螺丝") : type.name}
                      {type.spec && <small>{type.spec}</small>}
                    </span>
                    <span className="need-qty">{count}&times;</span>
                  </li>
                ))}
                {s.tools.map((t) => (
                  <li key={t} className="tool">
                    <span className="need-art">
                      <ToolArt id={t} size={40} />
                    </span>
                    <span className="need-name">{TOOL_INFO[t].name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {small.length > 0 && (
            <div className="warn-row">
              {small.map((w) => (
                <span key={w} className="warn-chip">
                  <WarnIcon id={w} size={24} />
                  {WARN_TEXT[w]}
                </span>
              ))}
            </div>
          )}

          {tip && (
            <div className="callout tip">
              <ISparkle size={18} />
              <span>{tip}</span>
            </div>
          )}

          {twoAhead >= 0 && (
            <p className="heads-up">
              <TwoPeople size={22} /> 提醒: 第 {index + 2 + twoAhead} 步需要两个人。
            </p>
          )}

          {next ? (
            <button className="upnext" onClick={onNext}>
              <span className="upnext-label">接下来</span>
              <span className="upnext-body">
                <Thumb id={id} plan={plan} mode={{ kind: "step", index: index + 1 }} w={150} h={110} className="upnext-thumb" />
                <span className="upnext-text">
                  <b>{index + 2}</b>
                  <span>{next.title}</span>
                </span>
                <IArrowRight size={18} />
              </span>
            </button>
          ) : (
            <div className="upnext final">
              <span className="upnext-label">最后一步</span>
              <span className="upnext-body">
                <span className="upnext-text">
                  <span>做完这一步就装好了。</span>
                </span>
              </span>
            </div>
          )}
        </motion.div>
      </div>
      <div className="pane-foot">
        <KeysTip />
        <button className="btn round" onClick={onBack} aria-label="上一步" title="上一步 (左方向键)">
          <IArrowLeft />
        </button>
        <button className="btn primary big done-btn" onClick={onNext} title="下一步 (右方向键或空格)">
          <span className="done-ico">
            <ICheck size={18} strokeWidth={2.8} />
          </span>
          <span className="done-label">{last ? "装好了, 收尾" : "这步做完了"}</span>
          <IArrowRight />
        </button>
      </div>
    </div>
  );
}

/**
 * The keyboard shortcuts, once: a tip over the Done button on a first visit
 * with a keyboard and mouse. Closing it, or using the keys, puts it away for good.
 */
function KeysTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (getPref("keysTip", false) || !matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)").matches) return;
    const t = setTimeout(() => setShow(true), 1200);
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key.toLowerCase() === "r")) return;
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      setPref("keysTip", true);
      setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="keys-tip" role="note" initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ type: "spring", stiffness: 460, damping: 32 }}>
          <span>
            <kbd aria-label="左方向键">&larr;</kbd>
            <kbd aria-label="右方向键">&rarr;</kbd> 切换
          </span>
          <span>
            <kbd>R</kbd> 重播
          </span>
          <button
            className="keys-tip-x"
            onClick={() => {
              setPref("keysTip", true);
              setShow(false);
            }}
            aria-label="知道了, 不再提示"
          >
            <IClose size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
