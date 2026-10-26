"""Feather only the wrap edges of Figma's 2014/2024 2:1 can labels.

The original packaging PNGs remain untouched. Run with Pillow and NumPy installed.
"""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "img" / "history"
for year in (2014, 2024):
    source = ROOT / f"{year}packaging.png"
    output = ROOT / f"{year}packaging-uv.png"
    pixels = np.asarray(Image.open(source).convert("RGB"), dtype=np.float32).copy()
    height, width, _ = pixels.shape
    if width != height * 2:
        raise ValueError(f"{source.name}: expected a 2:1 UV source")

    feather = round(width * 0.05)
    for offset in range(feather):
        blend = 1 - offset / feather
        blend = blend * blend * (3 - 2 * blend)
        left = pixels[:, offset, :].copy()
        right = pixels[:, width - 1 - offset, :].copy()
        seam = (left + right) / 2
        pixels[:, offset, :] = left * (1 - blend) + seam * blend
        pixels[:, width - 1 - offset, :] = right * (1 - blend) + seam * blend

    Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), "RGB").save(output)
    print(output.relative_to(ROOT.parent.parent))
