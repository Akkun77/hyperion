"""Author the original HYPERION Inspection Array in Blender 5.2.

Run with: blender --background --factory-startup --python build_inspection_array.py -- preview|final
Coordinates in this script follow the design brief: +Y up, +Z toward the camera.
Blender's Z-up coordinates are converted at object creation; glTF exports Y-up.
"""
import math
import sys
import traceback
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "design" / "hyperion-2" / "assets" / "source"
REVIEW = ROOT / "design" / "hyperion-2" / "assets" / "reviews"
MODELS = ROOT / "frontend" / "public" / "hyperion-2" / "models"
for folder in (SOURCE, REVIEW, MODELS):
    folder.mkdir(parents=True, exist_ok=True)


def record_failure(exc_type, exc, tb):
    (REVIEW / "blender_failure.log").write_text("".join(traceback.format_exception(exc_type, exc, tb)), encoding="utf-8")
    traceback.print_exception(exc_type, exc, tb)


sys.excepthook = record_failure
(REVIEW / "blender_started.txt").write_text(bpy.app.version_string, encoding="utf-8")

MODE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "preview"
if MODE not in ("preview", "final"):
    raise ValueError("Mode must be preview or final")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def pos(x, y, z):
    return (x, -z, y)


def material(name, rgb, roughness=.6, metalness=.1, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = .25
    return mat


GRAPHITE = material("Graphite | machined faces", (.057, .071, .083), .57, .23)
GRAPHITE_DARK = material("Graphite | recessed sides", (.026, .038, .046), .66, .16)
GRAPHITE_EDGE = material("Graphite | exposed grain", (.086, .103, .112), .58, .24)
CERAMIC = material("Ceramic | cool end caps", (.43, .49, .51), .66, .14)
SILVER = material("Satin silver | probe and plate", (.65, .71, .73), .32, .72)
CAVITY = material("Cavity | light absorbing", (.019, .029, .037), .82, .07)
CHANNEL = material("Channel | dormant metal", (.27, .31, .32), .42, .48)
FLOOR = material("Floor | graphite mineral", (.018, .023, .028), .78, .08)


def bevel(obj, amount=.05, segments=2):
    modifier = obj.modifiers.new("Physical bevel", "BEVEL")
    modifier.width = amount
    modifier.segments = segments
    modifier.affect = "EDGES"
    normal = obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    return obj


def box(name, center, size, mat, bevel_size=0, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(*center))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel_size:
        bevel(obj, bevel_size)
    if collection is not None:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def cavity_cut(obj, center, size):
    cutter = box("Temporary cavity cutter", center, size, CAVITY)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Machined recess", "BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def empty(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos(*location)
    obj.empty_display_size = .35
    return obj


def parent_keep_world(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


# The offset base establishes real foreground, side faces and rear depth.
box("Plinth / front mineral slab", (-.92, -.29, .45), (11.8, .58, 4.0), GRAPHITE_DARK, .095)
box("Plinth / offset rear slab", (1.5, -.62, -1.55), (9.2, .38, 4.9), GRAPHITE, .06)
box("Plinth / silver cut line", (1.4, .025, 2.48), (1.25, .045, .07), SILVER, .012)
box("Ground / finite matte plane", (0, -.93, -10.5), (45, .23, 43), FLOOR)
box("Backplane / terminal wall", (0, 7, -27), (38, 16, .55), CAVITY, .06)

for x, height in [(-5.25, 8.5), (-1.05, 11.4), (2.95, 10.6), (5.5, 8.3)]:
    box(f"Rear load column {x:+.2f}", (x, height / 2, -2.05), (.44, height, .8), GRAPHITE_DARK, .07)
for y in (1.05, 6.15, 10.75):
    box(f"Left rear cross-member {y:.2f}", (-2.47, y, -1.94), (7.3, .26, .75), GRAPHITE_DARK, .045)
    box(f"Right rear cross-member {y:.2f}", (4.16, y, -1.94), (4.3, .26, .75), GRAPHITE_DARK, .045)

LEFT_GATE = empty("Pivot_Gate_Left | outward slide", (.48, 5.6, .12))
RIGHT_GATE = empty("Pivot_Gate_Right | outward slide", (2.14, 5.6, .12))


def build_bank(side, count):
    left = side == "L"
    for i in range(count):
        x = (-5.58 + i * .49) if left else (2.16 + i * .39)
        height = 6.1 + ((i * 7 + (0 if left else 2)) % 6) * .86 + (.85 if left else 0)
        base = .62 + ((i * 3 + (1 if left else 0)) % 4) * .32
        depth = .92 + ((i * 5) % 4) * .21
        width = (.35 if left else .31) + (.12 if i % 4 == 0 else 0)
        z = -.22 + ((i * 3) % 5) * .24
        name = f"Fin_{side}_{i + 1:02d}"
        fin = box(name + " | solid beveled body", (x, base + height / 2, z),
                  (width, height, depth), GRAPHITE if i % 5 else GRAPHITE_EDGE)
        # Two boolean machined slots expose depth rather than painted black bars.
        for fraction in (.29, .69):
            slot_y = base + height * fraction
            cavity_cut(fin, (x, slot_y, z + depth / 2 - .075),
                       (width * .6, .13 if fraction < .5 else .085, .26))
            box(name + f" | recessed shadow {fraction}",
                (x, slot_y, z + depth / 2 - .115),
                (width * .52, .058, .018), CAVITY, .008)
        bevel(fin, .028, 2)
        if i % 4 == 0:
            box(name + " | ceramic crown", (x, base + height + .08, z),
                (width + .15, .18, depth + .12), CERAMIC, .025)
        if (left and i >= count - 3) or (not left and i <= 2):
            parent_keep_world(fin, LEFT_GATE if left else RIGHT_GATE)
            box(name + " | recessed seam channel", (x + (width / 2 if left else -width / 2),
                base + height * .52, z + .09), (.035, height * .65, .09), CHANNEL, .012)
        if i % 3 == 1:
            box(name + " | rear diagonal brace", (x, base + height * .45, z - depth / 2 - .2),
                (.14, height * .7, .42), GRAPHITE_DARK, .018)


build_bank("L", 13)
build_bank("R", 11)

# The receiving housing contains a genuine cut cavity and an inset plate.
housing = box("Receiving housing | machined graphite", (1.4, 2.4, 1.04),
              (1.74, 1.59, .52), GRAPHITE_DARK)
cavity_cut(housing, (1.4, 2.4, 1.32), (1.27, 1.17, .28))
bevel(housing, .055, 3)
box("Receiving plate | satin floating face", (1.4, 2.4, 1.31),
    (1.14, 1.03, .09), SILVER, .035,)
box("Receiving plate | recessed contact socket", (1.4, 2.4, 1.37),
    (.38, .38, .025), CAVITY, .025)
for dx in (-.52, .52):
    box(f"Receiving plate | tension rail {dx:+.2f}", (1.4 + dx, 2.4, 1.38),
        (.045, .86, .045), CERAMIC, .012)

PROBE_PIVOT = empty("Pivot_Probe | travel along Z", (1.4, 2.4, 4.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.34, depth=.7,
                                    end_fill_type="NGON", location=pos(1.4, 2.4, 4.45))
probe = bpy.context.object
probe.name = "Probe | flattened hexagonal silver body"
probe.rotation_euler[0] = math.pi / 2
probe.scale = (1.0, .73, 1.0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
probe.data.materials.append(SILVER)
bevel(probe, .035, 3)
parent_keep_world(probe, PROBE_PIVOT)
for name, cy, size, mat in [
    ("Probe | recessed lens channel", 2.63, (.42, .035, .39), CAVITY),
    ("Probe | ceramic lens insert", 2.655, (.26, .017, .27), CERAMIC),
    ("Probe | nose instrument", 2.4, (.2, .2, .09), GRAPHITE_DARK),
]:
    oz = 4.12 if "nose" in name else 4.45
    parent_keep_world(box(name, (1.4, cy, oz), size, mat, .015), PROBE_PIVOT)

DEBRIS_PIVOT = empty("Pivot_Debris | deterministic contact", (1.4, 2.4, 1.4))
debris = [(-.92, -.52, 1.75, .27), (.78, -.7, 1.8, .24), (-.47, .83, 1.57, .18),
          (.6, .72, 1.63, .22), (-1.14, .2, 1.46, .2), (1.1, .24, 1.49, .17),
          (-.27, -1.06, 1.87, .2), (.17, 1.01, 1.67, .17)]
for i, (dx, dy, z, scale) in enumerate(debris, 1):
    piece = box(f"Debris_Hero_{i:02d} | authored rest pose", (1.4 + dx, 2.4 + dy, z),
                (scale, scale * (1.35 + i % 3 * .31), scale * .82),
                CERAMIC if i % 4 == 0 else GRAPHITE, .025)
    piece.rotation_euler[2] = math.radians((i * 17) % 33 - 16)
    parent_keep_world(piece, DEBRIS_PIVOT)


def terrace(name, x, z, width, height, depth, variant):
    box(name + " | mineral mass", (x, height / 2, z), (width, height, depth), GRAPHITE, .09)
    box(name + " | ceramic ledge", (x, height + .13, z), (width + .18, .25, depth + .22), CERAMIC, .04)
    box(name + " | deep service slot", (x, height + .25, z + depth * .23),
        (width * .68, .055, .11), CAVITY, .015)
    for s in (-1, 1):
        box(name + f" | rear service pier {s}",
            (x + s * width * .31, height + .58 + variant * .12, z - depth * .22),
            (.34, .84 + variant * .22, depth * .42), GRAPHITE_DARK, .035)
    if variant == 1:
        box(name + " | raised central apparatus", (x, height + .67, z - depth * .19),
            (width * .28, 1.06, depth * .38), GRAPHITE_EDGE, .045)
    if variant == 2:
        box(name + " | recessed side platform", (x + width * .26, height * .57, z + depth * .46),
            (width * .43, height * .4, depth * .32), GRAPHITE_DARK, .035)


terrace("Terrace_A | stepped intake", -4.2, -9, 4.8, 1.9, 4.5, 0)
terrace("Terrace_B | elevated processing", 2.6, -15, 5.4, 3.2, 5.2, 1)
terrace("Terrace_C | broad evidence deck", -.7, -22, 7.2, 2.4, 4.2, 2)


def aim(camera, target):
    direction = Vector(pos(*target)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def camera(name, xyz, target, focal_mm, shift_x=0):
    data = bpy.data.cameras.new(name)
    data.lens = focal_mm
    data.clip_start = .1
    data.clip_end = 120
    data.shift_x = shift_x
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos(*xyz)
    aim(obj, target)
    return obj


desktop = camera("Camera_01_Awakening_Desktop", (14, 9, 27), (1, 5, 0), 42, -.16)
mobile = camera("Camera_01_Awakening_Mobile", (8, 7.5, 24), (1.4, 5, .1), 34, 0)
camera("Camera_03_Impact", (4.2, 3.7, 7), (1.4, 2.4, 1.2), 54)
camera("Camera_06_Command", (9, 12, -12), (0, 0, -20), 55)


def area(name, xyz, target, energy, size, tint=(1, 1, 1)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = tint
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos(*xyz)
    aim(obj, target)


area("Key | broad cold white", (-8, 14, 10), (0, 5, 0), 1900, 11)
area("Fill | restrained neutral", (9, 8, 14), (1, 5, 0), 400, 8)
area("Rim | narrow rear edge", (7, 10, -6), (1, 5, 0), 1200, 5, (.68, .78, .84))
area("Plate | localized inspection glint", (1.4, 4.3, 4), (1.4, 2.4, 1.2), 260, 2)

world = bpy.data.worlds.new("Void | neutral atmosphere")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs["Color"].default_value = (.016, .021, .025, 1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .2

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12 if MODE == "preview" else 64
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.resolution_percentage = 100


def select_device():
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                devices = [device for device in prefs.devices if device.type == kind]
                if devices:
                    for device in prefs.devices:
                        device.use = device in devices
                    scene.cycles.device = "GPU"
                    print("RENDER_DEVICE", kind, ", ".join(d.name for d in devices))
                    (REVIEW / "render_device.txt").write_text(kind + ": " + ", ".join(d.name for d in devices), encoding="utf-8")
                    return
            except Exception as exc:
                print("DEVICE_UNAVAILABLE", kind, type(exc).__name__)
    except Exception as exc:
        print("DEVICE_SCAN_FAILED", type(exc).__name__)
    scene.cycles.device = "CPU"
    print("RENDER_DEVICE CPU")
    (REVIEW / "render_device.txt").write_text("CPU: no compatible Cycles device detected", encoding="utf-8")


select_device()


def render(target_camera, width, height, filename):
    scene.camera = target_camera
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = str(REVIEW / filename)
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError as exc:
        if scene.cycles.device != "GPU":
            raise
        print("GPU_RENDER_FAILED", str(exc)[:250], "falling back to CPU once")
        scene.cycles.device = "CPU"
        (REVIEW / "render_device.txt").write_text("CPU: GPU render failed, used one fallback", encoding="utf-8")
        bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)


scene.camera = desktop
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "inspection_array.blend"))
print("SAVED_BLEND", SOURCE / "inspection_array.blend")

if MODE == "preview":
    render(desktop, 720, 450, "inspection_preview_desktop.png")
    render(mobile, 390, 844, "inspection_preview_mobile.png")
else:
    render(desktop, 1440, 900, "inspection_desktop_1440x900.png")
    render(mobile, 390, 844, "inspection_mobile_390x844.png")
    scene.camera = desktop
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type in ("MESH", "EMPTY", "CAMERA", "LIGHT") and not obj.name.startswith("Ground / finite"):
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(MODELS / "inspection_array.glb"),
                              export_format="GLB", use_selection=True,
                              export_cameras=True, export_lights=True,
                              export_apply=True)
    print("EXPORTED_GLB", MODELS / "inspection_array.glb")
