"""Parse public/models/Mario/ma_glass1.obj and split Mario's sunglasses into a
FRAME part and a LENS part, so the frame can render opaque while the lens stays
tinted-translucent.

build-model.py merged both OBJ groups into one `mario_sunglasses` mesh with a
single material (and the lens texture won the cache), so the frame came out
see-through and the whole thing picked up the lens's alpha. It also can't be
re-run locally. scripts/build-glasses.mjs patches the .glb with the two parts
this script emits.

  ma_glass1.obj groups:
    vertexColors            -> the lens panes (flat, at the front)   -> LENS
    _mat_sunglass_A_flame   -> frame + temple arms (front to back)   -> FRAME

Transform matches build-model.py: 270° about Y, recentre to [0,114,14], /70.
The rip also has the whole thing rolled 180° (brow bar ends up at the bottom —
"wearing them upside down"), so GLASS_ROLL defaults to 180 to put the brow on top.

Env knobs for iterating on orientation:
  GLASS_VFLIP=1|0     flip texture V (default 1, like build-model.py's Part.add)
  GLASS_ROLL=<deg>    roll about the view axis (Z) after transform (default 180)
  GLASS_OFF=x,y,z     override the recentre target
"""
import json, math, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(HERE, '..', 'public', 'models', 'Mario')
OUT = os.path.join(HERE, 'glasses_parts.json')

# The frame texture (H_mario_sunglass_flame_ia4.png) is black RGB + a frame-shaped
# alpha. Multiplying it by a tint colour would stay black, so the sunglasses slot
# could never recolour the frame. Emit a white-RGB copy that keeps the alpha, so
# frame colour = baseColorFactor (driven by applySkin) * white.
_src = Image.open(os.path.join(M, 'H_mario_sunglass_flame_ia4.png')).convert('RGBA')
_a = np.array(_src)
_a[:, :, :3] = 255
Image.fromarray(_a).save(os.path.join(HERE, 'mario_sunglass_frame_mask.png'))

VFLIP = os.environ.get('GLASS_VFLIP', '1') == '1'
ROLL = math.radians(float(os.environ.get('GLASS_ROLL', '180')))
OFF = np.array([float(x) for x in os.environ.get('GLASS_OFF', '0,114,14').split(',')])

verts, uvs, faces = [], [], []
cur = None
for line in open(os.path.join(M, 'ma_glass1.obj')):
    t = line.split()
    if not t:
        continue
    if t[0] == 'v':
        verts.append([float(x) for x in t[1:4]])
    elif t[0] == 'vt':
        uvs.append([float(x) for x in t[1:3]])
    elif t[0] == 'usemtl':
        cur = t[1]
    elif t[0] == 'f':
        vi, ti = [], []
        for c in t[1:]:
            p = c.split('/')
            vi.append(int(p[0]) - 1)
            ti.append(int(p[1]) - 1 if len(p) > 1 and p[1] else None)
        faces.append((vi, ti, cur))

verts = np.array(verts, float)
uvs = np.array(uvs, float)

ang = math.radians(270)
R = np.array([[math.cos(ang), 0, math.sin(ang)], [0, 1, 0], [-math.sin(ang), 0, math.cos(ang)]])
gv = verts @ R.T
used = sorted({vi for vv, _, m in faces if m for vi in vv})
goff = OFF - gv[used].mean(0)
gv = gv + goff
if ROLL:
    cz, sz = math.cos(ROLL), math.sin(ROLL)
    c = gv[used].mean(0)
    d = gv - c
    gv = c + np.column_stack([cz * d[:, 0] - sz * d[:, 1], sz * d[:, 0] + cz * d[:, 1], d[:, 2]])
gv = gv / 70.0

GROUPS = {
    'vertexColors':          ('mario_sunglasses_lens',  'vertexColors_glass.png',          'lens'),
    '_mat_sunglass_A_flame': ('mario_sunglasses_frame', 'mario_sunglass_frame_mask.png',   'frame'),
}

parts = []
for mat, (name, tex, kind) in GROUPS.items():
    fs = [f for f in faces if f[2] == mat]
    remap, P, UV, IDX = {}, [], [], []
    for vv, tt, _ in fs:
        tri = []
        for vi, ti in zip(vv, tt):
            key = (vi, ti)
            if key not in remap:
                remap[key] = len(P)
                P.append(gv[vi].tolist())
                if ti is not None and ti < len(uvs):
                    u, w = uvs[ti][:2]
                    UV.append([float(u), float(1.0 - w) if VFLIP else float(w)])
                else:
                    UV.append([0.0, 0.0])
            tri.append(remap[key])
        IDX.append(tri)
    P = np.array(P)
    idx = np.array(IDX)
    N = np.zeros_like(P)
    for tr in idx:
        a, b, c = P[tr]
        n = np.cross(b - a, c - a)
        for k in tr:
            N[k] += n
    ln = np.linalg.norm(N, axis=1, keepdims=True)
    ln[ln == 0] = 1
    N /= ln
    parts.append(dict(name=name, slot='mario_sunglasses', texture=tex, kind=kind,
                      positions=P.ravel().tolist(), normals=N.ravel().tolist(),
                      uvs=np.array(UV).ravel().tolist(), indices=idx.ravel().tolist()))

json.dump(parts, open(OUT, 'w'))
for p in parts:
    P = np.array(p['positions']).reshape(-1, 3)
    print(f"{p['name']:26} {p['kind']:6} tris={len(p['indices'])//3:3} "
          f"X {P[:,0].min():+.3f}..{P[:,0].max():+.3f}  Y {P[:,1].min():+.3f}..{P[:,1].max():+.3f}  "
          f"Z {P[:,2].min():+.3f}..{P[:,2].max():+.3f}")
