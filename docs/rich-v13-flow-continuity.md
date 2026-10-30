# RICH V13 flow continuity

Branch: codex/rich-v13-flow-continuity. Base: V12 4f695ba. Main/Production untouched.

Compared supplied 8.5s recording against 4.08s Slosh recording via 12 timestamped frames each. Reference: narrow tongues precede the incoming body, outgoing product overlaps incoming product, name swaps during that overlap, broad background follows. Recording: duplicate peach around 4.5s; last grape absent around 7.3s.

rich-flavors.js: seven independently delayed cubic/quadratic tongues connected to a rounded advancing body, existing actual background artwork revealed through SVG paths. Same path winding prevents overlapping masks from cancelling. Full coverage endpoint. Peach background .46–.65, grape lead .735, grape product .745–.895, name .775–.855, background complete .91. One native scroll callback and progress value retained. Foreground bloom reduced in size/opacity/blur.

rich-pet-3d.js: one persistent peach mesh interpolates position, scale and bank between duo and detail anchors. Duplicate detail mesh is never displayed. Grape entry uses shallow lift, restrained pitch/yaw/bank; peach exit has at most .65 rad added yaw. Grape stays through the end; existing next-section wave covers it. Idle buoyancy retained, reduced-motion skips idle and snaps handoff/entry/exit. Existing bounded renderer and texture sharing preserved.

Validation: parse; 2002 wave samples including exact reverse; 1001 intro forward/reverse states; 3D geometry tests. Browser: duo/detail handoff, overlapping flavors and title, end grape retained, reverse/forward, 390×844 resize and reset. No new runtime errors observed. Existing global horizontal content overflow is measurable at mobile width (body scrollWidth 1308 on viewport 390); not changed because unrelated sections own that layout. No claim of physical laptop FPS or pixel-identical reference camera/physics. Full-frame SVG refraction remains enabled as explicitly requested, so GPU cost remains device-dependent.
