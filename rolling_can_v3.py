# rolling_can_v3.py - Chilsung Cider 1950/1960 packaging from 칠성.zip
# CAUTION: This script deletes all objects in the CURRENT scene.
# Make a new .blend file first. Keep original rolling_can_v02.blend backed up.
# Place 칠성.zip in the SAME folder as your .blend file.
# File > Save As > rolling_can_v03.blend before running this script.
# Then Blender > Scripting > New > paste code > Alt+P.
#
# The zip must include:
#   칠성/img/1950packaging.png
#   칠성/img/1960packaging.png
# Only these labels are used for the can; backgrounds will be used on the web.
# Four-second loop: 1950 -> 1960 -> 1950; position/camera fixed.

import bpy
import math
import os
import zipfile
from mathutils import Vector

# Keep "칠성.zip" beside your saved .blend project.
# Alternatively supply its containing folder, e.g. r"C:\\Users\\name\\Downloads"
ZIP_FOLDER = ""
ZIP_FILENAME = "칠성.zip"
FILES = {
    "A": "1950packaging.png",
    "B": "1960packaging.png",
}
# Offset the label UV so the middle of each design is visible from camera.
LABEL_U_OFFSET = 0.30

# Clear the current scene ONLY, not materials or images in other files.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120  # frame 121 repeats frame 1; exclude it in a loop export
scene.render.fps = 30
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

def basic_mat(name, color, metallic=0.0, roughness=0.4):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

metal = basic_mat("Metal rims", (0.68, 0.72, 0.77), 0.82, 0.24)
floor_mat = basic_mat("Studio floor", (0.83, 0.85, 0.88), 0.0, 0.7)

# Both geometry and texture revolve around this one fixed X-axis pivot.
pivot = bpy.data.objects.new("CAN_ROTATION", None)
bpy.context.collection.objects.link(pivot)
pivot.location = (0, 0, 0.55)

def make_cylinder(name, radius, depth, x, mat, uv_label=False):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=128, radius=radius, depth=depth,
        calc_uvs=True, location=(0, 0, 0)
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = pivot
    obj.location = (x, 0, 0)
    obj.rotation_euler.y = math.radians(90)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Round metallic edges", 'BEVEL')
    bevel.width = 0.018 if uv_label else 0.014
    bevel.segments = 3
    for face in obj.data.polygons:
        face.use_smooth = (len(face.vertices) == 4)

    if uv_label:
        # Explicit cylindrical UVs: avoid depending on default UV projection.
        uv_layer = obj.data.uv_layers.active or obj.data.uv_layers.new(name="Label UV")
        for face in obj.data.polygons:
            # Cylinder side faces have four vertices; cap faces are n-gons.
            if len(face.vertices) != 4:
                continue
            theta_uv = []
            for loop_idx in face.loop_indices:
                vert = obj.data.vertices[obj.data.loops[loop_idx].vertex_index].co
                theta = math.atan2(vert.y, vert.x)
                u = ((theta + math.pi) / (2.0 * math.pi) + LABEL_U_OFFSET) % 1.0
                v = (vert.z / depth) + 0.5
                theta_uv.append((loop_idx, u, v))
            # Seam polygon: turn u=0 into u=1 for continuity.
            us = [u for _, u, _ in theta_uv]
            seam = max(us) - min(us) > 0.5
            for loop_idx, u, v in theta_uv:
                if seam and u < 0.5:
                    u += 1.0
                uv_layer.data[loop_idx].uv = (u, v)
    return obj

# ----- Create material with two cross-faded packaging images -----
label = bpy.data.materials.new("CHILSUNG 1950-1960 package transition")
label.use_nodes = True
label.diffuse_color = (0.91, 0.88, 0.75, 1.0)
nodes = label.node_tree.nodes
nodes.clear()
links = label.node_tree.links

output = nodes.new("ShaderNodeOutputMaterial")
output.location = (900, 100)
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
bsdf.location = (660, 100)
bsdf.inputs["Metallic"].default_value = 0.25
bsdf.inputs["Roughness"].default_value = 0.32
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

texcoord = nodes.new("ShaderNodeTexCoord")
texcoord.location = (-900, 160)
uv_output = texcoord.outputs["UV"]

# Extract only the two known image files from the local project ZIP.
base_folder = os.path.normpath(bpy.path.abspath("//"))
zip_folder = os.path.normpath(os.path.expanduser(ZIP_FOLDER)) if ZIP_FOLDER else base_folder
zip_path = os.path.join(zip_folder, ZIP_FILENAME)
folder = os.path.join(base_folder, "_cider_extracted_labels")
os.makedirs(folder, exist_ok=True)
if not os.path.isfile(zip_path):
    print("ZIP NOT FOUND:", zip_path)
    print("Save .blend next to 칠성.zip, or set ZIP_FOLDER at top of script.")
else:
    with zipfile.ZipFile(zip_path) as archive:
        for file_name in FILES.values():
            member = "칠성/img/" + file_name
            try:
                image_bytes = archive.read(member)
                with open(os.path.join(folder, file_name), "wb") as image_file:
                    image_file.write(image_bytes)
            except KeyError:
                print("MISSING PACKAGING INSIDE ZIP:", member)

fallback = {
    "A": (0.90, 0.13, 0.10, 1.0),  # red preview color if image missing
    "B": (0.09, 0.62, 0.34, 1.0),  # green preview color if image missing
}
found = []

def image_or_test_color(which, position_y):
    path = os.path.join(folder, FILES[which])
    if os.path.isfile(path):
        node = nodes.new("ShaderNodeTexImage")
        node.name = "PACKAGE_" + which
        node.label = "PACKAGING " + which + " - image"
        node.location = (-640, position_y)
        node.image = bpy.data.images.load(path, check_existing=True)
        node.interpolation = 'Linear'
        node.extension = 'REPEAT'
        links.new(uv_output, node.inputs["Vector"])
        # Pack PNGs into the eventual .blend for portability.
        try:
            node.image.pack()
        except Exception:
            pass
        found.append(which)
        return node.outputs["Color"]
    node = nodes.new("ShaderNodeRGB")
    node.name = "TEST_COLOR_" + which
    node.label = "Missing " + FILES[which] + " - test color"
    node.location = (-640, position_y)
    node.outputs["Color"].default_value = fallback[which]
    return node.outputs["Color"]

source_a = image_or_test_color("A", 300)
source_b = image_or_test_color("B", 60)

def mix_colors(name, x, y, input_a, input_b):
    node = nodes.new("ShaderNodeMixRGB")
    node.name = name
    node.label = name
    node.blend_type = 'MIX'
    node.location = (x, y)
    node.inputs[0].default_value = 0.0
    links.new(input_a, node.inputs[1])
    links.new(input_b, node.inputs[2])
    return node

ab = mix_colors("MIX 1950 to 1960", -100, 140, source_a, source_b)
links.new(ab.outputs["Color"], bsdf.inputs["Base Color"])

# Smooth, loop-safe test animation:
# 1-20 1950 hold, 20-50 fade to 1960, 50-80 1960 hold,
# 80-110 fade back to 1950, 110-121 1950 hold.
def animate_mix(node, keys):
    factor = node.inputs[0]
    for frame, value in keys:
        factor.default_value = value
        factor.keyframe_insert(data_path="default_value", frame=frame)
    factor.default_value = keys[0][1]

prefs = bpy.context.preferences.edit
original_interp = prefs.keyframe_new_interpolation_type
try:
    prefs.keyframe_new_interpolation_type = 'BEZIER'
    animate_mix(ab, [(1, 0), (20, 0), (50, 1), (80, 1), (110, 0), (121, 0)])
finally:
    prefs.keyframe_new_interpolation_type = original_interp

# ----- Can model: body with label + fixed shiny metal ends -----
make_cylinder("Can Body | animated label", 0.52, 2.24, 0, label, uv_label=True)
make_cylinder("Left metal rim", 0.53, 0.06, -1.13, metal)
make_cylinder("Right metal rim", 0.53, 0.06, 1.13, metal)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "Floor"
floor.data.materials.append(floor_mat)

camera_data = bpy.data.cameras.new("Fixed camera")
camera = bpy.data.objects.new("Fixed camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (3.2, -7.5, 2.8)
target = Vector((0, 0, 0.55))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 3.7
scene.camera = camera

light_data = bpy.data.lights.new("Large softbox", 'AREA')
light = bpy.data.objects.new("Large softbox", light_data)
bpy.context.collection.objects.link(light)
light.location = (-3, -4, 6)
light_data.energy = 850
light_data.shape = 'DISK'
light_data.size = 5
light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()

# Steady 360-degree spin over 120 frames, no visible scale/position change.
try:
    prefs.keyframe_new_interpolation_type = 'LINEAR'
    pivot.rotation_euler.x = 0
    pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=1)
    pivot.rotation_euler.x = math.tau
    pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=121)
finally:
    prefs.keyframe_new_interpolation_type = original_interp

scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_perspective = 'CAMERA'

loaded = ", ".join(found) if found else "none"
print("Chilsung can V3 ready. Imported labels:", loaded)
print("Image folder:", folder)
print("Expected: 1950packaging.png, 1960packaging.png. Missing labels appear as red/green TEST colors.")
print("To preview labels and transitions: choose Material Preview, press Space.")
