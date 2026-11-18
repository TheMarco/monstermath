# MonsterMath

A monster-collecting math game for children who are behind in math, built for
a 10-year-old with dyslexia around her teacher's practice list: 2-digit addition
and subtraction with regrouping, the meaning of multiplication and division,
writing many different expressions for a number, what a fraction is, and
multiplying fractions. It follows Illustrative Mathematics grades 3 and 4.
Everything is spoken aloud and shown with pictures, so it asks for very little
reading.

It is a static site with no server and no accounts. Each player's progress
stays in their own browser.

## Run it

```
npm install
npm run dev      # opens the game in the browser
npm run build    # writes the static site to dist/
```

The pictures, animation clips and voice lines are in the repository. Use
Chrome: the game is laid out for a laptop screen, and Safari erases a site's
stored data after seven days without a visit.

`npm test` runs the math tests and simulated play sessions.

## Players and backups

Progress is stored in the browser (localStorage), one save per player. "Players"
on the title screen adds another child; with more than one player the game
opens on "Who is playing?".

The grown-up page (hold the "Grown-ups" button on the title screen) has the
player's name, "Save a backup file" and "Load a backup file". A backup holds
one player and can be loaded in any copy of the game, on any computer. Loading
never overwrites anyone: it fills the current player if they have not started,
and otherwise adds a new player.

To preview the evolution and hatching sequences without earning them, add
`#fx=hatch:tup` or `#fx=evolve:puff:2` to the game's address and reload.

## How the game maps to the math

Each monster stands for one skill. The Journal is the child's view of that map;
the grown-up page (hold the "Grown-ups" button) is the adult view, with error
patterns and a summary to copy for the teacher.

| Place | Monster | Skill |
|---|---|---|
| Tall Grass | Dab | Splitting a number into two parts (+) |
| Tall Grass | Moss | A number as a difference (−) |
| Tall Grass | Glim | Multiplication as equal rows (×) |
| Tall Grass | Fenn | Division as sharing (÷) |
| Berry Canyon | Nub | 2-digit addition, no regrouping |
| Berry Canyon | Plum | 2-digit addition with regrouping |
| Berry Canyon | Dusk | 2-digit subtraction, no regrouping |
| Berry Canyon | Chip | 2-digit subtraction with regrouping |
| Honey Hollow | Bix | What a fraction is: naming and building |
| Honey Hollow | Tam | Comparing fractions and equal fractions |
| Honey Hollow | Zim | A fraction times a whole number |
| Honey Hollow | Lux | A fraction times a fraction |

The three starters and the six egg monsters take any treat.

**First-day check.** After picking a starter the child answers six short staircases
(place value, addition, subtraction, multiplication, division, fractions). Each
climbs one level per right answer and stops after two misses. A pick-one level
asks two questions and needs both right, so it cannot be passed on a guess. The result sets
where each kind of problem starts and is shown on the grown-up page. The grown-up
page also says when a child is outside what the game can teach: below its
easiest sums, or passing a whole topic of the check.

**Where to start.** Without a choice the check asks about every topic. On the
grown-up page, before the child begins, a grown-up can pick the level the child
works at, from kindergarten to grade 5. That is the level of the work the child
can do, which for a child who is behind is below the grade the child is in. Six
levels share four checks: kindergarten and grade 1 ask about counting, numbers
to 100, adding and subtracting; grade 2 about numbers, adding, subtracting and
equal groups; grade 3 about every topic but counting; grades 4 and 5 about
place value, multiplying, dividing and fractions. Grade 1 starts the Berry
Patch games one level up, and grade 5 the Bakery games. When the chosen range
turns out too hard, the check goes on with the range below (counting for
grades 2 and 3, adding and subtracting for grades 4 and 5). For grades 4 and 5
the Bakery monsters come out without waiting for the other places, unless the
check had to step down. The child never sees a grade. To begin again from
another level, add a new player. The rules are in `src/start.ts` and
`src/intake.ts`.

**Early numbers (Berry Patch).** For a child who is not yet adding within 10
there are four ideas, each with its own ladder, all drawn with the canyon's
berries and crates: counting a set (5 in a row up to counting out 20), comparing
(two piles up to three-digit numbers), making ten (how many more make 5, fill a
crate, teen numbers as one crate and loose berries) and tens and ones (crates
counted by tens, reading and building two-digit numbers, ten more and ten less,
carts for hundreds). The problems are in `src/math/count.ts` and the screen in
`src/screens/early.ts`. Their monsters live in the Berry Patch on the
meadow: Fig (counting), Flam (comparing), Kelp (making ten) and Beary (tens and
ones), drawn from a child's own drawings. Flam and Kelp come out once counting
with Fig is secure, Beary once making ten with Kelp is. The grown-up page has
buttons that open each of the four games for a look; nothing is saved from
there.

**Bakery.** Work for grades 4 and 5, in four games with five levels each, all
drawn with buns on baking trays: a tray of ten buns is a ten, a rack is a
hundred, a loaf is cut into equal slices, and a tray of one hundred small
squares is one whole.

- Big trays (Belch): multiplying in parts with the area model. The tray is
  split into a tens part and a ones part; the child fills in each part, then
  the total. From 30 × 4 up to 23 × 45 with a four-part tray.
- Sharing fairly (Drift): buns shared equally into baskets. Leftovers within
  the times tables (17 ÷ 5 is 3, and 2 left), tens (120 ÷ 4), then two and
  three digits divided in parts (84 ÷ 4 as 80 ÷ 4 and 4 ÷ 4).
- Slices (Bug): adding and taking away fractions of a loaf. Same size slices
  first, then one slice size that fits in the other (1/2 + 1/4), then two
  sizes that both have to be cut again (1/2 + 1/3). "Cut to match" cuts the
  loaves into the same slices. An equal fraction in smaller numbers is also
  right.
- Crumbs (Cook): decimals. Reading tenths and hundredths from a tray, which of
  two decimals is more (0.5 or 0.45), and adding and taking away, also past 1.
  Decimals are kept as whole hundredths in the code, so no sum goes through
  floating point.

A miss gets one spoken line about the picture. A second miss, or "Show me",
makes the picture do the work: every part of the tray shows its product, the
buns go into the baskets, the slices are counted, the strips and squares are
named. After a third miss the answer is shown for the child to copy. The
grown-up page names the error patterns it saw, such as 20 × 4 = 8, giving the
leftover as the answer, adding the bottom numbers, or lining up 0.25 + 0.4 as
0.29. The problems are in `src/math/upper.ts`, the screen in
`src/screens/upper.ts` and the pictures in `src/ui/bakery.ts`.

Belch comes out once equal rows (Glim) and packing a crate (Plum) are secure,
Drift once Belch and sharing (Fenn) are, Bug once equal fractions (Tam) are,
and Cook once naming fractions (Bix) is. When the first-day check started at
the Bakery, only Drift waits, for Belch. The grown-up page has buttons that open each of the four
games at a chosen level; nothing is saved from there.

**Treats (Tall Grass).** A monster shows a number and the child builds expressions
that equal it. Hearts depend on the thinking: `n + 0` earns 1, a real addition
3, subtraction 4, multiplication or division 5, with a bonus for the first use
of an operation. Easy answers alone cannot fill the 10-heart meter, and each
monster also needs one treat of its favorite operation. A wrong try costs
nothing and shows what the expression made. "Help me" fills in one number and
the sign; the answer finished from it is true but earns no hearts. The game
then asks for one more of the same kind without the hint's number ("your
turn"), which earns its hearts plus 2. Two tries that are not her own let the
your-turn go quietly, and the round ends only once it is made or let go.

**Berry Canyon.** A crate holds ten berries. Packing a crate is carrying and
opening one is borrowing, and the written column sum updates along the way.
Answers are picked per place (crates, loose berries), which removes digit
transpositions from the answer step.

**Honey Hollow.** Fractions are honey bars cut into equal pieces. Bix asks the child
to read a fraction off a bar (gold pieces on top, all pieces on the bottom) or
to cut and fill a bar to make one. Tam shows two bars: which has more honey, or
fill one to match the other. Zim eats the same piece every day, so the child lays the
pieces down and counts them (the bottom number stays, the top number grows).
Lux wants a piece of a piece: a tray is cut one way, then the other, and the
small pieces are counted. The top number and the bottom number keep one colour
each everywhere. Each idea has three problem sizes and moves between them the
same way the canyon does.

**Teaching.** Each new skill starts with a short lesson from the buddy monster
(watch, do one together, do one alone). "Teach me" replays it. Two misses on one
problem bring step-by-step help, a third miss shows the answer for the child to
copy (which earns nothing), and two missed problems in a row replay the
lesson (at most once a day).

**Growing with the child (`src/ladder.ts`, `src/skill.ts`).** Every skill is a ladder.
The four kinds of berry trip have five or six rungs each, from sums within 10
to three-digit numbers; the four fraction ideas have four to six rungs, ending
with problems worked from the numbers before the picture. The first-day check
picks the rung of the first thing the child has not shown yet. From there:

- Problems come from the child's rung. About one problem in four is a stretch problem from
  the rung above, announced as a tricky one. Never two in a row, never right
  after a miss.
- The rung goes up when at least five of the last six problems were right the
  first time without help and the latest one was clean, or after two stretch
  problems solved cleanly. It goes down after two misses in a row at the
  child's own rung, and the lesson for that skill replays.
- A miss on a stretch problem never counts and brings the
  step-by-step help at once.
- Treats have one ladder per kind of treat, shared by every monster that asks
  for it: the starters and egg monsters share one, and Dab, Moss, Glim and Fenn
  have one each. It starts where the first-day check puts it (any-treat
  monsters follow addition: 27 + 5 done means numbers from 24 to 36), and the
  very first round is a size down as a warm-up. Each round is one mark: clean
  (at most two wrong tries, and every hint followed by her own your-turn) or
  rough (five or more wrong tries, or a your-turn let go). Three clean rounds
  out of four, or two clean stretch rounds, move up; two rough rounds in a row
  move down. About one round in four is a stretch round from the size above.
- The berry blocks start hidden only when recent trips of that kind were right
  the first time without help.
- A new monster comes out when the skills before it are secure: three different
  days with at least four problems, at least 70% right the first time. The dots
  under a waiting monster count those days. Fraction times a whole number also
  waits for multiplication; fraction times a fraction waits for that and for
  comparing fractions. The first-day check can show a skill is already secure:
  berry trips done at full two-digit size, counting once two-digit numbers
  read as tens and ones, and the crate of ten once she also adds across ten.
  One new monster can be befriended per day, one egg
  hatches per day, and a day gives six stars in all. Until then the place
  button leads to the friend to practise with.
- When the answer had to be shown twice in a row on a skill's easiest level,
  the game sends the child to the friend whose skill comes before it.
- A problem solved within three tries earns its reward, with or without help.
  One reached by trying more answers than that earns nothing and does not count
  toward a friendship, a star or the day's goals. The grown-up page has a
  switch that opens every monster, for when the class has moved on.
- Each day the friend whose skill has gone worst lately asks to play first.
- Reaching a level she has never reached before on any skill earns the friend
  she is playing with a bonus star at the end of the round, outside the daily
  star limit. Climbing back after a step down earns nothing extra.
- After a break of a week or more every rung steps down one, treats sizes
  included.

The grown-up page lists the rung on every ladder, what that rung covers, and
how the last problems went. The thresholds are constants at the top of
`src/ladder.ts` and `src/skill.ts`.

**Growing.** Friends earn stars from play rounds, at most 2 per day. They evolve
at 4 stars and again at 10, so growing needs return visits. "Today" sets three
small goals that take 10 to 15 minutes.

**Around the math.** Petting, feeding and ball deepen a bond. Berries earned by
playing buy charms (worn floating over a monster's head), meadow decorations
(drag them to place them; five stand in the meadow at once and the rest can be
swapped in from the shop) and whole meadow looks in the Berry Shop. Finishing
the day's goals gives a small gift. Each friend's card shows a medal for every
level its skill has reached. Friends in the meadow walk over to
each other to greet, chat and play tag, and react when one of them is petted or
fed. Six friends are out in the meadow at a time: the buddy, the two who
asked to play, the ones met or called out most recently, and the rest in
turns, a different group each day. "All friends" shows everyone, and tapping a
resting friend brings it out. "Rest" on a friend's card sends it in again
(the buddy and the two who asked to play stay out). A monster that has all its stars for the day dozes. When the day's goals
are done, "Good night" puts the meadow to sleep, which gives the session a
clear end.

**Sound.** Every instruction is a recorded voice line. Music plays under it,
at a low level, and drops further whenever a line is spoken, because music
that competes with speech makes spoken instructions harder to follow. The
problem screens use a slower, sparser track than the meadow. The note button on
the meadow turns the music off and the speaker button turns off voice and
effects. Tracks are in `public/music`, effects in `public/sound`; an effect
whose file is missing falls back to a synthesized tone (`src/audio.ts`).

## Layout

- `src/math` expression scoring, hints, early number problems, regrouping problems, fractions, Bakery problems, error patterns
- `src/screens` players, title, intro (first-day check), home, treats, early numbers, canyon, hollow, bakery (`upper.ts`), lesson, shop, journal, stickers, grown-ups
- `src/data/monsters.ts` the monsters, their skills and number pools
- `src/lessons.ts`, `src/tutor.ts` the taught lessons and when they play
- `src/rewards.ts`, `src/shop.ts` levels, eggs, bonds, stickers, charms, decorations
- `src/voice/lines.ts` every spoken line; `scripts/voice/export-lines.ts` exports the recording script
- `src/report.ts` numbers for the grown-up page and the teacher summary
- `scripts/*-spec.md` how the art and animation were generated
- `scripts/shrink-art.sh` makes pictures and clips smaller after new art is fetched (needs `cwebp` and `ffmpeg`)

## Privacy

The game collects no information. There is no account, no tracking, no cookies
and no ads, and the code makes no request to any other server: it only loads
its own pictures, clips and sounds. Names, progress and answers stay in the
browser's storage on the player's computer. `tests/privacy.test.ts` fails when
the code gains an outside address or a way to send data. The grown-up page says
the same in a "Privacy" card.

## Browsers

Use Chrome, Edge or Firefox on a computer. Progress is saved in the browser,
and those keep it. Safari, and every browser on an iPhone or iPad, erases a
site's saved data after seven days in which the browser was used but the game
was not opened, so a child who skips a week can lose everything. The game shows
a warning there, on the title screen and on the grown-up page. A backup file
(grown-up page) or adding the game to the Home Screen avoids the loss. The game
is tested in Chrome and in Safari's engine on a laptop; Firefox, tablets and
touch are untested.

## Share picture

`public/og.jpg` (1200 by 630) is the picture a chat app or social site shows when the game's link is shared. The tags that point to it are added when the game is built (`vite.config.ts`). Those sites need the full address of the picture: on Vercel it is found by itself; anywhere else, build with `SITE_URL=https://your-address npm run build`. The picture is made from `scripts/og/og.html` (open it at 1200 by 630 and take a screenshot).

## Credits and license

Created by Marco van Hylckama Vlieg, <https://ai-created.com/>. If the game
helps your child, you can support its making at <https://ko-fi.com/aianddesign>.

The code is under the MIT license, see `LICENSE`.
