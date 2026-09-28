/** 標題畫面:繼續 / 新的旅程(選難度)/ 舊版《南方祖記》 */
import { useState } from "react";
import { DIFFICULTIES } from "../game/difficulty";
import type { DifficultyId } from "../game/types";
import { storyArt } from "./assets";
import { MuteButton } from "./MuteButton";

export function TitleScreen(props: { hasSave: boolean; onContinue: () => void; onNew: (d: DifficultyId) => void; onMusic: () => void }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="title-screen">
      <div className="screen-bg" style={{ backgroundImage: `url(${storyArt("title")})` }} />
      <div style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, zIndex: 2 }}>
        <MuteButton />
      </div>
      <div className="title-display title-logo">南方祖記</div>
      <div className="title-en">WARLORDS OF TAKAO</div>
      {!picking ? (
        <div className="title-menu fade-in">
          {props.hasSave && (
            <button className="btn btn-lg btn-primary" onClick={props.onContinue}>
              繼續旅程
            </button>
          )}
          <button className={`btn btn-lg ${props.hasSave ? "" : "btn-primary"}`} onClick={() => setPicking(true)}>
            新的旅程
          </button>
          <button className="btn btn-sm btn-ghost" onClick={props.onMusic}>
            ♪ 音樂室
          </button>
          <a className="link" href={`${import.meta.env.BASE_URL}legacy/`}>
            舊版《南方祖記》十關(之後會成為七千年前的章節)
          </a>
        </div>
      ) : (
        <div className="title-menu fade-in">
          {DIFFICULTIES.map((d) => (
            <button key={d.id} className="btn btn-block" style={{ flexDirection: "column", gap: 2, borderRadius: 16, padding: "10px 16px" }} onClick={() => props.onNew(d.id)}>
              <span style={{ fontSize: 17 }}>{d.name}</span>
              <span style={{ fontSize: 12.5, fontWeight: 400, fontFamily: "var(--font)" }}>{d.desc}</span>
            </button>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setPicking(false)}>
            返回
          </button>
          {props.hasSave && <div className="sub">開始新的旅程會覆蓋目前的進度。</div>}
        </div>
      )}
    </div>
  );
}
