# Hero splash integration

The hero animation lives in `js/hero-splash.js` and `css/hero-splash.css`. Its selectors and CSS variables use the `hero-splash` / `hs-` namespace, and it creates no canvas. One hero-scoped GSAP ScrollTrigger supplies reversible scroll progress; the History trigger and the site-wide liquid and cursor effects retain their own lifecycle.

The hero is two viewports tall with a sticky one-viewport stage. During its scroll range the can tab opens, a translucent jet and hero-only droplets rise, and a thin liquid sheet spreads across the top. Its SVG edge is regenerated from smooth curves with staggered, uneven drips. A matching clipped backdrop layer applies subtle blur and brightness only under the film. The live hero remains visible through the water. Near the end, the hero art clears and its background blends into the existing blue SEVEN STARS section. The can image remains upright and the existing CHILSUNG / CIDER art stays in place.

If the global bubble branch is merged later, keep its canvas, listeners, and styles separate from this module. In particular, avoid styling `.hero-splash-effects` globally or reusing `--hs-*` variables. Exclude the hero from global rising bubbles. The reduced-motion preference leaves the original static hero and ordinary section scroll intact.

Preview with `node experiments/serve-local.mjs`, then open `http://127.0.0.1:8767/index.html` and scroll from the top to SEVEN STARS. Check the product selector and the History 3D scene after the transition.
