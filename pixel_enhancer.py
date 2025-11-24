"""
Pixel-art sprite enhancement script.

This utility upscales a low-resolution soccer player sprite and adds pixel-art
friendly shading, outlines, and palette refinement to make it closer to a
professional reference while preserving the original pose and colors.

Usage:
    python pixel_enhancer.py --sprite path/to/sprite.png \
        --reference path/to/reference.png --scale 8 --palette-colors 24

Key parameters can be adjusted via CLI flags; see `--help` for details.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from typing import Iterable, Optional, Sequence, Tuple

import numpy as np
from PIL import Image, ImageChops, ImageFilter

RGBAColor = Tuple[int, int, int, int]


@dataclass
class LightDirection:
    """Simple container for a normalized light direction."""

    x: float = -1.0
    y: float = -1.0
    z: float = 1.0

    def as_array(self) -> np.ndarray:
        vec = np.array([self.x, self.y, self.z], dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            return vec
        return vec / norm


def load_image(path: str) -> Image.Image:
    """Load an image from disk as RGBA, preserving transparency."""
    return Image.open(path).convert("RGBA")


def upscale_image(image: Image.Image, scale: int) -> Image.Image:
    """Upscale pixel art with nearest-neighbor to keep crisp edges."""
    if scale <= 0:
        raise ValueError("Scale factor must be positive")
    w, h = image.size
    return image.resize((w * scale, h * scale), resample=Image.NEAREST)


def enhance_edges(image: Image.Image, outline_color: RGBAColor = (0, 0, 0, 255), thickness: int = 1) -> Image.Image:
    """Add a clean 1px outline around opaque pixels to tighten silhouettes."""
    if thickness < 1:
        return image

    alpha = image.split()[-1]
    dilated = alpha.filter(ImageFilter.MaxFilter(size=thickness * 2 + 1))
    outline_mask = ImageChops.subtract(dilated, alpha)

    outline_layer = Image.new("RGBA", image.size, outline_color)
    outline_layer.putalpha(outline_mask)
    return Image.alpha_composite(outline_layer, image)


def apply_pixel_shading(image: Image.Image, light_direction: LightDirection, intensity: float = 0.35) -> Image.Image:
    """Apply directional shading to add volume while staying pixel-friendly.

    The shading uses a simple lambertian-style dot product against a gradient
    normal derived from sprite position. This keeps the pose intact while
    adding readable depth.
    """
    if not 0 <= intensity <= 1:
        raise ValueError("intensity should be within [0, 1]")

    rgba = np.array(image).astype(np.float32)
    alpha = rgba[..., 3:4] / 255.0

    h, w = alpha.shape[:2]
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0

    nx = (x_coords - cx) / max(cx, 1.0)
    ny = (y_coords - cy) / max(cy, 1.0)
    nz = np.ones_like(nx)
    normals = np.stack([nx, ny, nz], axis=-1)

    light = light_direction.as_array().reshape((1, 1, 3))
    dot = (normals * light).sum(axis=-1)
    dot = (dot - dot.min()) / max(dot.ptp(), 1e-5)  # normalize to [0,1]

    shading = 1.0 + intensity * (dot - 0.5)
    rgba[..., :3] *= shading[..., None]
    rgba[..., :3] = np.clip(rgba[..., :3], 0, 255)

    rgba[..., 3:] = rgba[..., 3:] * alpha  # preserve alpha unmodified
    return Image.fromarray(rgba.astype(np.uint8), mode="RGBA")


def subtle_dither(image: Image.Image, strength: float = 0.08, seed: int = 1) -> Image.Image:
    """Add subtle dithering noise to soften banding while keeping pixel charm."""
    if strength <= 0:
        return image

    rng = np.random.default_rng(seed)
    rgba = np.array(image).astype(np.float32)
    noise = rng.uniform(-1, 1, size=rgba[..., :3].shape)
    rgba[..., :3] = np.clip(rgba[..., :3] + noise * 255 * strength, 0, 255)
    return Image.fromarray(rgba.astype(np.uint8), mode="RGBA")


def reduce_palette(image: Image.Image, n_colors: int, dither: bool = True) -> Image.Image:
    """Quantize the image to a limited palette suitable for games."""
    if n_colors < 2:
        raise ValueError("n_colors must be at least 2")

    dither_mode = Image.FLOYDSTEINBERG if dither else Image.NONE
    palettized = image.convert("P", palette=Image.ADAPTIVE, colors=n_colors, dither=dither_mode)
    return palettized.convert("RGBA")


def build_palette_from_reference(reference: Image.Image, colors: int) -> Image.Image:
    """Create a palette image from a reference sprite to guide quantization."""
    quantized = reference.convert("P", palette=Image.ADAPTIVE, colors=colors)
    palette = quantized.getpalette()[: colors * 3]

    # Create a 1px-high palette strip for quantization mapping.
    palette_strip = Image.new("P", (colors, 1))
    palette_strip.putpalette(palette + [0] * (768 - len(palette)))
    return palette_strip


def map_to_reference_palette(image: Image.Image, reference: Image.Image, colors: int) -> Image.Image:
    """Map sprite colors to a palette derived from the reference."""
    palette_strip = build_palette_from_reference(reference, colors)
    palettized = image.convert("RGB").quantize(palette=palette_strip, dither=Image.FLOYDSTEINBERG)
    return palettized.convert("RGBA")


def harmonize_colors(
    image: Image.Image,
    palette_colors: int,
    reference: Optional[Image.Image] = None,
    dither: bool = True,
) -> Image.Image:
    """Reduce colors using either a reference palette or adaptive palette."""
    if reference:
        image = map_to_reference_palette(image, reference, palette_colors)
    return reduce_palette(image, palette_colors, dither=dither)


def process_sprite(
    sprite_path: str,
    output_path: str,
    scale: int = 8,
    palette_colors: int = 24,
    light_direction: LightDirection = LightDirection(),
    shading_intensity: float = 0.35,
    dither_strength: float = 0.08,
    reference_path: Optional[str] = None,
) -> Image.Image:
    """Run the full enhancement pipeline and save the result."""
    sprite = load_image(sprite_path)
    reference = load_image(reference_path) if reference_path else None

    upscaled = upscale_image(sprite, scale)
    shaded = apply_pixel_shading(upscaled, light_direction=light_direction, intensity=shading_intensity)
    outlined = enhance_edges(shaded)
    dithered = subtle_dither(outlined, strength=dither_strength)
    harmonized = harmonize_colors(dithered, palette_colors=palette_colors, reference=reference)

    harmonized.save(output_path)
    return harmonized


def parse_light_direction(raw: Sequence[float]) -> LightDirection:
    if len(raw) != 3:
        raise argparse.ArgumentTypeError("--light-direction expects three floats (x y z)")
    return LightDirection(*map(float, raw))


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Enhance a pixel-art soccer player sprite.")
    parser.add_argument("--sprite", required=True, help="Path to the base sprite image")
    parser.add_argument("--output", default="soccer_player_enhanced.png", help="Path for the enhanced sprite output")
    parser.add_argument("--reference", help="Optional reference pixel-art image to match palette/style")
    parser.add_argument("--scale", type=int, default=8, help="Upscale factor (e.g., 8-10) using nearest-neighbor")
    parser.add_argument("--palette-colors", type=int, default=24, help="Number of colors to quantize the final sprite to")
    parser.add_argument("--light-direction", nargs=3, type=float, metavar=("X", "Y", "Z"), default=(-1.0, -1.0, 1.0), help="Light direction vector for shading (e.g., -1 -1 1 for top-left)")
    parser.add_argument("--shading-intensity", type=float, default=0.35, help="Strength of shading/highlights (0-1)")
    parser.add_argument("--dither-strength", type=float, default=0.08, help="Strength of subtle dithering noise (0-1)")
    parser.add_argument("--no-dither", action="store_true", help="Disable dithering during palette reduction")
    return parser


def main(args: Optional[Iterable[str]] = None) -> None:
    parser = build_arg_parser()
    parsed = parser.parse_args(args=args)

    light_dir = parse_light_direction(parsed.light_direction)
    process_sprite(
        sprite_path=parsed.sprite,
        output_path=parsed.output,
        scale=parsed.scale,
        palette_colors=parsed.palette_colors,
        light_direction=light_dir,
        shading_intensity=parsed.shading_intensity,
        dither_strength=0 if parsed.no_dither else parsed.dither_strength,
        reference_path=parsed.reference,
    )

    print("Saved enhanced sprite to", parsed.output)
    print("\nTry tweaking these flags for different looks:")
    print("  --scale <int>             Adjust output size (e.g., 6 for smaller, 10 for larger)")
    print("  --shading-intensity <0-1> Use 0.2 for softer shading or 0.6 for stronger highlights")
    print("  --palette-colors <int>    Use fewer colors (12-16) for a retro look or more (28-32) for richer detail")
    print("  --light-direction x y z   Move the light (e.g., 1 -1 1 for top-right)")


if __name__ == "__main__":
    main()
