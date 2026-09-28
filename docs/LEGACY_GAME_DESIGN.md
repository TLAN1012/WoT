# Warlords of Takao - 南方祖記 Campaign Design

## Product Direction

Warlords of Takao is a short-session fantasy tactics game built around readable hex geometry, asymmetric professions, terrain-driven decisions, and campaign objectives that reward more than simple survival.

The campaign is a mythic retelling of early Neolithic settlement in the region now called Tainan, Kaohsiung, and Pingtung. It begins with three voyagers landing around seven thousand years ago and grows into a nine-person founding community across ten archaeological map nodes.

The names used on the campaign map are modern archaeological site names, not claimed reconstructions of the inhabitants' own place names; no written record preserves those names.

## Originality Boundary

The project borrows genre conventions, not protected expression. It does not reuse names, characters, art, audio, map layouts, dialogue, code, or data from Warlords of Aternum.

The following are treated as general tactics patterns:

- hex-grid movement and range
- small-squad deployment
- terrain-based cover, elevation, movement, and healing
- active and passive unit abilities
- short battles with optional performance goals
- a campaign map connecting tactical encounters

WoT's characters, rival clan, stage layouts, combat numbers, skills, UI, narrative, and soundtrack are original to this repository. Archaeological site names and broad cultural chronology are factual reference points.

## Research Summary

The reference video supplied for the project is a defensive PvP clear advertised as taking under two minutes without losing a regiment. That informed two product targets: battles should reach meaningful contact quickly, and keeping every ally alive should be a visible mastery goal.

InnoGames' public description of Warlords of Aternum identifies several structural strengths: up to five deployed regiments, mixed melee/ranged/magic roles, terrain-dependent outcomes, unique abilities, and compact mobile sessions. Its support documentation describes terrain as a strategic layer and shows examples such as forest damage reduction, hill attack bonuses, marsh movement interruption, villages that heal, and blocking water.

The WoT implementation rebalances and recombines these general ideas:

- Forest reduces incoming normal attack damage by 35%.
- Hill grants 25% attack power against a lower target.
- Marsh ends movement and increases incoming normal damage by 20%.
- Village restores 12% maximum health at the start of a round.
- Water blocks ground movement.

## Core Turn

1. Select one ready friendly regiment.
2. Move within its movement allowance, respecting water, occupied cells, and marsh stopping rules.
3. Attack a target in range, use the once-per-battle signature ability, or wait.
4. When all friendly regiments have acted, the enemy phase begins.
5. Villages heal surviving occupants when the next player round starts.

Damage begins with attack minus a portion of armor, then applies terrain and guarding modifiers plus a narrow variance band. This keeps displayed stats predictive without making repeated attacks identical.

Opening deployment is profession-driven: archers and casters begin on the rear map edge; shield-halberd and priest units form the second line; builders and deer cavalry deploy farther forward as they join. Hold objectives must visually match their narrative terrain—for example, Chapter IV's high-ground objective is an actual hill cluster.

## Player Regiments

| Regiment | Role | Signature ability | Tactical identity |
| --- | --- | --- | --- |
| 姚仁 | 盾戟兵 | 藤盾壁 | 以藤盾與石戟穩住陣線 |
| 林曦 | 弓箭手 | 烽火箭 | 遠距離區域攻擊 |
| 安湄 | 潮聲祭司 | 祖泉祝禱 | 回復附近盟友 |
| 塔卡 | 死靈法師 | 祖魂追擊 | 召喚祖魂遠擊 |
| 奈雅 | 航海法師 | 順潮風 | 操控潮風並引導航路 |
| 卡維 | 聚落築造師 | 竹壁工事 | 建立守勢工事 |
| 露瑪 | 草藥祭司 | 林息祝禱 | 強力群體治療 |
| 巴努 | 水鹿騎兵 | 鹿角奔襲 | 五格高機動突擊 |
| 希娜 | 窯火法師 | 陶窯烈焰 | 遠距離火焰區域攻擊 |

## Ten-Node Campaign

1. 鳳鼻頭遺址 — 三人登岸。
2. 歸仁八甲遺址 — 沿河尋找高地。
3. 南關里東遺址 — 塔卡加入，四人同行。
4. 南關里遺址 — 試種潮田。
5. 網寮遺址 — 奈雅加入，五人同行。
6. 牛稠子遺址 — 卡維加入，六人築長屋。
7. 大崗山遺址 — 露瑪加入，七人取得石材與草藥。
8. 桃子園遺址 — 巴努與水鹿加入，八人盟誓。
9. 覆頂金遺址 — 希娜加入，九人共同體成形。
10. 鵝鑾鼻第二史前遺址 — 九人在南方盡頭點亮星火。

## Audio Direction

The primary score uses four original MP3 tracks: `Banner_of_Takao` for campaign and briefings, `Frontline_Calculations` for battle, `Victory_Over_Takao` for victory, and `Failed_war` for retreat. Music begins preloading when a scene opens, shows a loading/interaction hint, and starts after the browser receives a user gesture. The earlier procedural Web Audio score remains as a fallback.

Friendly characters have individual two-note selection cues and distinct vocal pitch profiles. Every attack begins with a short synthesized battle cry, followed by role-specific melee, bow, sling, or ritual-magic sound. Movement and abilities retain separate procedural cues.

## Campaign Presentation and Difficulty

Every stage opens with a full-screen illustrated briefing containing the battle context, objective, and round limit. Battles end in a dedicated illustrated result scene; victory and retreat use different art, narrative copy, color accents, ratings, and audio cues.

The campaign remains tuned for approachability. Battles use 12–14 round limits, the party grows from three to nine, and stars reward victory, speed, and keeping every settler alive.

## Source Notes

- InnoGames newsroom, "Warlords of Aternum brings turn-based strategy to life on mobile like never before," August 8, 2018.
- InnoGames customer support, "Why are there different types of Terrain?"
- InnoGames customer support, "How can I use a regiment's Ability?"
- YouTube video `7sMzdMhJCEw`, supplied by the project owner as a pacing and battle-flow reference.
- National Museum of Prehistory, Taiwan Prehistoric Culture Cloud: Dapenkeng culture, Bajia, Fengbitou, and Niuchoutzu culture entries.
