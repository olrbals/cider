# RICH V13 refraction optimization — 2026-10-30

Base e6806f8. Local branch codex/rich-v13-refraction-perf. No push, PR, preview deployment, main merge or Production change.

## Implementation

Only production change: js/liquid-gel-global.js. Scoped to .rich-flavors__viewport. Strict33ms image upload budget while simulation remains RAF-driven; byte-identical quantized RGB fields skip image replacement; settled RICH engine stops scheduling until input wakes it. Replace RICH canvas.putImageData → toDataURL(PNG) with a lossless24-bit top-down BMP assembled directly from the same CPU RGBA array and base64 passed to the existing feImage. No canvas readback or PNG encoder for RICH. Other sections retain their original PNG/update path. No libraries. No change to PET, simulation equations,180px map width, displacement scale, filter bounds116%, scroll timeline or input strength.

Minimum candidate (strict cadence/dedup only) measured separately before choosing the bitmap transport. SVG processing/decoding/base64 remain; this is not a GPU-only renderer or an image-upload-free architecture. Filter bounds were reviewed and retained to avoid clipping at large user-selected refraction values.

## Controlled comparison

Installed Chrome headless; isolated context DPR1,1920×1080; real PET script retained. Each variant loaded on a fresh document, same1.2s warmup and6s scripted scroll .70→.935→.70 with pointer movement. Order baseline/minimum/bitmap/bitmap/minimum/baseline. Original instrumentation around RAF, Long Tasks and serialization retained; an additional wrapper measures entire map-generation/update call. PET timing fields are zero because this harness does not instrument PET; they do NOT mean PET was disabled. Reported fps is RAF cadence, not displayed GPU FPS.

| Variant | RAF fps first/repeat | p95 frame ms first/repeat | Long Tasks first/repeat | PNG calls first/repeat | PNG blocking ms first/repeat | Map update ms first/repeat |
|---|---:|---:|---:|---:|---:|---:|
|baseline|54.9 / 59.4|33.3 / 16.8|5.0 / 0.0|331.0 / 358.0|2384.2 / 2435.7|2588.9 / 2628.5|
|minimum|59.6 / 59.6|16.8 / 16.8|0.0 / 0.0|180.0 / 180.0|959.4 / 927.3|1077.1 / 1032.7|
|bitmap|59.8 / 59.8|16.8 / 16.8|0.0 / 0.0|0.0 / 0.0|0.0 / 0.0|328.2 / 332.4|

1280×720,DPR1: baseline RAF58.8/59.4fps; bitmap59.8/59.8fps. All p95 frame16.8ms. Map update baseline2135/2196ms, bitmap320/331ms per6s.

DPR2 IAB exploratory run1920×1080: baseline12.3/12.7fps; minimum15.6/14.4; bitmap21.6/22.1. These are not directly comparable to headless/DPR1 and remain far from60. Original severe high-resolution lag is improved, not eliminated.

## Separate Performance trace

Two additional1920×1080,DPR1 single-variant runs under Chrome CDP Tracing; excluded from timing table to avoid profiling overhead. Baseline RasterImplementation::ReadbackImagePixels326 calls,2059.43ms inclusive; bitmap has no matching events. Baseline image-decoder frame events331 /130.05ms, bitmap185 /73.72ms. FunctionCall inclusive totals4767.14→3012.21ms. Nested/multi-thread event times cannot be summed or interpreted as exclusive CPU/GPU utilization. GPU completion/kernel timings and physical laptop presented FPS are unmeasured. Trace summaries retained here; full local traces at experiments/perf-v14/trace-baseline.json and trace-bitmap.json. Raster work, layout and full-surface SVG filter remain; no isolated SVG-filter timing was available.

## Visual and functional checks

The production bitmap encoder is unit tested for exact RGB order, negative height/top-down rows, odd-width padding, sizes, duplicate-map suppression and no RICH canvas readback. Fixed-map browser SVG output PNG versus production-encoded BMP:400×250 comparison,0 differing RGB pixels (parity-final.png: PNG left,BMP middle,unfiltered right). This tests spatial appearance, not temporal equivalence under arbitrary input. Actual product p=.82006, same pointer path: original and optimized screenshots reviewed; optimized feImage BMP, filter active, scale65.00. Idle animation means captures are not pixel-identical; no claim otherwise. Native scroll forward/reverse .935,.74,.9,.76,.82 and viewport1440×900→1920×1080 passed without page errors. No output video recorded. Other sections preserve their original path by code scope; complete unrelated-section regression was not repeated.

Existing wave reverse/coverage tests and PET geometry tests pass. JS parses, git diff --check passes. Static HTML/JS repository has no package.json/build script, so there is no bundler build to run; browser module loading and syntax/tests were used. No measurement hooks in production entrypoints. All benchmark engines, scripts and traces remain local untracked experiments; deployment entrypoints contain none.

## Limits and next work

Chrome/Chromium browser behavior validated; other engines untested. Base64 strings and SVG image decode/filter still cost time and allocate memory. High-DPR full-frame filtering remains the dominant unresolved cost; reducing that while preserving live DOM requires a separately scoped compositing design. No60fps guarantee or universal improvement multiplier. Source image assets unchanged.