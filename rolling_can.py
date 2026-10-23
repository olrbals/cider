# Blender: stationary rolling can (4-second seamless loop)
# Open Blender > Scripting > New, paste/run this file with Alt+P.
# WARNING: deletes all objects in the currently open Blender scene.
import bpy
import math
from mathutils import Vector

# Clear the default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 30
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

def material(name, color, metallic=0.0, roughness=0.35):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat

blue = material("Blue Packaging", (0.12, 0.55, 0.85), 0.2)
white = material("White Stripe", (0.95, 0.93, 0.86))
coral = material("Coral Stripe", (1.0, 0.38, 0.30))
silver = material("Silver Metal", (0.7, 0.73, 0.77), 0.8)
floor_mat = material("Studio Floor", (0.83, 0.85, 0.88))

# Objects are parented to a fixed pivot: only the X rotation changes.
pivot = bpy.data.objects.new("CAN_ROTATION", None)
bpy.context.collection.objects.link(pivot)
pivot.location = (0.0, 0.0, 0.55)

def cylinder(name, radius, depth, x, mat):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96,
        radius=radius,
        depth=depth,
        location=(0, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = pivot
    obj.location = (x, 0, 0)
    obj.rotation_euler.y = math.radians(90)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Soft Edges", 'BEVEL')
    bevel.width = 0.025
    bevel.segments = 3
    for polygon in obj.data.polygons:
        polygon.use_smooth = (len(polygon.vertices) == 4)
    return obj

cylinder("Can Body", 0.52, 2.24, 0.0, blue)
cylinder("Left Metal Rim", 0.53, 0.06, -1.13, silver)
cylinder("Right Metal Rim", 0.53, 0.06, 1.13, silver)

# A surface stripe lets the viewer see the can rotating.
def stripe(name, angle, width, mat):
    verts, faces = [], []
    steps = 48
    radius = 0.526
    for i in range(steps + 1):
        a = angle - width / 2.0 + width * i / steps
        y = radius * math.cos(a)
        z = radius * math.sin(a)
        verts.append((-1.07, y, z))
        verts.append((1.07, y, z))
    for i in range(steps):
        k = 2 * i
        faces.append((k, k + 2, k + 3, k + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = pivot
    obj.data.materials.append(mat)

stripe("White Label", -math.pi / 2, 0.75, white)
stripe("Coral Detail", -math.pi / 2 + 0.6, 0.16, coral)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "Floor"
floor.data.materials.append(floor_mat)

# Orthographic camera keeps the visible size stable.
cam_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(camera)
camera.location = (3.2, -7.5, 2.8)
target = Vector((0, 0, 0.55))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 3.7
scene.camera = camera

light_data = bpy.data.lights.new("Softbox", 'AREA')
light = bpy.data.objects.new("Softbox", light_data)
bpy.context.collection.objects.link(light)
light.location = (-3, -4, 6)
light_data.energy = 850
light_data.shape = 'DISK'
light_data.size = 5
light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()

# 30 fps x 4 seconds = 120 rendered frames.
# Frame 121 is identical to frame 1; omit it to prevent a duplicate pause.
prefs = bpy.context.preferences.edit
old_interp = prefs.keyframe_new_interpolation_type
try:
    prefs.keyframe_new_interpolation_type = 'LINEAR'
    pivot.rotation_euler.x = 0
    pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=1)
    pivot.rotation_euler.x = 2 * math.pi
    pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=121)
finally:
    prefs.keyframe_new_interpolation_type = old_interp

scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_perspective = 'CAMERA'

print("Can scene ready! Press Space in the viewport to play the animation.")
