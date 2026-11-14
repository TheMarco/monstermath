# Monster animation clips: generation spec

Scenario ids: team_id and project_id are both `team_LSUCdfXNhXUPNbW4N2u1APQV`.

Your work list is a TSV file of lines `name<TAB>asset_id` (one monster picture each). For every line do three steps.

## Step 1: put the picture on a flat magenta background

`mcp__scenario__model_run`, model_id `model_scenario-compose-image`, wait true, parameters:
`{"layers": [{"source": "<asset_id>", "x": "center", "y": "center", "anchor": "center", "scale": 0.8}], "canvasMode": "custom", "canvasWidth": 1024, "canvasHeight": 1024, "backgroundColor": "#FF00FF", "imageOutputFormat": "png"}`
Note the new asset id (the "composed" picture).

## Step 2: make two video clips from the composed picture

`mcp__scenario__model_run`, model_id `model_pruna-p-video-2`, wait false, parameters:
`{"prompt": "<PROMPT>", "image": "<composed id>", "lastFrameImage": "<composed id>", "duration": <SECONDS>, "resolution": "720p", "fps": 24, "saveAudio": false, "promptUpsampling": false}`

IDLE clip: SECONDS = 4, PROMPT =
The cartoon creature stays in place and idles with confident energy: it breathes, blinks, shifts its weight, flicks its tail, ears or wings, and any flames, sparks, water or glow on it flicker gently, then it settles back into the exact starting pose. Flat 2D cel-shaded cartoon animation with thick dark outlines; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, nothing else appears. Static camera, no zoom, no camera movement.

HAPPY clip: SECONDS = 3, PROMPT =
The cartoon creature celebrates a win: a quick energetic hop and a proud flourish with its tail, wings or paws, with a big confident grin, then it lands and settles back into the exact starting pose. Flat 2D cel-shaded cartoon animation with thick dark outlines; the art style, colors and proportions stay exactly the same in every frame. The background is a solid, flat, pure magenta screen that never changes: no shadows, no floor, no gradient, no hearts, no sparkles, no text, nothing else appears. Static camera, no zoom, no camera movement.

Each clip costs about 15 to 20 credits: never start the same clip twice unless it failed. Wait for the clips with `mcp__scenario__jobs_wait` (call again with pending ids if needed).

## Step 3: record the download links

`mcp__scenario__asset_download` for each finished clip (asset_id, team_id, project_id, no format parameter). Append to your output file one line per clip: `<name>-idle <url>` and `<name>-happy <url>`.
