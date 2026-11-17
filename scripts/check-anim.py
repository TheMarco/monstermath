"""Checks clips for two faults.
cut:   frames where the creature touches the picture edge.
smear: frames whose outlines are much softer than the first frame (motion blur).
usage: check.py out.json clip.mp4 [clip.mp4 ...]"""
import subprocess, sys, os, json
N = 200
BAND = 2
def analyse(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={N}:{N}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    size = N * N * 3
    frames = len(raw) // size
    cut = 0; worst = 0; sharp = []
    for f in range(frames):
        fr = raw[f * size:(f + 1) * size]
        r = fr[0::3]; g = fr[1::3]; b = fr[2::3]
        fg = bytearray(N * N); lum = bytearray(N * N)
        for i in range(N * N):
            ri = r[i]; gi = g[i]; bi = b[i]
            if ((ri if ri < bi else bi) - gi) <= 110: fg[i] = 1
            lum[i] = (ri * 2 + gi * 5 + bi) >> 3
        edge = 0
        for k in range(N):
            for d in range(BAND):
                edge = max(edge, 0)
        sides = [0, 0, 0, 0]
        for k in range(N):
            for d in range(BAND):
                sides[0] += fg[k * N + d]; sides[1] += fg[k * N + N - 1 - d]
                sides[2] += fg[d * N + k]; sides[3] += fg[(N - 1 - d) * N + k]
        m = max(sides)
        if m >= 4: cut += 1
        worst = max(worst, m // BAND)
        # sharpness: share of strong luma steps inside the creature
        strong = 0; count = 0
        for y in range(1, N - 1):
            row = y * N
            for x in range(1, N - 1):
                i = row + x
                if fg[i] and fg[i + 1] and fg[i + N]:
                    count += 1
                    d = abs(lum[i] - lum[i + 1]) + abs(lum[i] - lum[i + N])
                    if d > 60: strong += 1
        sharp.append(strong / count if count else 0)
    ref = sorted(sharp)[len(sharp) // 2] or 1e-9
    ratios = [s / ref for s in sharp]
    lo = min(ratios)
    soft = sum(1 for x in ratios if x < 0.6)
    return {'clip': os.path.basename(path)[:-4], 'frames': frames, 'cut': cut, 'worst': worst, 'minsharp': round(lo, 2), 'soft': soft, 'softest': ratios.index(lo)}
rows = [analyse(p) for p in sys.argv[2:]]
json.dump(rows, open(sys.argv[1], 'w'))
for r in rows:
    print(f"{r['clip']:18} cut {r['cut']:3}f worst {r['worst']:3}  sharp min {r['minsharp']:.2f} soft {r['soft']:3}f at {r['softest']}")
