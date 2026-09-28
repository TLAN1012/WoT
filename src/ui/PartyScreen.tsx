/**
 * 同伴:每位英雄的職業系(族語與語源)、等級、屬性點分配、戰鬥數值與技能。
 * 下方是「六大職業系」圖鑑,還沒相遇的系只顯示剪影與語源。
 */
import { ATTR_NAMES, FAMILIES, getClass, getFamily, XP_PER_LEVEL } from "../game/classes";
import { getHero, HEROES } from "../game/heroes";
import { getKeepsake, SLOTS } from "../game/keepsakes";
import { ATTR_IDS, canRecruit, deriveStats, equip, heroAttrs, resetPoints, spendPoint, wearer } from "../game/progress";
import { getSkill } from "../game/skills";
import { useState } from "react";
import type { HeroProgress, SaveState, SlotId } from "../game/types";
import { keepsakeArt, portraitArt } from "./assets";
import { KeepsakeCard } from "./KeepsakeCard";
import { TypeBadge } from "./DeployBar";

function Slots({ save, heroId, onPick }: { save: SaveState; heroId: string; onPick: (slot: SlotId) => void }) {
  const eq = save.equipment[heroId] ?? {};
  return (
    <div className="slots">
      {SLOTS.map((s) => {
        const item = eq[s.id] ? save.inventory.find((i) => i.uid === eq[s.id]) : undefined;
        const k = item ? getKeepsake(item.id) : null;
        return (
          <button key={s.id} className={`slot-box ${k ? "filled" : ""}`} onClick={() => onPick(s.id)}>
            <span className="slot-name">
              {s.name}・{s.realm}
            </span>
            {k ? <img src={keepsakeArt(k.id)} alt="" /> : <span style={{ fontSize: 26, opacity: 0.35, lineHeight: "48px" }}>○</span>}
            <span className="slot-eff">{k ? `${k.name}:${k.effects[s.id].desc}` : s.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function HeroSheet({ p, save, onChange, onPick }: { p: HeroProgress; save: SaveState; onChange: (p: HeroProgress) => void; onPick: (slot: SlotId) => void }) {
  const hero = getHero(p.id);
  const cls = getClass(hero.classId);
  const fam = getFamily(cls.family);
  const attrs = heroAttrs(p);
  const st = deriveStats(p);
  const spent = ATTR_IDS.reduce((n, a) => n + p.bonus[a], 0);
  return (
    <div className="paper fade-in">
      <div className="hero-card">
        <img className="pic" src={portraitArt(hero.id)} alt={hero.name} />
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 22 }}>{hero.name}</span>
            <span className="sub">{hero.roman}</span>
            <span className="family-badge" style={{ background: fam.color }}>
              {fam.name}
              <small style={{ fontWeight: 400, fontSize: 11 }}>{fam.zh}</small>
            </span>
            <TypeBadge t={fam.ctype} />
          </div>
          <div className="sub" style={{ fontSize: 12.5 }}>
            {cls.name}・名字來自{hero.etymology}
          </div>
          <div style={{ fontSize: 13.5, margin: "6px 0" }}>{hero.bio}</div>
          <div className="row" style={{ gap: 8, fontSize: 13 }}>
            <b style={{ fontFamily: "var(--font-ui)" }}>Lv {p.level}</b>
            <div className="bar xp grow" style={{ maxWidth: 200 }}>
              <i style={{ width: `${(p.xp / XP_PER_LEVEL) * 100}%` }} />
            </div>
            <span className="sub">{p.xp}/{XP_PER_LEVEL}</span>
          </div>
        </div>
      </div>
      <div className="divider" />
      <div className="paper-title">信物</div>
      <Slots save={save} heroId={p.id} onPick={onPick} />
      <div className="divider" />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div>
          <div className="paper-title">
            屬性 {p.unspent > 0 && <span className="level-up" style={{ fontSize: 13 }}>剩 {p.unspent} 點</span>}
          </div>
          <div className="grid" style={{ gap: 4 }}>
            {ATTR_IDS.map((a) => (
              <div key={a} className="attr-row">
                <b>{ATTR_NAMES[a].name}</b>
                <span style={{ fontWeight: 700 }}>
                  {attrs[a]}
                  {p.bonus[a] > 0 && <small style={{ color: "var(--good)" }}> +{p.bonus[a]}</small>}
                </span>
                <span className="sub" style={{ fontSize: 12 }}>{ATTR_NAMES[a].desc}</span>
                <button className="btn plus" disabled={p.unspent <= 0} onClick={() => onChange(spendPoint(p, a))} aria-label={`加${ATTR_NAMES[a].name}`}>
                  +
                </button>
              </div>
            ))}
          </div>
          {spent > 0 && (
            <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => onChange(resetPoints(p))}>
              重新分配
            </button>
          )}
          <div className="stat-grid" style={{ marginTop: 10 }}>
            <span>生命 <b>{st.maxHp}</b></span>
            <span>{fam.resource === "rage" ? "怒氣" : "靈力"} <b>{st.maxRes}</b></span>
            <span>物攻 <b>{st.atk}</b></span>
            <span>法術 <b>{st.mag}</b></span>
            <span>治療 <b>{st.heal}</b></span>
            <span>防禦 <b>{st.def}</b></span>
            <span>抗性 <b>{st.mdef}</b></span>
            <span>暴擊 <b>{Math.round(st.crit * 100)}%</b></span>
            <span>移動 <b>{st.move}</b></span>
            {fam.resource === "mana" && <span>每回合 +<b>{st.resRegen}</b></span>}
          </div>
        </div>
        <div>
          <div className="paper-title">技能</div>
          <div className="skill-list">
            <div className="skill-item">
              <span className="ic">🍃</span>
              <span>
                <b>{fam.passive.name}</b>(被動) {fam.passive.desc}
              </span>
            </div>
            {[{ level: 1, skill: cls.basic }, ...cls.skills].map(({ level, skill }) => {
              const sk = getSkill(skill);
              const locked = level > p.level;
              return (
                <div key={skill} className={`skill-item ${locked ? "locked" : ""}`}>
                  <span className="ic">{sk.icon}</span>
                  <span>
                    <b>{sk.name}</b>
                    {sk.cost > 0 && <span className="sub"> ・{fam.resource === "rage" ? "怒" : "靈"} {sk.cost}</span>}
                    {sk.cooldown > 0 && <span className="sub"> ・冷卻 {sk.cooldown}</span>}
                    {locked && <span className="sub"> ・Lv {level} 習得</span>}
                    <br />
                    {sk.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruitPanel({ save, onRecruit }: { save: SaveState; onRecruit: (id: string) => void }) {
  const candidates = HEROES.filter((h) => h.recruit && !save.party.includes(h.id));
  if (!candidates.length) return null;
  return (
    <div className="paper">
      <div className="paper-title">沿著記號追來的族人</div>
      <div className="sub" style={{ fontSize: 13, marginBottom: 8 }}>
        戰鬥中會撿到他們留下的足跡。第一次打贏每一關都有,重玩打過的關卡也會隨機撿到。集滿就能讓他們加入。
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {candidates.map((h) => {
          const have = save.shards[h.id] ?? 0;
          const need = h.recruit!.need;
          const ready = canRecruit(save, h.id);
          const cls = getClass(h.classId);
          const fam = getFamily(cls.family);
          return (
            <div key={h.id} className="row" style={{ flexWrap: "nowrap", gap: 10, alignItems: "flex-start" }}>
              <img
                src={portraitArt(h.id)}
                alt=""
                style={{ width: 64, height: 84, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "2px solid var(--bark)", background: "#cfd9d0", filter: have ? "none" : "brightness(0.2)" }}
              />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <b style={{ fontFamily: "var(--font-ui)", fontSize: 17 }}>{have ? h.name : "???"}</b>
                  <span className="family-badge" style={{ background: fam.color }}>
                    {fam.name}
                    <small style={{ fontWeight: 400, fontSize: 11 }}>{fam.zh}</small>
                  </span>
                  <TypeBadge t={fam.ctype} />
                </div>
                <div className="row" style={{ gap: 6, fontSize: 13, margin: "4px 0" }}>
                  <img src={keepsakeArt(`shard-${h.id}`)} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
                  {h.recruit!.shard} {Math.min(have, need)}/{need}
                  <div className="bar xp grow" style={{ maxWidth: 120 }}>
                    <i style={{ width: `${Math.min(1, have / need) * 100}%` }} />
                  </div>
                </div>
                {have > 0 && <div style={{ fontSize: 12.5 }}>{h.bio}</div>}
                {ready && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }} onClick={() => onRecruit(h.id)}>
                    讓{h.name}加入
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PartyScreen(props: { save: SaveState; onChange: (s: SaveState) => void; onBack: () => void; onRecruit: (id: string) => void }) {
  const { save } = props;
  const met = new Set(save.party.map((id) => getClass(getHero(id).classId).family));
  const [picking, setPicking] = useState<{ heroId: string; slot: SlotId } | null>(null);
  const current = picking ? save.equipment[picking.heroId]?.[picking.slot] : undefined;
  return (
    <div className="screen">
      <div className="content grid">
        <div className="row">
          <h1 className="h1 grow">同伴</h1>
          <button className="btn btn-sm btn-ghost" onClick={props.onBack}>
            返回
          </button>
        </div>
        <div className="sub" style={{ color: "var(--paper)" }}>
          每升一級,職業會自動成長,另外還有 3 點可以自由分配。想讓巴度更耐打就加「體」,想讓比杜的閃電更痛就加「智」。
        </div>
        <RecruitPanel save={save} onRecruit={props.onRecruit} />
        {save.party.map((id) => (
          <HeroSheet
            key={id}
            p={save.heroes[id]}
            save={save}
            onChange={(p) => props.onChange({ ...save, heroes: { ...save.heroes, [id]: p } })}
            onPick={(slot) => setPicking({ heroId: id, slot })}
          />
        ))}
        {picking && (
          <div className="modal" onClick={() => setPicking(null)}>
            <div className="paper fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="paper-title">
                {getHero(picking.heroId).name}的{SLOTS.find((x) => x.id === picking.slot)!.name}({SLOTS.find((x) => x.id === picking.slot)!.realm})
              </div>
              {current && (
                <button
                  className="btn btn-sm"
                  style={{ marginBottom: 10 }}
                  onClick={() => {
                    props.onChange(equip(save, picking.heroId, picking.slot, null));
                    setPicking(null);
                  }}
                >
                  取下
                </button>
              )}
              {save.inventory.length === 0 && <div style={{ fontSize: 14 }}>還沒有信物。每場戰鬥第一次勝利會得到一件,野獸有時也會留下東西。</div>}
              {save.inventory.map((item) => {
                const w = wearer(save, item.uid);
                return (
                  <button
                    key={item.uid}
                    className="pick"
                    style={item.uid === current ? { borderColor: "var(--ochre)" } : undefined}
                    onClick={() => {
                      props.onChange(equip(save, picking.heroId, picking.slot, item.uid));
                      setPicking(null);
                    }}
                  >
                    <KeepsakeCard id={item.id} highlight={picking.slot} compact />
                    {w && (
                      <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>
                        目前戴在{getHero(w.heroId).name}的{SLOTS.find((x) => x.id === w.slot)!.name}上(選了會移過來)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="paper">
          <div className="paper-title">六大職業系・族語的名字</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {FAMILIES.map((f) => (
              <div key={f.id} style={{ opacity: met.has(f.id) ? 1 : 0.6, fontSize: 13, lineHeight: 1.6 }}>
                <span className="family-badge" style={{ background: met.has(f.id) ? f.color : "#8a8272" }}>
                  {f.name}
                  <small style={{ fontWeight: 400, fontSize: 11 }}>{f.zh}</small>
                </span>
                <div>{f.etymology}</div>
                <div className="sub">{met.has(f.id) ? f.desc : "還沒有相遇。"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
