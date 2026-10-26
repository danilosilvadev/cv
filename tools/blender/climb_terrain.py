"""The mountain for "The Climb": one analytic height field (so it can be sampled at any detail), its four climate zones, and where things stand on it.
numpy only. Coordinates are Blender's: x east, y north, z up, metres. The summit is at the origin; the tropical lagoon lies to the south (negative y)."""
import numpy as np

SUMMIT = 2600.0          # metres
LAGOON = (0.0, -2150.0)  # where the climber starts


def _hash(ix, iy, seed):
    n = np.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453
    return n - np.floor(n)


def vn(x, y, seed=0.0):
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi
    sx, sy = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b, c, d = _hash(xi, yi, seed), _hash(xi + 1, yi, seed), _hash(xi, yi + 1, seed), _hash(xi + 1, yi + 1, seed)
    top = a + (b - a) * sx
    bot = c + (d - c) * sx
    return top + (bot - top) * sy


def fbm(x, y, seed=0.0, octaves=5):
    s, amp, f, norm = 0.0, 1.0, 1.0, 0.0
    for i in range(octaves):
        s = s + amp * vn(x * f, y * f, seed + i * 3.1)
        norm += amp; amp *= .5; f *= 2.07
    return s / norm


def ridged(x, y, seed=0.0, octaves=5):
    s, amp, f, norm, w = 0.0, 1.0, 1.0, 0.0, 1.0
    for i in range(octaves):
        n = 1 - np.abs(2 * vn(x * f, y * f, seed + i * 5.3) - 1)
        n = n * n * w
        w = np.clip(n * 1.6, 0, 1)
        s = s + amp * n; norm += amp; amp *= .5; f *= 2.13
    return s / norm


def h0_(base, big, mid, cliffs):
    return base + big + mid + cliffs


def height(x, y):
    """The mountain: a steep massif with ridges and buttresses, falling to a tropical lowland and the sea. Metres."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    r = np.sqrt(x * x + y * y)
    a = np.arctan2(y, x)
    wob = 1 + .16 * np.sin(a * 3 + 1.0) + .09 * np.sin(a * 5 - .6)              # an irregular footprint, not a perfect cone
    base = SUMMIT * np.clip(1 - r / (1750 * wob), 0, 1) ** 2.0
    k = np.clip(base / SUMMIT, 0, 1)
    big = ridged(x * .0011 + 4, y * .0011 - 2, 1.0, 5) * 760 * k ** .9            # ridges and buttresses
    mid = ridged(x * .0045, y * .0045, 7.0, 4) * 190 * k ** .8 + ridged(x * .012, y * .012, 13.0, 3) * 70 * k ** .8
    cliffs = ridged(x * .0095 + 40, y * .0095 - 9, 31.0, 4) * 150 * k ** 1.2
    fine = (fbm(x * .03, y * .03, 11.0, 4) - .5) * 26 * (.25 + k) + (fbm(x * .22, y * .22, 17.0, 3) - .5) * 3.2 * (.2 + k)   # crags and rock detail
    crag = (ridged(x * .31, y * .31, 41.0, 3) * 3.6 + ridged(x * 1.1, y * 1.1, 43.0, 2) * 1.1 + np.maximum(0, np.sin(h0_(base, big, mid, cliffs) * .55 + vn(x * .08, y * .08, 47.0) * 6) - .55) * 1.8) * np.clip(k * 3.2, 0, 1)   # crags and ledges on the walls
    h = base + big + mid + cliffs + fine + crag
    # the lowland: a gentle plain around the foot, with a lagoon basin to the south
    plain = 14 * (fbm(x * .004, y * .004, 3.0, 3) - .5) + 6
    low = np.clip((r - 900) / 500, 0, 1)
    h = h * (1 - low * .0) + 0
    h = np.maximum(h, plain * np.clip(1 - k * 3, 0, 1))
    lag = np.exp(-(((x - LAGOON[0]) / 330) ** 2 + ((y - LAGOON[1]) / 210) ** 2) ** 1.0) * 17
    return h - lag


def slope_deg(x, y, e=1.0):
    gx = (height(x + e, y) - height(x - e, y)) / (2 * e)
    gy = (height(x, y + e) - height(x, y - e)) / (2 * e)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def _srgb(c):
    return np.power(np.clip(np.asarray(c, float), 0, 1), 2.2)


def _mix(a, b, t):
    return a + (b - a) * t[..., None]


def _smooth(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def color(x, y, h=None, slope=None):
    """Linear RGB for every point: tropical green, arid red sandstone, dark wet rock, snow and blue ice, by altitude, slope and noise."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    h = height(x, y) if h is None else h
    slope = slope_deg(x, y) if slope is None else slope
    n1 = fbm(x * .02, y * .02, 21.0, 4); n2 = fbm(x * .15, y * .15, 23.0, 3); n3 = fbm(x * .8, y * .8, 29.0, 2)
    hh = h + (n1 - .5) * 260                                                          # ragged zone borders
    jungle = _srgb([.035, .16, .035]) * (.7 + .8 * n2[..., None]); sand = _srgb([.78, .68, .46])
    c = _mix(jungle, sand, _smooth(2, 0, h) * 1.0 + 0 * h)
    strata = .82 + .22 * np.sin(h * .42 + n1 * 14)[..., None] + .12 * (n3[..., None] - .5)
    arid = _srgb([.66, .30, .13]) * strata * (.8 + .4 * n2[..., None])
    arid = _mix(arid, _srgb([.45, .20, .10]) * strata, _smooth(30, 70, slope))
    rock = _mix(_srgb([.20, .20, .23]), _srgb([.08, .08, .10]), _smooth(35, 75, slope)) * (.75 + .5 * n2[..., None])
    snow = _srgb([.93, .96, 1.0]) * (.9 + .12 * n3[..., None]); ice = _srgb([.50, .72, .95]) * (.85 + .3 * n2[..., None])
    top = _mix(snow, ice, _smooth(46, 66, slope))
    top = _mix(top, rock * .8, _smooth(68, 82, slope))
    c = _mix(c, arid, _smooth(300, 520, hh))
    c = _mix(c, rock, _smooth(1050, 1250, hh))
    c = _mix(c, top, _smooth(1850, 2050, hh))
    return c


def surface_point(px, py):
    return np.array([px, py, float(height(px, py))])


def spot_on_face(azimuth_deg, altitude):
    """A point on the mountain's face at the given compass bearing and altitude (metres): walk out from the summit until the surface reaches that height."""
    a = np.radians(azimuth_deg)
    best = None
    for r in np.linspace(40, 1700, 3400):
        px, py = r * np.cos(a), r * np.sin(a)
        if height(px, py) <= altitude:
            best = (px, py); break
    px, py = best
    return np.array([px, py, float(height(px, py))])


if __name__ == "__main__":
    xs = np.linspace(-2000, 2000, 9)
    print("summit", float(height(0, 0)), "| heights along the south line:", [round(float(height(0, y))) for y in (-1700, -1500, -1200, -900, -600, -300, 0)])
    for az in (-90, 0, 90, 180):
        p = spot_on_face(az, 1500); print("face", az, "at 1500 m:", np.round(p, 1), "slope", round(float(slope_deg(p[0], p[1])), 1))
