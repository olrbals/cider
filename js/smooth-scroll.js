/* 11-07 — smooth, scene-by-scene scrolling.
   ① From the principles page on, one wheel gesture = one step: the page
      glides (eased, ~0.6–1.1s) to the next resting point of the story —
      each principle word, the recap, FIZZ, SEVEN STARS, the white line,
      every history era, the RICH beats and the footer. Further wheel
      events of the same gesture (trackpad inertia, fast spins) are absorbed.
   ② Above that (the hero holds its own sequence) wheel steps are eased so
      scroll-driven scenes never judder.
   Keyboard, scrollbar and touch keep the browser's native behaviour. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $ = id => document.getElementById(id);
  const vh = () => innerHeight;
  const absTop = el => el.getBoundingClientRect().top + scrollY;
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

  // ---- resting points (absolute scrollY), recomputed on every gesture ----
  let slowStops = new Map();
  function stops() {
    const out = [];
    slowStops = new Map();
    const span = el => Math.max(1, el.offsetHeight - vh());
    const bv = $('brand-values');
    if (bv) { const t = absTop(bv), r = span(bv); [0, .06, .40, .645, .9].forEach(p => out.push(t + r * p * .85)); out.push(t + r * .965); }   // + lemon-lime copy
    const ko = $('korea'); if (ko) out.push(absTop(ko));
    const id = $('identity');
    if (id) {
      const t = absTop(id), r = span(id), hold = vh() * .7, base = Math.max(1, r - hold);
      out.push(t, t + base * .14, t + base * .32, t + base * .70 + hold * .5);   // SEVEN STARS · white star · seven stars · white line
      // the star story plays through these steps
      slowStops.set(Math.min(maxY(), Math.round(t + base * .14)), 950);
      slowStops.set(Math.min(maxY(), Math.round(t + base * .32)), 1350);
      slowStops.set(Math.min(maxY(), Math.round(t + base * .70 + hold * .5)), 1500);   // fizz → white, ~2.4s
    }
    const hi = $('history-3d');
    if (hi) { const t = absTop(hi), r = span(hi); for (let i = 0; i < 8; i++) out.push(t + r * (i / 8 + (i ? .006 : 0))); }
    const rich = $('rich-flavors');
    if (rich) { const t = absTop(rich); [.9, 1.7, 2.95].forEach(s => out.push(t + vh() * s)); }
    const ft = $('footer'); if (ft) out.push(absTop(ft));
    return out.map(y => Math.min(maxY(), Math.round(y))).sort((a, b) => a - b);
  }

  // ---- shared animation state ----
  let mode = null;            // null | 'ease' | 'glide'
  let target = scrollY, current = scrollY, raf = 0, last = 0;
  let glide = null, lastWheel = 0, gestureUsed = false;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function frame(now) {
    raf = 0;
    if (mode === 'glide' && glide) {
      const k = Math.min(1, (now - glide.t0) / glide.dur);
      scrollTo(0, glide.from + (glide.to - glide.from) * easeIO(k));
      if (k < 1) { raf = requestAnimationFrame(frame); return; }
      glide = null; mode = null; window.__chilsungGlide = false;
      target = current = scrollY;
      return;
    }
    if (mode === 'ease') {
      if (Math.abs(scrollY - Math.round(current)) > 2) { mode = null; target = current = scrollY; last = 0; return; }
      const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
      last = now;
      current += (target - current) * (1 - Math.exp(-dt * 11));
      if (Math.abs(target - current) < .5) current = target;
      scrollTo(0, current);
      if (current !== target) raf = requestAnimationFrame(frame);
      else { mode = null; last = 0; }
    }
  }
  function startGlide(to) {
    const from = scrollY, dist = Math.abs(to - from);
    if (dist < 3) return false;
    glide = { from, to, t0: performance.now(), dur: to > from && slowStops.has(Math.round(to)) ? slowStops.get(Math.round(to)) : Math.min(1100, 560 + dist * .3) };
    mode = 'glide'; window.__chilsungGlide = true;
    if (!raf) raf = requestAnimationFrame(frame);
    return true;
  }

  addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest && e.target.closest('textarea, select, [data-native-scroll]')) return;
    const now = performance.now();
    const newGesture = now - lastWheel > 160;
    lastWheel = now;
    if (mode === 'glide') { e.preventDefault(); return; }      // absorb while gliding
    if (e.defaultPrevented) return;                              // hero / other scenes own it
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const list = stops();
    const y = scrollY;
    const inStory = list.length && y >= list[0] - 4 && y <= list[list.length - 1] + 4;
    if (inStory) {
      e.preventDefault();
      if (!newGesture && gestureUsed) return;                    // one step per gesture
      const next = dir > 0 ? list.find(s => s > y + 6) : [...list].reverse().find(s => s < y - 6);
      if (next !== undefined) { gestureUsed = true; startGlide(next); return; }
      if (dir < 0) { gestureUsed = false; mode = null; }         // above the first stop: fall through to easing
      else return;
    } else gestureUsed = false;
    // Eased free scrolling (hero region and anywhere outside the story).
    e.preventDefault();
    if (mode !== 'ease') { target = current = scrollY; last = 0; }
    const unit = e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? innerHeight : 1;
    target = Math.max(0, Math.min(maxY(), target + e.deltaY * unit));
    // Don't ease past the first resting point: land on it, then step from there.
    const first = list[0];
    if (first !== undefined && y < first - 4 && target > first) target = first;
    mode = 'ease';
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });
  // A new gesture is allowed again once the wheel has been quiet briefly.
  setInterval(() => { if (performance.now() - lastWheel > 160) gestureUsed = false; }, 120);
})();
