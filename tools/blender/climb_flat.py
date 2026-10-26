"""The Climb, in the flat, hazy, layered style of the reference image: one pastel palette that fades into haze with distance, faceted low-poly forms,
dark foreground silhouettes, tall slender pines, a big pale sun, and the water running to the horizon. Built from code in Blender.

    SHOT=base blender -b --python tools/blender/climb_flat.py        Output: lab/climb/flat_<shot>.png
Environment: CV_ROOT, SHOT, W and HGT (default 1920x1080), SAMPLES."""
import math, os, sys
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.environ.get("CV_ROOT", os.getcwd())
sys.path.insert(0, os.path.join(ROOT, "tools", "blender"))
import climb_terrain as T

SHOT = os.environ.get("SHOT", "base")
RW, RH, SAMPLES = int(os.environ.get("W", 1920)), int(os.environ.get("HGT", 1080)), int(os.environ.get("SAMPLES", 24))
OUT = os.path.join(ROOT, "lab", "climb"); os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene


def lin(c): return tuple(float(v) ** 2.2 for v in c)


# ───────────── one palette per shot: sky, haze, how far the haze reaches, the sun ─────────────
PAL = {
    "base": dict(sky_top=(.93, .78, .72), sky_low=(.80, .56, .60), haze=(.78, .55, .60), hz=(700, 6200), sun_el=23, sun_az=41, sun_col=(1.0, .93, .84),
                 near=(.17, .14, .30), tree=(.34, .27, .46), mount_tint=1.0),
}
P = PAL[SHOT]
sun_dir = Vector((math.sin(math.radians(P["sun_az"])) * math.cos(math.radians(P["sun_el"])), math.cos(math.radians(P["sun_az"])) * math.cos(math.radians(P["sun_el"])), math.sin(math.radians(P["sun_el"]))))

# ───────────── the sky: a gradient, warm and pale towards the sun ─────────────
world = bpy.data.worlds.new("sky"); scn.world = world; world.use_nodes = True; wn = world.node_tree; wn.nodes.clear()
tc, sep, mapr, ramp, bg, out_w = [wn.nodes.new(k) for k in ("ShaderNodeTexCoord", "ShaderNodeSeparateXYZ", "ShaderNodeMapRange", "ShaderNodeValToRGB", "ShaderNodeBackground", "ShaderNodeOutputWorld")]
dot, dmap, glow, mixc = [wn.nodes.new(k) for k in ("ShaderNodeVectorMath", "ShaderNodeMapRange", "ShaderNodeMix", "ShaderNodeMix")]
wn.links.new(tc.outputs["Generated"], sep.inputs[0]); wn.links.new(sep.outputs["Z"], mapr.inputs["Value"])
mapr.inputs["From Min"].default_value = -.05; mapr.inputs["From Max"].default_value = .75; mapr.clamp = True
ramp.color_ramp.elements[0].color = (*lin(P["sky_low"]), 1); ramp.color_ramp.elements[1].color = (*lin(P["sky_top"]), 1)
wn.links.new(mapr.outputs["Result"], ramp.inputs["Fac"])
dot.operation = "DOT_PRODUCT"; dot.inputs[1].default_value = tuple(sun_dir); wn.links.new(tc.outputs["Generated"], dot.inputs[0])
dmap.inputs["From Min"].default_value = .55; dmap.inputs["From Max"].default_value = 1.0; dmap.clamp = True; wn.links.new(dot.outputs["Value"], dmap.inputs["Value"])
mixc.data_type = "RGBA"; mixc.blend_type = "MIX"; mixc.inputs[7].default_value = (*lin((1.0, .96, .88)), 1); wn.links.new(dmap.outputs["Result"], mixc.inputs[0]); wn.links.new(ramp.outputs["Color"], mixc.inputs[6])
wn.links.new(mixc.outputs[2], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 1.0; wn.links.new(bg.outputs["Background"], out_w.inputs["Surface"])
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 2.2; sun.angle = math.radians(3); sun.color = P["sun_col"]
so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so); so.rotation_euler = (-sun_dir).to_track_quat("-Z", "Y").to_euler()


# ───────────── materials: lit flat colour that fades into the haze with distance from the camera ─────────────
def mat(name, color, rough=1.0, haze=True, emit=False, spec=.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); out = nt.nodes.new("ShaderNodeOutputMaterial")
    if emit:
        b = nt.nodes.new("ShaderNodeEmission"); b.inputs["Color"].default_value = (*lin(color), 1); last = b.outputs["Emission"]; base_out = last
    else:
        b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.inputs["Base Color"].default_value = (*lin(color), 1); b.inputs["Roughness"].default_value = rough
        try: b.inputs["Specular IOR Level"].default_value = spec
        except KeyError: pass
        last = b.outputs["BSDF"]
    if haze:
        t_, ln, mr, em, mx = [nt.nodes.new(k) for k in ("ShaderNodeTexCoord", "ShaderNodeVectorMath", "ShaderNodeMapRange", "ShaderNodeEmission", "ShaderNodeMixShader")]
        ln.operation = "LENGTH"; nt.links.new(t_.outputs["Camera"], ln.inputs[0])
        mr.inputs["From Min"].default_value = P["hz"][0]; mr.inputs["From Max"].default_value = P["hz"][1]; mr.inputs["To Min"].default_value = 0; mr.inputs["To Max"].default_value = .93
        nt.links.new(ln.outputs["Value"], mr.inputs["Value"]); em.inputs["Color"].default_value = (*lin(P["haze"]), 1)
        nt.links.new(mr.outputs["Result"], mx.inputs["Fac"]); nt.links.new(last, mx.inputs[1]); nt.links.new(em.outputs["Emission"], mx.inputs[2]); last = mx.outputs["Shader"]
    nt.links.new(last, out.inputs["Surface"]); return m


def obj(name, me, m):
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob); ob.data.materials.append(m); return ob


def mesh_from(verts, faces, name, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = smooth
    return me


# ───────────── the mountain: big faceted faces, banded from jungle to snow, but in pastel and softened by haze ─────────────
def terrain(name, x0, x1, y0, y1, n, skip=None, smooth=False):
    xs, ys = np.linspace(x0, x1, n + 1), np.linspace(y0, y1, n + 1); X, Y = np.meshgrid(xs, ys); Z = T.height(X, Y)
    col = T.color(X, Y, Z, T.slope_deg(X, Y, (x1 - x0) / n))
    col = np.power(np.clip(col, 0, 1), 1 / 2.2); col = .78 * col + .22 * np.array(P["haze"])[None, None, :]   # pull every colour towards the palette
    me = bpy.data.meshes.new(name); nv = (n + 1) ** 2
    me.vertices.add(nv); me.vertices.foreach_set("co", np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).astype(np.float32).ravel())
    ii, jj = np.meshgrid(np.arange(n), np.arange(n)); v00 = (jj * (n + 1) + ii).ravel(); quads = np.stack([v00, v00 + 1, v00 + n + 2, v00 + n + 1], axis=1).astype(np.int32)
    if skip is not None:
        cx, cy = X.ravel()[v00] + (x1 - x0) / n / 2, Y.ravel()[v00] + (y1 - y0) / n / 2; quads = quads[~((cx > skip[0]) & (cx < skip[1]) & (cy > skip[2]) & (cy < skip[3]))]
    me.loops.add(len(quads) * 4); me.polygons.add(len(quads)); me.loops.foreach_set("vertex_index", quads.ravel())
    me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32)); me.polygons.foreach_set("loop_total", np.full(len(quads), 4, np.int32)); me.update(calc_edges=True)
    ca = me.color_attributes.new("col", "FLOAT_COLOR", "POINT"); ca.data.foreach_set("color", np.concatenate([np.power(col.reshape(-1, 3), 2.2), np.ones((nv, 1))], 1).astype(np.float32).ravel())
    me.polygons.foreach_set("use_smooth", np.full(len(quads), smooth, bool))
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); out = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "col"; nt.links.new(vc.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 1.0
    try: b.inputs["Specular IOR Level"].default_value = 0
    except KeyError: pass
    t_, ln, mr, em, mx = [nt.nodes.new(k) for k in ("ShaderNodeTexCoord", "ShaderNodeVectorMath", "ShaderNodeMapRange", "ShaderNodeEmission", "ShaderNodeMixShader")]
    ln.operation = "LENGTH"; nt.links.new(t_.outputs["Camera"], ln.inputs[0]); mr.inputs["From Min"].default_value = P["hz"][0]; mr.inputs["From Max"].default_value = P["hz"][1]; mr.inputs["To Max"].default_value = .93
    nt.links.new(ln.outputs["Value"], mr.inputs["Value"]); em.inputs["Color"].default_value = (*lin(P["haze"]), 1)
    nt.links.new(mr.outputs["Result"], mx.inputs["Fac"]); nt.links.new(b.outputs["BSDF"], mx.inputs[1]); nt.links.new(em.outputs["Emission"], mx.inputs[2]); nt.links.new(mx.outputs["Shader"], out.inputs["Surface"])
    obj(name, me, m)


terrain("mountain", -2200, 2200, -2600, 1800, 120)                                          # 37 m facets: big flat planes, like the reference
terrain("ground", -14000, 14000, -14000, 14000, 160, skip=(-2200, 2200, -2600, 1800), smooth=True)

# ───────────── the water: it runs from the camera to the foot of the mountain ─────────────
LX, LY = 0.0, T.LAGOON[1]
SEA = 7.5
wv = [(-14000, -14000, SEA), (14000, -14000, SEA), (14000, 14000, SEA), (-14000, 14000, SEA)]
obj("water", mesh_from(wv, [(0, 1, 2, 3)], "water"), mat("water", (.50, .40, .42), rough=.12, spec=.6, emit=False))

# ───────────── pines: tall and slender (tiers of narrowing flat cones on a thin trunk), generated in bulk with numpy ─────────────
def pine_mesh(xs, ys, zs, hs, ws, seed, tiers=6, name="pines"):
    """xs, ys, zs, hs, ws: arrays, one pine each. Every tier is a 6-sided cone; a trunk is a thin 4-sided cone."""
    r = np.random.default_rng(seed); n = len(xs); V = []; F = []; base = [0]
    def cones(cx, cy, cz, rad, hgt, seg):
        ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
        ring = np.stack([cx[:, None] + rad[:, None] * np.cos(ang)[None], cy[:, None] + rad[:, None] * np.sin(ang)[None], np.repeat(cz[:, None], seg, 1)], -1)
        apex = np.stack([cx, cy, cz + hgt], -1)[:, None, :]
        verts = np.concatenate([ring, apex], 1).reshape(-1, 3)
        k = np.arange(len(cx))[:, None] * (seg + 1) + base[0]
        tri = np.stack([k + np.arange(seg)[None], k + (np.arange(seg)[None] + 1) % seg, np.repeat(k + seg, seg, 1)], -1).reshape(-1, 3)
        V.append(verts); F.append(tri); base[0] += len(verts)
    cones(xs, ys, zs, ws * .05, hs * .5, 4)
    for t in range(tiers):
        f = t / tiers; rad = ws * (1 - f * .8) * (.85 + .3 * r.random(n)); cones(xs, ys, zs + hs * (.24 + .7 * f), rad, hs * (.26 - .08 * f), 6)
    me = bpy.data.meshes.new(name); me.from_pydata(np.concatenate(V).tolist(), [], np.concatenate(F).tolist()); me.update()
    for p_ in me.polygons: p_.use_smooth = False
    return me


def forest(n, rect, hmax, hsize, wsize, seed, avoid=None, tiers=6, name="forest"):
    r = np.random.default_rng(seed); X = r.uniform(rect[0], rect[1], n * 3); Y = r.uniform(rect[2], rect[3], n * 3); Z = T.height(X, Y); S_ = T.slope_deg(X, Y, 3.0)
    ok = (Z > SEA + 1.5) & (Z < hmax) & (S_ < 38)
    if avoid: ok &= ~((X > avoid[0]) & (X < avoid[1]) & (Y > avoid[2]) & (Y < avoid[3]))
    X, Y, Z = X[ok][:n], Y[ok][:n], Z[ok][:n]; H = r.uniform(*hsize, len(X)); W = H * r.uniform(*wsize, len(X))
    return pine_mesh(X, Y, Z - 1.0, H, W, seed, tiers, name)


CX, CY = 0.0, LY - 900.0                                                   # the camera stands on the near shore of the water
obj("forest_mid", forest(12000, (-2000, 2000, LY + 150, -1450), 420, (24, 50), (.17, .22), 5), mat("tree_far", P["tree"], rough=1.0))
obj("forest_near", forest(260, (-190, 190, CY - 60, CY + 170), 60, (20, 36), (.16, .21), 9, avoid=(-26, 26, CY - 50, CY + 400), name="near"), mat("tree_near", P["near"], rough=1.0))
rr = np.random.default_rng(21); tx = np.concatenate([rr.uniform(-70, -30, 4), rr.uniform(34, 80, 4)]); ty = CY + rr.uniform(10, 50, 8)
obj("tall_pines", pine_mesh(tx, ty, T.height(tx, ty) - 1.0, rr.uniform(34, 56, 8), rr.uniform(6, 8.5, 8), 21, 9, "tall"), mat("tall", P["near"], rough=1.0, haze=False))

# the dark shores framing the water, like the reference's foreground hills
for side in (-1, 1):
    n = 60; xs = np.linspace(0, 520, n + 1) * side + side * 24; ys = np.linspace(CY - 200, CY + 520, n + 1); X, Y = np.meshgrid(xs, ys)
    Z = 4 + 22 * np.exp(-((np.abs(X) - 24 - 150) / 190) ** 2) * (.6 + .4 * np.sin(Y * .006 + side)) - np.clip((Y - CY - 90) * .01, 0, 6) + 5 * np.sin(Y * .02 + X * .01 * side)
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).tolist(); ii, jj = np.meshgrid(np.arange(n), np.arange(n)); v00 = (jj * (n + 1) + ii).ravel()
    obj("shore%d" % side, mesh_from(verts, np.stack([v00, v00 + 1, v00 + n + 2, v00 + n + 1], 1).tolist(), "shore", True), mat("shore", P["near"], rough=1.0, haze=False))

# ───────────── the climber: a tiny dark figure with a red scarf, standing on the shore ─────────────
def climber(loc, yaw, s=1.0):
    root = bpy.data.objects.new("climber", None); scn.collection.objects.link(root); root.location = loc; root.rotation_euler = (0, 0, yaw); root.scale = (s,) * 3
    dark, red = mat("cloth", (.07, .06, .12), haze=False), mat("scarf", (.96, .08, .06), haze=False, emit=True)
    def part(prim, m, l, sz, rot=(0, 0, 0)):
        if prim == "box": bpy.ops.mesh.primitive_cube_add(size=1)
        elif prim == "sphere": bpy.ops.mesh.primitive_uv_sphere_add(radius=.5, segments=12, ring_count=8)
        else: bpy.ops.mesh.primitive_cylinder_add(radius=.5, depth=1, vertices=10)
        o = bpy.context.object; o.location, o.scale, o.rotation_euler = l, sz, rot; o.data.materials.append(m); o.parent = root
    part("box", dark, (0, 0, 1.18), (.46, .26, .62)); part("box", dark, (0, 0, .78), (.40, .24, .26)); part("cyl", dark, (-.12, 0, .38), (.17, .17, .8)); part("cyl", dark, (.12, 0, .38), (.17, .17, .8))
    part("box", dark, (-.30, 0, 1.2), (.14, .16, .56)); part("box", dark, (.30, 0, 1.2), (.14, .16, .56)); part("sphere", dark, (0, 0, 1.68), (.24, .25, .26)); part("box", dark, (0, .2, 1.18), (.38, .24, .56))
    part("box", red, (0, -.05, 1.5), (.28, .22, .1)); part("box", red, (.06, -.17, 1.36), (.09, .05, .34))


bx = 22.0; by = CY + 34.0
climber((bx, by, max(float(T.height(bx, by)), SEA) + 1.0), math.pi + .15, 2.1)

# ───────────── the sun: a big soft pale disc in the haze ─────────────
D = 20000.0; sc = sun_dir * D
dm = mesh_from([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [(0, 1, 2, 3)], "disc"); uv = dm.uv_layers.new(); uv.data.foreach_set("uv", [0, 0, 1, 0, 1, 1, 0, 1])
sm = bpy.data.materials.new("sun"); sm.use_nodes = True; sn = sm.node_tree; sn.nodes.clear()
so_, mixs, tr, em, tcd, vm, mp, rp = [sn.nodes.new(k) for k in ("ShaderNodeOutputMaterial", "ShaderNodeMixShader", "ShaderNodeBsdfTransparent", "ShaderNodeEmission", "ShaderNodeTexCoord", "ShaderNodeVectorMath", "ShaderNodeMapRange", "ShaderNodeValToRGB")]
vm.operation = "DISTANCE"; vm.inputs[1].default_value = (.5, .5, 0); sn.links.new(tcd.outputs["UV"], vm.inputs[0])
mp.inputs["From Min"].default_value = .08; mp.inputs["From Max"].default_value = .5; mp.inputs["To Min"].default_value = 1.0; mp.inputs["To Max"].default_value = 0.0; mp.clamp = True
sn.links.new(vm.outputs["Value"], mp.inputs["Value"]); em.inputs["Color"].default_value = (*lin((1.0, .97, .90)), 1); em.inputs["Strength"].default_value = 1.4
sn.links.new(mp.outputs["Result"], mixs.inputs[0]); sn.links.new(tr.outputs[0], mixs.inputs[1]); sn.links.new(em.outputs[0], mixs.inputs[2]); sn.links.new(mixs.outputs[0], so_.inputs["Surface"])
try: sm.surface_render_method = "BLENDED"
except Exception: sm.blend_method = "BLEND"
sd = obj("sun_disc", dm, sm); sd.location = sc; sd.scale = (3300, 3300, 1)

# ───────────── camera: low on the near shore, looking up the water to the mountain ─────────────
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 15; cam_d.clip_end = 90000
cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
cam.location = Vector((CX, CY, max(float(T.height(CX, CY)), SEA) + 11.0)); cam.rotation_euler = (math.radians(104.0), 0, 0)

r = scn.render; r.resolution_x, r.resolution_y = RW, RH
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
    try: r.engine = eng; break
    except TypeError: continue
try: scn.eevee.taa_render_samples = SAMPLES
except Exception: pass
scn.view_settings.view_transform = "Standard"; scn.view_settings.exposure = 0.0
r.image_settings.file_format = "PNG"; r.filepath = os.path.join(OUT, "flat_" + SHOT + ".png")
bpy.ops.render.render(write_still=True)
print("rendered", r.filepath, r.engine)
