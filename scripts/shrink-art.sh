#!/bin/bash
# Makes the game's files smaller without a visible change:
# - pictures with see-through parts (monsters, items, logo): PNG to lossless WebP
# - animation clips: 640 px (720 px for the ones in scripts/anim-wide.txt), H.264 High profile, CRF 21
# Needs cwebp and ffmpeg. Safe to run again: files already done are skipped.
set -u
cd "$(dirname "$0")/.."
command -v cwebp >/dev/null || { echo "cwebp is missing (brew install webp)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is missing (brew install ffmpeg)"; exit 1; }
n=0
for png in public/art/monsters/*.png public/art/items/*.png public/art/logo.png; do
  [ -e "$png" ] || continue
  if cwebp -quiet -lossless -m 6 -q 100 "$png" -o "${png%.png}.webp"; then rm "$png"; n=$((n + 1)); else echo "FAILED  $png"; fi
done
echo "Pictures converted: $n"
c=0
for mp4 in public/art/anim/*.mp4; do
  [ -e "$mp4" ] || continue
  name=$(basename "$mp4" .mp4)
  # Clips remade with more room keep 720 px, so the monster stays as sharp as before.
  side=640
  grep -qx "$name" scripts/anim-wide.txt 2>/dev/null && side=720
  width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$mp4")
  mark=$(ffprobe -v error -show_entries format_tags=comment -of csv=p=0 "$mp4")
  [ "$width" = "640" ] && continue
  [ "$mark" = "shrunk" ] && continue
  tmp="${mp4%.mp4}.tmp.mp4"
  if ffmpeg -y -loglevel error -i "$mp4" -an -vf "scale=$side:$side:flags=lanczos" -c:v libx264 -profile:v high -preset slower -crf 21 -pix_fmt yuv420p -metadata comment=shrunk -movflags +faststart "$tmp"; then mv "$tmp" "$mp4"; c=$((c + 1)); else echo "FAILED  $mp4"; rm -f "$tmp"; fi
done
echo "Clips re-encoded: $c"
