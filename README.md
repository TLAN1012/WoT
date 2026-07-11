# Warlords of Takao

An original, browser-based hex tactics campaign set in a fantasy retelling of southwestern Taiwan around seven thousand years ago.

WoT takes inspiration from the short-session tactical clarity of mobile hex games while using its own setting, cast, maps, abilities, mission rules, visual language, and procedural soundtrack.

## Playable Slice

- Ten campaign nodes based on real archaeological site names across present-day Tainan, Kaohsiung, and Pingtung
- A founding party that grows from three settlers to nine asymmetric heroes
- Physical, magical, priestly, necromantic, and deer-cavalry professions
- Forest, hill, marsh, village, water, and plain terrain rules
- Move-then-attack turns with deterministic range and path rules
- Enemy AI that advances, uses terrain, and prioritizes vulnerable targets
- One-to-three-star ratings for victory, speed, and survival
- Persistent local campaign progress
- Responsive desktop and mobile layouts
- Four original MP3 tracks for campaign, battle, victory, and retreat, with Web Audio fallback and loading status
- Full-screen illustrated briefings for all ten battles and distinct victory/retreat result scenes
- Background-only story art generated through headless Grok; all Traditional Chinese copy is rendered by Phaser for crisp display and easy editing
- More forgiving campaign balance with lower enemy durability and damage plus wider round limits
- Hand-painted isometric terrain and 2D-rendered 3D miniatures generated for this project
- A large antique relief map of an early-Neolithic Tainan–Kaohsiung–Pingtung landscape

## Run Locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Click or tap once to unlock audio in the browser.

## Quality Checks

```bash
npm test
npm run build
npm run test:e2e
```

## Controls

Choose a stage to review its illustrated battle briefing, then begin the tactical map. Select a friendly regiment, choose a highlighted destination, then select an enemy in range. A regiment may move once and attack once per round. Each signature ability can be used once per battle.

## Design Notes

The original game design, source references, combat rules, campaign structure, and content boundaries are documented in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

The generated asset layout, frame mapping, and art direction are documented in [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

## License

MIT
