# Hero splash integration

The hero animation lives in `js/hero-splash.js` and `css/hero-splash.css`. Its selectors and CSS variables use the `hero-splash` / `hs-` namespace, and it creates no canvas. One hero-scoped GSAP ScrollTrigger supplies reversible scroll progress; the History trigger and the site-wide liquid and cursor effects retain their own lifecycle.

The hero is two viewports tall with a sticky one-viewport stage. At the first scroll the can remains upright while shrinking 10% and moving down 6.5% of the stage height. The opening is measured after that transform on each ScrollTrigger update, keeping the SVG jet attached to it. A continuous, translucent stem rises into three connected rounded tips with a few separate droplets. The jet then widens at the top; the liquid sheet is shown only when its uneven drips start descending, avoiding an early full-width line. The SVG edge is regenerated from smooth curves with staggered drips. White gradients and clipped backdrop layers give the jet and film clear, softly refracted depth without an opaque color fill. Near the end, the hero art clears and its green background brightens to white for the updated SEVEN STARS design. The existing CHILSUNG / CIDER art and stars stay in place.

If the global bubble branch is merged later, keep its canvas, listeners, and styles separate from this module. In particular, avoid styling `.hero-splash-effects` globally or reusing `--hs-*` variables. Exclude the hero from global rising bubbles. The reduced-motion preference leaves the original static hero and ordinary section scroll intact.

This integration preview includes commit `890bb6a`, which supplies the white background and green typography for SEVEN STARS. The hero ends on the same white background. The ambient carbonation module remains inactive until the hero has fully left the viewport.

Preview with `node experiments/serve-local.mjs`, then open `http://127.0.0.1:8767/index.html` and scroll from the top to SEVEN STARS. Check the product selector and the History 3D scene after the transition.
