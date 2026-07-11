# Headless Grok task: WoT story backgrounds

Use the `imagine` skill and image tools. Generate project assets only; do not edit TypeScript, tests, docs, Git state, or existing images.

## Goal

Create twelve 16:9 story background illustrations under `public/assets/story/neolithic/`:

1. `fengbitou-landing.png` — Yao, Sora, and Mei land a dugout canoe beside a lagoon and light the first hearth.
2. `bajia-riverbank.png` — the same three settlers scout a fertile river terrace after floodwater recedes.
3. `nanguanli-east.png` — Taka, the violet ancestor-spirit necromancer, joins the first three near a wetland camp.
4. `nanguanli-lagoon.png` — the same four defend an early millet plot on a low hill above a brackish lagoon.
5. `wangliao-forest.png` — Nai joins the four and guides them through a misty forest-waterway using stars and shell navigation.
6. `niuchouzi-settlement.png` — Kavi joins and raises the central posts of a bamboo-and-thatch longhouse.
7. `dagangshan-quarry.png` — Luma joins at a foothill stone source with medicinal plants and polished-stone tools.
8. `taoziyuan-alliance.png` — Panu arrives mounted on a Formosan sambar deer at a hearth alliance gathering.
9. `fudingjin-hunt.png` — Sina joins beside the first stable pottery kiln while all nine heroes face an encircling rival clan.
10. `eluanbi-starfire.png` — all nine heroes light a coastal star-fire on the Hengchun peninsula before a storm.
11. `victory.png` — all nine heroes at sunrise overlooking a chain of peaceful early-Neolithic settlements from lagoon to southern cape.
12. `defeat.png` — all nine heroes retreat together through rain while protecting fire, seed, pottery, and the wounded; nobody is abandoned.

## Fixed visual references

- `public/assets/generated/allies-neolithic-sheet.png` is the canonical identity and costume sheet. Frame order is Yao, Sora, Mei, Taka, Nai, Kavi, Luma, Panu on sambar deer, Sina. Faces, hair, body proportions, costume colors, tools, magic colors, and deer appearance must remain recognizable and stable.
- `public/assets/generated/enemies-neolithic-sheet.png` is the canonical rival-clan sheet.
- `public/assets/generated/southwest-taiwan-neolithic-map.png` is the canonical environment and palette reference.

Use `image_edit`, not a fresh unconstrained `image_gen`, whenever recurring heroes appear. Start from the canonical ally sheet and reuse the first accepted three-person scene as an additional consistency reference for later scenes. Add only the newly introduced hero at each growth step. Do not redesign or substitute any protagonist.

## Art direction

Historical-fantasy early Neolithic southwestern Taiwan, premium cinematic 3D story illustration matching the chibi miniatures, plant fiber/bark cloth/hide/shell/bone/bamboo/wood/polished stone, subtropical lagoons/rivers/forest/coral hills. No metal, medieval armor, Chinese imperial architecture, modern objects, firearms, cannons, lighthouses, tiled cities, or ocean-going junks.

Keep essential characters within the middle 60% of the frame so desktop and portrait cover crops remain usable. Leave visually calm upper and lower bands for code-rendered UI overlays.

## Absolute text prohibition

These are background-only assets. Include no Chinese, no English, no letters, no numbers, no pseudo-writing, no labels, no title cards, no banners with symbols, no signs, no UI, no logos, and no watermark. If a generated image contains any text-like glyph, reject it and regenerate or edit it before saving.

## Validation and save rules

- Inspect every output before saving.
- Confirm correct cast count and identities for that chapter.
- Confirm no text-like marks and no anachronistic objects.
- Save final PNG files at the exact paths listed above.
- Preserve existing files; this is a new `neolithic/` directory.
- Finish with a concise list of created paths and any scene that could not meet identity consistency.
