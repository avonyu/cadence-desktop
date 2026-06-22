#!/usr/bin/env python3
"""Add transparent padding to an icon image.

Detects the content bounding box (non-transparent pixels), scales content down,
and centers it on the original canvas with transparent padding.

Usage:
  python3 scripts/pad-icon.py -i <input.png> [-p <padding>] [-o <output.png>]

  -i   input image path (required)
  -p   padding ratio on each side, 0~1 (default 0.08)
  -o   output path (default: overwrite input)
"""

import argparse
from typing import Optional
from PIL import Image


def get_content_bbox(img: Image.Image) -> Optional[tuple[int, int, int, int]]:
    """Return bounding box of non-transparent pixels, or None if fully transparent."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return img.getbbox()


def add_padding(input_path: str, padding: float, output_path: str) -> None:
    img = Image.open(input_path).convert("RGBA")
    orig_w, orig_h = img.size

    # Find content (non-transparent) bounding box
    bbox = get_content_bbox(img)
    if bbox is None:
        print("Warning: image is fully transparent, adding padding to entire canvas")
        bbox = (0, 0, orig_w, orig_h)

    left, top, right, bottom = bbox
    content_w = right - left
    content_h = bottom - top

    # Target content size after padding: (1 - 2*padding) of canvas
    scale = 1 - 2 * padding
    target_content_w = round(orig_w * scale)
    target_content_h = round(orig_h * scale)

    # Crop content, resize to target size
    content = img.crop(bbox)
    content_ratio = content_w / content_h
    target_ratio = target_content_w / target_content_h

    # Fit content within target area while preserving aspect ratio
    if content_ratio > target_ratio:
        # Content is wider — fit to width
        new_w = target_content_w
        new_h = round(target_content_w / content_ratio)
    else:
        # Content is taller — fit to height
        new_h = target_content_h
        new_w = round(target_content_h * content_ratio)

    content_resized = content.resize((new_w, new_h), Image.LANCZOS)

    # Create new transparent canvas of original size, paste content centered
    result = Image.new("RGBA", (orig_w, orig_h), (0, 0, 0, 0))
    offset_x = (orig_w - new_w) // 2
    offset_y = (orig_h - new_h) // 2
    result.paste(content_resized, (offset_x, offset_y))

    # Print info
    actual_padding_x = (orig_w - new_w) / orig_w / 2
    actual_padding_y = (orig_h - new_h) / orig_h / 2
    print(f"Input:        {input_path} ({orig_w}x{orig_h})")
    print(f"Content bbox: {left},{top} -> {right},{bottom}  ({content_w}x{content_h})")
    print(f"Padding:      {padding:.0%} target,  {actual_padding_x:.1%} / {actual_padding_y:.1%} actual")
    print(f"Content size: {new_w}x{new_h}")

    result.save(output_path)
    print(f"Done:         {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add transparent padding to an icon image."
    )
    parser.add_argument("-i", required=True, help="Input image path")
    parser.add_argument("-o", default=None, help="Output path (default: overwrite input)")
    parser.add_argument(
        "-p",
        type=float,
        default=0.08,
        help="Padding ratio on each side, 0~1 (default: 0.08)",
    )
    args = parser.parse_args()

    input_path = args.i
    padding = args.p
    output_path = args.o if args.o else input_path

    if not 0 <= padding < 1:
        print("Error: padding ratio must be between 0 and 1 (e.g. 0.08 for 8%)")
        parser.exit(1)

    add_padding(input_path, padding, output_path)


if __name__ == "__main__":
    main()
