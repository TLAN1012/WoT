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
| `public/assets/generated/allies-sheet.png` | 2x2 | Yao, Sora, Mei, Taka |
| `public/assets/generated/enemies-sheet.png` | 3x2 | Ember Raider, Salt Archer, Mire Guard, Ash Cannoner, Marshal Voss, empty |
| `public/assets/generated/terrain-sheet.png` | 3x2 | Plain, Forest, Hill, Marsh, Village, Water |
| `public/assets/generated/saltwind-continent-map.png` | full image | complete Saltwind Continent |

The sprite sheets were generated on a flat `#ff00ff` chroma-key background. The project-local final PNGs use an alpha matte created with Codex's image-generation chroma removal helper. Original generated outputs remain in Codex's generated image store.

## Prompt Constraints

Character sheets require identical 45-degree cameras, equal grid cells, consistent feet baselines, full silhouettes, strong class palettes, and no labels or scenery. Terrain sheets require identical hex footprints, visible plate thickness, readable terrain silhouettes, equal grid cells, and no labels. The continent map requires the entire coastline to remain visible, hand-inked relief, parchment materials, no labels, and no modern objects.

New art should preserve these constraints so frames can be registered without manual per-character positioning.
