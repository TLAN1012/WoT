/**
 * 劇情(視覺小說式):背景插畫、說話者立繪(臉朝右站左邊、朝左站右邊)、和紙對話框。
 * 點畫面或按 Enter/空白鍵翻頁,右上角可跳過。
 */
import { useEffect, useState } from "react";
import { getSpeaker } from "../game/heroes";
import type { StoryPage } from "../game/types";
import { portraitArt, storyArt } from "./assets";

export interface StoryScreenProps {
  pages: StoryPage[];
  background?: string;
  title?: string;
  subtitle?: string;
  onDone: () => void;
}

export function StoryScreen({ pages, background, title, subtitle, onDone }: StoryScreenProps) {
  const [i, setI] = useState(0);
  const page = pages[i];
  const next = () => (i + 1 < pages.length ? setI(i + 1) : onDone());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setI((n) => (n + 1 < pages.length ? n + 1 : (onDone(), n)));
      }
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, onDone]);

  if (!page) return null;
  const speaker = page.speaker ? getSpeaker(page.speaker) : undefined;
  const bg = page.image ?? background;

  return (
    <div className="story" onClick={next}>
      {bg && <div key={bg} className="story-bg" style={{ backgroundImage: `url(${storyArt(bg)})` }} />}
      {speaker && (
        <img
          key={speaker.id}
          className={`story-portrait fade-in ${speaker.facing === "left" ? "at-right" : "at-left"}`}
          src={portraitArt(speaker.id)}
          alt={speaker.name}
        />
      )}
      <button
        className="btn btn-sm btn-ghost"
        style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, zIndex: 3 }}
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        跳過 ⏭
      </button>
      {title && i === 0 && (
        <div className="fade-in" style={{ position: "absolute", top: "16%", width: "100%", textAlign: "center", zIndex: 2, padding: "0 16px" }}>
          <div className="title-display" style={{ fontSize: "clamp(28px, 7vw, 52px)" }}>{title}</div>
          {subtitle && <div className="title-en" style={{ letterSpacing: "0.12em" }}>{subtitle}</div>}
        </div>
      )}
      <div className="paper story-box fade-in" key={i}>
        {speaker ? (
          <div className="story-name">
            {speaker.name}
            <small>{speaker.title}</small>
          </div>
        ) : (
          <div className="story-name" style={{ color: "var(--muted)", fontSize: 14 }}>
            ——
          </div>
        )}
        <div className="story-text">{page.text}</div>
        <div className="story-hint">
          {i + 1} / {pages.length} ▸
        </div>
      </div>
    </div>
  );
}
