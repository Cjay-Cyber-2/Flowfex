#!/usr/bin/env python3
"""
Remove disconnected corner blobs from Syniq raster logo exports while keeping the
solid outer ring plus any glyphs fully enclosed by that ring (star / hollow fill).

Uses a forgiving teal-ish alpha mask, labels 4-connected components, keeps the
largest component plus any whose bounding box sits inside the dominant cluster's
bounding box (with slack). Remaining orphans that match corner stripe heuristics
or are tiny stray pixels near the rim are erased. Fully transparent RGB is
zeroed for clean stacking in the UI.

Example:
  ./clean_syniq_logo_png.py frontend/src/assets/syniq-logo-v3.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def in_foreground(px, x: int, y: int, alpha_floor: int) -> bool:
    """Loosened guard so faint inner strokes still connect to their layer."""
    r, g, b, a = px[x, y]
    if a <= alpha_floor:
        return False
    return g >= 145 and b >= 138 and g >= r + 10


def label_components(im: Image.Image, alpha_floor: int) -> list[set[tuple[int, int]]]:
    px = im.load()
    w, h = im.size
    seen: set[tuple[int, int]] = set()
    comps: list[set[tuple[int, int]]] = []

    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or not in_foreground(px, sx, sy, alpha_floor):
                continue
            comp: set[tuple[int, int]] = set()
            stack = [(sx, sy)]
            while stack:
                x, y = stack.pop()
                if x < 0 or x >= w or y < 0 or y >= h:
                    continue
                if (x, y) in seen or not in_foreground(px, x, y, alpha_floor):
                    continue
                seen.add((x, y))
                comp.add((x, y))
                stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            if comp:
                comps.append(comp)

    comps.sort(key=len, reverse=True)
    return comps


def bbox(pix: set[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs = [p[0] for p in pix]
    ys = [p[1] for p in pix]
    return min(xs), min(ys), max(xs), max(ys)


def inflate(bb: tuple[int, int, int, int], pad: int) -> tuple[int, int, int, int]:
    xmin, ymin, xmax, ymax = bb
    return xmin - pad, ymin - pad, xmax + pad, ymax + pad


def bbox_inside(inner: tuple[int, int, int, int], outer: tuple[int, int, int, int]) -> bool:
    ix0, iy0, ix1, iy1 = inner
    ox0, oy0, ox1, oy1 = outer
    return ix0 >= ox0 and iy0 >= oy0 and ix1 <= ox1 and iy1 <= oy1


def corner_bl_stray(bb: tuple[int, int, int, int], w: int, h: int) -> bool:
    xmin, ymin, xmax, ymax = bb
    return ymin >= h - 360 and xmax <= w // 3


def corner_tr_stray(bb: tuple[int, int, int, int], w: int, h: int) -> bool:
    xmin, ymin, xmax, ymax = bb
    return ymax <= 220 and xmin >= w * 2 // 3


def normalize_transparent(im: Image.Image) -> None:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)


def clean(src: Path, dst: Path, alpha_floor: int) -> tuple[int, int]:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size

    comps = label_components(im, alpha_floor=alpha_floor)
    if len(comps) < 2:
        normalize_transparent(im)
        im.save(dst, optimize=True)
        return 0, max((len(c) for c in comps), default=0)

    dominant = comps[0]
    main_bb_inf = inflate(bbox(dominant), pad=42)

    removed_pixels = 0
    cleared = False

    for orphan in comps[1:]:
        ob = bbox(orphan)
        if bbox_inside(ob, main_bb_inf):
            continue
        if corner_bl_stray(ob, w, h) or corner_tr_stray(ob, w, h):
            purge = orphan
        elif len(orphan) <= 120:
            purge = orphan
        else:
            continue

        for x, y in purge:
            px[x, y] = (0, 0, 0, 0)
            removed_pixels += 1
        cleared = True

    normalize_transparent(im)
    # Gentle left-edge shim: orphaned anti-alias specks detached from foreground graph
    if cleared:
        dust_floor = max(18, alpha_floor - 12)
        for yy in range(int(h * 0.76), h):
            for xx in range(0, min(48, max(26, int(w * 0.057)))):
                r, g, b, a = px[xx, yy]
                if a <= dust_floor:
                    continue
                if g >= 135 and b >= 132 and r < g - 4:
                    px[xx, yy] = (0, 0, 0, 0)

    im.save(dst, optimize=True)

    foreground_total = sum(len(c) for c in comps)
    return removed_pixels, foreground_total


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src", type=Path, help="Input PNG path")
    ap.add_argument(
        "-o",
        "--out",
        type=Path,
        help="Output PNG path (default: overwrite SRC)",
    )
    ap.add_argument(
        "--alpha-floor",
        type=int,
        default=26,
        help="Floor for considering a pixel foreground (8-120).",
    )
    args = ap.parse_args()

    alpha_floor = max(8, min(args.alpha_floor, 220))
    out = args.out or args.src

    removed, foreground = clean(args.src, out, alpha_floor=alpha_floor)
    print(f"foreground_pixels(total_cc)={foreground} removed_px={removed} -> {out}")


if __name__ == "__main__":
    main()
