# MonsterMath art, version 2 (bold cartoon): generation spec

Scenario ids: team_id and project_id are both `team_LSUCdfXNhXUPNbW4N2u1APQV`.
Model: `model_openai-gpt-image-2-5-sunburst`. Parameters for every run:
`{"prompt": <see below>, "referenceImages": [<asset id>], "width": 1024, "height": 1024, "quality": "high", "background": "transparent", "numOutputs": 1}`

## Prompt templates (use exactly, filling in the description)

STAGE 2 prompt:
The reference image shows the first stage of an original creature from a monster-taming adventure game. Draw the second stage of the same creature, grown stronger: the same species, the same colors and markings, and exactly the same art style, thick outline and flat cel shading as the reference. DESCRIPTION Cool and athletic, still friendly. One creature, full body, dynamic three-quarter view, centered, nothing else in the image, no text, no ground shadow, no background.

STAGE 3 prompt:
The reference image shows the first stage of an original creature from a monster-taming adventure game. Draw the third and final stage of the same creature, fully grown and powerful: the same species, the same colors and markings, and exactly the same art style, thick outline and flat cel shading as the reference. DESCRIPTION Awe-inspiring and heroic, a protector, not evil. One creature, full body, dynamic three-quarter view, centered, nothing else in the image, no text, no ground shadow, no background.

For both, `referenceImages` is the monster's own STAGE 1 asset id.

## Monsters: id | stage 1 asset | stage 2 description | stage 3 description

pim | asset_QkMEecBQ2NiKB2vus7KiaNWV | A lean forest hare with longer ears, larger red spotted mushroom caps on its shoulders and back that glow faintly, strong hind legs, in mid-leap. | A majestic forest jackalope: a large hare with branching antlers covered in glowing shelf mushrooms, a mane of moss, a big red mushroom-cap mantle over its shoulders, standing tall and noble.
bop | asset_32uVWvf8fvH34dZj2mrE5CS7 | A sleek river otter with wave-shaped fins on its forearms and back, a longer curling wave tail, and a ball of water held between its paws. | A powerful sea-serpent otter with a long strong body, a crest of crashing wave along its spine, flowing fin whiskers, coiled around a swirl of water.
dab | asset_YvkKJc7RUsbKUQxYJZpyxJfe | A graceful young water bird, taller with a longer neck, a collar of lily pads, an opened pink lotus on its head and teal-striped wings. | A majestic lotus crane with broad wings whose feathers end in lily pads, a crown of pink lotus petals, long elegant tail plumes, wings spread wide.
glim | asset_EYjpdWxPbYdrmvnftRQDCT4F | A lantern beetle with larger patterned wings, a small curved horn, and a brighter glowing lantern tail. | A majestic star beetle with a great curved horn, an armored golden shell with violet stripes, four broad glowing wings like stained glass, and a lantern tail blazing like a small sun.
fenn | asset_BZfW5kJPyq2AymDqtDxfqc6h | A lean young fox with two curled fern tails, leaf markings on its legs and a ruff of leaves around its neck. | An elegant forest fox spirit with five large fern-frond tails fanned out behind it, a mane of leaves and small white flowers, and twig sprouts like small antlers behind its ears, poised and wise.
nub | asset_cQuRbhXViAu9wbyP1wfRbMqw | A strong boulder hound with heavier stone plates, a glowing amber crystal vein along its back, and a bushier sprout tail with several leaves. | A mighty stone wolf with amber crystal spires rising from its back, mossy stone armor, and a tail like a small leafy branch, head raised in a proud howl.
plum | asset_NKgx3vc2kkchm2pbWx8fjwVN | A swift orchard hawk with longer pointed wings, a blossom crest, and tail feathers ending in white plum blossoms. | A majestic great blossom bird with sweeping purple wings, a long flowing tail of blossoming branches, and petals swirling around it.
dusk | asset_cLhYWFhhNeUSNSnKVC8teiXN | A larger bat with crescent-moon markings on its wings, longer ears and a fluffier cream ruff. | A majestic night-sky bat with huge wings patterned with stars and a crescent moon, a long tail, and a flowing cream mane, soaring.
chip | asset_Lffgr8XKfopDx3ywA23fnNeP | A gliding crystal squirrel with crystal-edged gliding membranes between its limbs, a larger crystal tail with several points, and crystal bracers on its forearms. | A crystal-armored guardian, long-bodied like a marten, with a huge fan of aqua crystal spikes for a tail, crystal shoulder plates and a gem crown, standing heroic.
tup | asset_aABLyYnkPg8WUBeJEpNPMYRe | A lean flame lynx with taller tufted flaming ears, bold flame stripes and a longer blazing tail. | A majestic sun lion with a roaring mane of fire, a flame-tipped tail and golden armor-like markings, in a proud stance.
jam | asset_GsQGZYq14zH1dt2i6GAhePEE | A bigger bear with bramble vines and berries wrapped around its shoulders and a thicker leaf collar. | A towering berry bear guardian with bramble armor on its forearms and back, and a crown of leaves and white strawberry flowers, friendly but mighty.
mint | asset_ofWnYSa8i4WsogABLJtAJDPd | A young drake with larger leaf wings, vine markings, small flowers along its spine and longer horns. | A majestic forest dragon with huge leaf wings, branch-like antler horns, and a tail ending in a cluster of leaves and blossoms, rearing proudly.
pom | asset_K1sUJgKvSHY2R7qkHoCECe8f | A taller penguin with a bigger ice crest, ice-blade flippers and a scarf of frost around its neck. | A tall regal frost penguin with a crown of ice crystals, long ice-blade flippers, and a cape of frost in green and violet aurora colors flowing from its shoulders.
nox | asset_F1GPoZmqi9JzE8p5HTKq9tDE | A larger owl with constellation lines connecting the stars on its wings, longer ear tufts and a crescent mark on its brow. | A majestic cosmic great owl with vast wings holding a swirling galaxy pattern, a halo of small stars, and long flowing tail feathers, serene and powerful.
fizz | asset_Hpo7XRvyHZ5sXFw4d6SenAq1 | A larger axolotl with branching coral-like gills, a longer finned tail and small coral growths on its back. | A long powerful reef axolotl with a crown of branching coral gills, coral armor plates on its back and a great fan tail, surrounded by a ring of bubbles.

## Moss (stage 1 must be made first)

Moss stage 1 prompt (referenceImages = ["asset_oQzuVzEj7PDVkiPLkuxZ8u63"]):
Use the reference image only as a style guide: match its thick dark outlines with varied line weight, flat cel shading with one shadow tone, sharp graphic highlights, rich bright colors and eye style exactly. Draw a different original creature in that same style, for a monster-taming adventure game aimed at ten to twelve year olds. One creature, full body, dynamic three-quarter view, centered, filling about 80% of the frame, nothing else in the image. First stage of three: young, charming and lively with attitude, clearly a spirited young animal, not a baby, not chibi. The creature: a young armadillo with sandy-tan skin, a long pointed snout, large upright ears, and a banded shell covered in soft green moss with small blue bellflowers growing on it, strong little claws, trotting forward with a determined grin. No text, no ground shadow, no background.

Then moss stage 2 and 3 use the new moss stage 1 asset as reference:
moss | (new asset) | A sturdy armadillo with a thicker banded shell overgrown with moss, small ferns and blue bellflowers, and strong digging claws. | A great armored guardian armadillo whose shell is a mossy hill with a small flowering tree and stones growing on it, heavy plated legs, in a calm powerful stance.

## Already made (only need download links)

puff stage 1 asset_oQzuVzEj7PDVkiPLkuxZ8u63, stage 2 asset_VXLuHhkxLs4SUhR4r6g4cKbE, stage 3 asset_Wso9Ya6CZSVcm6t9rbDUqQqC
