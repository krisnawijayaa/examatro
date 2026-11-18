# Membuat tekstur original (prosedural, seamless) untuk Examatro. Jalankan: python3 tools/gen_textures.py
import numpy as np
from PIL import Image
rng = np.random.default_rng(7)
TAU = 2 * np.pi

def pnoise(n, f):  # noise periodik (seamless) via low-pass FFT; f = frekuensi potong
    F = np.fft.fft2(rng.standard_normal((n, n)))
    k = np.hypot(np.fft.fftfreq(n)[None, :] * n, np.fft.fftfreq(n)[:, None] * n)
    a = np.fft.ifft2(F * np.exp(-(k / f) ** 2)).real
    a -= a.min(); return a / a.max()

# 1. Felt: anyaman kain halus + bercak tinta (256px, tile)
n = 256; y, x = np.mgrid[0:n, 0:n] / n
weave = np.sin(TAU * 64 * x) * np.sin(TAU * 64 * y)
lum = 0.66 + 0.17 * weave + 0.16 * (pnoise(n, 90) - .5) + 0.28 * (pnoise(n, 5) - .5)
base = np.array([22, 74, 58]) / 255
Image.fromarray((np.clip(lum[..., None] * base * 1.25, 0, 1) * 255).astype('uint8')).save('assets/green-felt.webp', quality=82)

# 2. Marmer berputar untuk lapisan bergerak (512px, tile, grayscale)
n = 512; y, x = np.mgrid[0:n, 0:n] / n
w = pnoise(n, 3) * 2.2 + pnoise(n, 7) * .6
m = .5 + .5 * np.sin(TAU * (2 * x + 1 * y) + TAU * w * 1.5)
m = .5 + (m - .5) * .55   # kontras rendah: marmer hanya memberi variasi cahaya
Image.fromarray((np.stack([m] * 3, -1) * 255).astype('uint8')).save('assets/felt-marble.webp', quality=70)

# 3. Kertas kartu: ivory + serat (128px, tile)
n = 128; paper = np.ones((n, n, 3)) * np.array([243, 235, 214])
lum = (pnoise(n, 40) - .5) * 20 + (pnoise(n, 6) - .5) * 13
for _ in range(150):  # serat kertas (wrap-around agar tetap seamless)
    px, py = rng.integers(0, n, 2); a = rng.uniform(0, TAU); L = rng.integers(6, 15); v = rng.uniform(-16, 6)
    for t in range(L): lum[int(py + np.sin(a) * t) % n, int(px + np.cos(a) * t) % n] += v
Image.fromarray(np.clip(paper + lum[..., None], 0, 255).astype('uint8')).save('assets/card-paper.webp', quality=88)

# 4. Grain cetak: bintik halus transparan (96px, tile)
n = 96; v = rng.random((n, n)); dark = rng.random((n, n)) > .5
a = np.where(v > .72, rng.integers(8, 30, (n, n)), 0).astype('uint8')
rgb = np.where(dark[..., None], [35, 28, 22], [255, 250, 235]).astype('uint8')
Image.fromarray(np.dstack([rgb, a]), 'RGBA').save('assets/card-grain.png', optimize=True)

# 5. Tepi kartu: bayangan dalam di pinggir + aus halus (140x196)
W, H = 140, 196; yy, xx = np.mgrid[0:H, 0:W]; d = np.minimum.reduce([xx, yy, W - 1 - xx, H - 1 - yy]).astype(float)
a = np.exp(-d / 4.5) * 95 + np.exp(-d / 1.5) * 40 + (rng.random((H, W)) > .93) * np.exp(-d / 6) * 70
rgb = np.zeros((H, W, 3), 'uint8'); rgb[...] = [48, 36, 26]
Image.fromarray(np.dstack([rgb, np.clip(a, 0, 255).astype('uint8')]), 'RGBA').save('assets/card-edge.png', optimize=True)
print('ok')
