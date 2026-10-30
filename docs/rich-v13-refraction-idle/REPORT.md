# RICH refraction follow-up

Base d0be1a3 (the current Preview). Scope: RICH only. Preserve PET geometry/materials/renderer settings, map resolution, ripple equations, strength65, stroke handling and scroll sequence.

## Selected change

A neutral field still left a full-screen SVG filter attached. RICH now tracks the actual quantized red/green field: if every pixel is128, it bypasses the neutral filter and bitmap update; any non-neutral pixel restores the full filter. Unchanged non-neutral ripples keep filtering: no timer, energy cutoff, quiet-mouse shortcut or viewport-local cutoff is used to erase a tail. Existing neutral128 previously caused a uniform~0.127CSS-pixel shift at default strength65; bypassing it removes that tiny uniform shift as well. Non-neutral field pixels and strength are unchanged.

CSS confines the RICH layout/paint/style work to its existing viewport and hints the filter composite. DOM photo/intro anchors hidden behind the real3D representation now use visibility:hidden so they retain layout/geometry without redundant shadows/paint. Context-loss fallback still removes rich-pet-ready, restoring these originals.

## Measurements and decisions

Same6s progress .70→.935→.70. Stationary mouse variant: synthetic pointer event at the same fixed position every frame (no artificial ripple),1.2s warmup. Order baseline/new/new/baseline. IAB actual1920×1080,DPR1, baseline32.1/40.1 RAF fps,p95 100.1/66.7ms; new45.3/42.3fps,p95 50.1/66.7ms. Strong variability remains: no universal uplift claim. All4 runs had0 Long Tasks. This specifically verifies scrolling with a neutral ripple field, not active-ripple speed.

A separate active IAB sequence was throttled to~1fps with~1001ms RAF intervals; it is excluded from performance conclusions (local active-iab.json retained for diagnosis).

Exploratory active Chrome DPR2 cache-only comparison: baseline59.1/59.8,new59.8/59.8fps. No meaningful steady-state gain claim for this isolated CSS component. Whole candidate active-ripple comparison recorded separately when available. RAF cadence is not GPU-presented FPS; hardware GPU completion time was not measured.

Rejected: ROI flood/composite approach slowed IAB1920×1080,DPR2 from34.1/36.3 to17.4/17.8fps. The tail expanded most of the viewport and added compositing passes. Split DOM/PET filter approach1280×720,DPR2 had inconsistent32.6/53.4 baseline versus41.1/32.1 split. Neither is in production code. These exploratory figures were read from tool output; no full raw ROI file was recovered after its temporary browser tab expired.

## Validation

Production QA in Chrome1920×1080,DPR2: neutral filter none; pointer stroke restores original filter at65.00; tail remains filtered after500ms; reset bypasses; reverse/forward progress checks;1440×900 resize then1920×1080 and return to RICH restores mouse ripples. No page errors. Changing viewport height can reposition the page into the footer because the existing preceding section heights change; the test explicitly returned to the same RICH progress after resizing. No claim of scroll-anchor preservation.

Unit tests cover no-neutral uploads, changed ripple uploads, unchanged ripple retains filter, return to neutral bypasses, lossless bitmap dimensions/RGB/stride. Existing wave/reverse and PET geometry tests pass. Static site, no package build script: syntax and browser loading checked. No measurement code added to production.

## Remaining limitation

When a non-neutral wave is active, full-screen SVG displacement is still required and can be slow on high-DPR/in-app environments. This change improves the needless neutral-state cost; it does not claim to solve all active-wave lag or guarantee60fps. A complete shared GPU scene compositor would be a larger visual architecture change and was not slipped into this patch.


Final active Chrome1920×1080,DPR2 comparison: original58.6/59.8fps, candidate59.8/59.6fps, all p95 16.8ms. One candidate run had a51ms Long Task. This is no clear steady-state speed gain; the change avoids unnecessary neutral work without claiming faster full-field displacement.

Also coordinated the existing native scroll queue with PET idle RAF: queue() cancels an already-pending idle PET callback before the scroll pose render. The scroll update still renders synchronously with the DOM/background and restarts idle floating afterward. No extra listener or timer added, no geometry/material/quality change. This prevents an avoidable idle-then-scroll double render when both callbacks were queued; its isolated FPS impact is not measured. Existing model material and renderer dimensions remain unchanged.
