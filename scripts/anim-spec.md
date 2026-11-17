# Monster animation clips: generation spec

Scenario ids: team_id and project_id are both `team_LSUCdfXNhXUPNbW4N2u1APQV`.

Your work list is a TSV file of lines `name<TAB>asset_id<TAB>which` (one monster picture each). `which` is `idle`, `happy` or `both`: the clips to make for that picture. For every line do three steps.

## Step 1: put the picture on a flat magenta background, with room to move

`mcp__scenario__model_run`, model_id `model_scenario-compose-image`, wait true, parameters:
`{"layers": [{"source": "<asset_id>", "x": "center", "y": "center", "anchor": "center", "scale": 0.6}], "canvasMode": "custom", "canvasWidth": 1024, "canvasHeight": 1024, "backgroundColor": "#FF00FF", "imageOutputFormat": "png"}`
Note the new asset id (the "composed" picture). The scale must be exactly 0.6: the game draws the clip by it.

## Step 2: make the video clips from the composed picture

`mcp__scenario__model_run`, model_id `model_pruna-p-video-2`, wait false, parameters:
`{"prompt": "<PROMPT>", "image": "<composed id>", "lastFrameImage": "<composed id>", "duration": <SECONDS>, "resolution": "720p", "fps": 24, "saveAudio": false, "promptUpsampling": false}`

Use the prompts word for word. Fast motion makes this model smear the drawing, so they ask for slow, small movement.

IDLE clip: SECONDS = 4, PROMPT =
The small cartoon creature stays in the same spot in the center and idles calmly: slow breathing, a blink, a small slow shift of its weight, a gentle slow sway of its tail, ears or wings, and any flames, sparks, water or glow on it flicker softly; then it settles back into the exact starting pose. All movement is slow, small and smooth; nothing moves fast. The creature stays the same size and stays fully inside the picture with wide empty magenta space on every side at all times; no part of it ever comes near the edges. Every frame is a crisp, sharp, clean drawing with solid thick dark outlines and flat colors: no motion blur, no smearing, no ghosting, no melting, no distortion. Flat 2D cel-shaded cartoon animation; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, nothing else appears. Static camera, no zoom, no camera movement.

HAPPY clip: SECONDS = 3, PROMPT =
The small cartoon creature celebrates a win in the same spot in the center: a big confident grin, one small low bounce in place and a slow proud wiggle of its tail, wings or paws, then it settles back into the exact starting pose. All movement is gentle, small and smooth; nothing moves fast. The creature stays the same size and stays fully inside the picture with wide empty magenta space on every side at all times; no part of it ever comes near the edges. Every frame is a crisp, sharp, clean drawing with solid thick dark outlines and flat colors: no motion blur, no smearing, no ghosting, no melting, no distortion. Flat 2D cel-shaded cartoon animation; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, no hearts, no sparkles, no text, nothing else appears. Static camera, no zoom, no camera movement.

CALM HAPPY clip (for a monster whose happy clip came out smeared): SECONDS = 3, PROMPT =
The small cartoon creature is delighted, in the same spot in the center: it smiles wide with happy eyes, gently nods its head twice and slowly sways its tail, ears or wings a little, then settles back into the exact starting pose. Its feet stay planted on the same spot the whole time; it does not jump, spin, turn around, stretch or wave its limbs. All movement is very slow, small and smooth; nothing moves fast. The creature stays the same size and stays fully inside the picture with wide empty magenta space on every side at all times; no part of it ever comes near the edges. Every frame is a crisp, sharp, clean drawing with solid thick dark outlines and flat colors: no motion blur, no smearing, no ghosting, no melting, no distortion. Flat 2D cel-shaded cartoon animation; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, no hearts, no sparkles, no text, nothing else appears. Static camera, no zoom, no camera movement.

CALM IDLE clip (for a monster whose idle clip came out smeared): SECONDS = 4, PROMPT =
The small cartoon creature stands still in the same spot in the center and only breathes and blinks: its chest rises and falls slowly, it blinks once or twice, and any flames, sparks, water or glow on it flicker softly. Its body, head, limbs, tail and wings hold the exact starting pose the whole time; it does not walk, turn, jump, stretch or wave. All movement is very slow, small and smooth; nothing moves fast. The creature stays the same size and stays fully inside the picture with wide empty magenta space on every side at all times; no part of it ever comes near the edges. Every frame is a crisp, sharp, clean drawing with solid thick dark outlines and flat colors: no motion blur, no smearing, no ghosting, no melting, no distortion. Flat 2D cel-shaded cartoon animation; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, nothing else appears. Static camera, no zoom, no camera movement.

An idle clip costs 20 credits and a happy clip 15: never start the same clip twice unless it failed. Wait for the clips with `mcp__scenario__jobs_wait` (call again with pending ids if needed).

## Step 3: record the download links

`mcp__scenario__asset_download` for each finished clip (asset_id, team_id, project_id, no format parameter). Append to your output file one line per clip: `<name>-idle <url>` or `<name>-happy <url>` (the name, one space, the full url).

## After downloading

`bash scripts/fetch-anim.sh` downloads the clips (a clip named in `scripts/anim-wide.txt` replaces its older copy), `bash scripts/shrink-art.sh` makes them smaller, and `python3 scripts/check-anim.py out.json public/art/anim/*.mp4` reports clips where the monster touches the edge (cut) or goes soft (sharp min under 0.75).
