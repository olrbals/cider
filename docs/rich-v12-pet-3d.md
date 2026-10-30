# RICH V12: actual 3D PET motion

Uses the user-supplied cider-3d-test.zip PET cross-section and peach/grape WebP sleeve images. Original upload is preserved. Existing bundled Three.js is reused; no CDN or new package is added.

Files: rich-pet-model.js builds the PET and UV sleeve, cap/seal/neck/base. Cap ridges use one instanced draw per PET. rich-pet-3d.js runs one transparent canvas for the intro and detailed product stages, reading the existing DOM choreography so existing layout, color fields, title slots and wave masks remain in place. rich-flavors.js forwards its progress after updating the DOM. Existing image nodes remain hidden fallbacks and geometry anchors.

Intro pairs drift off left together while a separate peach detail model enters, preventing a model teleport across scene boundaries. Flavor replacement overlaps outgoing peach/incoming grape on the old background. Both outgoing PETs bank left, pitch to reveal the top, and yaw toward the rear side (up to roughly 106 degrees). Grape final exit uses the last scroll interval. Incoming PETs show side/base perspectives and settle toward the front. All poses are driven by scroll; CSS inner floating is inherited through DOM anchors. Fruit uses alpha planes with front/back depth and original image textures.

Performance: DPR cap 1.35, approximately 30fps idle scheduling only inside the visible RICH section, single renderer, shared label texture promises, instanced ridges, no transmission/refraction pass. Four PET instances support scene overlap; only active instances are visible. Rendering suspends offscreen/hidden; failed setup retains DOM fallback; context loss restores fallback. No numerical physical-device FPS guarantee.

Checks: JS parse, existing forward/reverse wave and intro tests, new rich-pet-model.mjs geometry/dimensions/instancing tests. Browser inspected PET/fruit overlap on pink background, source sleeve labels, first-scene handoff and reverse movement, green end screen; one RICH canvas, no console errors. Fixed a late peach-fruit visibility leak found during final exit QA.

Limits: the label is the supplied wrap image, including its existing imagery/highlights; no new actual rear-label photography or five-lobed bottle base was supplied. Fruit remains planar artwork in 3D depth. Camera and trajectories are art-directed to the reference; this is not a claim of pixel-exact reconstruction of the Slosh model or its camera. Existing body min-width and unrelated global effects are retained.

Main and Production are unchanged. Branch codex/rich-v12-pet-3d-motion, based on V11 2bd5abd.
