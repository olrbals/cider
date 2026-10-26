# Rolling Can Animation (Blender)

**A fixed-camera, horizontally lying beverage can that rotates in place while its package design smoothly changes A → B → C → A.**

## What's in this repository

- [rolling_can.py](./rolling_can.py): **v1** — the first working can + continuous rotation. Kept unchanged as a backup.
- [rolling_can_v2.py](./rolling_can_v2.py): **v2** — same can movement + **three smoothly crossfading packaging images** (4-second seamless animation, 30 fps, 120 frames).
- `rolling_can_v01.blend` or `rolling_can_v02.blend`: **not uploaded yet**. These are Blender project files you save yourself.

## Step 1 — Prepare package artwork

Download/export the three package designs as **flat label images**, rather than photos of a can seen in perspective. PNG is recommended; ideally, each has the same pixel dimensions and layout.

Rename the files exactly:
- `package_a.png`
- `package_b.png`
- `package_c.png`

Put the three PNG files in **the same local folder as the Blender .blend file**. The images that were shown in ChatGPT are *not* transferred automatically to your PC or GitHub.

If your references are screenshots or realistic can mockups, first obtain/export the underlying flat packaging design; applying a perspective image as a UV label would distort it.

## Step 2 — Start a new Blender scene

1. Open Blender → **File → New → General**.
2. **File → Save As** → save `rolling_can_v02.blend` in the folder with the three PNGs.
3. On GitHub open [rolling_can_v2.py](./rolling_can_v2.py), click **Raw**, and copy the whole code.
4. In Blender choose **Scripting → New**, paste the code and press **Alt + P**.
5. Choose **Layout** and **Camera View** (numpad 0).
6. Enable **Material Preview** mode (the sphere icon at the top right of the 3D viewport) and press **Space** to play.

**Warning:** This code deletes every object in the current Blender scene. Always run it in a fresh scene or after making a backup.

## Step 3 — Troubleshooting image files

If the can turns **pink → green → blue** instead of showing your actual package designs, the program did not find your PNGs.

Check the spelling and location of all 3 files. Alternatively, edit the first lines of `rolling_can_v2.py`:

```python
IMAGE_FOLDER = r"C:\\Users\\yourname\\Downloads"
```

Replace it with the full folder location that actually contains your files. Do not put individual image file paths in `IMAGE_FOLDER`.

If you get odd wrapping, check that your design is a **flat can label**: the image's horizontal direction maps around the can's circumference and its vertical direction maps along the can's length. Adjust or rotate the PNG artwork before importing if needed.

## Step 4 — Save the work

After confirming the preview, **File → Save As** to save `rolling_can_v02.blend`. When images are found, the script tries to **pack them into the .blend** to make the project easier to move.

To continue on another computer, you can download this GitHub repository, create a new Blender scene, and run the v2 script with the three original PNGs alongside the saved .blend.

## Animation spec

- Camera: orthographic, fixed
- Can: position and apparent size fixed, X-axis rotation
- Motion: 360 degrees / 4 seconds, constant rotation speed
- Package transitions: smooth fade from A to B (frames 1-41), B to C (41-81), C to A (81-121)
- Export: frames 1-120, so the identical end frame 121 does not create a pause.

*The Blender script was authored for Blender 4.x–5.x APIs but has not been rendered/tested in the Blender application in this environment.*
