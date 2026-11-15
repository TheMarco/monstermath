#!/bin/bash
# Downloads batch 4 from Scenario: six more meadow decorations and three
# meadow looks (sunset, autumn, snow). Links in scripts/art-urls-v4.txt expire
# after about a week.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src-v2/bg art-src-v2/items public/art/bg public/art/items
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
  case "$name" in
    bg/*) sips -s format jpeg -s formatOptions 88 "$src" --out "public/art/$name.jpg" >/dev/null ;;
    *) sips -Z 640 "$src" --out "public/art/$name.png" >/dev/null ;;
  esac
  ok=$((ok + 1))
  echo "ok      $name"
done < scripts/art-urls-v4.txt
echo "Done: $ok of 9 pictures."
