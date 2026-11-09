"""Gera uma máscara (PNG com alfa) só das partes douradas/brilhantes da coroa.
Uso: python3 mask_ouro.py entrada.png saida_mask.png [x0 x1 y0 y1]
(x0..y1 = região da coroa em frações 0-1 da imagem; padrão da versão larga: 0.31 0.69 0.30 0.73)
A máscara serve para o brilho passar SOMENTE no ouro, sem tocar em pele, cabelo ou fundo."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
X0, X1, Y0, Y1 = [float(v) for v in sys.argv[3:7]] if len(sys.argv) >= 7 else (0.31, 0.69, 0.30, 0.73)
im = Image.open(src).convert("RGB")
W, H = im.size
hsv = np.asarray(im.convert("HSV")).astype(np.float32)
h = hsv[..., 0] * 360 / 255          # matiz em graus
s = hsv[..., 1] / 255                # saturação
v = hsv[..., 2] / 255                # brilho

# ouro: matiz alaranjado/amarelado, saturado e claro o bastante
ouro = (h > 18) & (h < 52) & (s > 0.32) & (v > 0.42)

# região da coroa (em frações da imagem), para ignorar mãos, rosto e fundo
y, x = np.mgrid[0:H, 0:W]
regiao = (x > X0 * W) & (x < X1 * W) & (y > Y0 * H) & (y < Y1 * H)
m = (ouro & regiao).astype(np.float32)

# intensidade: mais brilho = mais máscara (realça os pontos de luz do metal)
m *= np.clip((v - 0.35) / 0.5, 0.25, 1.0)

mask = Image.fromarray((m * 255).astype(np.uint8))
# remove só os pontinhos isolados de baixo (reflexos no cabelo), mantendo todo o detalhe do ouro
from scipy import ndimage
mask = mask.filter(ImageFilter.MaxFilter(3))
bin_ = np.asarray(mask) > 60
lab, n = ndimage.label(bin_)
areas = ndimage.sum(bin_, lab, index=np.arange(1, n + 1))
cy = ndimage.center_of_mass(bin_, lab, index=np.arange(1, n + 1))
keep = np.zeros(n + 1, dtype=bool)
for i in range(n):
    pequeno_e_baixo = areas[i] < 220 and cy[i][0] > 0.66 * H
    keep[i + 1] = not pequeno_e_baixo
arr = np.asarray(mask).copy()
arr[~keep[lab]] = 0
mask = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.4))
a = np.asarray(mask)

out = np.zeros((H, W, 4), dtype=np.uint8)
out[..., :3] = 255
out[..., 3] = a
Image.fromarray(out, "RGBA").save(dst, optimize=True)
print("cobertura da máscara: %.1f%% da imagem" % (100 * (a > 40).mean()))
