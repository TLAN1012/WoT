/**
 * BattleScreen — 全螢幕戰場
 *
 *  - 拖曳平移、滾輪/雙指縮放、「⤢」回到全圖
 *  - 點英雄:金色 = 可移動、紅色 = 目前技能可打的目標;下方選技能
 *  - 滑鼠懸停目標看範圍與傷害預覽、點下去出手;觸控第一下預覽、第二下出手
 *  - 所有英雄都行動完會自動結束回合;敵方一隻一隻動(先移動、再出手)
 *  - 溫和難度可悔棋
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio } from "../audio/audio";
import { hexCorners, hexEq, hexKey, hexToPixel, parseHexKey, type Hex } from "../engine/hex";
import { nextEnemy, planActions, planEnemy } from "../game/ai";
import {
  battleReducer,
  getUnit,
  hasStatus,
  living,
  previewSkill,
  reachable,
  sideDone,
  skillReady,
  skillTargets,
  skillVictims,
  unitAt,
  type BattleAction,
} from "../game/battle";
import { getClass, getFamily } from "../game/classes";
import { getEnemy } from "../game/enemies";
import { getHero } from "../game/heroes";
import { charmInfo } from "../game/keepsakes";
import { getSkill, skillArea } from "../game/skills";
import { getTerrain } from "../game/terrain";
import type { BattleState, StatusId, Unit } from "../game/types";
import { portraitArt, spriteArt, SPRITE_FACES_LEFT, terrainArt } from "./assets";
import { MuteButton } from "./MuteButton";

const HEX = 40;
const AI_STEP_MS = 520;
const STATUS_ICON: Record<StatusId, string> = { stun: "💫", slow: "🐌", might: "🔥", guard: "🛡️", taunt: "📣", regen: "🌱" };
const STATUS_NAME: Record<StatusId, string> = { stun: "暈眩", slow: "遲緩", might: "強化", guard: "守勢", taunt: "被挑釁", regen: "再生" };

interface View {
  x: number;
  y: number;
  k: number;
}

interface Floater {
  id: number;
  at: Hex;
  text: string;
  color: string;
}

export interface BattleScreenProps {
  battle: BattleState;
  onChange: (s: BattleState) => void;
  onFinish: () => void;
  onRetreat: () => void;
  title: string;
  objectiveText: string;
  allowUndo: boolean;
}

function spriteId(u: Unit): string {
  return u.defId;
}

function spriteScale(u: Unit): number {
  if (u.defId === "elephant") return 3;
  if (u.defId === "grayfang" || u.defId === "tiger") return 2.2;
  if (u.defId === "totem") return 1.6;
  if (u.defId === "wisp") return 1.5;
  return 2;
}

export function BattleScreen(props: BattleScreenProps) {
  const { battle, onChange, onFinish, onRetreat, title, objectiveText, allowUndo } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [hoverHex, setHoverHex] = useState<Hex | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [focusHex, setFocusHex] = useState<Hex | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [banner, setBanner] = useState<{ id: number; text: string; sub?: string } | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [history, setHistory] = useState<BattleState[]>([]);
  const lastPointer = useRef<"mouse" | "touch" | "pen">("mouse");

  const isPlayerTurn = battle.side === "hero" && battle.outcome === "ongoing";
  const selected = selectedId ? battle.units.find((u) => u.id === selectedId && !u.down && u.isHero) : undefined;
  const activeSkill = selected && skillId && selected.skills.includes(skillId) ? getSkill(skillId) : null;

  const dispatch = useCallback(
    (a: BattleAction): BattleState => {
      if (a.type === "END_TURN") setHistory([]);
      else if (allowUndo && battle.side === "hero") setHistory((h) => [...h.slice(-30), battle]);
      const next = battleReducer(battle, a);
      onChange(next);
      return next;
    },
    [battle, onChange, allowUndo],
  );

  /** 出手後自動換到下一位還沒行動的英雄 */
  function advance(next: BattleState) {
    const nxt = living(next, "hero").find((u) => u.isHero && !u.acted);
    setSelectedId(nxt?.id ?? null);
    setSkillId(nxt ? getClass(getHero(nxt.defId).classId).basic : null);
    setArmed(null);
  }

  // ── 飄字、音效、橫幅 ────────────────────────────────
  const seen = useRef(battle.log.length);
  useEffect(() => {
    const fresh = battle.log.slice(seen.current);
    seen.current = battle.log.length;
    const add: Floater[] = [];
    for (const e of fresh) {
      if (e.kind === "hit" && e.at) {
        add.push({ id: Math.random(), at: e.at, text: `${e.crit ? "暴擊 " : ""}-${e.amount}`, color: e.crit ? "#ffd35a" : "#ff8a6a" });
      } else if (e.kind === "skill" && e.skill) {
        const sk = getSkill(e.skill);
        if (sk.effect !== "heal") audio.sfx(sk.scale === "phys" ? "hit" : "magic");
      } else if (e.kind === "heal" && e.at) {
        add.push({ id: Math.random(), at: e.at, text: `+${e.amount}`, color: "#8fe38a" });
        audio.sfx("heal");
      } else if (e.kind === "miss" && e.at) {
        add.push({ id: Math.random(), at: e.at, text: "落空", color: "#e8f0ff" });
      } else if (e.kind === "charm") {
        if (e.at) add.push({ id: Math.random(), at: e.at, text: "✦ 信物", color: "#ffe08a" });
        setBanner({ id: Date.now(), text: "✦ 信物發動", sub: e.text.replace(/^✦ /, "") });
        audio.sfx("heal");
      } else if (e.kind === "drop") {
        setBanner({ id: Date.now(), text: "🎁 撿到信物", sub: e.text.replace(/^🎁 /, "") });
      } else if (e.kind === "down") {
        audio.sfx("down");
      } else if (e.kind === "event") {
        setBanner({ id: Date.now(), text: "⚑ 戰況變化", sub: e.text });
      } else if (e.kind === "info" && e.text.includes("我方行動") && e.turn > 1) {
        setBanner({ id: Date.now(), text: `第 ${e.turn} 回合`, sub: battle.objective.kind === "survive" ? `撐到第 ${battle.objective.turns} 回合結束` : undefined });
      } else if (e.kind === "info" && e.text === "敵方行動") {
        setBanner({ id: Date.now(), text: "野獸的回合" });
      }
    }
    if (add.length) {
      setFloaters((f) => [...f, ...add]);
      setTimeout(() => setFloaters((f) => f.filter((x) => !add.includes(x))), 1150);
    }
  }, [battle.log, battle.objective]);

  // ── 敵方回合:一隻一隻動 ────────────────────────────
  const queue = useRef<BattleAction[]>([]);
  useEffect(() => {
    if (battle.side !== "enemy" || battle.outcome !== "ongoing") {
      queue.current = [];
      return;
    }
    const t = setTimeout(() => {
      if (!queue.current.length) {
        const u = nextEnemy(battle);
        if (!u) {
          onChange(battleReducer(battle, { type: "END_TURN" }));
          return;
        }
        queue.current = planActions(planEnemy(battle, u));
      }
      const a = queue.current.shift()!;
      let next = battleReducer(battle, a);
      // 動作無效(例如目標已經倒下)就讓這隻待命
      if (next === battle && a.type !== "END_TURN") next = battleReducer(battle, { type: "WAIT", unitId: (a as { unitId: string }).unitId });
      if (a.type === "MOVE") audio.sfx("move");
      onChange(next);
    }, AI_STEP_MS);
    return () => clearTimeout(t);
  }, [battle, onChange]);

  // 我方全員行動完 → 自動結束回合
  useEffect(() => {
    if (!isPlayerTurn || !sideDone(battle)) return;
    const t = setTimeout(() => dispatch({ type: "END_TURN" }), 650);
    return () => clearTimeout(t);
  }, [battle, isPlayerTurn, dispatch]);

  // ── 範圍、目標、預覽 ────────────────────────────────
  const reach = useMemo(() => {
    if (!selected || !isPlayerTurn || selected.moved || selected.acted) return new Map<string, Hex>();
    const m = new Map<string, Hex>();
    for (const [k, info] of reachable(battle, selected)) if (info.canStop && !hexEq(info.pos, selected.pos)) m.set(k, info.pos);
    return m;
  }, [battle, selected, isPlayerTurn]);

  const targets = useMemo(() => {
    const m = new Map<string, Hex>();
    if (!selected || !activeSkill || !isPlayerTurn || selected.acted || !skillReady(selected, activeSkill)) return m;
    for (const h of skillTargets(battle, selected, activeSkill.id)) m.set(hexKey(h), h);
    return m;
  }, [battle, selected, activeSkill, isPlayerTurn]);

  const aimKey = armed ?? (hoverHex && targets.has(hexKey(hoverHex)) ? hexKey(hoverHex) : null);
  const selfSkill = activeSkill && (activeSkill.target === "self") ? activeSkill : null;
  const aim = aimKey ? targets.get(aimKey)! : selfSkill && selected && targets.size ? selected.pos : null;

  const area = useMemo(() => {
    if (!selected || !activeSkill || !aim) return new Set<string>();
    if (activeSkill.shape === "chain") return new Set(skillVictims(battle, selected, activeSkill.id, aim).map((v) => hexKey(v.pos)));
    if (activeSkill.effect === "buff" && activeSkill.id === "roar") return new Set(skillArea({ ...activeSkill, shape: "blast", size: activeSkill.size }, selected.pos, selected.pos).map(hexKey));
    return new Set(skillArea(activeSkill, selected.pos, aim).map(hexKey));
  }, [battle, selected, activeSkill, aim]);

  const preview = useMemo(() => {
    if (!selected || !activeSkill || !aim) return null;
    return previewSkill(battle, selected, activeSkill.id, aim);
  }, [battle, selected, activeSkill, aim]);

  function cast(target: Hex) {
    if (!selected || !activeSkill) return;
    advance(dispatch({ type: "SKILL", unitId: selected.id, skillId: activeSkill.id, target }));
  }

  function selectHero(u: Unit) {
    audio.sfx("select");
    setSelectedId(u.id);
    setSkillId(getClass(getHero(u.defId).classId).basic);
    setArmed(null);
    setInspectId(null);
  }

  function onHexTap(h: Hex) {
    if (drag.current.moved) return;
    setFocusHex(h);
    const key = hexKey(h);
    const who = unitAt(battle, h);
    if (!isPlayerTurn) {
      if (who) setInspectId(who.id);
      return;
    }
    // 目標優先(治療自己、立圖騰到空地等)
    if (targets.has(key) && activeSkill && selected) {
      if (lastPointer.current === "touch" && armed !== key) {
        setArmed(key);
        return;
      }
      cast(h);
      return;
    }
    if (who && who.isHero) {
      if (who.acted) setInspectId(who.id);
      else selectHero(who);
      return;
    }
    if (who) {
      setInspectId(who.id);
      setArmed(null);
      return;
    }
    if (selected && reach.has(key)) {
      audio.sfx("move");
      dispatch({ type: "MOVE", unitId: selected.id, to: h });
      setArmed(null);
      return;
    }
    setArmed(null);
    setInspectId(null);
  }

  // ── 幾何與鏡頭 ──────────────────────────────────────
  const hexEntries = useMemo(() => Object.entries(battle.terrain), [battle.terrain]);
  const bounds = useMemo(() => {
    const px = hexEntries.map(([k]) => hexToPixel(parseHexKey(k), HEX));
    return {
      minX: Math.min(...px.map((p) => p.x)) - HEX,
      minY: Math.min(...px.map((p) => p.y)) - HEX * 1.6,
      maxX: Math.max(...px.map((p) => p.x)) + HEX,
      maxY: Math.max(...px.map((p) => p.y)) + HEX,
    };
  }, [hexEntries]);
  const pts = hexCorners(HEX).map((c) => `${c.x},${c.y}`).join(" ");
  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });

  const fitView = useCallback(
    (w: number, h: number): View => {
      const mw = bounds.maxX - bounds.minX;
      const mh = bounds.maxY - bounds.minY;
      const k = Math.min(w / mw, h / mh) * 0.98;
      return { k, x: (w - mw * k) / 2 - bounds.minX * k, y: (h - mh * k) / 2 - bounds.minY * k };
    },
    [bounds],
  );
  const initialView = useCallback(
    (w: number, h: number): View => {
      const f = fitView(w, h);
      const minK = 0.72;
      if (!(f.k < minK && w < 700)) return f;
      // 手機:放大到看得清楚,鏡頭對準英雄
      const heroes = living(battle, "hero");
      const cx = heroes.length ? heroes.reduce((n, u) => n + hexToPixel(u.pos, HEX).x, 0) / heroes.length + HEX * 2 : (bounds.minX + bounds.maxX) / 2;
      const cy = heroes.length ? heroes.reduce((n, u) => n + hexToPixel(u.pos, HEX).y, 0) / heroes.length : (bounds.minY + bounds.maxY) / 2;
      return { k: minK, x: w / 2 - cx * minK, y: h / 2 - cy * minK };
    },
    // 只在開場算一次英雄位置
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fitView, bounds],
  );
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize({ w, h });
      setView(initialView(w, h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [initialView]);

  const zoomAt = (cx: number, cy: number, factor: number) => {
    setView((v) => {
      const fit = fitView(size.w, size.h).k;
      const k = Math.min(3, Math.max(fit * 0.7, v.k * factor));
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, startX: 0, startY: 0, pinch: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    lastPointer.current = e.pointerType as "mouse" | "touch" | "pen";
    audio.unlock();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.moved = false;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = mapRef.current!.getBoundingClientRect();
      if (drag.current.pinch > 0) zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, d / drag.current.pinch);
      drag.current.pinch = d;
      drag.current.moved = true;
      return;
    }
    if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > 8) drag.current.moved = true;
    if (drag.current.moved) {
      setView((v) => ({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
      mapRef.current?.classList.add("dragging");
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = 0;
    mapRef.current?.classList.remove("dragging");
    setTimeout(() => (drag.current.moved = false), 0);
  };
  const onWheel = (e: React.WheelEvent) => {
    const rect = mapRef.current!.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  // ── 資訊卡 ──────────────────────────────────────────
  const infoHex = hoverHex ?? focusHex;
  const infoTerrain = infoHex && battle.terrain[hexKey(infoHex)] ? getTerrain(battle.terrain[hexKey(infoHex)]) : null;
  const inspected = inspectId ? getUnit(battle, inspectId) : undefined;
  const heroes = battle.units.filter((u) => u.isHero);
  const foesLeft = living(battle, "enemy").length;
  const units = [...living(battle)].sort((a, b) => a.pos.r - b.pos.r || a.pos.q - b.pos.q);

  const objectiveLine =
    battle.objective.kind === "survive" ? `${objectiveText}(第 ${Math.min(battle.turn, battle.objective.turns)} / ${battle.objective.turns} 回合)` : objectiveText;

  return (
    <div className="battle">
      <div className="battle-top">
        <button className="btn btn-sm btn-ghost btn-icon" onClick={onRetreat} title="撤退">
          ✕
        </button>
        <div className="grow">
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div className="sub" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={objectiveLine}>
            ⚑ {objectiveLine}
          </div>
        </div>
        <span className="chip">回合 {battle.turn}</span>
        <span className="chip">敵 {foesLeft}</span>
        {allowUndo && (
          <button
            className="btn btn-sm btn-ghost btn-icon"
            disabled={!history.length || !isPlayerTurn}
            title="悔棋"
            onClick={() => {
              const prev = history[history.length - 1];
              if (!prev) return;
              setHistory((h) => h.slice(0, -1));
              seen.current = prev.log.length;
              onChange(prev);
            }}
          >
            ↶
          </button>
        )}
        <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setLogOpen((v) => !v)} title="戰鬥紀錄">
          📜
        </button>
        <MuteButton />
      </div>

      <div className="battle-map" ref={mapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
        <svg>
          <defs>
            <clipPath id="hexClip">
              <polygon points={pts} />
            </clipPath>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {hexEntries.map(([key, tid]) => {
              const h = parseHexKey(key);
              const { x, y } = hexToPixel(h, HEX);
              const t = getTerrain(tid);
              const inReach = reach.has(key);
              const isTarget = targets.has(key);
              const inArea = area.has(key);
              return (
                <g key={key} transform={`translate(${x},${y})`} onClick={() => onHexTap(h)} onMouseEnter={() => setHoverHex(h)} onMouseLeave={() => setHoverHex(null)}>
                  <polygon points={pts} fill={t.color} />
                  <image href={terrainArt(tid)} x={-HEX * 1.05} y={-HEX * 1.05} width={HEX * 2.1} height={HEX * 2.1} clipPath="url(#hexClip)" preserveAspectRatio="xMidYMid slice" style={{ pointerEvents: "none" }} />
                  <polygon points={pts} fill="rgba(241,232,210,0.16)" stroke="rgba(40,34,24,0.45)" strokeWidth={1} style={{ pointerEvents: "none" }} />
                  {inReach && <polygon points={pts} fill="rgba(245,214,120,0.32)" stroke="rgba(245,214,120,0.95)" strokeWidth={1.6} style={{ pointerEvents: "none" }} />}
                  {isTarget && (
                    <polygon
                      points={pts}
                      fill={activeSkill?.effect === "heal" || activeSkill?.effect === "summon" ? "rgba(120,220,140,0.25)" : "rgba(200,50,40,0.22)"}
                      stroke={activeSkill?.effect === "heal" || activeSkill?.effect === "summon" ? "#7be08a" : "#ff5a45"}
                      strokeWidth={2.2}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {inArea && <polygon points={pts} fill={activeSkill?.effect === "heal" ? "rgba(140,240,150,0.35)" : "rgba(255,120,60,0.38)"} stroke="#ffd35a" strokeWidth={2} strokeDasharray="5 3" style={{ pointerEvents: "none" }} />}
                  {armed === key && <polygon points={pts} fill="none" stroke="#fff" strokeWidth={3} style={{ pointerEvents: "none" }} />}
                </g>
              );
            })}

            {units.map((u) => {
              const { x, y } = hexToPixel(u.pos, HEX);
              const sc = spriteScale(u);
              const w = HEX * sc;
              const faceLeft = SPRITE_FACES_LEFT.has(spriteId(u));
              // 英雄朝右(面向東方),野獸朝左
              const flip = u.side === "enemy" ? !faceLeft : faceLeft;
              const sel = u.id === selectedId;
              const hit = preview?.find((p) => p.unitId === u.id);
              const dim = u.isHero && u.acted && isPlayerTurn;
              return (
                <g key={u.id} className="unit-sprite" transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
                  <ellipse cx={0} cy={HEX * 0.42} rx={HEX * 0.5 * Math.min(sc / 1.7, 1.6)} ry={HEX * 0.16} fill="rgba(0,0,0,0.35)" />
                  {sel && <ellipse cx={0} cy={HEX * 0.42} rx={HEX * 0.62} ry={HEX * 0.22} fill="none" stroke="#ffd35a" strokeWidth={2.5} />}
                  <image
                    href={spriteArt(spriteId(u))}
                    x={-w / 2}
                    y={HEX * 0.5 - w}
                    width={w}
                    height={w}
                    preserveAspectRatio="xMidYMax meet"
                    transform={flip ? "scale(-1,1)" : undefined}
                    opacity={dim ? 0.55 : 1}
                    filter="url(#shadow)"
                  />
                  <g transform={`translate(${-HEX * 0.5},${HEX * 0.55})`}>
                    <rect width={HEX} height={5} rx={2} fill="rgba(0,0,0,0.6)" />
                    <rect width={(HEX * u.hp) / u.maxHp} height={5} rx={2} fill={u.side === "hero" ? "#6fcf6a" : getEnemy(u.defId).boss ? "#e0a030" : "#e0604a"} />
                    {u.resource && (
                      <>
                        <rect y={6} width={HEX} height={3} rx={1.5} fill="rgba(0,0,0,0.6)" />
                        <rect y={6} width={(HEX * u.res) / Math.max(1, u.maxRes)} height={3} rx={1.5} fill={u.resource === "rage" ? "#e0663a" : "#5aa8e8"} />
                      </>
                    )}
                  </g>
                  {u.statuses.length > 0 && (
                    <text x={HEX * 0.5} y={-w + HEX * 0.7} fontSize={12} textAnchor="end">
                      {u.statuses.map((s) => STATUS_ICON[s.id]).join("")}
                    </text>
                  )}
                  {hit && (
                    <text className="floater" style={{ animation: "none" }} x={0} y={HEX * 0.5 - w - 4} textAnchor="middle" fontSize={15} fill={hit.kind === "heal" ? "#8fe38a" : hit.lethal ? "#ffd35a" : "#fff"}>
                      {hit.kind === "heal" ? `+${hit.amount}` : hit.lethal ? `擊倒 ${hit.amount}` : `-${hit.amount}`}
                    </text>
                  )}
                </g>
              );
            })}

            {floaters.map((f) => {
              const { x, y } = hexToPixel(f.at, HEX);
              return (
                <text key={f.id} className="floater" x={x} y={y - HEX * 0.9} textAnchor="middle" fontSize={18} fill={f.color}>
                  {f.text}
                </text>
              );
            })}
          </g>
        </svg>

        <div className="zoom-ctl">
          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)}>
            ＋
          </button>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)}>
            －
          </button>
          <button className="btn btn-sm btn-ghost btn-icon" title="全圖" onClick={() => setView(fitView(size.w, size.h))}>
            ⤢
          </button>
        </div>

        {infoTerrain && !preview && (
          <div className="hud-card glass terrain-card">
            <b style={{ fontFamily: "var(--font-ui)" }}>{infoTerrain.name}</b>
            {infoTerrain.defense !== 0 && (
              <span className="chip" style={{ marginLeft: 6, color: infoTerrain.defense > 0 ? "#9fe39a" : "#ff9a80" }}>
                承傷 {infoTerrain.defense > 0 ? "−" : "+"}
                {Math.round(Math.abs(infoTerrain.defense) * 100)}%
              </span>
            )}
            {!infoTerrain.impassable && <span className="chip" style={{ marginLeft: 6 }}>移動 {infoTerrain.moveCost}</span>}
            <div style={{ opacity: 0.85 }}>{infoTerrain.desc}</div>
          </div>
        )}

        {preview && activeSkill && selected && (
          <div className="hud-card paper preview-card" style={{ padding: "8px 12px" }}>
            <b>
              {activeSkill.icon} {activeSkill.name}
            </b>
            {preview.length ? (
              <span>
                {" "}
                →{" "}
                {preview.map((p) => {
                  const v = getUnit(battle, p.unitId)!;
                  return (
                    <span key={p.unitId} style={{ marginRight: 8 }}>
                      {v.name} <b style={{ color: p.kind === "heal" ? "var(--good)" : "var(--ochre)" }}>{p.kind === "heal" ? `+${p.amount}` : `-${p.amount}`}</b>
                      {p.lethal && " 擊倒!"}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span className="sub"> {activeSkill.desc}</span>
            )}
            {selected.crit > 0 && activeSkill.effect === "damage" && <div className="sub" style={{ fontSize: 12 }}>暴擊率 {Math.round(selected.crit * 100)}%</div>}
            {selfSkill && (
              <div style={{ marginTop: 6 }}>
                <button className="btn btn-sm btn-primary" onClick={() => cast(selected.pos)}>
                  施放
                </button>
              </div>
            )}
            {armed && <div className="sub" style={{ fontSize: 12 }}>再點一次出手</div>}
          </div>
        )}

        {inspected && !inspected.down && (
          <div className="hud-card paper unit-card fade-in" onClick={() => setInspectId(null)}>
            <img src={spriteArt(spriteId(inspected))} alt="" />
            <div>
              <b style={{ fontFamily: "var(--font-ui)", fontSize: 16 }}>{inspected.name}</b>
              <span className="sub" style={{ marginLeft: 6 }}>
                生命 {inspected.hp}/{inspected.maxHp}
              </span>
              <div style={{ fontSize: 12.5 }}>{inspected.isHero ? getHero(inspected.defId).title : getEnemy(inspected.defId).desc}</div>
              {inspected.statuses.length > 0 && (
                <div style={{ fontSize: 12.5, marginTop: 2 }}>
                  {inspected.statuses.map((s) => `${STATUS_ICON[s.id]}${STATUS_NAME[s.id]} ${s.turns}`).join("　")}
                </div>
              )}
              {inspected.charms.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {inspected.charms.map((c) => {
                    const info = charmInfo(c);
                    const used = inspected.charmUsed.includes(c);
                    return (
                      <div key={c} style={{ opacity: used ? 0.5 : 1 }}>
                        ✦ {info?.keepsake.name}:{info?.desc}
                        {used && "(已發動)"}
                      </div>
                    );
                  })}
                </div>
              )}
              {!inspected.isHero && inspected.skills.length > 0 && (
                <div className="sub" style={{ fontSize: 12 }}>
                  招式:{inspected.skills.map((id) => getSkill(id).name).join("、")}
                </div>
              )}
            </div>
          </div>
        )}

        {logOpen && (
          <div className="hud-card paper log">
            {battle.log.slice(-60).map((e, i) => (
              <div key={i} style={{ color: e.kind === "event" || e.kind === "charm" || e.kind === "drop" ? "var(--ochre)" : e.kind === "info" ? "var(--muted)" : undefined }}>
                {e.text}
              </div>
            ))}
          </div>
        )}

        {banner && (
          <div key={banner.id} className="banner">
            <div className="big">{banner.text}</div>
            {banner.sub && <div className="small">{banner.sub}</div>}
          </div>
        )}

        {battle.outcome !== "ongoing" && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", background: "rgba(10,14,11,0.55)" }}>
            <div className="paper fade-in" style={{ textAlign: "center", width: "min(360px, 90%)" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 30, color: battle.outcome === "victory" ? "var(--good)" : "var(--ochre)" }}>
                {battle.outcome === "victory" ? "勝利!" : "撤退"}
              </div>
              <div className="sub" style={{ margin: "4px 0 12px" }}>{battle.log[battle.log.length - 1]?.text}</div>
              <button className="btn btn-primary" onClick={onFinish}>
                繼續
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="battle-bottom">
        <div className="hero-strip">
          {heroes.map((h) => (
            <button
              key={h.id}
              className={`hero-chip ${h.id === selectedId ? "sel" : ""} ${h.acted && !h.down ? "done" : ""} ${h.down ? "down" : ""}`}
              disabled={h.down}
              onClick={() => {
                if (!isPlayerTurn || h.acted) setInspectId(h.id);
                else selectHero(h);
              }}
            >
              <img src={portraitArt(h.id)} alt="" />
              <span className="bars">
                <span style={{ fontWeight: 600 }}>
                  {h.name} {hasStatus(h, "stun") ? "💫" : ""}
                  <span style={{ opacity: 0.7, fontWeight: 400 }}> {h.hp}/{h.maxHp}</span>
                </span>
                <span className="bar">
                  <i style={{ width: `${(h.hp / h.maxHp) * 100}%` }} />
                </span>
                <span className="bar">
                  <i style={{ width: `${(h.res / Math.max(1, h.maxRes)) * 100}%`, background: h.resource === "rage" ? "var(--rage)" : "var(--mana)" }} />
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
          <div className="actions grow">
            {selected && isPlayerTurn && !selected.acted ? (
              <>
                {selected.skills.map((id) => {
                  const sk = getSkill(id);
                  const cd = selected.cooldowns[id] ?? 0;
                  const ready = skillReady(selected, sk);
                  const fam = getFamily(getClass(getHero(selected.defId).classId).family);
                  return (
                    <button
                      key={id}
                      className={`btn skill-btn ${skillId === id ? "active" : ""}`}
                      disabled={!ready}
                      title={sk.desc}
                      onClick={() => {
                        setSkillId(id);
                        setArmed(null);
                      }}
                    >
                      <span className="ic">{sk.icon}</span>
                      <span className="nm">{sk.name}</span>
                      <span className="cost">{cd > 0 ? `冷卻 ${cd}` : sk.cost ? `${fam.resource === "rage" ? "怒" : "靈"} ${sk.cost}` : "普攻"}</span>
                    </button>
                  );
                })}
                <button className="btn skill-btn" onClick={() => advance(dispatch({ type: "WAIT", unitId: selected.id }))}>
                  <span className="ic">⏸</span>
                  <span className="nm">待命</span>
                  <span className="cost">結束行動</span>
                </button>
              </>
            ) : (
              <div className="sub" style={{ padding: "8px 4px", fontSize: 13, color: "var(--paper)" }}>
                {isPlayerTurn ? "點選英雄(或下方頭像)開始行動" : battle.outcome === "ongoing" ? "野獸行動中……" : ""}
              </div>
            )}
          </div>
          <button className="btn btn-moss" disabled={!isPlayerTurn} onClick={() => dispatch({ type: "END_TURN" })} style={{ flex: "none" }}>
            結束回合
          </button>
        </div>
      </div>
    </div>
  );
}
