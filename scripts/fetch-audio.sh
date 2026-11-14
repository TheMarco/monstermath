#!/bin/bash
# Downloads the music and sound effects from Scenario and converts them for the game.
# The links in scripts/audio-urls.txt are signed and expire after about a week.
# Originals go to art-src-v2/audio/, game-ready copies to public/music/ and public/sound/.
set -u
cd "$(dirname "$0")/.."
mkdir -p art-src-v2/audio/music art-src-v2/audio/sound public/music public/sound
while read -r key url; do
  [ -z "$key" ] && continue
  src="art-src-v2/audio/$key.audio"
  out="public/$key.m4a"
  if [ ! -s "$src" ]; then
    if ! curl -fsSL -o "$src" "$url"; then
      echo "FAILED  $key"
      rm -f "$src"
      continue
    fi
  fi
  [ -s "$out" ] && continue
  case "$(file -b "$src")" in
    *WAVE*) ext=wav ;;
    *MPEG*|*ID3*|*MP3*) ext=mp3 ;;
    *) ext=bin ;;
  esac
  tmp="art-src-v2/audio/$key.tmp.$ext"
  cp "$src" "$tmp"
  rate=128000
  case "$key" in sound/*) rate=96000 ;; esac
  # If conversion is not possible, ship the original: the browser reads audio by its content.
  if ! afconvert -f m4af -d aac -b "$rate" "$tmp" "$out" >/dev/null 2>&1; then
    cp "$src" "$out"
  fi
  rm -f "$tmp"
done < scripts/audio-urls.txt
want=$(grep -c . scripts/audio-urls.txt)
have=$(ls public/music/*.m4a public/sound/*.m4a 2>/dev/null | wc -l | tr -d ' ')
echo "Music and sounds ready: $have of $want"
exit 0
