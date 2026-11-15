#!/bin/bash
# Makes the game's files smaller without a visible change:
# - pictures with see-through parts (monsters, items, logo): PNG to lossless WebP
# - animation clips: 640 px, H.264 High profile, CRF 21 (the game draws them at 420 px or less)
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
  width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$mp4")
  [ "$width" = "640" ] && continue
  tmp="${mp4%.mp4}.tmp.mp4"
  if ffmpeg -y -loglevel error -i "$mp4" -an -vf "scale=640:640:flags=lanczos" -c:v libx264 -profile:v high -preset slower -crf 21 -pix_fmt yuv420p -movflags +faststart "$tmp"; then mv "$tmp" "$mp4"; c=$((c + 1)); else echo "FAILED  $mp4"; rm -f "$tmp"; fi
done
echo "Clips re-encoded: $c"
