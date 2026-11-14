# MonsterMath

A monster-collecting math game for one child, built around her teacher's
practice list: 2-digit addition and subtraction with regrouping, the meaning of
multiplication and division, writing many different expressions for a number,
what a fraction is, and multiplying fractions.

## Run it

```
npm install
bash scripts/fetch-art-v2.sh   # monster pictures, backgrounds, decorations
bash scripts/fetch-anim.sh     # animated monster clips
bash scripts/fetch-voice.sh    # recorded voice lines
npm run dev                    # opens the game in the browser
```

The three fetch scripts download from signed links in `scripts/`. The links
expire about a week after they were made (the latest batch on 2026-11-13), so
run the scripts before then. They skip anything already downloaded, and the
downloaded files stay in `art-src-v2/`, `art-src/voice/` and `public/`.

`npm test` runs the math tests and simulated play sessions.

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

**First-day check.** After picking a starter she answers six short staircases
(place value, addition, subtraction, multiplication, division, fractions). Each
climbs one level per right answer and stops after two misses. The result sets
where each kind of problem starts and is shown on the grown-up page.

**Treats (Tall Grass).** A monster shows a number and she builds expressions
that equal it. Hearts depend on the thinking: `n + 0` earns 1, a real addition
3, subtraction 4, multiplication or division 5, with a bonus for the first use
of an operation. Easy answers alone cannot fill the 10-heart meter, and each
monster also needs one treat of its favorite operation. A wrong try costs
nothing and shows what the expression made.

**Berry Canyon.** A crate holds ten berries. Packing a crate is carrying and
opening one is borrowing, and the written column sum updates as she does it.
Answers are picked per place (crates, loose berries), which removes digit
transpositions from the answer step.

**Honey Hollow.** Fractions are honey bars cut into equal pieces. Bix asks her
to read a fraction off a bar (gold pieces on top, all pieces on the bottom) or
to cut and fill a bar to make one. Tam shows two bars: which has more honey, or
fill one to match the other. Zim eats the same piece every day, so she lays the
pieces down and counts them (the bottom number stays, the top number grows).
Lux wants a piece of a piece: a tray is cut one way, then the other, and she
counts the small pieces. The top number and the bottom number keep one colour
each everywhere. Each idea has three problem sizes and moves between them the
same way the canyon does.

**Teaching.** Each new skill starts with a short lesson from her buddy monster
(watch, do one together, do one alone). "Teach me" replays it. Two misses on one
problem bring step-by-step help, and two missed problems in a row replay the
lesson (at most once a day).

**Growing with her (`src/ladder.ts`, `src/skill.ts`).** Every skill is a ladder.
The four kinds of berry trip have five or six rungs each, from sums within 10
to three-digit numbers; the four fraction ideas have four to six rungs, ending
with problems worked from the numbers before the picture. The first-day check
puts her on the rung of the first thing she has not shown yet. From there:

- She works at her rung. About one problem in four is a stretch problem from
  the rung above, announced as a tricky one. Never two in a row, never right
  after a miss.
- She moves up when at least five of her last six problems were right the first
  time without help and the latest one was clean, or when she solves two
  stretch problems cleanly. She moves down after two misses in a row at her own
  rung, and the lesson for that skill replays.
- A miss on a stretch problem never counts against her and brings the
  step-by-step help at once.
- Treat numbers move up after two clean rounds and down after one rough round
  (five or more wrong tries, or two hints).
- The berry blocks start hidden only when recent trips of that kind were right
  the first time without help.
- A new monster comes out when the skill before it is secure (six or more
  problems, most recent ones right the first time). Until then the place button
  takes her to the friend she should practise with. The grown-up page has a
  switch that opens every monster, for when the class has moved on.
- Each day the friend whose skill has gone worst lately asks to play first.
- After a break of a week or more every rung steps down one.

The grown-up page lists her rung on every ladder, what that rung covers, and
how her last problems went. The thresholds are constants at the top of
`src/ladder.ts` and `src/skill.ts`.

**Growing.** Friends earn stars from play rounds, at most 2 per day. They evolve
at 4 stars and again at 10, so growing needs return visits. "Today" sets three
small goals that take 10 to 15 minutes.

**Around the math.** Petting, feeding and ball deepen a bond. Berries earned by
playing buy charms (worn floating over a monster's head) and meadow decorations
(drag them to place them) in the Berry Shop. Friends in the meadow walk over to
each other to greet, chat and play tag, and react when one of them is petted or
fed. A monster that has all its stars for the day dozes. When the day's goals
are done, "Good night" puts the meadow to sleep, which gives the session a
clear end.

Progress is stored in the browser (localStorage) on this computer.

## Layout

- `src/math` expression scoring, hints, regrouping problems, fractions, error patterns
- `src/screens` title, intro (first-day check), home, treats, canyon, hollow, lesson, shop, journal, stickers, grown-ups
- `src/data/monsters.ts` the monsters, their skills and number pools
- `src/lessons.ts`, `src/tutor.ts` the taught lessons and when they play
- `src/rewards.ts`, `src/shop.ts` levels, eggs, bonds, stickers, charms, decorations
- `src/voice/lines.ts` every spoken line; `scripts/voice/export-lines.ts` exports the recording script
- `src/report.ts` numbers for the grown-up page and the teacher summary
- `scripts/*-spec.md` how the art and animation were generated
