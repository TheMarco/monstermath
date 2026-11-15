#!/bin/bash
# Downloads the monster animation clips from Scenario into public/art/anim/
# and writes the list the game reads. Links in scripts/anim-urls.txt expire
# after about a week; downloaded clips are kept.
set -u
cd "$(dirname "$0")/.."
mkdir -p public/art/anim
# Clips made from the first version of the art must not survive into the new look.
if [ ! -f public/art/anim/.v2 ]; then
  rm -f public/art/anim/*.mp4
  touch public/art/anim/.v2
fi
while read -r name url; do
  [ -z "$name" ] && continue
  out="public/art/anim/$name.mp4"
  if [ ! -s "$out" ]; then
    if curl -fsSL -o "$out" "$url"; then echo "ok      $name"; else echo "FAILED  $name"; rm -f "$out"; fi
  fi
done < <(cat scripts/anim-urls-*.txt 2>/dev/null)
cd public/art/anim
printf '[' > manifest.json
first=1
for f in *.mp4; do
  [ -e "$f" ] || continue
  [ $first -eq 1 ] || printf ',' >> manifest.json
  printf '"%s"' "${f%.mp4}" >> manifest.json
  first=0
done
printf ']\n' >> manifest.json
echo "Clips ready: $(ls *.mp4 2>/dev/null | wc -l | tr -d ' ') of 156"
