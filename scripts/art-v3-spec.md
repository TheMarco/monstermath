# MonsterMath art, batch 3 (Honey Hollow monsters, background, meadow decorations)

Scenario ids: team_id and project_id are both `team_LSUCdfXNhXUPNbW4N2u1APQV`.
Model for every picture: `model_openai-gpt-image-2-5-sunburst` (12 credits per picture; never run the same picture twice unless it failed).
Style anchor asset (the storm ram Puff): `asset_oQzuVzEj7PDVkiPLkuxZ8u63`.
Never mention any existing game, show or brand in a prompt.

Load the tools first with ToolSearch, query
"select:mcp__scenario__model_run,mcp__scenario__asset_download,mcp__scenario__jobs_wait".
Run pictures with `wait: false` and then `mcp__scenario__jobs_wait` on the job ids (call again with the pending ids until done).
For every finished picture call `mcp__scenario__asset_download` (asset_id, team_id, project_id, no format parameter) to get its signed URL.
Copy every URL character for character. Do NOT download files yourself (no curl, no wget).
If a picture is refused by moderation or fails, retry once with the same prompt; if it fails again, skip it and report its name.

## Monster pictures

Parameters: `{"prompt": <prompt>, "referenceImages": [<asset id>], "width": 1024, "height": 1024, "quality": "high", "background": "transparent", "numOutputs": 1}`

STAGE 1 prompt (referenceImages = the style anchor):
Use the reference image only as a style guide: match its thick dark outlines with varied line weight, flat cel shading with one shadow tone, sharp graphic highlights, rich bright colors and eye style exactly. Draw a different original creature in that same style, for a monster-taming adventure game aimed at ten to twelve year olds. One creature, full body, dynamic three-quarter view, centered, filling about 80% of the frame, nothing else in the image. First stage of three: young, charming and lively with attitude, clearly a spirited young animal, not a baby, not chibi. The creature: DESCRIPTION No text, no ground shadow, no background.

STAGE 2 prompt (referenceImages = that monster's own STAGE 1 asset):
The reference image shows the first stage of an original creature from a monster-taming adventure game. Draw the second stage of the same creature, grown stronger: the same species, the same colors and markings, and exactly the same art style, thick outline and flat cel shading as the reference. DESCRIPTION Cool and athletic, still friendly. One creature, full body, dynamic three-quarter view, centered, nothing else in the image, no text, no ground shadow, no background.

STAGE 3 prompt (referenceImages = that monster's own STAGE 1 asset):
The reference image shows the first stage of an original creature from a monster-taming adventure game. Draw the third and final stage of the same creature, fully grown and powerful: the same species, the same colors and markings, and exactly the same art style, thick outline and flat cel shading as the reference. DESCRIPTION Awe-inspiring and heroic, a protector, not evil. One creature, full body, dynamic three-quarter view, centered, nothing else in the image, no text, no ground shadow, no background.

Make stage 1 first, then stages 2 and 3 from it.

### bix (honeycomb badger)
1: a young honey badger with a charcoal body, a broad cream-white stripe running from its head down its back, amber plates patterned like honeycomb on its shoulders, a drop of golden honey on the tip of its short tail, strong little claws, marching forward with a scrappy fearless grin.
2: A tougher honey badger with a row of glowing amber honeycomb hexagon plates along its back, bigger claws, a thicker cream stripe and a small mane of dripping golden honey behind its head, in a ready stance.
3: A mighty honey badger guardian wearing full armor of golden honeycomb hexagons on its back and shoulders, a flowing mane of amber honey, a great striped tail, standing proud and fearless.

### tam (amber red panda)
1: a young red panda with russet fur, a cream face mask, dark legs, a big ringed tail whose rings alternate russet and glowing amber, and a small amber gem on its forehead, balancing playfully on its hind legs with a bright grin.
2: A nimble red panda with two big ringed tails, amber gem markings on its brow and paws, and a scarf-like ruff of cream fur around its neck, in a mid-leap pose.
3: A majestic red panda spirit with three great ringed tails fanned out behind it, a crown of glowing amber gems, a flowing cream mane, and a few amber shards floating close around it, poised and calm.

### zim (comb lizard)
1: a young frilled lizard with teal-green scales, a bright orange belly, a round neck frill patterned like golden honeycomb, and a curled tail, standing upright on its hind legs with a cheeky grin.
2: A lean frilled lizard runner with a larger golden honeycomb frill edged in orange, a row of small spines down its back and strong hind legs, sprinting on two legs.
3: A grand frilled drake lizard with a huge radiant honeycomb frill like a sun disc, golden spines down its back and a long powerful tail, rearing up proudly.

### lux (pollen fawn)
1: a young deer fawn with a warm golden-tan coat, white spots shaped like small flower petals, tiny budding antlers with one yellow blossom on each, and a fluffy white tail, prancing with its head held high.
2: A graceful young stag with branching antlers that carry yellow blossoms and green leaves, petal-shaped white spots and a ruff of cream fur on its chest, in mid-leap.
3: A majestic forest stag with great antlers like blossoming golden branches, a thick cream mane woven with flowers, softly glowing petal markings, standing tall and noble.

## Background (one picture)

Parameters: `{"prompt": <prompt>, "referenceImages": ["asset_oQzuVzEj7PDVkiPLkuxZ8u63"], "width": 1536, "height": 864, "quality": "high", "background": "opaque", "numOutputs": 1}`

bg/hollow prompt:
Use the reference image only as a style guide for linework and shading: thick dark outlines, flat cel shading with one shadow tone, sharp graphic highlights, rich bright colors. Background illustration for a monster-taming adventure game, wide landscape, no creatures, no characters, no insects, no text. A sunlit hollow deep in an old forest: giant mossy tree trunks on the left and right edges, huge golden honeycombs hanging from the branches and built into a hollow trunk, slow drips of amber honey, big bright flowers at the base of the trees, warm shafts of light from above. The whole center is a wide, flat, pale mossy clearing kept empty and uncluttered so game pieces can sit on it. Adventurous and warm, bold cartoon style, not pastel, not babyish.

## Meadow decorations (eight pictures)

Parameters: `{"prompt": <prompt>, "referenceImages": ["asset_oQzuVzEj7PDVkiPLkuxZ8u63"], "width": 1024, "height": 1024, "quality": "high", "background": "transparent", "numOutputs": 1}`

DECORATION prompt:
Use the reference image only as a style guide: match its thick dark outlines with varied line weight, flat cel shading with one shadow tone, sharp graphic highlights and rich bright colors exactly. Draw a single object, a decoration for the home meadow in a monster-taming adventure game: DESCRIPTION Three-quarter view from slightly above, centered, filling about 80% of the frame. No creatures, no characters, no text, no ground shadow, no background, nothing else in the image.

items/decor-lantern: a short wooden post with a glowing orange paper lantern hanging from it.
items/decor-fountain: a small round stone fountain with clear blue water splashing up in the middle.
items/decor-tent: a small adventure camp tent with teal and cream stripes and a tiny red flag on top.
items/decor-flowers: a patch of big bright wildflowers in pink, yellow and blue with green leaves.
items/decor-crystal: a cluster of tall glowing aqua crystals growing out of a grey rock.
items/decor-picnic: a red and white checkered picnic blanket with a woven basket full of purple berries on it.
items/decor-bush: a round green bush heavy with big purple berries.
items/decor-campfire: a campfire with a ring of stones, crossed logs and a bright friendly flame.

## Batch 4 (2026-11-14): six more decorations, three meadow looks

Same model and decoration prompt as above (12 CU each, 108 CU in all). New
DESCRIPTION lines: mushrooms (a ring of red toadstools), swing (log A-frame
with a red seat), slide (yellow chute, blue ladder), windmill (white tower,
red roof, cream sails), treehouse (cabin with a teal roof in a short tree),
balloon (red, yellow and teal hot-air balloon resting on the ground).

Meadow looks use the meadow background itself as the reference
(`asset_4XAMYrf6L2MPwPMJG6SLxV6d`), 1536 by 864, opaque: "Redraw exactly the
same scene, same composition ... at sunset / in autumn / on a bright snowy
winter day ... Keep the wide center clearing empty." Download with
`bash scripts/fetch-art-v4.sh`.
