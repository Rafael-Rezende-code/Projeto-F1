#!/usr/bin/env python3
"""Recorte dos carros do topo da página do piloto (fase 2 da rodada de conteúdo).

Lê as fotos brutas de assets/carros-brutos/ (FORA do deploy), associa cada uma a um piloto pela equipe no nome do
arquivo (ou por --piloto), escolhe por piloto a foto com melhor chance de recorte limpo (fundo claro e uniforme nas
bordas), remove o fundo com o rembg, limpa o halo da borda e exporta um PNG com alfa (~2000px de largura) em
public/images/pilotos/carros/{slug}.png. Para cada piloto grava também uma prévia sobre fundo claro, escuro e na cor
da equipe em assets/carros-brutos/previas/{slug}.jpg: CONFIRA A PRÉVIA antes de usar. Se o recorte não ficou bom,
apague o PNG: sem ele, a página mostra as miniaturas de produtos.

Instalação (uma vez, fora do projeto):  python3 -m venv .venv-rembg && .venv-rembg/bin/pip install "rembg[cpu]"
Uso:  .venv-rembg/bin/python scripts/carros/recortar.py              (todas as fotos de assets/carros-brutos/)
      .venv-rembg/bin/python scripts/carros/recortar.py --piloto norris caminho/da/foto.jpg
Depois: `pnpm images:blur` (ou o build) e, se o carro apontar para a esquerda no arquivo, carFacing: "left" em
lib/drivers.ts (a página espelha). PLACEHOLDERS: fotos de imprensa têm logos e números (ver CLAUDE.md).
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "assets" / "carros-brutos"
OUT = ROOT / "public" / "images" / "pilotos" / "carros"
PREVIEWS = RAW / "previas"
WIDTH = 2000
MODEL = "isnet-general-use"  # bordas melhores que o u2net padrão em objetos rígidos

# Piloto pela equipe (ou pelo nome do piloto) no nome do arquivo.
KEYWORDS = {
    "norris": ["mclaren", "norris", "mcl"],
    "verstappen": ["redbull", "red-bull", "red_bull", "verstappen", "rb2"],
    "hamilton": ["ferrari", "hamilton", "sf-", "sf2"],
    "bortoleto": ["audi", "sauber", "bortoleto", "kick"],
}
TEAM_COLOR = {"norris": "#E77400", "verstappen": "#121F45", "hamilton": "#DC0000", "bortoleto": "#BB0A30"}


def driver_for(path: Path):
    name = path.stem.lower()
    for slug, words in KEYWORDS.items():
        if any(word in name for word in words):
            return slug
    return None


def background_score(path: Path) -> float:
    """Quanto maior, mais fácil o recorte: bordas claras e uniformes."""
    image = np.asarray(Image.open(path).convert("L").resize((400, 400)), dtype=np.float32)
    border = np.concatenate([image[:20].ravel(), image[-20:].ravel(), image[:, :20].ravel(), image[:, -20:].ravel()])
    return border.mean() / 255 - border.std() / 64


def remove_halo(rgba: Image.Image, background_rgb) -> Image.Image:
    """Tira o halo: encolhe 1px o alfa, suaviza a borda e devolve à cor original os pixels semitransparentes
    (descontamina a cor do fundo: C = (I - (1 - a) * B) / a)."""
    r, g, b, a = rgba.split()
    alpha = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    arr = np.asarray(rgba.convert("RGB"), dtype=np.float32)
    al = np.asarray(alpha, dtype=np.float32)[..., None] / 255
    bg = np.array(background_rgb, dtype=np.float32)
    safe = np.clip(al, 0.05, 1)
    fixed = np.where(al < 0.98, np.clip((arr - (1 - safe) * bg) / safe, 0, 255), arr)
    out = Image.fromarray(fixed.astype(np.uint8), "RGB")
    out.putalpha(alpha)
    return out


def border_color(path: Path):
    image = np.asarray(Image.open(path).convert("RGB").resize((400, 400)), dtype=np.float32)
    border = np.concatenate([image[:20].reshape(-1, 3), image[-20:].reshape(-1, 3), image[:, :20].reshape(-1, 3), image[:, -20:].reshape(-1, 3)])
    return tuple(np.median(border, axis=0))


def cut(path: Path, slug: str, session) -> Path:
    from rembg import remove

    source = Image.open(path).convert("RGB")
    rgba = remove(source, session=session, post_process_mask=True)
    rgba = remove_halo(rgba, border_color(path))
    box = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        raise RuntimeError("nada recortado")
    pad = int(0.02 * (box[2] - box[0]))
    rgba = rgba.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(rgba.width, box[2] + pad), min(rgba.height, box[3] + pad)))
    if rgba.width != WIDTH:
        rgba = rgba.resize((WIDTH, round(rgba.height * WIDTH / rgba.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"{slug}.png"
    rgba.save(target, optimize=True)

    PREVIEWS.mkdir(parents=True, exist_ok=True)
    thumb = rgba.copy()
    thumb.thumbnail((900, 900))
    tiles = []
    for color in ("#f5f5f3", "#111111", TEAM_COLOR.get(slug, "#444444")):
        tile = Image.new("RGB", (thumb.width + 40, thumb.height + 40), color)
        tile.paste(thumb, (20, 20), thumb)
        tiles.append(tile)
    sheet = Image.new("RGB", (tiles[0].width, sum(t.height for t in tiles)))
    y = 0
    for tile in tiles:
        sheet.paste(tile, (0, y))
        y += tile.height
    sheet.save(PREVIEWS / f"{slug}.jpg", quality=88)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--piloto", choices=sorted(KEYWORDS), help="força o piloto (com um arquivo só)")
    parser.add_argument("arquivos", nargs="*", type=Path)
    args = parser.parse_args()

    files = args.arquivos or sorted(p for p in RAW.glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not files:
        sys.exit(f"Nenhuma foto em {RAW.relative_to(ROOT)}/")
    candidates = {}
    for path in files:
        slug = args.piloto or driver_for(path)
        if not slug:
            print(f"? {path.name}: sem equipe/piloto no nome (renomeie ou use --piloto)")
            continue
        candidates.setdefault(slug, []).append((background_score(path), path))

    from rembg import new_session

    session = new_session(MODEL)
    for slug, options in sorted(candidates.items()):
        options.sort(reverse=True)
        score, best = options[0]
        print(f"{slug}: {best.name} (nota do fundo {score:.2f}; {len(options)} opção(ões))")
        target = cut(best, slug, session)
        print(f"  → {target.relative_to(ROOT)}  prévia: {(PREVIEWS / (slug + '.jpg')).relative_to(ROOT)}")


if __name__ == "__main__":
    main()
