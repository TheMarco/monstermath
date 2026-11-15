#!/bin/bash
# Downloads the version 2 (bold cartoon) monster art from Scenario and sizes
# it for the game, replacing the earlier pictures in public/art/monsters.
# Links in scripts/art-urls-v2-*.txt expire after about a week.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src-v2/monsters art-src-v2/bg art-src-v2/items public/art/monsters public/art/bg public/art/items
failed=0
cat scripts/art-urls-v2-*.txt | while read -r name url; do
  [ -z "$name" ] && continue
  src="art-src-v2/$name.png"
  if [ ! -s "$src" ]; then
    if ! curl -fsSL -o "$src" "$url"; then
      echo "FAILED  $name"
      rm -f "$src"
      continue
    fi
  fi
  case "$name" in
    bg/*) sips -s format jpeg -s formatOptions 88 "$src" --out "public/art/$name.jpg" >/dev/null ;;
    *) sips -Z 640 "$src" --out "public/art/$name.png" >/dev/null ;;
  esac
  echo "ok      $name"
done
echo "Monster pictures: $(ls art-src-v2/monsters/*.png 2>/dev/null | wc -l | tr -d ' ') of 75. Backgrounds: $(ls art-src-v2/bg/*.png 2>/dev/null | wc -l | tr -d ' ') of 4. Decorations: $(ls art-src-v2/items/decor-*.png 2>/dev/null | wc -l | tr -d ' ') of 8."
# The pilot animation was made from the old Puff picture; remove it so it does not play over the new one.
if [ -d public/art/anim ] && [ ! -f public/art/anim/.v2 ]; then
  rm -f public/art/anim/*.mp4
  echo '[]' > public/art/anim/manifest.json
  touch public/art/anim/.v2
fi
exit 0
