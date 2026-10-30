"""HYPERION Inspection Array: asymmetric machined architecture, authored in Blender.

blender --background --factory-startup --python build_inspection_array_v2.py -- preview|final
Design-space coordinates are X right, Y up, Z toward the arrival camera.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / 'design/hyperion-2/assets/source'
REVIEW = ROOT / 'design/hyperion-2/assets/reviews'
MODELS = ROOT / 'frontend/public/hyperion-2/models'
for folder in (SOURCE, REVIEW, MODELS):
    folder.mkdir(parents=True, exist_ok=True)
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'preview'
if MODE not in ('preview', 'final'):
    raise ValueError('Expected preview or final')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def xyz(x, y, z):
    return (x, -z, y)


def mat(name, color, roughness=.46, metal=.65, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = .3
    return m


TITANIUM = mat('01 | brushed dark titanium', (.09, .112, .121), .42, .72)
BLACK = mat('02 | carbon recessed', (.022, .029, .035), .68, .28)
EDGE = mat('03 | pale machined edge', (.22, .26, .27), .39, .78)
CUT = mat('04 | fractured inner metal', (.12, .14, .15), .55, .58)
SILVER = mat('05 | satin silver instrument', (.52, .58, .59), .27, .82)
WHITE = mat('06 | ceramic optical core', (.49, .55, .56), .26, .27, (.06, .07, .075))
SIGNAL_CYAN = mat('Signal_Cyan | dormant trace', (.032, .052, .058), .38, .53)
SIGNAL_LIME = mat('Signal_Lime | dormant trace', (.044, .052, .025), .38, .53)
FLOOR = mat('09 | near black floor', (.012, .016, .020), .82, .06)


def bevel(obj, width=.06, segments=2):
    b = obj.modifiers.new('Light catching bevel', 'BEVEL')
    b.width = width
    b.segments = segments
    b.affect = 'EDGES'
    n = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    n.keep_sharp = True
    return obj


def cube(name, center, size, material, bevel_size=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(*center))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel_size:
        bevel(obj, bevel_size)
    return obj


def slab(name, profile, front, depth, material, bevel_size=.06):
    """A genuinely shaped solid: asymmetric concave XY outline extruded into depth."""
    n = len(profile)
    verts = [xyz(x, y, front) for x, y in profile]
    verts += [xyz(x, y, front-depth) for x, y in profile]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    for i in range(n):
        j = (i+1) % n
        faces.append((i, j, n+j, n+i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    if bevel_size:
        bevel(obj, bevel_size, 3)
    return obj


def strut(name, start, end, width, depth, material):
    """Tapered, faceted structural beam with cut back edges."""
    x0, y0, z0 = start
    x1, y1, z1 = end
    dx, dy = x1-x0, y1-y0
    length = math.hypot(dx, dy)
    nx, ny = -dy/length*width/2, dx/length*width/2
    poly = [(x0+nx,y0+ny),(x1+nx*.65,y1+ny*.65),
            (x1-nx*.65,y1-ny*.65),(x0-nx,y0-ny)]
    return slab(name, poly, (z0+z1)/2+depth/2, depth, material, .045)


def empty(name, loc):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = xyz(*loc)
    obj.empty_display_size = .3
    return obj


def parent(obj, pivot):
    matrix = obj.matrix_world.copy()
    obj.parent = pivot
    obj.matrix_world = matrix
    return obj


# An open mechanical escarpment with a deliberately offset inspection throat.
# Six large shaped masses replace the old repeated post grid.
left_gate = empty('Pivot_Gate_Left', (-.25, 4.6, .1))
right_gate = empty('Pivot_Gate_Right', (2.25, 4.6, .1))
slab('Backbone | deep fractured spine',
     [(-6.0,.35),(-5.75,6.7),(-4.8,9.6),(-2.8,10.5),(-1.9,9.8),
      (-3.5,8.1),(-3.95,4.8),(-2.45,2.1),(-1.1,.65)], -.55, 2.2, BLACK, .14)
slab('Left shoulder | swept armor',
     [(-5.9,5.5),(-5.5,9.0),(-3.9,11.2),(-.1,11.65),(.7,10.55),
      (-1.75,9.05),(-2.75,7.1),(-3.95,6.1)], 1.0, 1.16, TITANIUM, .12)
slab('Left jaw | interlocking lower shell',
     [(-5.3,.45),(-3.4,.2),(-.85,1.15),(.15,3.15),(-.35,4.3),
      (-1.55,3.25),(-3.45,3.05),(-4.55,5.7)], 1.42, 1.35, TITANIUM, .10)
parent(slab('Left iris shutter | moving wedge',
     [(-2.55,4.6),(-1.4,6.55),(.38,7.1),(.78,6.2),(.02,5.35),
      (-.48,4.75),(-.98,3.96)], 1.72, .92, CUT, .07), left_gate)
slab('Right crown | overhanging cantilever',
     [(1.7,10.7),(3.15,11.8),(6.15,10.15),(6.6,7.7),
      (5.1,8.45),(3.1,8.35),(2.1,7.3),(1.3,8.35)], 1.0, 1.42, TITANIUM, .13)
slab('Right abutment | cranked structural mass',
     [(3.05,.25),(4.7,.45),(6.7,3.25),(6.05,7.9),(4.9,8.15),
      (4.65,5.5),(3.45,3.65),(1.9,3.45),(1.95,1.45)], 1.3, 1.5, BLACK, .13)
parent(slab('Right iris shutter | moving hook',
     [(2.18,4.05),(3.45,4.45),(4.05,6.1),(3.45,7.65),
      (2.1,7.55),(1.3,6.25),(1.75,5.45)], 1.68, .87, TITANIUM, .08), right_gate)

# Structural depth: rear compression truss, diagonal loads and readable openings.
for i, (a,b) in enumerate([
    ((-5.3,2.3,-2.0),(-3.1,8.8,-2.0)),
    ((-4.25,9.2,-2.4),(.0,9.65,-2.4)),
    ((3.25,10.0,-2.2),(5.6,3.0,-2.2)),
    ((-3.15,2.45,-2.0),(-.4,6.8,-2.0)),
    ((3.5,2.0,-2.0),(1.75,7.25,-2.0)),
]):
    strut('Rear tension truss %02d'%i, a,b,.24,.38,CUT)
slab('Throat | deep shadow cassette',
     [(.1,2.15),(2.5,2.15),(2.95,3.15),(2.85,5.75),
      (2.1,7.5),(.45,7.25),(-.25,5.6),(-.2,3.1)], -.75, .75, BLACK, .065)
slab('Throat | left beveled liner',
     [(-.2,3.0),(.25,3.1),(.42,6.4),(.0,6.8),(-.65,5.8)], 1.96,.35,EDGE,.035)
slab('Throat | right beveled liner',
     [(2.35,2.65),(2.9,3.15),(2.75,6.85),(2.2,7.25),(1.96,5.9)], 1.95,.42,EDGE,.035)
slab('Throat | upper locking tooth',
     [(.35,7.25),(1.1,7.55),(1.35,6.9),(1.9,7.55),(2.55,7.15),
      (2.3,8.05),(1.25,8.7),(.15,8.15)], 2.0,.58,CUT,.04)

# Physical face details sit on different Z planes, with breaks and occlusion.
slab('Left armor | recessed raised facet',
     [(-5.0,8.3),(-3.72,10.5),(-1.1,10.95),(-2.25,9.4),(-3.55,8.7)],1.66,.19,EDGE,.025)
slab('Left armor | black undercut',
     [(-4.55,6.35),(-3.5,8.55),(-3.7,6.8),(-3.1,4.65),(-4.35,3.1)],1.71,.12,BLACK,.025)
slab('Right armor | oblique face',
     [(3.05,10.7),(5.65,9.65),(6.1,7.75),(4.45,8.95)],1.83,.18,EDGE,.025)
slab('Right armor | split cheek',
     [(4.85,7.2),(5.88,7.75),(5.82,4.45),(4.65,3.65),(4.9,5.35)],1.87,.23,CUT,.03)
slab('Lower shear plate | serrated lip',
     [(-4.95,1.25),(-2.6,.48),(-.95,1.55),(.05,2.6),(-1.05,2.15),(-2.6,1.5)],
     2.02,.19,EDGE,.03)
for i,(a,b) in enumerate([
    ((-4.95,8.4,1.76),(-3.95,10.05,1.76)),
    ((-2.95,10.66,1.77),(-.95,10.87,1.77)),
    ((5.12,9.55,1.92),(5.82,8.15,1.92)),
    ((5.56,6.55,2.03),(5.45,4.6,2.03)),
    ((-3.95,2.1,2.1),(-2.2,1.55,2.1)),
]):
    strut('Interrupted edge bevel %02d'%i,a,b,.075,.065,SILVER)

# Hidden sensor core and two-stage receiving cassette behind an aperture.
cube('Mechanism | shadow well', (1.32,4.3,.15),(1.45,1.65,.55),BLACK,.05)
cube('Mechanism | outer instrument frame',(1.32,4.3,1.34),(1.57,1.77,.32),CUT,.10)
slab('Mechanism | faceted silver contact face',
     [(.85,3.78),(1.76,3.78),(1.96,4.02),(1.96,4.63),
      (1.7,4.85),(.96,4.85),(.72,4.6),(.72,4.02)],1.7,.13,SILVER,.036)
slab('Mechanism | inset impact socket',
     [(1.15,4.08),(1.51,4.08),(1.68,4.3),(1.51,4.52),
      (1.15,4.52),(.99,4.3)],1.755,.025,BLACK,.012)
for side in (-1,1):
    cube('Mechanism | guide rail %s'%side,(1.32+side*.66,4.3,1.58),(.075,1.48,.1),EDGE,.013)
    cube('Mechanism | optical slit %s'%side,(1.32+side*.48,4.3,1.63),(.023,1.05,.025),SIGNAL_CYAN,.008)
cube('Mechanism | buried white aperture',(1.32,5.37,.92),(.42,.065,.18),WHITE,.015)

# Non-repeating hatches, inset vents, hinge hardware and compression links.
for i, (name, profile, z) in enumerate([
    ('Crown lock', [(-2.42,9.78),(-1.79,9.95),(-1.58,9.61),(-2.2,9.36)],1.82),
    ('Shoulder intake', [(-4.65,7.28),(-4.27,7.92),(-4.05,7.72),(-4.32,7.01)],1.79),
    ('Right crown vent',[(4.21,9.42),(4.77,9.17),(4.62,8.94),(4.05,9.15)],1.92),
    ('Lower jaw notch',[(-2.71,1.65),(-2.17,1.83),(-2.32,2.03),(-2.88,1.88)],2.16),
    ('Right lower lock',[(4.58,3.55),(4.94,3.94),(4.76,4.19),(4.41,3.79)],1.92),
]):
    slab('Machined inset %02d | %s'%(i,name),profile,z,.055,BLACK,.012)
for i,(a,b,w) in enumerate([
    ((-4.45,8.57,1.72),(-3.72,8.13,1.72),.13),
    ((-3.48,9.16,1.83),(-2.57,9.44,1.83),.08),
    ((4.02,10.05,1.88),(4.79,9.62,1.88),.11),
    ((5.3,7.09,1.96),(5.21,6.15,1.96),.09),
    ((-3.95,3.28,1.82),(-3.08,2.98,1.82),.12),
]):
    strut('Stepped inset rib %02d'%i,a,b,w,.11,CUT)
for i,(a,b) in enumerate([
    ((-1.46,6.35,.35),(.16,5.52,.35)),
    ((3.47,6.68,.18),(2.33,5.79,.18)),
    ((-1.6,3.21,.22),(.06,3.87,.22)),
]):
    strut('Visible rear compression actuator %02d'%i,a,b,.16,.18,EDGE)
for i,(x,y,z) in enumerate([
    (-3.9,9.44,1.82),(-3.16,10.25,1.81),(-1.86,10.55,1.8),
    (-4.31,4.2,1.82),(-2.46,2.34,2.13),
    (4.01,10.75,1.86),(5.31,9.53,1.9),(5.38,6.54,2.0),
    (4.83,4.06,1.94),(3.13,2.25,1.9),
]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.085,depth=.035,
                                        location=xyz(x,y,z))
    fastener=bpy.context.object
    fastener.name='Captive hex fastener %02d'%i
    fastener.rotation_euler[0]=math.pi/2
    fastener.data.materials.append(EDGE)
    bevel(fastener,.008,2)

# Flat, segmented signal engravings. Their runtime emission is driven by scroll.
for i,(a,b) in enumerate([
    ((.25,6.27,2.03),(.18,5.6,2.03)),
    ((.13,5.34,2.03),(.08,4.72,2.03)),
    ((2.48,6.32,2.03),(2.48,5.75,2.03)),
    ((2.46,5.48,2.03),(2.49,4.92,2.03)),
]):
    strut('Signal_Cyan_segment_%02d'%i,a,b,.035,.012,SIGNAL_CYAN)
for i,(a,b) in enumerate([
    ((.83,7.57,2.08),(1.13,7.78,2.08)),
    ((1.42,7.78,2.08),(1.77,7.62,2.08)),
]):
    strut('Signal_Lime_segment_%02d'%i,a,b,.032,.012,SIGNAL_LIME)

# A flattened inspection instrument, clearly separate from the receiving face.
probe_pivot = empty('Pivot_Probe', (1.32,4.3,4.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.31, depth=.62,
                                    location=xyz(1.32,4.3,4.0))
probe = bpy.context.object
probe.name = 'Probe | octagonal satin body'
probe.rotation_euler[0] = math.pi/2
probe.data.materials.append(SILVER)
bevel(probe,.045,3)
parent(probe,probe_pivot)
parent(cube('Probe | dark optical inset',(1.32,4.3,4.37),(.38,.31,.035),BLACK,.014),probe_pivot)
parent(cube('Probe | contact tip',(1.32,4.3,3.67),(.16,.16,.13),WHITE,.035),probe_pivot)

# Sculpted shards, not a randomly scattered uniform particle field.
debris_pivot = empty('Pivot_Debris',(1.32,4.3,1.7))
fragments = [
    [(-.72,3.05),(-.3,3.18),(-.38,3.62),(-.85,3.45)],
    [(2.4,3.25),(2.74,3.38),(2.6,3.78),(2.25,3.64)],
    [(.5,5.5),(.8,5.56),(.64,5.95),(.34,5.82)],
    [(2.1,5.25),(2.4,5.4),(2.18,5.83),(1.94,5.67)],
    [(-1.0,4.9),(-.62,5.04),(-.77,5.39),(-1.12,5.23)],
    [(3.04,4.55),(3.4,4.62),(3.2,5.03),(2.91,4.86)],
]
for i, poly in enumerate(fragments):
    shard = slab('Debris_Hero_%02d'%i,poly,2.3 + (i%3)*.28,.16 + (i%2)*.1,
                 EDGE if i in (1,4) else TITANIUM,.025)
    parent(shard,debris_pivot)

# A small nested service landscape establishes a destination beyond the gate.
for i,(x,y,z,w,h,d) in enumerate([
    (-3.5,.3,-7,3.7,1.9,3.2),
    (2.8,.25,-12,4.4,3.1,3.8),
    (-.8,.2,-19,6.3,1.5,4.7),
]):
    cube('Terrace_%02d | hewn base'%i,(x,y+h/2,z),(w,h,d),BLACK,.11)
    slab('Terrace_%02d | offset upper deck'%i,
         [(x-w*.45,y+h),(x+w*.4,y+h),(x+w*.52,y+h+.18),
          (x+w*.2,y+h+.37),(x-w*.48,y+h+.26)],z+d*.35,.65,TITANIUM,.045)
    cube('Terrace_%02d | recessed instrument rail'%i,
         (x,y+h+.29,z+d*.36),(w*.55,.05,.08),EDGE,.012)

cube('Ground | finite dark stage',(0,-.55,-8),(40,.2,42),FLOOR,.0)
cube('Plinth | split front escarpment',(0,-.14,-.52),(13.7,.47,4.25),BLACK,.09)
cube('Backplane | distant void',(0,6.0,-29),(34,18,.2),BLACK,.02)


def aim(obj, target):
    obj.rotation_euler = (Vector(xyz(*target))-obj.location).to_track_quat('-Z','Y').to_euler()


def camera(name, loc, target, lens, shift=0):
    data=bpy.data.cameras.new(name)
    data.lens=lens
    data.clip_end=130
    data.shift_x=shift
    obj=bpy.data.objects.new(name,data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=xyz(*loc)
    aim(obj,target)
    return obj


desktop=camera('Camera_01_Desktop',(15,9,25),(1.1,5.8,0),43,-.17)
closeup=camera('Camera_03_Closeup',(5.4,5.25,8.4),(1.32,4.3,1.1),54)
mobile=camera('Camera_01_Mobile',(8,7.1,20),(1.2,5.5,.7),36)
camera('Camera_06_Command',(9,11,-12),(0,0,-20),52)


def light(name, loc, target, energy, size, color=(1,1,1)):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=energy
    data.shape='DISK'
    data.size=size
    data.color=color
    obj=bpy.data.objects.new(name,data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location=xyz(*loc)
    aim(obj,target)


light('Key | broad white sculpture',(-8,15,10),(0,5,0),2300,9)
light('Rim | high narrow edge',(5,12,-5),(1,5,0),1850,5,(.8,.88,.92))
light('Throat | hidden white bounce',(1.3,6,-.1),(1.3,4.3,1.4),250,2)
light('Low | grazing foreground',(-4,1,8),(0,4,0),380,5)
world=bpy.data.worlds.new('Absorbing charcoal atmosphere')
bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.012,.017,.022,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.23

scene=bpy.context.scene
scene.camera=desktop
scene.render.engine='CYCLES'
scene.cycles.samples=10 if MODE=='preview' else 48
scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'


def render_device():
    try:
        bpy.ops.preferences.addon_enable(module='cycles')
        pref=bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX','CUDA','HIP','ONEAPI'):
            try:
                pref.compute_device_type=kind
                pref.get_devices()
                found=[d for d in pref.devices if d.type==kind]
                if found:
                    for d in pref.devices:
                        d.use=d in found
                    scene.cycles.device='GPU'
                    print('RENDER_DEVICE',kind,','.join(d.name for d in found))
                    return
            except Exception:
                pass
    except Exception:
        pass
    scene.cycles.device='CPU'
    print('RENDER_DEVICE CPU')


render_device()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'inspection_array.blend'))


def render(cam,w,h,name):
    scene.camera=cam
    scene.render.resolution_x=w
    scene.render.resolution_y=h
    scene.render.resolution_percentage=100
    scene.render.filepath=str(REVIEW/name)
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError:
        if scene.cycles.device!='GPU':
            raise
        scene.cycles.device='CPU'
        bpy.ops.render.render(write_still=True)
    print('RENDERED',scene.render.filepath)


if MODE=='preview':
    render(desktop,720,450,'inspection_v2_preview_desktop.png')
    render(closeup,720,540,'inspection_v2_preview_closeup.png')
    render(mobile,390,700,'inspection_v2_preview_mobile.png')
else:
    render(desktop,1440,900,'inspection_desktop_1440x900.png')
    render(closeup,1080,810,'inspection_closeup_1080x810.png')
    render(mobile,390,844,'inspection_mobile_390x844.png')
    scene.camera=desktop
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        if obj.type in ('MESH','EMPTY','CAMERA','LIGHT') and not obj.name.startswith('Ground |'):
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(MODELS/'inspection_array.glb'),
        export_format='GLB',use_selection=True,export_cameras=True,export_lights=True,
        export_apply=True)
    print('EXPORTED',MODELS/'inspection_array.glb')
