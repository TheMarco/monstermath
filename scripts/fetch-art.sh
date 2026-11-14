#!/bin/bash
# Downloads the MonsterMath art from Scenario and sizes it for the game.
# The links in art-urls.txt are signed and stop working around 2026-11-21.
# Originals go to art-src/, game-ready copies to public/art/.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src/monsters art-src/bg art-src/items public/art/monsters public/art/bg public/art/items
failed=0
while read -r name url; do
  [ -z "$name" ] && continue
  src="art-src/$name.png"
  if [ ! -s "$src" ]; then
    if ! curl -fsSL -o "$src" "$url"; then
      echo "FAILED  $name"
      rm -f "$src"
      failed=$((failed + 1))
      continue
    fi
  fi
  case "$name" in
    monsters/*|items/*) sips -Z 512 "$src" --out "public/art/$name.png" >/dev/null ;;
    bg/*) sips -s format jpeg -s formatOptions 85 "$src" --out "public/art/$name.jpg" >/dev/null ;;
  esac
  echo "ok      $name"
done < scripts/art-urls.txt
echo "Done. $failed failed."
[ "$failed" -eq 0 ]
