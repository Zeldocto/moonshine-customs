"""Parse watergun_item.dae, apply build-model.py's FLUDD transform, split mesh0
by texel colour into Moonshine slots, and dump fludd_parts.json for the Node
glb-patcher.

Mirrors scripts/build-model.py's FLUDD block exactly:
  * 180 deg Y rotation
  * centre/scale: (centre + (p + off - centre) * 0.85) / 70, off = [0,68,-30]-centre
  * centre computed over ALL verts in the file (mesh0 + mesh1), like load_dae.
The item texture (H_watergun_main_s3tc_item.png) is kept UNTOUCHED; slots recolour
at runtime via the same hue-shift shader Mario uses.
"""
import json, math, colorsys, os
import numpy as np
from PIL import Image
import xml.etree.ElementTree as ET

_HERE = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(_HERE, '..', 'public', 'models', 'FLUDD')
OUT = os.path.join(_HERE, 'fludd_parts.json')
NS = '{http://www.collada.org/2005/11/COLLADASchema}'
floats = lambda t: np.array([float(x) for x in t.split()])
ints = lambda t: np.array([int(x) for x in t.split()], dtype=int)


def parse_mesh(fn, gid):
    root = ET.parse(os.path.join(F, fn)).getroot()
    for g in root.iter(NS + 'geometry'):
        if g.get('id') != gid:
            continue
        mesh = g.find(NS + 'mesh')
        srcs = {}
        for s in mesh.findall(NS + 'source'):
            fa = s.find(NS + 'float_array')
            acc = s.find(f'.//{NS}accessor')
            srcs[s.get('id')] = floats(fa.text).reshape(-1, int(acc.get('stride')))
        vpos = mesh.find(NS + 'vertices').find(NS + 'input').get('source')[1:]
        prim = mesh.find(NS + 'polylist')
        if prim is None:
            prim = mesh.find(NS + 'triangles')
        inp = prim.findall(NS + 'input')
        stride = max(int(i.get('offset')) for i in inp) + 1
        p = ints(prim.find(NS + 'p').text).reshape(-1, 3, stride)
        off = {}
        for i in inp:
            sem = i.get('semantic')
            src = vpos if sem == 'VERTEX' else i.get('source')[1:]
            off[sem] = (int(i.get('offset')), src)
        pos = srcs[off['VERTEX'][1]]
        vidx = p[:, :, off['VERTEX'][0]]
        uv = None
        if 'TEXCOORD' in off:
            uv = srcs[off['TEXCOORD'][1]][p[:, :, off['TEXCOORD'][0]]]
        col = None
        if 'COLOR' in off:
            col = srcs[off['COLOR'][1]][p[:, :, off['COLOR'][0]]]
        return dict(pos=pos, vidx=vidx, uv=uv, col=col)


def bucket(rgb):
    r, g, b = [x / 255 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if v < 0.18:
        return 'black'
    if s < 0.20:
        return 'white/grey' if v > 0.55 else 'grey'
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


def components(vidx, idxs):
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    v2t = {}
    for ti in idxs:
        for v in vidx[ti]:
            v2t.setdefault(int(v), []).append(ti)
    for ts in v2t.values():
        for t in ts[1:]:
            parent[find(t)] = find(ts[0])
    groups = {}
    for ti in idxs:
        groups.setdefault(find(ti), []).append(ti)
    return sorted(groups.values(), key=len, reverse=True)


m0 = parse_mesh('watergun_item.dae', 'mesh0')
m1 = parse_mesh('watergun_item.dae', 'mesh1')

# --- transform --------------------------------------------------------------
# build-model.py flips FLUDD 180° about Y. That points the nozzle forward (like
# the promo art) but swings the waistband/buckle round to FLUDD's back and the
# back panel against Mario — the "waistband and back are swapped" bug. Sunshine's
# rip has the belt buckle at +Z and the back panel also near +Z, so no single Y
# rotation gets buckle-to-front AND funnel-forward. The body's orientation is the
# one that has to be right, so ROT=0 (buckle to the front, back panel to the
# rear); the nozzle then rests folded back over the shoulder rather than aimed
# forward. OFF.z is pulled well back so the pack floats just behind Mario instead
# of clipping his head/back. All values overridable by env for iteration.
ROT = float(os.environ.get('FLUDD_ROT', '0'))
OFF = np.array([float(x) for x in os.environ.get('FLUDD_OFF', '0,78,-70').split(',')])
SCL = float(os.environ.get('FLUDD_SCALE', '0.8'))

# Optionally spin just the nozzle group (verts above NOZ_Y, i.e. above the
# flexible hose) about a vertical axis, to aim the funnel differently.
NOZ_Y = float(os.environ.get('FLUDD_NOZ_Y', '61'))
NOZ_PX = float(os.environ.get('FLUDD_NOZ_PX', '0'))
NOZ_PZ = float(os.environ.get('FLUDD_NOZ_PZ', '-7'))
NOZ_ANG = float(os.environ.get('FLUDD_NOZ_ANG', '0'))     # deg about vertical pole axis
NOZ_LIFT = float(os.environ.get('FLUDD_NOZ_LIFT', '0'))   # raise the nozzle group (dae units)
# BODY_ANG spins just the lower half (verts <= BODY_Y) about a vertical axis.
# Used to bring the waistband/buckle round to the front while leaving the nozzle
# assembly in its (good) global-rotation pose above.
BODY_Y = float(os.environ.get('FLUDD_BODY_Y', '55'))
BODY_PX = float(os.environ.get('FLUDD_BODY_PX', '0'))
BODY_PZ = float(os.environ.get('FLUDD_BODY_PZ', '0'))
BODY_ANG = float(os.environ.get('FLUDD_BODY_ANG', '0'))


def spin(sel, ang, px, pz):
    r = math.radians(ang)
    cc, ss = math.cos(r), math.sin(r)
    for mm in (m0, m1):
        s = sel(mm)
        dx = mm['pos'][s, 0] - px
        dz = mm['pos'][s, 2] - pz
        mm['pos'][s, 0] = px + cc * dx + ss * dz
        mm['pos'][s, 2] = pz - ss * dx + cc * dz


if NOZ_ANG != 0:
    spin(lambda mm: mm['pos'][:, 1] > NOZ_Y, NOZ_ANG, NOZ_PX, NOZ_PZ)
if NOZ_LIFT != 0:
    for mm in (m0, m1):
        mm['pos'][mm['pos'][:, 1] > NOZ_Y, 1] += NOZ_LIFT
if BODY_ANG != 0:
    spin(lambda mm: mm['pos'][:, 1] <= BODY_Y, BODY_ANG, BODY_PX, BODY_PZ)

a = math.radians(ROT)
Ry = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]]).T
all_pos = np.vstack([m0['pos'], m1['pos']])
all_pos_r = all_pos @ Ry
used = np.unique(np.concatenate([m0['vidx'].ravel(),
                                 (m1['vidx'] + len(m0['pos'])).ravel()]))
centre = all_pos_r[used].mean(0)
off = OFF - centre


def xf(p):
    return (centre + (p + off - centre) * SCL) / 70.0


m0pos = np.array([xf(v) for v in m0['pos'] @ Ry])
m1pos = np.array([xf(v) for v in m1['pos'] @ Ry])

# --- texture / classification ----------------------------------------------
tex = np.array(Image.open(os.path.join(F, 'H_watergun_main_s3tc_item.png')).convert('RGB')).astype(float)
TH, TW, _ = tex.shape


def samp(u):
    x = int(np.clip(u[0] % 1.0, 0, .999) * TW)
    y = int(np.clip(1.0 - (u[1] % 1.0), 0, .999) * TH)
    return tex[y, x]


uvc = m0['uv'].mean(1)
bk = np.array([bucket(samp(u)) for u in uvc])
bk = np.where(np.isin(bk, ['white/grey', 'grey']), 'metal', bk)

# The FLUDD slot table (src/lib/skin-format/slots.ts):
#   fludd_paint   -> yellow shell
#   fludd_metal   -> every grey/chrome part (nozzles, joints, pump, funnel)
#   fludd_straps  -> the harness: brown shoulder straps + the brown pack box
#   fludd_model_tank ("Water tank", blue fallback) -> the translucent sphere = mesh1
# The blue accent ring between body segments has no slot -> untinted `fludd_trim`.
slot_of = {}
for i in range(len(bk)):
    if bk[i] == 'metal':
        slot_of[i] = 'fludd_metal'
    elif bk[i] == 'yellow':
        slot_of[i] = 'fludd_paint'
    elif bk[i] == 'orange/brown':
        slot_of[i] = 'fludd_straps'
    else:
        slot_of[i] = 'fludd_trim'  # blue ring + strays: untinted, stock pixels

# --- assemble per-slot meshes ---------------------------------------------
def emit(tri_ids, pos_lookup, vidx, uv, flip_v=True):
    remap = {}
    P, UV, IDX = [], [], []
    for ti in tri_ids:
        tri = []
        for k in range(3):
            vi = int(vidx[ti][k])
            key = (vi, tuple(uv[ti][k]) if uv is not None else None)
            if key not in remap:
                remap[key] = len(P)
                P.append(pos_lookup[vi].tolist())
                if uv is not None:
                    u, w = uv[ti][k]
                    UV.append([float(u), float(1.0 - w) if flip_v else float(w)])
                else:
                    UV.append([0.0, 0.0])
            tri.append(remap[key])
        IDX.append(tri)
    P = np.array(P)
    idx = np.array(IDX)
    # smooth area-weighted normals
    N = np.zeros_like(P)
    for t in idx:
        v0, v1, v2 = P[t]
        fn = np.cross(v1 - v0, v2 - v0)
        for vi in t:
            N[vi] += fn
    ln = np.linalg.norm(N, axis=1, keepdims=True)
    ln[ln == 0] = 1
    N = N / ln
    return P, N, np.array(UV), idx.ravel()


parts = []
by_slot = {}
for i, s in slot_of.items():
    by_slot.setdefault(s, []).append(i)

for slot, tri_ids in by_slot.items():
    P, N, UV, IDX = emit(tri_ids, m0pos, m0['vidx'], m0['uv'])
    # stock-luminance reference for the shader
    lums = []
    for ti in tri_ids:
        for k in range(3):
            c = samp(m0['uv'][ti][k]) / 255.0
            lums.append(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])
    mean_rgb = np.mean([samp(m0['uv'][ti][k]) / 255.0
                        for ti in tri_ids for k in range(3)], axis=0)
    parts.append(dict(
        name=slot, slot=(None if slot == 'fludd_trim' else slot),
        texture='H_watergun_main_s3tc_item.png',
        positions=P.ravel().tolist(), normals=N.ravel().tolist(),
        uvs=UV.ravel().tolist(), indices=IDX.tolist(),
        refLum=float(np.mean(lums)), meanRGB=mean_rgb.tolist(),
    ))

# --- water tank sphere (mesh1): vertex-coloured, no map -------------------
P, N, _UV, IDX = emit(list(range(len(m1['vidx']))), m1pos, m1['vidx'], None)
water_rgb = m1['col'].reshape(-1, m1['col'].shape[-1])[:, :3].mean(0)
parts.append(dict(
    name='fludd_model_tank', slot='fludd_model_tank', texture=None,
    positions=P.ravel().tolist(), normals=N.ravel().tolist(),
    uvs=[], indices=IDX.tolist(),
    refLum=None, meanRGB=water_rgb.tolist(),
))

json.dump(parts, open(OUT, 'w'))
for p in parts:
    P = np.array(p['positions']).reshape(-1, 3)
    print(f"{p['name']:18} slot={str(p['slot']):18} tris={len(p['indices'])//3:4} "
          f"verts={len(P):4} meanRGB={[round(c,2) for c in p['meanRGB']]} "
          f"refLum={round(p['refLum'],3) if p['refLum'] else None} "
          f"y={P[:,1].min():.2f}..{P[:,1].max():.2f}")
