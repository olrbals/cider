# rolling_can_v2.py
# Blender 4.x / 5.x: fixed-position rolling can + smooth package transitions.
# WARNING: Running this script clears all objects in the CURRENT scene.
# Keep your original .blend safe; run in File > New > General.
#
# HOW TO USE YOUR OWN PACKAGE IMAGES:
# 1. Save this script or your .blend beside three flat label images:
#    package_a.png, package_b.png, package_c.png
# 2. Or set IMAGE_FOLDER to the folder that contains those files.
# 3. Run from Blender > Scripting (Alt+P).
# Without those images, three placeholder COLORS are used instead.
#
# Images should be flat label artwork, not perspective can photos.
# Image horizontal dimension wraps the can circumference;
# image vertical dimension runs along the can's long axis.

import bpy
import math
import os
from mathutils import Vector

# ----- EDIT THIS ONLY IF YOUR IMAGES ARE IN A DIFFERENT FOLDER -----
IMAGE_FOLDER = ""   # Example for Windows: r"C:\\Users\\me\\Downloads"
FILES = {
    "A": "package_a.png",
    "B": "package_b.png",
    "C": "package_c.png",
}
# ------------------------------------------------------------------

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
                u = (theta + math.pi) / (2.0 * math.pi)
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

# ----- Create material with three cross-faded image textures -----
label = bpy.data.materials.new("PACKAGE A-B-C animated material")
label.use_nodes = True
label.diffuse_color = (0.9, 0.6, 0.7, 1.0)
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

folder = os.path.normpath(
    os.path.expanduser(IMAGE_FOLDER.strip())
    if IMAGE_FOLDER.strip() else bpy.path.abspath("//")
)
fallback = {
    "A": (0.95, 0.35, 0.52, 1.0),  # pink test color
    "B": (0.30, 0.77, 0.48, 1.0),  # green test color
    "C": (0.22, 0.52, 0.94, 1.0),  # blue test color
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
source_c = image_or_test_color("C", -180)

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

ab = mix_colors("MIX A to B", -340, 210, source_a, source_b)
bc = mix_colors("MIX toward C", -70, 120, ab.outputs["Color"], source_c)
ca = mix_colors("MIX C back to A", 190, 80, bc.outputs["Color"], source_a)
links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])

# Smooth transitions:
# frames 1..41 A -> B
# frames 41..81 B -> C
# frames 81..121 C -> A
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
    animate_mix(ab, [(1, 0), (41, 1), (121, 1)])
    animate_mix(bc, [(1, 0), (41, 0), (81, 1), (121, 1)])
    animate_mix(ca, [(1, 0), (81, 0), (121, 1)])
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
print("Rolling can V2 ready. Imported images:", loaded)
print("Image folder:", folder)
print("Missing files will show pink/green/blue TEST colors.")
print("To preview image and cross-fade: choose Material Preview (or Rendered), press Space.")
