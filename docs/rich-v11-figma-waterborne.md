# RICH V11: waterborne meeting and color bloom

Base ce2188a; branch codex/rich-v11-figma-waterborne. Figma file Ja8Ep1JwxOOFgMArfYr16T, page 1180:2687; specific implementation frames 1347:172 (before) and 1347:186 (after). Both high-fidelity design contexts and screenshots were inspected. Session 5687be37-b0ff-4508-9ab9-10359090ef5f.

Six product/fruit slots interpolate between the Figma inner image dimensions, centers, rotations and opacity. Both flavors approach from opposite sides, with a small scroll-linked swell and subtle inner CSS rocking. There is no high-speed impact or independent impact timer.

Master scroll stages: .19–.275 approach from opposite sides; .29–.375 meet and grow toward the after layout; .335–.44 source before/after blurred color fields crossfade and the viewport tint develops; .36–.465 three source foreground fruit layers enlarge/fade in at cropped canvas edges. Foreground opacity endpoints .48/.52/.56 match Figma. Blur 6/9/9px adds the requested out-of-focus interpretation while the bottles stay sharp. All phases reverse with scroll. The whole peach uses the source vertical reflection. Ice and water streams are absent.

The six PNGs and four source SVGs are saved in img/flavors/v11-*. Source URLs are not referenced at runtime. The original screenshot is not used as an implementation image. SVG intrinsic root dimensions are retained.

Verification: JavaScript parsing and git diff --check pass. Tests cover finite wave and intro values at 1,001 samples, exact reverse replay, opposite entry directions, meet-before-color ordering and final opacity states. Browser checked before state at p=.28014 (ink 0, foreground opacity zero), after p=.48014 (ink 1, opacity .48/.52/.56), reverse restoration, no missing images, no JS errors, and continuity into existing peach detail. Screenshots: rich-v11-before.jpg and rich-v11-after.jpg.

HTML outside the first intro scene is identical to base. Existing detailed product stages, Hero, Seven Stars, Feel the Fizz and History remain as before. No main merge or Production deployment.

This is an art-directed 2D depth-of-field treatment, not a camera/3D simulation. Large foreground fruit have bounded CSS blur; they pause outside the relevant stage. No additional rendering library or generated asset was introduced.
