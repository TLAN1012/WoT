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
import { CHAPTERS } from "./game/chapters";
import { getDifficulty } from "./game/difficulty";
import { gainXp, grantKeepsake, loadSave, newSave, writeSave, clearSave } from "./game/progress";
import type { BattleDef, BattleState, SaveState, StoryPage } from "./game/types";
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

const chapter = CHAPTERS[0];

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [save, setSave] = useState<SaveState | null>(null);
  const [story, setStory] = useState<StoryState | null>(null);
  const [battleDef, setBattleDef] = useState<BattleDef | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [result, setResult] = useState<{ result: BattleResult; gains: HeroGain[]; rewards: string[] } | null>(null);

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

  const openChapter = useCallback(
    (s: SaveState) => {
      if (!s.seenIntro.includes(chapter.id)) {
        setSave({ ...s, seenIntro: [...s.seenIntro, chapter.id] });
        playStory({ pages: chapter.intro, background: "title", title: chapter.title, subtitle: chapter.era, music: "b", then: () => setScreen("chapter") });
      } else setScreen("chapter");
    },
    [playStory],
  );

  const startBattle = useCallback(
    (def: BattleDef, skipIntro = false) => {
      if (!save) return;
      setBattleDef(def);
      const begin = () => {
        setBattle(initBattle(def, save));
        setScreen("battle");
      };
      if (skipIntro) begin();
      else playStory({ pages: def.intro, background: def.art, title: def.title, subtitle: def.subtitle, then: begin });
    },
    [save, playStory],
  );

  const finishBattle = useCallback(() => {
    if (!save || !battle || !battleDef) return;
    const r = battleResult(battle, battleDef.parTurns);
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
    const rewards = [...(firstWin ? [battleDef.reward] : []), ...r.drops];
    let next: SaveState = { ...save, heroes, stars };
    for (const id of rewards) next = grantKeepsake(next, id);
    setSave(next);
    setResult({ result: r, gains, rewards });
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
  }, [battleDef, result, playStory]);

  // ── 畫面 ──────────────────────────────────────────
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
          openChapter(s);
        }}
        onNew={(d) => {
          clearSave();
          const s = newSave(d);
          setSave(s);
          openChapter(s);
        }}
      />
    );
  }
  if (screen === "party") {
    return <PartyScreen save={save} onChange={setSave} onBack={() => setScreen("chapter")} />;
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
    return <ResultScreen title={battleDef.title} result={result.result} gains={result.gains} parTurns={battleDef.parTurns} rewards={result.rewards} winArt={battleDef.winArt} onNext={afterResult} onRetry={() => startBattle(battleDef, true)} />;
  }
  return (
    <ChapterScreen
      chapter={chapter}
      save={save}
      onBattle={(b) => startBattle(b)}
      onParty={() => setScreen("party")}
      onPrologue={() => playStory({ pages: chapter.intro, background: "title", title: chapter.title, subtitle: chapter.era, music: "b", then: () => setScreen("chapter") })}
      onEpilogue={() => playStory({ pages: chapter.epilogue, background: "sunrise", music: "b", then: () => setScreen("chapter") })}
      onTitle={() => setScreen("title")}
      onMusic={() => setScreen("music")}
    />
  );
}
