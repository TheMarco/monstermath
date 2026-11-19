#!/bin/bash
# Downloads the match arenas from Scenario. Links in scripts/art-urls-arena.txt
# expire after about a week. To redo one, delete its file in art-src-v2/bg.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src-v2/bg public/art/bg
ok=0
while read -r name url; do
  [ -z "$name" ] && continue
  src="art-src-v2/$name.png"
  if [ ! -s "$src" ]; then
    if ! curl -fsSL -o "$src" "$url"; then
      echo "FAILED  $name"
      rm -f "$src"
      continue
    fi
  fi
  sips -s format jpeg -s formatOptions 88 "$src" --out "public/art/$name.jpg" >/dev/null
  ok=$((ok + 1))
  echo "ok      $name"
done < scripts/art-urls-arena.txt
echo "Done: $ok of 6 arenas."
