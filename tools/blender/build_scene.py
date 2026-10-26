"""Build "the descent" in Blender from code: the loss landscape (glowing contours), the gradient-descent run, the minimum, drifting data motes,
a small traveller with a lantern, and a camera that flies the run. Then render it (route C: a film to scrub with the scroll) and export it
as glTF (route B: a live 3D scene for the page).

    blender -b --python tools/blender/build_scene.py            # all stages
    STAGE=export blender -b --python tools/blender/build_scene.py   # scene + glTF only (no render)
Environment: CV_ROOT (repo root), STAGE (all|scene|export|render), FRAMES (default 240), W and HGT (default 1280x720), ENGINE (override)."""
import json, math, os, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.environ.get("CV_ROOT", os.getcwd())
ASSETS, OUT = os.path.join(ROOT, "lab", "assets"), os.path.join(ROOT, "lab", "render")
STAGE = os.environ.get("STAGE", "all")
FRAMES, RW, RH = int(os.environ.get("FRAMES", 240)), int(os.environ.get("W", 1280)), int(os.environ.get("HGT", 720))
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, "tools", "blender"))
import descent_model as dm

data = json.load(open(os.path.join(ASSETS, "scene.json")))
X0, X1, Z0, Z1 = data["footprint"]
MAIN = np.array(data["main"])                      # (n,3): x, h, z in the web's coordinates
RUNS = [np.array(r) for r in data["runs"]]
MIN = np.array(data["min"])


def V(p):                                           # web (x, h, z) -> Blender (x, -z, h); the glTF exporter turns that back into the web's axes
    return Vector((float(p[0]), -float(p[2]), float(p[1])))


def smooth(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t


def at(t):                                          # a point on the main run, t in 0..1
    t = min(1.0, max(0.0, t)); f = t * (len(MAIN) - 1); i = min(len(MAIN) - 2, int(f)); return MAIN[i] + (MAIN[i + 1] - MAIN[i]) * (f - i)


bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
world = bpy.data.worlds.new("world"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.002, .003, .010, 1); bg.inputs[1].default_value = 1.0


def emission_material(name, color=(1, 1, 1), strength=1.0, image=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out, bsdf = nt.nodes.new("ShaderNodeOutputMaterial"), nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1); bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Emission Strength"].default_value = strength
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = image; tex.interpolation = "Linear"; tex.extension = "EXTEND"
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    else:
        bsdf.inputs["Emission Color"].default_value = (color[0], color[1], color[2], 1)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def new_object(name, mesh, mat=None):
    ob = bpy.data.objects.new(name, mesh); scn.collection.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob


# ── the terrain: a mesh of the surface, lit only by its own contour texture
NXg, NZg = 360, 340
xs, zs = np.linspace(X0, X1, NXg + 1), np.linspace(Z0, Z1, NZg + 1)
GX, GZ = np.meshgrid(xs, zs)
GH = dm.H(GX, GZ)
verts = np.stack([GX.ravel(), -GZ.ravel(), GH.ravel()], axis=1)
ii, jj = np.meshgrid(np.arange(NXg), np.arange(NZg))
v00 = (jj * (NXg + 1) + ii).ravel()
faces = np.stack([v00, v00 + 1, v00 + NXg + 2, v00 + NXg + 1], axis=1)
mesh = bpy.data.meshes.new("terrain"); mesh.from_pydata(verts.tolist(), [], faces.tolist()); mesh.update()
uv = mesh.uv_layers.new(name="UV"); fx = verts[faces.ravel()]
uv.data.foreach_set("uv", np.stack([(fx[:, 0] - X0) / (X1 - X0), 1 - ((-fx[:, 1]) - Z0) / (Z1 - Z0)], axis=1).ravel().tolist())
img = bpy.data.images.load(os.path.join(ASSETS, "contours.png")); img.colorspace_settings.name = "sRGB"
terrain = new_object("terrain", mesh, emission_material("contours", image=img, strength=1.0))
for p in terrain.data.polygons: p.use_smooth = True


def tube(name, pts, radius, color, strength):                      # a glowing tube along a path
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for k, p in enumerate(pts): q = V(p); sp.points[k].co = (q.x, q.y, q.z, 1)
    cu.bevel_depth = radius; cu.bevel_resolution = 2; cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); scn.collection.objects.link(ob); ob.data.materials.append(emission_material(name, color, strength))
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target="MESH"); ob.select_set(False)
    return ob


tube("run_main", MAIN, .15, (1.0, .78, .40), 9.0)
tube("run_glow", MAIN, .5, (1.0, .55, .18), .9)
for k, r in enumerate(RUNS): tube("run_failed_%d" % k, r, .1, (.38, .91, .84), 3.0)

# ── the minimum: a still core of light and rings that never stop
bpy.ops.mesh.primitive_ico_sphere_add(radius=1.1, subdivisions=3, location=V(MIN) + Vector((0, 0, 6))); core = bpy.context.object; core.name = "core"
core.data.materials.append(emission_material("core", (1, .90, .70), 6.0))
rings = []
for k, rr in enumerate((5, 9, 14)):
    bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=.09, major_segments=96, minor_segments=8, location=V(MIN) + Vector((0, 0, 6)), rotation=(.25 * k, 0, 0))
    ob = bpy.context.object; ob.name = "ring_%d" % k; ob.data.materials.append(emission_material("ring", (1, .70, .28), 3.0)); rings.append(ob)

# ── data motes drifting above the surface (one mesh of little glowing spheres)
rng = np.random.default_rng(7); bm = bmesh.new()
for _ in range(900):
    mx, mz = rng.uniform(X0, X1), rng.uniform(Z0, Z1); mh = float(dm.H(mx, mz)) + rng.uniform(2, 34); r = rng.uniform(.10, .26)
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r, matrix=Matrix.Translation(V((mx, mh, mz))))
mm = bpy.data.meshes.new("motes"); bm.to_mesh(mm); bm.free()
new_object("motes", mm, emission_material("motes", (.30, .75, 1.0), 2.4))

# ── the traveller (a cloaked figure with a lantern) and the comet that runs the path
fig_mat = bpy.data.materials.new("cloak"); fig_mat.use_nodes = True; fig_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.01, .008, .01, 1)
traveller = bpy.data.objects.new("traveller", None); scn.collection.objects.link(traveller)
bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=.95, radius2=.12, depth=2.6, location=(0, 0, 1.3)); cone = bpy.context.object; cone.data.materials.append(emission_material("cloak", (.015, .012, .018), .15)); cone.parent = traveller
bpy.ops.mesh.primitive_uv_sphere_add(radius=.42, location=(0, 0, 2.95)); head = bpy.context.object; head.data.materials.append(cone.data.materials[0]); head.parent = traveller
bpy.ops.mesh.primitive_uv_sphere_add(radius=.28, location=(1.0, 0, 1.7)); lamp = bpy.context.object; lamp.data.materials.append(emission_material("lantern", (1, .78, .45), 30.0)); lamp.parent = traveller
for ob in (cone, head, lamp): bpy.context.view_layer.objects.active = ob
comet_parts = []
for k in range(7):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5 - k * .16, location=(0, 0, 0)); ob = bpy.context.object; ob.name = "comet_%d" % k
    ob.data.materials.append(emission_material("comet", (1, .92, .72), 22.0 - k * 2.5)); comet_parts.append(ob)

# ── the camera: it flies the run, high and wide at the start, then low and close, ending at the minimum
cam_data = bpy.data.cameras.new("cam"); cam_data.angle = math.radians(52); cam_data.clip_end = 2000
cam = bpy.data.objects.new("camera", cam_data); scn.collection.objects.link(cam); scn.camera = cam
CAM = []                                                                   # per frame: position and look-at in the web's coordinates (for the live page)
for f in range(1, FRAMES + 1):
    u = (f - 1) / (FRAMES - 1); tc = .012 + .95 * smooth(u)
    c, b = at(tc), at(max(0, tc - .075)); d = np.array([c[0] - b[0], 0, c[2] - b[2]]); n = np.linalg.norm(d); d = d / n if n > 1e-6 else np.array([0, 0, -1.0])
    side = lerp(-48, 7, smooth(tc / .38)); up = 9 + 40 * math.exp(-tc * 7.5)
    pos = np.array([b[0] - d[2] * side, b[1] + up, b[2] + d[0] * side]); look = at(tc + .10) + np.array([0, 3.5, 0])
    w = smooth((tc - .60) / .34); look = look + (MIN + np.array([0, 5, 0]) - look) * w
    pos = pos + (MIN + np.array([24.0, 52.0, 62.0]) - pos) * w                      # the last move rises out of the basin and looks down at the core
    CAM.append({"pos": np.round(pos, 3).tolist(), "look": np.round(look, 3).tolist(), "tc": round(tc, 4)})
    P, L = V(pos), V(look); cam.location = P; cam.rotation_euler = (L - P).to_track_quat("-Z", "Y").to_euler()
    cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
    # the traveller walks ahead of the camera, the comet runs the path on a loop
    fp, fq = at(tc + .05), at(tc + .06); traveller.location = V(fp); traveller.rotation_euler = (0, 0, math.atan2(-(fq[0] - fp[0]), -(fq[2] - fp[2])) + math.pi / 2)
    traveller.scale = (2.4 / 2.6,) * 3
    traveller.keyframe_insert("location", frame=f); traveller.keyframe_insert("rotation_euler", frame=f); traveller.keyframe_insert("scale", frame=f)
    tcom = ((f - 1) / FRAMES * 1.7) % 1
    for k, ob in enumerate(comet_parts): ob.location = V(at(tcom - k * .006) + np.array([0, .6, 0])); ob.keyframe_insert("location", frame=f)
    for k, ob in enumerate(rings): ob.rotation_euler = (.25 * k + math.pi * 0, 0, (f - 1) * (.012 + .004 * k) * (1 if k % 2 == 0 else -1)); ob.keyframe_insert("rotation_euler", frame=f)
scn.frame_start, scn.frame_end = 1, FRAMES
json.dump({"frames": FRAMES, "camera": CAM, "fov": 52}, open(os.path.join(ASSETS, "camera.json"), "w"), separators=(",", ":"))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "descent.blend"))
print("scene built:", len(bpy.data.objects), "objects")

if STAGE in ("all", "export"):
    for ob in list(bpy.data.objects):
        if ob.type == "CAMERA": ob.select_set(False)
    bpy.ops.object.select_all(action="DESELECT")
    glb = os.path.join(ASSETS, "descent.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_cameras=False, export_lights=False, export_animations=False, export_yup=True, export_apply=True)
    print("exported", glb, os.path.getsize(glb) // 1024, "KB")

if STAGE in ("all", "render"):
    r = scn.render; r.resolution_x, r.resolution_y, r.resolution_percentage = RW, RH, 100
    for eng in ([os.environ["ENGINE"]] if "ENGINE" in os.environ else ["BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"]):
        try: r.engine = eng; break
        except TypeError: continue
    print("render engine:", r.engine)
    try: scn.view_settings.view_transform = "Standard"
    except Exception: pass
    if r.engine == "CYCLES":
        scn.cycles.samples = 24; scn.cycles.use_denoising = True; scn.cycles.device = "GPU"
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences; prefs.compute_device_type = "CUDA"; prefs.get_devices()
            for d in prefs.devices: d.use = True
        except Exception as e: print("gpu setup:", e)
    else:
        try: scn.eevee.taa_render_samples = 24
        except Exception: pass
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"
    os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
    r.filepath = os.path.join(OUT, "frames", "f_")
    if os.environ.get("FRAME_LIST"):                                                   # a few test frames, e.g. FRAME_LIST=1,80,160,240
        for fr in [int(x) for x in os.environ["FRAME_LIST"].split(",")]:
            scn.frame_set(fr); r.filepath = os.path.join(OUT, "frames", "test_%04d.png" % fr); bpy.ops.render.render(write_still=True)
        print("rendered test frames")
    else:
        bpy.ops.render.render(animation=True)
        print("rendered", FRAMES, "frames")
