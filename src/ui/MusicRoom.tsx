/** 音樂室:試聽每個段落的 A/B 兩首,並選擇要固定哪一首(或交給場景自動選) */
import { useState } from "react";
import { audio } from "../audio/audio";
import { loadPrefs, MUSIC, savePref, type MusicSlot, type Variant } from "../audio/music";

export function MusicRoom({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState(loadPrefs());
  const [playing, setPlaying] = useState<string | null>(null);
  const choose = (slot: MusicSlot, v: Variant | null) => {
    savePref(slot, v);
    setPrefs(loadPrefs());
  };
  return (
    <div className="screen">
      <div className="content grid">
        <div className="row">
          <h1 className="h1 grow">音樂室</h1>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>
            返回
          </button>
        </div>
        <div className="sub" style={{ color: "var(--paper)" }}>
          每個段落有兩首不同風格的配樂,全部由我們自架的 ACE-Step 生成。「自動」會依場合選曲(例如海岸用太平洋打擊樂、玄武岩之夜用太鼓)。手機若沒有聲音,請確認側邊靜音鍵與音量,再點一下畫面。
        </div>
        {MUSIC.map((m) => (
          <div key={m.slot} className="paper">
            <div className="paper-title">
              {m.name} <span className="sub" style={{ fontSize: 12 }}>{m.use}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["a", "b"] as Variant[]).map((v) => {
                const id = `${m.slot}-${v}`;
                return (
                  <button
                    key={v}
                    className={`btn ${playing === id ? "btn-primary" : ""}`}
                    style={{ borderRadius: 14, flexDirection: "column", gap: 2, padding: "8px 10px" }}
                    onClick={() => {
                      audio.unlock();
                      audio.playBgm(id);
                      setPlaying(id);
                    }}
                  >
                    <span>
                      {playing === id ? "♪" : "▶"} {v.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: "var(--font)" }}>{v === "a" ? m.a : m.b}</span>
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <span className="sub" style={{ fontSize: 12.5 }}>遊戲中使用:</span>
              {([null, "a", "b"] as Array<Variant | null>).map((v) => {
                const on = (prefs[m.slot] ?? null) === v;
                return (
                  <button key={String(v)} className={`btn btn-sm ${on ? "btn-moss" : ""}`} onClick={() => choose(m.slot, v)}>
                    {v ? v.toUpperCase() : "自動"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
