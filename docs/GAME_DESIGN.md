# Warlords of Takao - Vertical Slice Design

## Product Direction

Warlords of Takao is a short-session fantasy tactics game built around readable hex geometry, asymmetric regiments, terrain-driven decisions, and campaign objectives that reward more than simple survival.

The first release is a vertical slice: three complete battles, a persistent campaign route, a four-character player roster, an enemy faction, procedural sound, and a reusable data format for adding regions and encounters.

## Originality Boundary

The project borrows genre conventions, not protected expression. It does not reuse names, characters, art, audio, map layouts, dialogue, code, or data from Warlords of Aternum.

The following are treated as general tactics patterns:

- hex-grid movement and range
- small-squad deployment
- terrain-based cover, elevation, movement, and healing
- active and passive unit abilities
- short battles with optional performance goals
- a campaign map connecting tactical encounters

WoT's Saltwind continent, Ash Fleet, Saltwind Company, named characters, stage layouts, combat numbers, skill designs, UI, and soundtrack are original to this repository.

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

## Player Regiments

| Regiment | Role | Signature ability | Tactical identity |
| --- | --- | --- | --- |
| Yao Ren, Harbor Warden | Vanguard | Breakwater | Durable anchor; halves incoming damage for two turns |
| Sora Lin, Sunshot Courier | Ranger | Signal Flare | Long-range area strike for clustered targets |
| Mei An, Tidebinder | Mystic | Returning Current | Restores nearby allies and sustains a defensive line |
| Taka Vey, Ridge Strider | Skirmisher | Gale Lunge | High-mobility finisher with a three-hex strike |

## Campaign Slice

### I. Cinder Gate

- Objective: eliminate every enemy regiment.
- Teaches: movement, attack range, forest cover, hills, villages.
- Stars: win; finish by round 7; lose no allies.

### II. Saltwind Crossing

- Objective: hold the bronze beacon for two full rounds.
- Teaches: positioning under pressure and deciding when not to chase enemies.
- Stars: win; finish by round 8; lose no allies.

### III. The Broken Lighthouse

- Objective: defeat Marshal Voss before the tenth round.
- Teaches: breaking a guarded formation and prioritizing the mission target.
- Stars: win; finish by round 7; lose no allies.

## Audio Direction

Music is generated at runtime with Web Audio and scheduled ahead for stable rhythm. Campaign mode layers a slow modal melody, low drone, plucked tones, and restrained frame drums. Battle mode uses a faster 16-step score with taiko-style percussion, bass movement, horn swells, and shifting melodic phrases.

Friendly characters have individual two-note selection cues and distinct vocal pitch profiles. Every attack begins with a short synthesized battle cry, followed by a role-specific melee, bow, tide-magic, or cannon sound. Enemy raiders, guards, artillery, and the commander use the same system with lower, more hostile voice profiles. Movement, abilities, victory, and defeat retain separate cues. All sound is original procedural synthesis; no third-party recording is distributed.

## Source Notes

- InnoGames newsroom, "Warlords of Aternum brings turn-based strategy to life on mobile like never before," August 8, 2018.
- InnoGames customer support, "Why are there different types of Terrain?"
- InnoGames customer support, "How can I use a regiment's Ability?"
- YouTube video `7sMzdMhJCEw`, supplied by the project owner as a pacing and battle-flow reference.
