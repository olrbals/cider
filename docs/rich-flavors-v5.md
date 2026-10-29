# RICH V5 — desktop Slosh motion

Base: PR #19 / 60009b24c6afec6b0a54201abefb6d33f57af15e.
Branch: codex/rich-flavors-v5-slosh-pop.

## Experience
- Retain the Figma 2026 message and source product/fruit assets.
- When the copy is fully revealed (14% of the section), hold for 720ms, then play an 820ms pop independently of wheel speed. Scrolling beyond 25.5% triggers the pop immediately. Deep jumps beyond 50% settle it immediately.
- Reset/reverse the burst when scrolling back above the copy threshold.
- Clear photographic water sheets sit behind the bottles; a masked lower splash crosses in front. Two separate ice layers translate, turn and scale independently.
- Retain a subtle settled splash/ice tableau after the impact.
- Peach enters at 51–66%, grape at 80–94%. Each entire scene is clipped by an asymmetric liquid edge. Bottle/fruit inertia and a slight outgoing slide reproduce the reference carousel language.
- Peach uses distorted pink checks; grape uses green/cream curved rays. Title bands and product names retain the Figma artwork.
- Previous/next buttons navigate the same scroll sequence and support keyboard focus. The final next button continues to the following section.
- Reduced motion uses discrete scene changes without timed motion.

## Assets
Generated using the built-in image_gen tool, with true alpha preserved:
- img/flavors/v5-water-ice.png
- img/flavors/v5-ice-cube.png
Vector patterns authored locally, not downloaded.
The supplied newFlavorReference.png guided material/lighting; product labels remain the existing Figma assets.

Generation prompts:
1. Production-ready transparent soda website asset: landscape, clear high-speed photographic water bursting into irregular thin curling liquid sheets, branching jets and droplets, empty central area for existing bottles, five clear irregular ice cubes near the outer edges, bright studio backlight. No bottles, fruit, labels, text, gradient or background; actual transparent alpha. The supplied image was used only as the material style reference.
2. Exactly one crystal clear irregular square ice cube, macro studio photograph, three-quarter angle, softly bevelled melting edges, tiny trapped bubbles/internal cracks, delicate silver-white specular highlights, colorless droplets, generous transparent margin. No backdrop, text, fruit, bottle or shadow plane; genuine alpha.

## Verification
- Desktop browser: timed pop completes after scrolling stops; actual water and ice render; peach → grape next button; grape → peach previous button; reverse scroll restores the duo.
- Browser console: no JavaScript errors during these flows.
- JavaScript parsing and git diff --check pass.
- Both photographic assets have RGBA alpha with fully transparent pixels.
- All referenced flavor images exist locally.
- index.html before/after the RICH section is identical to PR #19. No other existing source files were changed.
- Desktop is the requested acceptance target; mobile acceptance is excluded.
- Screenshot: screenshots/rich-v5-water-ice.jpg.

This implementation uses layered photographic sprites and vector clipping, rather than a real-time fluid simulation. The GIF establishes motion/composition; timing is adapted to the Figma products and scroll sequence.
