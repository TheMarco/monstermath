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
fetch() {
  if curl -fsSL -o "$2" "$3"; then echo "ok      $1"; else echo "FAILED  $1"; rm -f "$2"; fi
}
# First clips: the monster takes 0.8 of the picture.
while read -r name url; do
  [ -z "$name" ] && continue
  grep -qx "$name" scripts/anim-wide.txt 2>/dev/null && continue
  grep -qx "$name" scripts/anim-dropped.txt 2>/dev/null && continue
  out="public/art/anim/$name.mp4"
  [ -s "$out" ] || fetch "$name" "$out" "$url"
done < <(cat scripts/anim-urls-*.txt 2>/dev/null)
# Clips remade with more room (0.6 of the picture), named in scripts/anim-wide.txt.
# A remade clip is kept at 720 px; the copy it replaces is 640 px wide. When a
# clip is remade again, the last link for its name wins: .fetched remembers
# which one was downloaded.
touch public/art/anim/.fetched
while read -r name url; do
  [ -z "$name" ] && continue
  grep -qx "$name" scripts/anim-wide.txt 2>/dev/null || continue
  # Clips in anim-dropped.txt still smeared after three tries: the game hops the monster instead.
  grep -qx "$name" scripts/anim-dropped.txt 2>/dev/null && continue
  out="public/art/anim/$name.mp4"
  id=$(printf '%s' "$url" | sed -E 's/.*(asset_[A-Za-z0-9]+).*/\1/')
  had=$(awk -v n="$name" '$1 == n {v = $2} END {print v}' public/art/anim/.fetched)
  if [ -s "$out" ] && [ "$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$out")" != "640" ]; then
    { [ -z "$had" ] || [ "$had" = "$id" ]; } && continue
  fi
  fetch "$name" "$out.new" "$url"
  if [ -s "$out.new" ]; then mv "$out.new" "$out"; echo "$name $id" >> public/art/anim/.fetched; fi
done < <(cat scripts/anim-wide-urls-*.txt 2>/dev/null | awk '{u[$1]=$2} END {for (n in u) print n, u[n]}')
cd public/art/anim
# The list the game reads: each clip and how much of the picture the monster takes.
printf '{' > manifest.json
first=1
for f in *.mp4; do
  [ -e "$f" ] || continue
  name="${f%.mp4}"
  fill=0.8
  if grep -qx "$name" ../../../scripts/anim-wide.txt 2>/dev/null; then
    [ "$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")" != "640" ] && fill=0.6
  fi
  [ $first -eq 1 ] || printf ',' >> manifest.json
  printf '"%s":%s' "$name" "$fill" >> manifest.json
  first=0
done
printf '}\n' >> manifest.json
echo "Clips ready: $(ls *.mp4 2>/dev/null | wc -l | tr -d ' ') (11 of the 174 are left out: scripts/anim-dropped.txt)"
