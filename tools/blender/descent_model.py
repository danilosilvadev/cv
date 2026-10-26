"""The loss landscape and the gradient-descent run, shared by every route that draws "the descent" (numpy only, no Blender needed).
Same maths as the live engine (assets/descent.js): a macro loss surface Hs, a visible surface H = Hs + roughness, and a real gradient descent
with momentum that walks from a high start down to the global minimum. Coordinates are the web's: x right, h up, z toward the viewer."""
import numpy as np

X0, X1, Z0, Z1 = -230.0, 230.0, -310.0, 130.0      # the terrain's footprint
GX, GZ = 28.0, -150.0                                # the global minimum


def _hash(ix, iz, seed):
    n = np.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453
    return n - np.floor(n)


def _vn(x, z, seed):
    xi, zi = np.floor(x), np.floor(z)
    xf, zf = x - xi, z - zi
    sx, sz = xf * xf * (3 - 2 * xf), zf * zf * (3 - 2 * zf)
    a, b, c, d = _hash(xi, zi, seed), _hash(xi + 1, zi, seed), _hash(xi, zi + 1, seed), _hash(xi + 1, zi + 1, seed)
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz


def fbm(x, z, seed=0.0):
    return .5 * _vn(x, z, seed) + .27 * _vn(x * 2.1, z * 2.1, seed) + .15 * _vn(x * 4.3, z * 4.3, seed) + .08 * _vn(x * 8.7, z * 8.7, seed)


def Hs(x, z):
    """The macro loss surface: one funnel to the global minimum and a few local minima."""
    h = np.clip(z + 150, -40, 90) * .12
    h = h - 54 * np.exp(-((x - GX) ** 2 + (z - GZ) ** 2) / (2 * 40 * 40))
    h = h - 15 * np.exp(-((x + 118) ** 2 + (z + 20) ** 2) / (2 * 22 * 22))
    h = h - 17 * np.exp(-((x - 120) ** 2 + z ** 2) / (2 * 24 * 24))
    h = h - 18 * np.exp(-((x + 80) ** 2 + (z + 150) ** 2) / (2 * 18 * 18))
    h = h + 8 * np.sin(x * .03 + z * .02) * np.exp(-((z + 20) / 100) ** 2)
    d = np.sqrt(x * x + (z + 60) ** 2)
    return h + np.maximum(0, d - 150) * .08


def H(x, z):
    """The visible surface: the macro surface plus roughness."""
    return Hs(x, z) + (fbm(x * .02 + 3, z * .02, 1.0) - .5) * 12 + (fbm(x * .06 + 7, z * .06, 2.0) - .5) * 3


def descend(x, z, steps=1500, lr=3.2, mom=.9):
    """Real gradient descent with momentum on the macro surface."""
    pts, vx, vz, e = [(x, z)], 0.0, 0.0, .6
    for i in range(steps):
        gx = (Hs(x + e, z) - Hs(x - e, z)) / (2 * e)
        gz = (Hs(x, z + e) - Hs(x, z - e)) / (2 * e)
        vx = mom * vx - lr * gx
        vz = mom * vz - lr * gz
        x, z = x + vx, z + vz
        pts.append((x, z))
        if i > 60 and np.hypot(gx, gz) < .015 and np.hypot(vx, vz) < .03:
            break
    return np.array(pts)


def resample(raw, n):
    """n points evenly spaced along the path, lifted onto the visible surface. Returns (n,3) of (x, h, z)."""
    seg = np.hypot(np.diff(raw[:, 0]), np.diff(raw[:, 1]))
    cum = np.concatenate([[0], np.cumsum(seg)])
    d = np.linspace(0, cum[-1], n)
    x, z = np.interp(d, cum, raw[:, 0]), np.interp(d, cum, raw[:, 1])
    return np.stack([x, H(x, z) + .9, z], axis=1), float(cum[-1])


def main_run(n=700):
    return resample(descend(-75, 85), n)


def other_runs(n=360):
    return [resample(descend(sx, sz), n)[0] for sx, sz in [(75, 70), (105, 85), (0, 95), (60, 90)]]   # these starts fall into the local minimum on the right


if __name__ == "__main__":
    pts, length = main_run()
    end = pts[-1]
    print("main run: %d points, length %.0f, ends at (%.1f, %.1f, %.1f) vs minimum (%.0f, %.0f)" % (len(pts), length, end[0], end[1], end[2], GX, GZ))
    for r in other_runs(): print("other run ends at (%.0f, %.0f)" % (r[-1][0], r[-1][2]))
