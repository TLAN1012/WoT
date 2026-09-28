/**
 * App — 畫面流程
 *
 *   標題 →(第一次)序章 → 章節地圖 ─ 出發:戰前劇情 → 戰鬥 → 結算 → 戰後劇情 →(最後一戰)終章 → 章節地圖
 *                                   └ 同伴(分配點數、看技能)
 * 進度即時寫入 localStorage;戰鬥中離開視同撤退。
 */
import { useCallback, useEffect, useState } from "react";
import { audio } from "./audio/audio";
import { pickTrack, type Variant } from "./audio/music";
import { battleResult, initBattle, type BattleResult } from "./game/battle";
import { chapterUnlocked, CHAPTERS, getChapter } from "./game/chapters";
import { getDifficulty } from "./game/difficulty";
import { addMaterials, addShards, gainXp, grantKeepsake, inherit, loadSave, newSave, recruit, writeSave, clearSave } from "./game/progress";
import { setArtGeneration } from "./ui/assets";
import { getHero } from "./game/heroes";
import { rollMaterials } from "./game/materials";
import type { BattleDef, BattleState, MaterialId, SaveState, StoryPage } from "./game/types";
import { BattleScreen } from "./ui/BattleScreen";
import { ChapterScreen } from "./ui/ChapterScreen";
import { MusicRoom } from "./ui/MusicRoom";
import { PartyScreen } from "./ui/PartyScreen";
import { ResultScreen, type HeroGain } from "./ui/ResultScreen";
import { StoryScreen } from "./ui/StoryScreen";
import { TitleScreen } from "./ui/TitleScreen";

type Screen = "title" | "chapter" | "party" | "story" | "battle" | "result" | "music";

interface StoryState {
  pages: StoryPage[];
  background?: string;
  title?: string;
  subtitle?: string;
  /** 劇情配樂版本(序章/終章用洞簫) */
  music?: Variant;
  then: () => void;
}

/** 繼續旅程:回到上次所在的章節(舊存檔則是同一代裡最新開放的章節,不會自動跨代) */
function resumeChapter(s: SaveState): string {
  if (s.lastChapter) return s.lastChapter;
  return [...CHAPTERS].reverse().find((c) => chapterUnlocked(c, s.stars) && c.generation <= s.generation)?.id ?? CHAPTERS[0].id;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [chapterId, setChapterId] = useState("ch1");
  const chapter = getChapter(chapterId);
  const [save, setSave] = useState<SaveState | null>(null);
  const [story, setStory] = useState<StoryState | null>(null);
  const [battleDef, setBattleDef] = useState<BattleDef | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [result, setResult] = useState<{
    result: BattleResult;
    gains: HeroGain[];
    rewards: string[];
    shards: Record<string, number>;
    materials: Partial<Record<MaterialId, number>>;
    tier: number;
  } | null>(null);

  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  useEffect(() => {
    // 手機瀏覽器對「算不算使用者手勢」的認定不一,全部掛上;切回前景時也試著喚醒
    const unlock = () => audio.unlock();
    const events = ["pointerdown", "touchend", "click", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && audio.unlock();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 依場合選曲(音樂室自己控制播放)
  useEffect(() => {
    if (screen === "music") return;
    let track = pickTrack("theme");
    if (screen === "story") track = pickTrack("story", story?.music);
    if (screen === "battle" && battleDef) track = pickTrack(battleDef.music.slot, battleDef.music.variant);
    if (screen === "result" && result) track = pickTrack(result.result.victory ? "victory" : "defeat");
    audio.playBgm(track);
  }, [screen, result, story, battleDef]);

  const playStory = useCallback((s: StoryState) => {
    if (!s.pages.length) return s.then();
    setStory(s);
    setScreen("story");
  }, []);

  /** 進入章節:跨入新的一代時先祖名傳承;第一次進入播序章 */
  const openChapter = useCallback(
    (s: SaveState, id: string) => {
      const ch = getChapter(id);
      if (ch.generation > s.generation) {
        const ok = confirm(
          `進入「${ch.title}」會進行祖名傳承:英雄換成第 ${ch.generation} 代,等級保留一半、點數全部退回重新分配(信物與足跡保留)。\n\n這一步不能回頭。想用第一代的六個人玩「間章」刷材料的話,請先玩夠再前進。\n\n確定要前往嗎?`,
        );
        if (!ok) return;
      }
      setChapterId(id);
      let next: SaveState = { ...inherit(s, ch.generation, ch.inheritFloor), lastChapter: id };
      if (!next.seenIntro.includes(ch.id)) {
        next = { ...next, seenIntro: [...next.seenIntro, ch.id] };
        setSave(next);
        playStory({ pages: ch.intro, background: "title", title: ch.title, subtitle: ch.era, music: "b", then: () => setScreen("chapter") });
      } else {
        setSave(next);
        setScreen("chapter");
      }
    },
    [playStory],
  );

  const startBattle = useCallback(
    (def: BattleDef, skipIntro = false, tier = 1) => {
      if (!save) return;
      setBattleDef(def);
      const begin = () => {
        setBattle(initBattle(def, save, undefined, tier));
        setScreen("battle");
      };
      if (skipIntro) begin();
      else playStory({ pages: def.intro, background: def.art, title: def.title, subtitle: def.subtitle, then: begin });
    },
    [save, playStory],
  );

  const finishBattle = useCallback(() => {
    if (!save || !battle || !battleDef) return;
    const trial = !!battleDef.material;
    const r = battleResult(battle, battleDef.parTurns, battleDef.xpScale ?? 1);
    // 試煉關卡:星數 = 打過的最高難度
    if (trial) r.stars = r.victory ? battle.tier : 0;
    const gains: HeroGain[] = [];
    const heroes = { ...save.heroes };
    for (const id of save.party) {
      const before = heroes[id];
      const g = gainXp(before, r.xp[id] ?? 0);
      heroes[id] = g.hero;
      gains.push({ before, after: g.hero, xp: r.xp[id] ?? 0 });
    }
    const firstWin = r.victory && !save.stars[battleDef.id];
    const stars = r.victory ? { ...save.stars, [battleDef.id]: Math.max(save.stars[battleDef.id] ?? 0, r.stars) } : save.stars;
    // 首勝獎勵信物 + 戰場掉落
    const rewards = [...(firstWin && battleDef.reward ? [battleDef.reward] : []), ...r.drops];
    let next: SaveState = { ...save, heroes, stars };
    for (const id of rewards) next = grantKeepsake(next, id);
    // 材料(試煉)
    const materials = r.victory && battleDef.material ? rollMaterials(battleDef.material, battle.tier, Math.random) : {};
    next = addMaterials(next, materials);
    // 足跡:首勝固定給;重玩隨機撿到 1~2 個還沒加入的族人的(試煉只在 2★ 以上有機會)
    const shards: Record<string, number> = {};
    if (r.victory && (!trial || (battle.tier >= 2 && Math.random() < 0.5))) {
      if (firstWin && !trial) Object.assign(shards, battleDef.shards.first);
      else {
        const pool = battleDef.shards.replay.filter((id) => !next.party.includes(id));
        if (pool.length) shards[pool[Math.floor(Math.random() * pool.length)]] = 1 + Math.floor(Math.random() * 2);
      }
    }
    for (const id of Object.keys(shards)) if (next.party.includes(id)) delete shards[id];
    next = addShards(next, shards);
    setSave(next);
    setResult({ result: r, gains, rewards, shards, materials, tier: trial ? battle.tier : 0 });
    setScreen("result");
  }, [save, battle, battleDef]);

  const afterResult = useCallback(() => {
    if (!battleDef || !result) return;
    if (!result.result.victory) {
      setScreen("chapter");
      return;
    }
    const last = chapter.battles[chapter.battles.length - 1].id === battleDef.id;
    playStory({
      pages: battleDef.outro,
      background: battleDef.art,
      then: () => (last ? playStory({ pages: chapter.epilogue, background: "sunrise", music: "b", then: () => setScreen("chapter") }) : setScreen("chapter")),
    });
  }, [battleDef, result, playStory, chapter]);

  // ── 畫面 ──────────────────────────────────────────
  setArtGeneration(save?.generation ?? 1);
  if (screen === "story" && story) {
    return (
      <StoryScreen
        key={story.pages[0]?.text}
        pages={story.pages}
        background={story.background}
        title={story.title}
        subtitle={story.subtitle}
        onDone={() => {
          const then = story.then;
          setStory(null);
          then();
        }}
      />
    );
  }
  if (screen === "music") {
    return <MusicRoom onBack={() => setScreen(save ? "chapter" : "title")} />;
  }
  if (screen === "title" || !save) {
    return (
      <TitleScreen
        hasSave={loadSave() !== null}
        onMusic={() => setScreen("music")}
        onContinue={() => {
          const s = loadSave();
          if (!s) return;
          setSave(s);
          openChapter(s, resumeChapter(s));
        }}
        onNew={(d) => {
          clearSave();
          const s = newSave(d);
          setSave(s);
          openChapter(s, "ch1");
        }}
      />
    );
  }
  if (screen === "party") {
    return (
      <PartyScreen
        save={save}
        onChange={setSave}
        onBack={() => setScreen("chapter")}
        onRecruit={(id) => {
          setSave(recruit(save, id));
          playStory({ pages: getHero(id).recruit!.story, background: "coast", title: `${getHero(id).name}加入了!`, then: () => setScreen("party") });
        }}
      />
    );
  }
  if (screen === "battle" && battle && battleDef) {
    return (
      <BattleScreen
        battle={battle}
        onChange={setBattle}
        onFinish={finishBattle}
        onRetreat={() => {
          if (battle.outcome !== "ongoing") return;
          if (confirm("撤退?這一戰算作失敗(經驗保留一半)。")) setBattle({ ...battle, outcome: "defeat", log: [...battle.log, { turn: battle.turn, kind: "info", text: "撤退" }] });
        }}
        title={battleDef.title}
        objectiveText={battleDef.objectiveText}
        allowUndo={getDifficulty(save.difficulty).allowUndo}
      />
    );
  }
  if (screen === "result" && result && battleDef) {
    return <ResultScreen title={battleDef.title} result={result.result} gains={result.gains} parTurns={battleDef.parTurns} rewards={result.rewards} shards={result.shards} shardTotals={save.shards} materials={result.materials} tier={result.tier} winArt={battleDef.winArt} onNext={afterResult} onRetry={() => startBattle(battleDef, true, battle?.tier ?? 1)} />;
  }
  return (
    <ChapterScreen
      chapter={chapter}
      chapters={CHAPTERS.map((c) => ({ id: c.id, title: c.title, unlocked: chapterUnlocked(c, save.stars) }))}
      onSwitch={(id) => openChapter(save, id)}
      save={save}
      onBattle={(b, tier) => startBattle(b, false, tier)}
      onParty={() => setScreen("party")}
      onPrologue={() => playStory({ pages: chapter.intro, background: "title", title: chapter.title, subtitle: chapter.era, music: "b", then: () => setScreen("chapter") })}
      onEpilogue={() => playStory({ pages: chapter.epilogue, background: "sunrise", music: "b", then: () => setScreen("chapter") })}
      onTitle={() => setScreen("title")}
      onMusic={() => setScreen("music")}
    />
  );
}
