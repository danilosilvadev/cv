"""The Climb, built from code in Blender: a colossal mountain in four climate zones, a tropical lagoon, weather, a climber. One scene, many shots, all close to the mountain.
Style: flat, stylised shapes with layered atmospheric haze (colour fades towards a haze colour with distance), so a simple scene still has depth.

    SHOT=base blender -b --python tools/blender/climb_scene.py        (SHOT = base|arid|rock|ice|summit)
Environment: CV_ROOT, SHOT, W and HGT (default 1920x1080), SAMPLES. Output: lab/climb/<shot>.png"""
import math, os, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.environ.get("CV_ROOT", os.getcwd())
sys.path.insert(0, os.path.join(ROOT, "tools", "blender"))
import climb_terrain as T

SHOT = os.environ.get("SHOT", "base")
RW, RH, SAMPLES = int(os.environ.get("W", 1920)), int(os.environ.get("HGT", 1080)), int(os.environ.get("SAMPLES", 32))
OUT = os.path.join(ROOT, "lab", "climb"); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene


def srgb(c): return tuple(float(v) ** 2.2 for v in c)


def surface_normal(x, y):
    e = 1.5; gx = (T.height(x + e, y) - T.height(x - e, y)) / (2 * e); gy = (T.height(x, y + e) - T.height(x, y - e)) / (2 * e)
    n = Vector((-float(gx), -float(gy), 1.0)); n.normalize(); return n


# ───────────── the shots ─────────────
beach = None
for yy in np.arange(T.LAGOON[1], T.LAGOON[1] + 500, 0.5):
    if T.height(8.0, yy) >= 0.7: beach = (8.0, float(yy)); break
SHOTS = {
    # sun_el/az: where the sun is. haze: the colour distance fades to. hz: (near, far) metres for the haze. sun_size: the disc, degrees.
    "base":   dict(sun_el=7, sun_az=118, air=1.0, dust=.6, haze=(.74, .55, .62), hz=(250, 5200), sun_size=3.2, exposure=-.1, lens=16),
    "arid":   dict(sun_el=18, sun_az=118, air=1.0, dust=.5, haze=(.88, .66, .52), hz=(160, 3200), sun_size=2.4, exposure=-.1, lens=24, face=(-90, 760)),
    "rock":   dict(sun_el=12, sun_az=118, air=.8, dust=.2, haze=(.40, .43, .50), hz=(60, 900), sun_size=1.2, exposure=-.4, lens=24, face=(-90, 1500)),
    "ice":    dict(sun_el=10, sun_az=118, air=.8, dust=.2, haze=(.72, .78, .88), hz=(40, 600), sun_size=1.2, exposure=-.1, lens=24, face=(-90, 2250)),
    "summit": dict(sun_el=5, sun_az=118, air=1.0, dust=1.2, haze=(.95, .78, .62), hz=(300, 6000), sun_size=3.4, exposure=0.0, lens=22),
}
S = SHOTS[SHOT]

# ───────────── sky and sun ─────────────
world = bpy.data.worlds.new("sky"); scn.world = world; world.use_nodes = True; nt = world.node_tree; nt.nodes.clear()
sky = nt.nodes.new("ShaderNodeTexSky"); bgn = nt.nodes.new("ShaderNodeBackground"); wout = nt.nodes.new("ShaderNodeOutputWorld")
sky.sky_type = "MULTIPLE_SCATTERING"; sky.sun_elevation = math.radians(S["sun_el"]); sky.sun_rotation = math.radians(S["sun_az"]); sky.air_density = S["air"]; sky.aerosol_density = S["dust"]
sky.sun_disc = True; sky.sun_size = math.radians(S["sun_size"]); sky.sun_intensity = 1.0
nt.links.new(sky.outputs["Color"], bgn.inputs["Color"]); nt.links.new(bgn.outputs["Background"], wout.inputs["Surface"])
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3.4; sun.angle = math.radians(2.0); sun.color = (1, .88, .74)
sun_ob = bpy.data.objects.new("sun", sun); scn.collection.objects.link(sun_ob)
sun_dir = Vector(sky.sun_direction); sun_ob.rotation_euler = (-sun_dir).to_track_quat("-Z", "Y").to_euler()


# ───────────── materials: flat stylised colour, plus haze that grows with distance from the camera ─────────────
def new_mat(name, color=None, rough=.9, vcol=False, haze=True, spec=.1):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt_ = m.node_tree; nt_.nodes.clear()
    out_, bsdf = nt_.nodes.new("ShaderNodeOutputMaterial"), nt_.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = rough
    try: bsdf.inputs["Specular IOR Level"].default_value = spec
    except KeyError: pass
    if vcol:
        vc = nt_.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "col"; nt_.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    else: bsdf.inputs["Base Color"].default_value = (*srgb(color), 1)
    last = bsdf.outputs["BSDF"]
    if haze:
        tc, ln, mr, em, mx = [nt_.nodes.new(k) for k in ("ShaderNodeTexCoord", "ShaderNodeVectorMath", "ShaderNodeMapRange", "ShaderNodeEmission", "ShaderNodeMixShader")]
        ln.operation = "LENGTH"; nt_.links.new(tc.outputs["Camera"], ln.inputs[0])
        mr.inputs["From Min"].default_value = S["hz"][0]; mr.inputs["From Max"].default_value = S["hz"][1]; mr.inputs["To Min"].default_value = 0; mr.inputs["To Max"].default_value = .94
        nt_.links.new(ln.outputs["Value"], mr.inputs["Value"]); em.inputs["Color"].default_value = (*srgb(S["haze"]), 1); em.inputs["Strength"].default_value = 1.0
        nt_.links.new(mr.outputs["Result"], mx.inputs["Fac"]); nt_.links.new(bsdf.outputs["BSDF"], mx.inputs[1]); nt_.links.new(em.outputs["Emission"], mx.inputs[2]); last = mx.outputs["Shader"]
    nt_.links.new(last, out_.inputs["Surface"]); return m


def add_obj(name, mesh, mat=None, parent=None):
    ob = bpy.data.objects.new(name, mesh); scn.collection.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    if parent: ob.parent = parent
    return ob


# ───────────── terrain: a coarse mountain, plus a fine patch around the camera's subject ─────────────
def grid(name, x0, x1, y0, y1, nx, ny, skip=None, drop=None, drop_by=6.0, smooth=False):
    xs, ys = np.linspace(x0, x1, nx + 1), np.linspace(y0, y1, ny + 1)
    X, Y = np.meshgrid(xs, ys); Z = T.height(X, Y)
    if drop is not None: Z = Z - drop_by * ((X > drop[0]) & (X < drop[1]) & (Y > drop[2]) & (Y < drop[3]))
    sl = T.slope_deg(X, Y, max(.5, (x1 - x0) / nx)); col = T.color(X, Y, T.height(X, Y), sl)
    me = bpy.data.meshes.new(name); nv = (nx + 1) * (ny + 1)
    me.vertices.add(nv); me.vertices.foreach_set("co", np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).astype(np.float32).ravel())
    ii, jj = np.meshgrid(np.arange(nx), np.arange(ny)); v00 = (jj * (nx + 1) + ii).ravel()
    quads = np.stack([v00, v00 + 1, v00 + nx + 2, v00 + nx + 1], axis=1).astype(np.int32)
    if skip is not None:
        cx_, cy_ = X.ravel()[v00] + (x1 - x0) / nx / 2, Y.ravel()[v00] + (y1 - y0) / ny / 2
        quads = quads[~((cx_ > skip[0]) & (cx_ < skip[1]) & (cy_ > skip[2]) & (cy_ < skip[3]))]
    me.loops.add(len(quads) * 4); me.polygons.add(len(quads))
    me.loops.foreach_set("vertex_index", quads.ravel()); me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32)); me.polygons.foreach_set("loop_total", np.full(len(quads), 4, np.int32))
    me.update(calc_edges=True)
    ca = me.color_attributes.new("col", "FLOAT_COLOR", "POINT"); ca.data.foreach_set("color", np.concatenate([col.reshape(-1, 3), np.ones((nv, 1))], 1).astype(np.float32).ravel())
    me.polygons.foreach_set("use_smooth", np.full(len(quads), smooth, bool))
    return me


mat_t = new_mat("terrain", vcol=True, rough=.95, spec=.05)
FOCUS = None; patch = None
if "face" in S:
    FOCUS = T.spot_on_face(*S["face"]); patch = (FOCUS[0] - 230, FOCUS[0] + 230, FOCUS[1] - 230, FOCUS[1] + 230)
add_obj("mountain", grid("mountain", -2200, 2200, -2600, 1800, 1100, 1100, drop=patch), mat_t)
add_obj("ground", grid("ground", -12000, 12000, -12000, 12000, 200, 200, skip=(-2200, 2200, -2600, 1800), smooth=True), mat_t)
if patch: add_obj("patch", grid("patch", *patch, 920, 920), mat_t)

water = new_mat("water", (.02, .50, .52), rough=.3, spec=.1)
wm = bpy.data.meshes.new("water"); wm.from_pydata([(-12000, -12000, 0), (12000, -12000, 0), (12000, 12000, 0), (-12000, 12000, 0)], [], [(0, 1, 2, 3)]); add_obj("water", wm, water)


# ───────────── trees: stylised blobs, merged into one mesh ─────────────
def trees(n, hmax, slope_max, rect, avoid=None, seed=3):
    bm_ = bmesh.new(); r_ = np.random.default_rng(seed); count = 0
    for _ in range(n * 4):
        x_, y_ = float(r_.uniform(rect[0], rect[1])), float(r_.uniform(rect[2], rect[3])); h_ = float(T.height(x_, y_))
        if h_ < 1.2 or h_ > hmax or float(T.slope_deg(x_, y_, 2.0)) > slope_max: continue
        if avoid and abs(x_ - avoid[0]) < avoid[2] and abs(y_ - avoid[1]) < avoid[3]: continue
        sz = float(r_.uniform(7, 16))
        bmesh.ops.create_icosphere(bm_, subdivisions=1, radius=sz * .5, matrix=Matrix.Translation((x_, y_, h_ + sz * .35)) @ Matrix.Diagonal((1.0, 1.0, 1.15, 1.0)))
        count += 1
        if count >= n: break
    me_ = bpy.data.meshes.new("trees"); bm_.to_mesh(me_); bm_.free()
    add_obj("trees", me_, new_mat("leaf", (.05, .20, .08), .9))


# ───────────── cloud sprites: cauliflower puffs, lit from one side ─────────────
def cloud_image(seed):
    n = 512; yy, xx = np.mgrid[0:n, 0:n] / n; r_ = np.random.default_rng(int(seed) + 100)
    acc = np.zeros((n, n), np.float32); shade = np.zeros((n, n), np.float32); L = np.array([.55, -.65])
    for k in range(64):
        t = r_.uniform(0, 1); cx = .5 + (r_.uniform(-.5, .5)) * (.86 - .35 * abs(t - .5)); cy = .56 + r_.normal(0, .12) - (0 if k < 40 else .12)
        rad = r_.uniform(.05, .17) * (1.2 - abs(cx - .5) * 1.2); dx, dy = xx - cx, (yy - cy) * 1.15; d = np.sqrt(dx * dx + dy * dy)
        a = np.clip(1 - d / rad, 0, 1) ** .6; a = a * a * (3 - 2 * np.clip(a * 1.6, 0, 1))
        nxx, nyy = dx / np.maximum(d, 1e-4), dy / np.maximum(d, 1e-4); lit = np.clip((nxx * L[0] + nyy * L[1]) * .5 + .62, 0, 1.0)
        m = a > acc * .85; acc = np.maximum(acc, a); shade = np.where(m, lit, shade)
    fine = T.fbm(xx * 14 + seed, yy * 14, seed, 4)
    alpha = np.clip(acc * 1.6 + (fine - .5) * .5 * (acc > 0), 0, 1); alpha = alpha * alpha * (3 - 2 * alpha)
    base_ = .38 + .62 * shade * (.8 + .4 * fine)
    px = np.zeros((n, n, 4), np.float32); px[..., 0] = base_; px[..., 1] = base_ * .99; px[..., 2] = base_ * .97 + .03; px[..., 3] = alpha
    im = bpy.data.images.new("cloud%d" % seed, n, n, alpha=True); im.pixels.foreach_set(px[::-1].ravel()); im.update(); return im


def cloud_mat(im, tint, strength, opacity):
    m = bpy.data.materials.new("cloud"); m.use_nodes = True; nt_ = m.node_tree; nt_.nodes.clear()
    out_, mix, tr, em, tx, mul, mulf = [nt_.nodes.new(k) for k in ("ShaderNodeOutputMaterial", "ShaderNodeMixShader", "ShaderNodeBsdfTransparent", "ShaderNodeEmission", "ShaderNodeTexImage", "ShaderNodeMix", "ShaderNodeMath")]
    tx.image = im; tx.extension = "CLIP"; mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1; mul.inputs[7].default_value = (*srgb(tint), 1)
    nt_.links.new(tx.outputs["Color"], mul.inputs[6]); nt_.links.new(mul.outputs[2], em.inputs["Color"]); em.inputs["Strength"].default_value = strength
    mulf.operation = "MULTIPLY"; mulf.inputs[1].default_value = opacity; nt_.links.new(tx.outputs["Alpha"], mulf.inputs[0]); nt_.links.new(mulf.outputs[0], mix.inputs[0])
    nt_.links.new(tr.outputs[0], mix.inputs[1]); nt_.links.new(em.outputs[0], mix.inputs[2]); nt_.links.new(mix.outputs[0], out_.inputs["Surface"])
    try: m.surface_render_method = "BLENDED"
    except Exception: m.blend_method = "BLEND"
    return m


def clouds(spec, cam_loc):
    imgs = [cloud_image(s_) for s_ in (3, 7, 12, 19)]
    for k, (cx, cy, cz, size, tint, strength, opacity) in enumerate(spec):
        me = bpy.data.meshes.new("c%d" % k); me.from_pydata([(-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0)], [], [(0, 1, 2, 3)])
        uv_ = me.uv_layers.new(); uv_.data.foreach_set("uv", [0, 0, 1, 0, 1, 1, 0, 1])
        ob = add_obj("cloud", me, cloud_mat(imgs[k % 4], tint, strength, opacity)); ob.location = (cx, cy, cz)
        ob.rotation_euler = (Vector(cam_loc) - Vector((cx, cy, cz))).to_track_quat("Z", "Y").to_euler(); ob.scale = (size, size * .62, 1)


# ───────────── the climber: dark gear, a bright red scarf; oriented to stand or lean on a slope ─────────────
def climber(P, facing, up=Vector((0, 0, 1)), scale=1.0, pose="stand"):
    """P: feet position. facing: direction the climber looks towards. up: the climber's up axis (the slope normal when climbing)."""
    up = Vector(up).normalized(); f = Vector(facing); f -= up * f.dot(up); f.normalize(); right = up.cross(f); right.normalize()
    rot = Matrix(((right.x, -f.x, up.x), (right.y, -f.y, up.y), (right.z, -f.z, up.z)))                  # local +x right, local -y forward, local +z up
    root = bpy.data.objects.new("climber", None); scn.collection.objects.link(root); root.location = P; root.rotation_euler = rot.to_euler(); root.scale = (scale,) * 3
    jacket, pants, red, skin, pack, helmet = (new_mat("jacket", (.05, .09, .20), .8), new_mat("pants", (.08, .08, .10), .85), new_mat("scarf", (.95, .05, .04), .6), new_mat("skin", (.75, .5, .4), .7), new_mat("pack", (.62, .30, .06), .85), new_mat("helmet", (.92, .92, .94), .5))
    def part(prim, mat, loc_, size, rot_=(0, 0, 0)):
        if prim == "box": bpy.ops.mesh.primitive_cube_add(size=1)
        elif prim == "sphere": bpy.ops.mesh.primitive_uv_sphere_add(radius=.5, segments=14, ring_count=8)
        else: bpy.ops.mesh.primitive_cylinder_add(radius=.5, depth=1, vertices=10)
        ob = bpy.context.object; ob.location, ob.scale, ob.rotation_euler = loc_, size, rot_; ob.data.materials.append(mat); ob.parent = root
        for p_ in ob.data.polygons: p_.use_smooth = True
        return ob
    climbing = pose == "climb"
    part("box", jacket, (0, 0, 1.18), (.46, .26, .62)); part("box", pants, (0, 0, .78), (.40, .24, .26))
    if climbing:                                                                     # legs bent onto the wall, arms reaching up
        part("cyl", pants, (-.14, -.18, .42), (.17, .17, .8), (-.7, 0, 0)); part("cyl", pants, (.14, -.30, .55), (.17, .17, .8), (-1.1, 0, 0))
        part("cyl", jacket, (-.34, -.12, 1.62), (.13, .13, .7), (-.35, 0, .25)); part("cyl", jacket, (.34, -.18, 1.78), (.13, .13, .7), (-.15, 0, -.3))
    else:
        part("cyl", pants, (-.12, 0, .38), (.17, .17, .8)); part("cyl", pants, (.12, 0, .38), (.17, .17, .8))
        part("box", jacket, (-.30, 0, 1.2), (.14, .16, .56)); part("box", jacket, (.30, 0, 1.2), (.14, .16, .56))
    part("sphere", skin, (0, -.02, 1.66), (.21, .22, .24)); part("sphere", helmet, (0, 0, 1.72), (.26, .27, .2))
    part("box", pack, (0, .2, 1.18), (.38, .24, .56)); part("box", red, (0, -.04, 1.5), (.27, .22, .1)); part("box", red, (.06, -.16, 1.36), (.09, .05, .34))
    return root


# ───────────── shots ─────────────
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = S["lens"]; cam_d.clip_end = 80000
cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
look = None
if SHOT == "base":
    bx, by = beach; feet = Vector((bx + 4.0, by + 14, float(T.height(bx + 4.0, by + 14))))
    climber(feet, Vector((0, 1, 0)), scale=1.0)
    cam.location = Vector((bx - 1.0, by - 7, float(T.height(bx - 2.0, by - 11)) + 1.5)); look = cam.location + Vector((0, 100, 28))
    trees(2400, 330, 36, (-700, 700, T.LAGOON[1] - 100, T.LAGOON[1] + 900), avoid=(bx, by + 8, 45, 50))
    rng2 = np.random.default_rng(5); cs = []
    for k in range(10): cs.append((float(rng2.uniform(-1500, 1500)), float(rng2.uniform(0, 1500)), float(rng2.uniform(2900, 4200)), float(rng2.uniform(900, 1700)), (1.0, .86, .80), 1.0, .9))
    clouds(cs, cam.location)
elif SHOT in ("arid", "rock", "ice"):
    P = Vector(FOCUS); n = surface_normal(P.x, P.y); downhill = Vector((n.x, n.y, 0)); downhill.normalize()
    uphill = (Vector((0, 0, 1)) - n * n.z); uphill.normalize()
    climber(P + n * .05, -downhill, up=(Vector((0, 0, 1)) * .35 + n * .65), scale=1.0, pose="climb")
    side = n.cross(uphill); side.normalize()
    cam.location = P + n * 4.0 + downhill * 5.0 + side * 4.0; look = P + uphill * 1.4 + n * .9
    if SHOT == "arid": trees(1200, 330, 40, (-500, 500, -2600, -1200))
else:                                                                                      # summit
    cam.location = Vector((9, -14, T.SUMMIT + 3)); look = Vector((0, -400, T.SUMMIT - 120))
cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()

# ───────────── render ─────────────
r = scn.render; r.resolution_x, r.resolution_y = RW, RH
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
    try: r.engine = eng; break
    except TypeError: continue
try: scn.eevee.taa_render_samples = SAMPLES
except Exception: pass
scn.view_settings.exposure = S["exposure"]
try: scn.view_settings.view_transform = "AgX"; scn.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
r.image_settings.file_format = "PNG"; r.filepath = os.path.join(OUT, SHOT + ".png")
bpy.ops.render.render(write_still=True)
print("rendered", r.filepath, "engine", r.engine)
