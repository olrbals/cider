# RICH V6 motion verification

Base: 093c208 (PR #20). New branch codex/rich-v6-fluid-choreography.

## Analysis and implementation
Reference: supplied 120-frame Slosh GIF; frames 28–56 inspected as a contact sheet. A leading lobed color field precedes the new bottle, old and new bottles overlap, and the outgoing bottle rolls left before the next title settles. The user mentions a current implementation video, but no additional local video attachment was supplied in this turn; current behavior was inspected in source and browser.

Existing RICH used a native scroll event + requestAnimationFrame controller, not a GSAP timeline. Hero/History have separate GSAP/Three.js controllers. Keep the existing controller boundary: the RICH normalized scroll position is now the single master playhead, with no wall-clock delays or autonomous burst loop. One passive scroll listener, one queued RAF at most; zero RAF work after settling without input. Existing global cursor and ambient effects remain independent as before.

1. Wave: nonperiodic staggered row timings, rounded cubic contours, three leading sheets that merge into the main mask; whole-scene masking retains the underlying scene during overlap. Exact full/empty endpoint masks.
2. Rolling: bottle displacement and roll angle share a 310px effective rolling radius; fruit shares the motion envelope with smaller rotation. Small terminal rebound; previous product exits underneath the incoming scene. This is 2D image rotation, not true 3D axial bottle rotation.
3. Collision: contact at 31% master progress; eight independently growing/thinning SVG liquid sheets, three front copies for depth, 22 deterministic droplets, five reused alpha ice sprites with independent rotation and ballistic gravity paths. Everything fades by 44.7%. Original large splash photograph and old static splash SVG removed from runtime markup.
4. Color: collision background is a viewport-sized pink/lime CSS gradient independent of artwork scale. Existing patterns remain with reduced contrast. Product images/layout/text are retained.

## Verification
- Node syntax check and tests/rich-motion-v6.cjs pass.
- 2,002 finite wave samples, exact reverse geometry, coverage endpoints.
- Collision sampled forward/back at 1,001 positions: identical state, finite trajectories; ice absent before contact and after settling.
- Browser: small wheel increments, normal scroll, rapid jump to grape and reverse, repeated forward/back; no JS console errors. Stopped product/ice/path attributes compared equal across observations. Five ice sprites / eleven liquid paths remain constant (8 back + 3 front); no recreation on scroll.
- 1366x768 laptop viewport verified: RICH viewport bounds x=0, width=1366, full gradient. 390x844 mobile collision and transition smoke check completed; existing site body still has its legacy 1100px minimum width outside this bounded stage.
- HTML before/after RICH is identical to base; only RICH HTML/CSS/JS plus tests/docs/screenshots changed. No main merge or Production deployment.
- Static project has no package build step; JS parsing, geometry tests, asset existence and browser rendering are the applicable gates.

## Limits
Procedural liquid is a lightweight art-directed SVG approximation, not physically simulated or optically refracted water. Device-size emulation is not a measured physical laptop GPU benchmark; no numerical FPS guarantee. Existing global gel/cursor/ambient controllers may still contribute to GPU cost. Rolling uses the existing flat bottle asset; label sides/back are not reconstructed.
