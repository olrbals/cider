# RICH V13 refraction replacement

Base: `7d1539050311d649dcfd34825c1f22b5e00a176e` on `codex/rich-v13-refraction-idle-perf`.

## Implementation

- `liquid-gel-global.js` keeps the existing RICH refraction before progress `0.29`. At and after the cutoff it removes only the RICH filter target and prevents pointer injection, simulation, bitmap encoding, image upload and RAF scheduling. Reverse scrolling below the cutoff initializes the RICH field and restores the original interaction. Other targets use their unchanged paths.
- `rich-carbonation.js` owns one RICH-local Canvas 2D layer. A fixed-seed collision field derives every position and opacity from scroll progress, so reverse scrolling replays it exactly. PEACH and GRAPE share one continuing time-based detail stream with no scene reset.
- The detail stream paints at no more than 30fps, caps its backing DPR at `1.25` (`1` in low-power mode), caps particle count, pauses outside the RICH viewport and while the document is hidden, and disables itself for reduced motion.

## Browser validation

Chrome at `1680x938`, device DPR `2`:

- Progress `0.24997`: an actual pointer drag restored `url("#site-liquid-gel-filter")`.
- Progress `0.31002`: the RICH filter was `none` after another pointer interaction.
- Forward and reverse return below the cutoff restored the pre-collision pointer refraction.
- Collision, PEACH, PEACH-to-GRAPE and GRAPE states retained one Canvas and one continuous detail particle set. Text stayed readable and the PET rendered above the shared bubble layer.
- Scrolling offscreen set the RICH Canvas inactive; re-entry resumed the same singleton Canvas.
- A synthetic `webglcontextlost` event removed `rich-pet-ready`, restored the DOM fallback, retained one carbonation Canvas and produced no console error.
- Console warning/error scan was clean.

## Performance

The raw measurements are in `perf-chrome-dpr2.json`. The scenario was the same 6-second progress `0.70 -> 0.935 -> 0.70` loop with an active pointer stroke.

| | V13 baseline | Candidate |
|---|---:|---:|
| RAF fps | 19.17 / 20.50 | 46.00 / 41.33 |
| p50 interval | 50.0 / 50.0 ms | 16.7 / 16.7 ms |
| p95 interval | 66.8 / 66.7 ms | 33.4 / 50.0 ms |
| Frames over 33.4ms | 102 / 106 | 21 / 31 |
| RICH refraction image updates | 112 / 123 | 0 / 0 |
| Long Tasks | 3 / 0 | 1 / 7 |

The measured two-run RAF mean improved from `19.83` to `43.67fps`, and the removed refraction path performed zero image updates. Long Task counts varied enough that this report makes no Long Task improvement claim. RAF cadence is not GPU-presented FPS.
