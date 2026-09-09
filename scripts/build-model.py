"""Build mario_fludd.glb properly.

Why this exists: Sunshine keeps Mario's colours in the texture atlas, not in
per-material colours. One ripped material ("_mat_head") covers the blue overall
bib, the blue legs AND the red shirt sleeves. Tinting by material therefore
cannot work.

So we classify every triangle by the colour it samples from the atlas, split the
geometry into one mesh per Moonshine slot, and rewrite the atlas so tinted
regions carry only luminance (shading survives, hue comes from the slot colour).
Untinted regions - face, eyes, mouth, the cap's M - keep their original pixels.
"""
import colorsys, json, os
import numpy as np
from PIL import Image
import sys
sys.path.insert(0, '/home/claude')
from export_parts import load_obj_full, parse_mtl
from dae import load_dae

M = '/home/claude/repo/public/models/Mario/'
F = '/home/claude/repo/public/models/FLUDD/'
ATLAS = 'H_ma_new_main_s3tc.png'
SCALE = 1.0 / 70.0

# Colour bucket -> slot, per ripped material group. None means "never tint".
RULES = {
    '_mat_head_7_': {'*': 'mario_cap'},
    # The shine shirt is a cyan base with yellow shine sprites printed on it.
    # Moonshine tints the base; the shines stay yellow, so they stay untinted.
    '_mat_head_2_': {'yellow': None, 'orange/brown': None,
                     '*': 'mario_sunshine_shirt'},
    # brown here is Mario's bare forearms, not footwear - leave it untinted.
    '_mat_head':    {'blue': 'mario_overalls', 'red': 'mario_shirt',
                     'orange/brown': None, 'white/grey': None,
                     '*': 'mario_overalls'},
    '_mat_head_5_': {'*': 'mario_gloves'},
    '_mat_head_6_': {'*': 'mario_gloves'},
    '_mat_head_3_': {'*': 'mario_shoes'},
    '_mat_head_4_': {'*': 'mario_shoes'},
    '_mat_head_8_': {'*': None},   # face
    '_mat_mouse':   {'*': None},
    '_mat_eye_L':   {'*': None},
    '_mat_eye_R':   {'*': None},
}
UNTINTED_MESH = {'_mat_head_8_': 'mario_face', '_mat_head': 'mario_skin',
                 '_mat_head_2_': 'mario_shine_logo', '_mat_mouse': 'mario_mouth',
                 '_mat_eye_L': 'mario_eye_l', '_mat_eye_R': 'mario_eye_r'}


def bucket(rgb):
    r, g, b = [x / 255 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if v < 0.18:
        return 'black'
    if s < 0.18:
        return 'white/grey' if v > 0.6 else 'grey'
    if h < 0.045 or h > 0.93:
        return 'red'
    if h < 0.11:
        return 'orange/brown'
    if h < 0.19:
        return 'yellow'
    if h < 0.45:
        return 'green'
    if h < 0.72:
        return 'blue'
    return 'purple/pink'


class Part:
    def __init__(self, name, slot, texture):
        self.name, self.slot, self.texture = name, slot, texture
        self.default_color = None
        self.pos, self.uv, self.idx, self._m = [], [], [], {}

    def add(self, corners, verts, uvs, xf):
        tri = []
        for vi, ti in corners:
            k = (vi, ti)
            if k not in self._m:
                self._m[k] = len(self.pos)
                self.pos.append([float(x) for x in xf(verts[vi])])
                if uvs is not None and ti is not None and ti < len(uvs):
                    u, w = uvs[ti]
                    self.uv.append([float(u), float(1.0 - w)])
                else:
                    self.uv.append([0.0, 0.0])
            tri.append(self._m[k])
        self.idx.extend(tri)


def build():
    atlas = np.array(Image.open(M + ATLAS).convert('RGB')).astype(float)
    H, W, _ = atlas.shape
    verts, uvs, faces = load_obj_full(M + 'ma_mdl1.obj')
    mtl = parse_mtl(M + 'ma_mdl1.mtl')

    def sample(uv_pt):
        x = int(np.clip(uv_pt[0] % 1.0, 0, 0.999) * W)
        y = int(np.clip(1.0 - (uv_pt[1] % 1.0), 0, 0.999) * H)
        return atlas[y, x]

    parts, tri_slots = {}, []

    def part(name, slot, tex):
        if name not in parts:
            parts[name] = Part(name, slot, tex)
        return parts[name]

    xf = lambda p: np.array(p) * SCALE

    for a, b, c, mat in faces:
        if not mat or mat.endswith(('_uv2', '_uv3')) or mat not in RULES:
            continue
        tis = [t for (_, t) in (a, b, c) if t is not None]
        cen = uvs[tis].mean(0) if len(tis) == 3 else None
        rule = RULES[mat]
        slot = rule.get(bucket(sample(cen)) if cen is not None else '*', rule.get('*'))
        name = slot if slot else UNTINTED_MESH.get(mat, 'mario_skin')
        part(name, slot, mtl.get(mat)).add((a, b, c), verts, uvs, xf)
        if slot and cen is not None and len(tis) == 3:
            tri_slots.append((tis, slot))

    # ---- luminance atlas ---------------------------------------------------
    label = np.zeros((H, W), dtype=np.int32)
    slot_ids = sorted({s for _, s in tri_slots})
    sid = {s: i + 1 for i, s in enumerate(slot_ids)}

    def raster(tri_uv, value):
        pts = np.array([[uv[0] % 1.0 * W, (1.0 - uv[1] % 1.0) * H] for uv in tri_uv])
        x0, x1 = int(pts[:, 0].min()), int(np.ceil(pts[:, 0].max()))
        y0, y1 = int(pts[:, 1].min()), int(np.ceil(pts[:, 1].max()))
        x0, y0 = max(x0 - 1, 0), max(y0 - 1, 0)
        x1, y1 = min(x1 + 1, W - 1), min(y1 + 1, H - 1)
        if x1 <= x0 or y1 <= y0:
            return
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        p0, p1, p2 = pts
        d = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(d) < 1e-9:
            return
        w0 = ((p1[1] - p2[1]) * (gx - p2[0]) + (p2[0] - p1[0]) * (gy - p2[1])) / d
        w1 = ((p2[1] - p0[1]) * (gx - p2[0]) + (p0[0] - p2[0]) * (gy - p2[1])) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        sub = label[y0:y1 + 1, x0:x1 + 1]
        sub[inside] = value

    for tis, slot in tri_slots:
        raster([uvs[t] for t in tis], sid[slot])

    out = atlas.copy()
    lum = atlas @ np.array([0.299, 0.587, 0.114])
    for s, i in sid.items():
        mask = label == i
        if not mask.any():
            continue
        mean = max(float(lum[mask].mean()), 1.0)
        # Normalise so the region averages white; tint x this = right hue,
        # original shading preserved.
        g = np.clip(lum[mask] / mean, 0.0, 1.6) * 200.0
        out[mask] = np.stack([g, g, g], axis=-1)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save('/home/claude/mario_atlas_tint.png')
    print('atlas regions:', {s: int((label == i).sum()) for s, i in sid.items()})

    defaults = {}
    for s_, i in sid.items():
        mask = label == i
        if mask.any():
            mean_rgb = atlas[mask].reshape(-1, 3).mean(0)
            # exported texel is lum/mean_lum * 200, so this factor reproduces
            # the stock look when no skin colour overrides the slot.
            defaults[s_] = [float(min(c / 200.0, 1.0)) for c in mean_rgb]

    for p in parts.values():
        if p.texture == ATLAS:
            p.texture = 'mario_atlas_tint.png'
        p.default_color = defaults.get(p.slot)

    # ---- FLUDD -------------------------------------------------------------
    # watergun_item.dae is the assembled pack; body.dae is skinned and needs
    # joint transforms we do not read.
    import math as _m
    fv, ff = load_dae(F + 'watergun_item.dae')
    _a = _m.radians(180)
    fv = fv @ np.array([[_m.cos(_a), 0, _m.sin(_a)], [0, 1, 0],
                        [-_m.sin(_a), 0, _m.cos(_a)]]).T
    used = sorted({i for a, b, c, _ in ff for i in (a, b, c)})
    centre = fv[used].mean(0)
    off = np.array([0, 68, -30]) - centre
    fxf = lambda p: (centre + (np.array(p) + off - centre) * 0.85) * SCALE
    fp = part('fludd_paint', 'fludd_paint', None)
    for a, b, c, _m in ff:
        fp.add(((a, None), (b, None), (c, None)), fv, None, fxf)

    # ---- sunglasses --------------------------------------------------------
    gm = parse_mtl(M + 'ma_glass1.mtl')
    gv, guv, gf = load_obj_full(M + 'ma_glass1.obj')
    import math
    ang = math.radians(270)
    R = np.array([[math.cos(ang), 0, math.sin(ang)], [0, 1, 0],
                  [-math.sin(ang), 0, math.cos(ang)]])
    gv = gv @ R.T
    gused = sorted({vi for a, b, c, m in gf if m and not m.endswith(('_uv2', '_uv3'))
                    for (vi, _t) in (a, b, c)})
    gc = gv[gused].mean(0)
    gused2 = sorted({vi for a, b, c, m in gf if m and not m.endswith(('_uv2', '_uv3'))
                     for (vi, _t) in (a, b, c)})
    goff = np.array([0.0, 114.0, 14.0]) - gv[gused2].mean(0)
    gxf = lambda p: (np.array(p) + goff) * SCALE
    for a, b, c, mat in gf:
        if not mat or mat.endswith(('_uv2', '_uv3')):
            continue
        part('mario_sunglasses', 'mario_sunglasses', gm.get(mat)).add((a, b, c), gv, guv, gxf)

    res = []
    for p in parts.values():
        pos = np.array(p.pos)
        res.append({'name': p.name, 'slot': p.slot, 'texture': p.texture,
                    'defaultColor': getattr(p, 'default_color', None),
                    'positions': pos.flatten().tolist(),
                    'uvs': np.array(p.uv).flatten().tolist(),
                    'indices': p.idx,
                    'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()})
    return res


if __name__ == '__main__':
    parts = build()
    for p in sorted(parts, key=lambda x: x['name']):
        print(f"{p['name']:24} slot={str(p['slot']):22} tris={len(p['indices'])//3:5} "
              f"y={p['min'][1]:.2f}..{p['max'][1]:.2f}")
    json.dump(parts, open('/home/claude/parts.json', 'w'))
