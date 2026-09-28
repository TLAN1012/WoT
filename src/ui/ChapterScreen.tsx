/** 章節地圖:鹿皮古地圖上的關卡節點 */
import { useState } from "react";
import { getDifficulty } from "../game/difficulty";
import { MATERIALS } from "../game/materials";
import { keepsakeArt } from "./assets";
import { HEROES } from "../game/heroes";
import { canRecruit } from "../game/progress";
import type { BattleDef, ChapterDef, SaveState } from "../game/types";
import { storyArt } from "./assets";
import { MuteButton } from "./MuteButton";

export function ChapterScreen(props: {
  chapter: ChapterDef;
  save: SaveState;
  onBattle: (b: BattleDef, tier: number) => void;
  onParty: () => void;
  onPrologue: () => void;
  onEpilogue: () => void;
  onTitle: () => void;
  onMusic: () => void;
  chapters: Array<{ id: string; title: string; unlocked: boolean }>;
  onSwitch: (id: string) => void;
}) {
  const { chapter, save } = props;
  const firstOpen = chapter.battles.findIndex((b) => !save.stars[b.id]);
  const trial = chapter.mode === "trial";
  const [picking, setPicking] = useState<BattleDef | null>(null);
  const go = (b: BattleDef) => (trial ? setPicking(b) : props.onBattle(b, 1));
  const cleared = firstOpen === -1;
  const unspent = save.party.reduce((n, id) => n + save.heroes[id].unspent, 0);
  const recruitable = HEROES.filter((h) => canRecruit(save, h.id)).length;

  return (
    <div className="screen">
      <div className="screen-bg" style={{ backgroundImage: `url(${storyArt(chapter.battles[0].art)})`, filter: "blur(2px)" }} />
      <div className="content grid">
        <div className="row">
          <div className="grow">
            <div className="sub" style={{ color: "var(--paper)", fontSize: 14, textShadow: "0 1px 4px #000" }}>{chapter.era}</div>
            <h1 className="h1">{chapter.title}</h1>
          </div>
          <MuteButton />
          <button className="btn btn-sm btn-ghost" onClick={props.onMusic} title="音樂室">
            ♪
          </button>
          <button className="btn btn-sm btn-ghost" onClick={props.onTitle}>
            標題
          </button>
        </div>
        {props.chapters.length > 1 && (
          <div className="row" style={{ gap: 6 }}>
            {props.chapters.map((c) => (
              <button
                key={c.id}
                className={`btn btn-sm ${c.id === chapter.id ? "btn-primary" : ""}`}
                disabled={!c.unlocked}
                onClick={() => c.id !== chapter.id && props.onSwitch(c.id)}
                title={c.unlocked ? c.title : "前一景全部通關後開放"}
              >
                {c.unlocked ? c.title.split("・")[0] + "・" + c.title.split("・")[1] : `🔒 ${c.title.split("・")[0]}`}
              </button>
            ))}
          </div>
        )}
        <div className="map-wrap" style={{ backgroundImage: `url(${storyArt(chapter.mapArt)})` }}>
          {chapter.battles.map((b, i) => {
            const stars = save.stars[b.id] ?? 0;
            const locked = firstOpen !== -1 && i > firstOpen;
            const cls = stars ? "done" : locked ? "locked" : "next";
            return (
              <button key={b.id} className={`map-node ${cls}`} style={{ left: `${b.node.x}%`, top: `${b.node.y}%` }} disabled={locked} onClick={() => go(b)}>
                <span className="dot">{i + 1}</span>
                <span className="label">{b.title}</span>
                {stars > 0 && <span className="stars" style={{ fontSize: 13 }}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>}
              </button>
            );
          })}
        </div>
        <div className="paper">
          <div className="paper-title">{cleared ? `${chapter.title.split("・")[0]}完成` : `下一站:${chapter.battles[firstOpen].title}`}</div>
          {!cleared ? (
            <>
              <div style={{ fontSize: 14 }}>{chapter.battles[firstOpen].subtitle}</div>
              <div className="sub" style={{ marginTop: 4 }}>⚑ {chapter.battles[firstOpen].objectiveText}</div>
            </>
          ) : (
            <div style={{ fontSize: 14 }}>
              {props.chapters.some((c) => c.unlocked && c.id !== chapter.id && props.chapters.findIndex((x) => x.id === c.id) > props.chapters.findIndex((x) => x.id === chapter.id))
                ? "這一景完成了。可以前往下一景,也可以回來重玩、收集足跡。"
                : "這一景完成了。下一景製作中。"}
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            {!cleared && (
              <button className="btn btn-primary" onClick={() => go(chapter.battles[firstOpen])}>
                出發
              </button>
            )}
            <button className="btn btn-moss" onClick={props.onParty}>
              同伴{unspent > 0 ? `(${unspent} 點可分配)` : ""}
              {recruitable > 0 && <span className="level-up" style={{ color: "#fff" }}>・有人可以招募!</span>}
            </button>
            <button className="btn btn-sm" onClick={props.onPrologue}>
              序章
            </button>
            {cleared && (
              <button className="btn btn-sm" onClick={props.onEpilogue}>
                終章
              </button>
            )}
            <span className="grow" />
            <span className="chip">難度:{getDifficulty(save.difficulty).name}</span>
          </div>
        </div>
      </div>
      {picking && (
        <div className="modal" onClick={() => setPicking(null)}>
          <div className="paper fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="paper-title">{picking.title}</div>
            <div style={{ fontSize: 14 }}>{picking.subtitle}・⚑ {picking.objectiveText}</div>
            <div className="row" style={{ gap: 6, margin: "8px 0", fontSize: 13 }}>
              主要材料:
              {picking.material && (
                <>
                  <img src={keepsakeArt(`mat-${picking.material}`)} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />
                  {MATERIALS[picking.material].name}
                </>
              )}
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {[1, 2, 3].map((t) => {
                const best = save.stars[picking.id] ?? 0;
                const open = t <= best + 1;
                return (
                  <button
                    key={t}
                    className={`btn btn-block ${t === best + 1 ? "btn-primary" : ""}`}
                    disabled={!open}
                    style={{ flexDirection: "column", gap: 2, borderRadius: 14 }}
                    onClick={() => {
                      setPicking(null);
                      props.onBattle(picking, t);
                    }}
                  >
                    <span>
                      {"★".repeat(t)}
                      {"☆".repeat(3 - t)} {t <= best ? "(已通過)" : ""}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 400, fontFamily: "var(--font)" }}>
                      {t === 1 && "一般。燧石、貝殼。"}
                      {t === 2 && (open ? "野獸更強、多一隻。有機會掉鹿角與足跡。" : "先通過 1★")}
                      {t === 3 && (open ? "最強、再多兩隻。鹿角較多,有機會掉黑曜石。" : "先通過 2★")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
