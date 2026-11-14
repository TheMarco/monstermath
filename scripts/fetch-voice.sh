#!/bin/bash
# Downloads the recorded voice clips from Scenario and converts them for the game.
# The links in scripts/voice/urls-*.txt are signed and expire after about a week.
# Originals go to art-src/voice/, game-ready copies to public/voice/<key>.m4a.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src/voice public/voice
failed=0; done_count=0
cat scripts/voice/urls-*.txt 2>/dev/null | while read -r key url; do
  [ -z "$key" ] && continue
  src="art-src/voice/$key.audio"
  out="public/voice/$key.m4a"
  if [ ! -s "$src" ]; then
    if ! curl -fsSL -o "$src" "$url"; then
      echo "FAILED  $key"
      rm -f "$src"
      continue
    fi
  fi
  kind=$(file -b "$src")
  case "$kind" in
    *WAVE*) ext=wav ;;
    *MPEG*|*ID3*|*MP3*) ext=mp3 ;;
    *) ext=bin ;;
  esac
  tmp="art-src/voice/$key.$ext"
  cp "$src" "$tmp"
  # AAC keeps the clips small. If conversion is not possible, ship the original:
  # the browser reads the audio by its content, not its file extension.
  if ! afconvert -f m4af -d aac -b 64000 "$tmp" "$out" >/dev/null 2>&1; then
    cp "$src" "$out"
  fi
  rm -f "$tmp"
done
have=$(ls public/voice/*.m4a 2>/dev/null | wc -l | tr -d ' ')
want=$(cut -f1 scripts/voice/lines.tsv | wc -l | tr -d ' ')
echo "Voice clips ready: $have of $want"
missing=$(cut -f1 scripts/voice/lines.tsv | while read -r k; do [ -s "public/voice/$k.m4a" ] || echo "$k"; done)
[ -n "$missing" ] && echo "Missing: $(echo $missing | tr '\n' ' ')"
exit 0
