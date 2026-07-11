# WoT Art Direction

## Visual System

The battle view uses 2D raster art to simulate a 3D tabletop battlefield. Logical axial hex coordinates remain unchanged; rendering compresses the vertical axis to `0.55` for a 45-degree isometric presentation.

- Terrain is rendered as thick hand-painted hex plates.
- Characters are full-body chibi miniatures with a shared elevated camera and upper-left key light.
- Depth ordering follows each tile or unit's projected screen Y position.
- The campaign uses a complete top-down antique maritime chart with illustrated relief rather than an angled battle projection.

## Generated Assets

The following assets were created with the built-in ChatGPT/Codex image generation tool for this project on 2026-07-11:

| File | Grid | Frame order |
| --- | --- | --- |
| `public/assets/generated/allies-neolithic-sheet.png` | 3x3 | Yao, Sora, Mei, Taka, Nai, Kavi, Luma, Panu on sambar deer, Sina |
| `public/assets/generated/enemies-neolithic-sheet.png` | 3x2 | Rival hunter, javelin thrower, rattan guard, sling thrower, clan chief, empty |
| `public/assets/generated/terrain-sheet.png` | 3x2 | Plain, Forest, Hill, Marsh, Village, Water |
| `public/assets/generated/southwest-taiwan-neolithic-map.png` | full image | early-Neolithic Tainan–Kaohsiung–Pingtung campaign region |
| `public/assets/story/neolithic/<stage-id>.png` | 16:9 | ten chapter-specific background-only illustrations |
| `public/assets/story/neolithic/victory.png` | 16:9 | nine-hero campaign victory background |
| `public/assets/story/neolithic/defeat.png` | 16:9 | nine-hero tactical retreat background |

The sprite sheets were generated on a flat `#ff00ff` chroma-key background. The project-local final PNGs use an alpha matte created with Codex's image-generation chroma removal helper. Original generated outputs remain in Codex's generated image store.

## Prompt Constraints

Character sheets require identical 45-degree cameras, equal grid cells, consistent feet baselines, full silhouettes, strong class palettes, and no labels or scenery. Materials are plant fiber, bark cloth, hide, shell, bone, bamboo, wood, and polished stone; deer cavalry uses a Formosan sambar deer. Terrain sheets require identical hex footprints, visible plate thickness, readable terrain silhouettes, equal grid cells, and no labels. The campaign map uses hand-inked relief, early-Holocene wetlands and estuaries, no embedded labels, and no modern or medieval objects.

New art should preserve these constraints so frames can be registered without manual per-character positioning.

The twelve active story backgrounds were generated through headless Grok Imagine using the ally sheet, enemy sheet, and continent map as locked references. Later scenes chain from accepted earlier scenes and add only newly introduced heroes. They contain no embedded text; Phaser renders all Traditional Chinese titles, narrative, objectives, ratings, and controls at runtime with device-pixel-ratio-aware text textures. Essential figures remain near the horizontal center for portrait cover crops. The reproducible Grok work orders are `docs/GROK_STORY_BACKGROUNDS.md` and `docs/GROK_STORY_BACKGROUNDS_FIX.md`.
