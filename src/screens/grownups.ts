import { ALL_SPECIES, SPECIES, UPPER_ORDER } from '../data/monsters';
import { GRADE_POINTS, gradeOf, START_POINTS } from '../intake';
import { COUNT_ERROR_TEXT, COUNT_KINDS, type CountKind } from '../math/count';
import { OP_SYMBOL, type Kind } from '../math/expr';
import { FRAC_ERROR_TEXT } from '../math/fractions';
import { ERROR_TEXT } from '../math/regroup';
import { UPPER_ERROR_TEXT, UPPER_KINDS, type UpperKind } from '../math/upper';
import { COUNT_TEXT, countStats, UPPER_TEXT, upperStats, daysAgo, exprStats, FRAC_TEXT, fracStats, levelRows, intakeCeiling, intakeRows, intakeWarning, tutoringRows, walkthroughCount, KIND_TEXT, monsterStatus, pct, teacherSummary, tripStats, TYPE_TEXT } from '../report';
import { adoptBackup, buddyOf, currentPlayer, daysPlayed, friends, NAME_MAX, players, readBackup, removePlayer, renamePlayer } from '../state';
import { button, monsterImg, type Screen } from '../ui/common';
import { h, replace } from '../ui/dom';

/** Progress page for the parent: calm, readable, no speech. */
export const grownupsScreen: Screen = (app, params) => {
  const { save } = app;
  const player = currentPlayer();
  const who = player.name;
  const days = daysPlayed(save);
  const all = exprStats(save);
  const week = exprStats(save, daysAgo(6));
  const trips = tripStats(save);
  const note = h('span', { class: 'gu-note' }, typeof params.note === 'string' ? params.note : '');

  const row = (...cells: Array<string | number>): HTMLElement => h('tr', null, cells.map((c) => h('td', null, String(c))));
  const head = (...cells: string[]): HTMLElement => h('tr', null, cells.map((c) => h('th', null, c)));
  const table = (...rows: Array<HTMLElement | HTMLElement[]>): HTMLElement => h('div', { class: 'gu-table' }, h('table', {}, rows.flat()));
  const card = (title: string, ...kids: unknown[]): HTMLElement => h('section', { class: 'gu-card' }, h('h2', null, title), kids as HTMLElement[]);
  const tile = (value: string | number, label: string): HTMLElement => h('div', { class: 'gu-tile' }, h('b', null, String(value)), h('span', null, label));

  /** A monster's name with its picture, so the tables match what the child sees. */
  const face = (name: string): HTMLElement => {
    const id = ALL_SPECIES.find((x) => SPECIES[x].name === name);
    return h('span', { class: 'gu-face' }, id ? monsterImg(id, save.monsters[id]?.stage ?? 1, 30) : null, name);
  };
  /** "2 of 5" as filled steps, with the words beside them. */
  const steps = (level: string): HTMLElement => {
    const m = /^(\d+) of (\d+)$/.exec(level);
    if (!m) return h('span', { class: 'gu-muted' }, level);
    const at = Number(m[1]);
    const of = Number(m[2]);
    return h('span', { class: 'gu-steps' }, h('span', { class: 'gu-steps-bar', 'aria-hidden': 'true' }, Array.from({ length: of }, (_, i) => h('i', { class: i < at ? 'on' : '' }))), level);
  };
  const cells = (...kids: Array<HTMLElement | string | number>): HTMLElement => h('tr', null, kids.map((c) => h('td', null, typeof c === 'object' ? c : String(c))));

  const copy = (): void => {
    const text = teacherSummary(save);
    const done = (): void => replace(note, 'Copied.');
    const fail = (): void => replace(note, 'Could not copy. Use the download instead.');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  };

  const download = (): void => {
    app.commit();
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const slug = who.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';
    const link = h('a', { href: url, download: `monstermath-${slug}.json` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const loadText = (text: string): void => {
    const backup = readBackup(text);
    if (!backup) {
      replace(note, 'That file is not a MonsterMath backup.');
      return;
    }
    adoptBackup(backup);
    app.reload();
    app.go('grownups', { note: `Loaded the backup as ${currentPlayer().name}.` });
  };
  const picker = h('input', { type: 'file', accept: '.json,application/json', class: 'gu-file', 'aria-label': 'Backup file' });
  picker.addEventListener('change', () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      replace(note, 'That file is too large to be a MonsterMath backup.');
      return;
    }
    file.text().then(loadText, () => replace(note, 'Could not read that file.'));
  });

  const nameInput = h('input', { class: 'gu-name', type: 'text', maxlength: String(NAME_MAX), value: who, 'aria-label': 'Player name', autocomplete: 'off', spellcheck: 'false' });
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  const rename = (): void => {
    renamePlayer(player.id, nameInput.value);
    app.commit();
    app.go('grownups');
  };

  const twice = (label: string, warning: string, act: () => void): HTMLButtonElement => {
    let armed = false;
    const btn: HTMLButtonElement = button(label, () => {
      if (!armed) {
        armed = true;
        replace(btn, warning);
        btn.classList.add('btn-danger');
        return;
      }
      act();
    }, 'btn-small');
    return btn;
  };
  const resetBtn = twice(`Reset ${who}'s progress`, `Click again to erase ${who}'s progress`, () => app.reset());
  const removeBtn =
    players().length > 1
      ? twice(`Remove ${who}`, `Click again to remove ${who} and erase their progress`, () => {
          removePlayer(player.id);
          app.reload();
          app.go('players');
        })
      : null;

  // The start point can only be chosen before the first question of the check.
  const startLocked = save.introDone || (save.intakeAt ?? 0) > 0 || save.placement.length > 0;
  const startNow = save.startAt ?? 'auto';
  const gradeNow = gradeOf(save.startAt, save.startGrade);
  const startSelect = h(
    'select',
    {
      class: 'gu-select gu-start',
      disabled: startLocked,
      onchange: () => {
        const picked = GRADE_POINTS.find((g) => `g${g.grade}` === startSelect.value);
        if (picked) {
          save.startAt = picked.start;
          save.startGrade = picked.grade;
        } else {
          delete save.startAt;
          delete save.startGrade;
        }
        app.commit();
        app.go('grownups');
      },
    },
    [
      h('option', { value: 'auto', selected: gradeNow === null }, 'Not sure, let the game find out'),
      ...GRADE_POINTS.map((g) => h('option', { value: `g${g.grade}`, selected: g.grade === gradeNow }, g.label)),
    ],
  );

  const tryLevel = h('select', { class: 'gu-select' }, [1, 2, 3, 4, 5, 6].map((n) => h('option', { value: String(n - 1) }, String(n))));
  const TRY_LABEL: Record<CountKind, string> = { count: 'Counting', more: 'Comparing', ten: 'Making ten', place: 'Tens and ones' };

  const bakeLevel = h('select', { class: 'gu-select' }, [1, 2, 3, 4, 5].map((n) => h('option', { value: String(n - 1) }, String(n))));
  const BAKE_LABEL: Record<UpperKind, string> = { mult: 'Big trays', div: 'Sharing fairly', fadd: 'Slices', dec: 'Crumbs' };

  const openBtn = button(save.openAll ? 'Monsters: all open (click to follow progress again)' : 'Open all monsters now', () => {
    save.openAll = !save.openAll;
    app.commit();
    app.go('grownups');
  }, 'btn-small');

  const recentExpr = save.exprLog.slice(-15).reverse();
  const recentTrips = save.tripLog.slice(-12).reverse();
  const easyNote =
    all.easyShare === null
      ? 'No number sentences yet.'
      : `Easy sentences (+0, +1, ×1 and the like) are ${Math.round(all.easyShare * 100)}% of all correct ones, and ${
          week.easyShare === null ? 'n/a' : `${Math.round(week.easyShare * 100)}%`
        } over the last 7 days. Leaning on easy sentences is a common way to avoid harder thinking; the share should fall over time.`;

  const el = h(
    'div',
    { class: 'screen grownups-screen' },
    h(
      'div',
      { class: 'gu-scroll' },
      h(
        'div',
        { class: 'gu-top' },
        h('h1', null, `For grown-ups: ${who}`),
        button('Back to the game', () => app.go(save.introDone ? 'home' : 'title'), 'btn-small gu-back'),
      ),
      h(
        'div',
        { class: 'gu-page' },
      h(
        'div',
        { class: 'gu-tiles' },
        tile(days.length, days.length === 1 ? 'day played' : 'days played'),
        tile(days.length ? days[days.length - 1]! : 'not yet', 'last played'),
        tile(`${friends(save).length} of ${ALL_SPECIES.length}`, 'monsters befriended'),
        tile(week.correct, 'number sentences right, last 7 days'),
      ),
      h(
        'p',
        { class: 'gu-lead' },
        days.length === 0
          ? 'No play recorded yet.'
          : `Played on ${days.length} ${days.length === 1 ? 'day' : 'days'}. First ${days[0]}, latest ${days[days.length - 1]}. A session of 10 to 15 minutes a day is the target; the three "Today" goals take about that long.`,
      ),

      card(
        `Where ${who} is now`,
      h(
        'p',
        null,
        'Every skill is a ladder. Problems come from the current level, and about one in four comes from the level above. The level goes up when at least five of the last six problems were right the first time without help, and down after two misses in a row. A miss on a problem from the level above never counts.',
      ),
      table(
        head('Skill', 'Monster', 'Level', 'Working on', 'Lately'),
        levelRows(save).map((x) => cells(x.skill, face(x.monster), steps(x.level), x.working, x.recent)),
      ),
      h(
        'p',
        null,
        'A new monster comes out when the skills before it are secure: three different days with at least four problems, most of them right the first time. The dots under a waiting monster show those days. One new monster can be befriended per day, one egg hatches per day, and a day gives six stars in all. If the class has moved on and a topic is needed now, open everything: ',
        openBtn,
      ),
      ),

      card(
        'Number sentences (make the number)',
      h('p', null, easyNote),
      table(
        head('Kind of sentence', 'All time', 'Last 7 days'),
        (Object.keys(KIND_TEXT) as Kind[]).map((k) => row(KIND_TEXT[k], all.byKind[k], week.byKind[k])),
        row('Tries that did not equal the number', all.attempts - all.correct, week.attempts - week.correct),
        row('Tries after asking for help', all.hinted, week.hinted),
      ),
      recentExpr.length
        ? h(
            'p',
            { class: 'gu-recent' },
            'Latest tries: ',
            recentExpr.map((e) =>
              h('span', { class: e.correct ? 'ok' : 'miss' }, `${e.a} ${OP_SYMBOL[e.op]} ${e.b} ${e.correct ? '=' : '≠'} ${e.target}`),
            ),
          )
        : null,
      ),

      card(
        'Berry Canyon (2-digit addition and subtraction)',
      table(
        head('Problem type', 'Problems', 'Right first try', 'Used the blocks', 'Error patterns seen'),
        trips.map((s) =>
          row(
            TYPE_TEXT[s.type],
            s.trips,
            `${s.firstTry} (${pct(s.firstTry, s.trips)})`,
            s.withBlocks,
            s.errors.length ? s.errors.map((e) => `${e.count}x ${ERROR_TEXT[e.pattern]}`).join('; ') : 'none',
          ),
        ),
      ),
      recentTrips.length
        ? h(
            'p',
            { class: 'gu-recent' },
            'Latest problems: ',
            recentTrips.map((t) => {
              const sign = t.type === 'add' || t.type === 'addR' ? '+' : '−';
              const wrong = t.answers.slice(0, -1);
              return h(
                'span',
                { class: t.firstTry ? 'ok' : 'miss' },
                `${t.a} ${sign} ${t.b}${wrong.length ? ` (first answered ${wrong.join(', ')})` : ''}`,
              );
            }),
          )
        : null,
      ),

      (save.countLog ?? []).length
        ? card(
            'Early numbers (counting, comparing, ten, tens and ones)',
            table(
              head('Idea', 'Level', 'Working on', 'Problems', 'Right first try', 'Needed counting help', 'Error patterns seen'),
              countStats(save)
                .filter((s) => s.problems > 0)
                .map((s) =>
                  row(
                    COUNT_TEXT[s.kind],
                    s.level,
                    s.working,
                    s.problems,
                    `${s.firstTry} (${pct(s.firstTry, s.problems)})`,
                    s.helped,
                    s.errors.length ? s.errors.map((e) => `${e.count}x ${COUNT_ERROR_TEXT[e.pattern]}`).join('; ') : 'none',
                  ),
                ),
            ),
            h(
              'p',
              { class: 'gu-recent' },
              'Latest problems: ',
              (save.countLog ?? [])
                .slice(-12)
                .reverse()
                .map((c) => h('span', { class: c.firstTry ? 'ok' : 'miss' }, `${c.text}${c.answers.length > 1 ? ` (first answered ${c.answers.slice(0, -1).join(', ')})` : ''}`)),
            ),
          )
        : null,

      (save.upperLog ?? []).length
        ? card(
            'Bakery (multiplying and dividing in parts, fractions, decimals)',
            table(
              head('Idea', 'Level', 'Working on', 'Problems', 'Right first try', 'Needed picture help', 'Error patterns seen'),
              upperStats(save)
                .filter((s) => s.problems > 0)
                .map((s) =>
                  row(
                    UPPER_TEXT[s.kind],
                    s.level,
                    s.working,
                    s.problems,
                    `${s.firstTry} (${pct(s.firstTry, s.problems)})`,
                    s.helped,
                    s.errors.length ? s.errors.map((e) => `${e.count}x ${UPPER_ERROR_TEXT[e.pattern]}`).join('; ') : 'none',
                  ),
                ),
            ),
            h(
              'p',
              { class: 'gu-recent' },
              'Latest problems: ',
              (save.upperLog ?? [])
                .slice(-12)
                .reverse()
                .map((u) => h('span', { class: u.firstTry ? 'ok' : 'miss' }, `${u.text}${u.answers.length > 1 ? ` (first answered ${u.answers.slice(0, -1).join('; ')})` : ''}`)),
            ),
          )
        : null,

      card(
        'Honey Hollow (fractions)',
      table(
        head('Idea', 'Problems', 'Right first try', 'Needed counting help', 'Error patterns seen'),
        fracStats(save).map((s) =>
          row(
            FRAC_TEXT[s.kind],
            s.problems,
            `${s.firstTry} (${pct(s.firstTry, s.problems)})`,
            s.helped,
            s.errors.length ? s.errors.map((e) => `${e.count}x ${FRAC_ERROR_TEXT[e.pattern]}`).join('; ') : 'none',
          ),
        ),
      ),
      (save.fracLog ?? []).length
        ? h(
            'p',
            { class: 'gu-recent' },
            'Latest problems: ',
            (save.fracLog ?? [])
              .slice(-12)
              .reverse()
              .map((f) => h('span', { class: f.firstTry ? 'ok' : 'miss' }, `${f.text}${f.answers.length > 1 ? ` (first answered ${f.answers.slice(0, -1).join(', ')})` : ''}`)),
          )
        : null,
      ),

      card(
        'Teaching',
      h(
        'p',
        null,
        `Each lesson plays once before its skill, again whenever "Teach me" is pressed, and by itself (at most once a day) after two missed problems in a row. Step-by-step help on a berry trip was used ${walkthroughCount(save)} times.`,
      ),
      table( head('Lesson', 'What it teaches', 'Times seen'), tutoringRows(save).map((x) => row(x.lesson, x.teaches, x.seen))),
      ),

      card(
        'Skills by monster',
      table(
        head('Monster', 'Skill', 'Status'),
        ALL_SPECIES.map((id) => cells(face(SPECIES[id].name), SPECIES[id].skill, monsterStatus(save, id))),
      ),
      ),

      save.placement.length
        ? card(
            'First-day check',
            intakeRows(save).length
              ? table(
                  head('Strand', 'Highest level passed', 'Where it stopped'),
                  intakeRows(save).map((x) => row(x.strand, x.reached, x.next)),
                )
              : null,
            intakeWarning(save) ? h('p', { class: 'gu-flag' }, intakeWarning(save)) : null,
            intakeCeiling(save) ? h('p', { class: 'gu-flag' }, intakeCeiling(save)) : null,
            h('p', null, 'Every question asked:'),
            table(
              head('Question', 'Answer given', 'Expected'),
              save.placement.map((p) => row(p.prompt, p.unsure ? 'not sure' : (p.given ?? ''), p.correct ? 'correct' : p.expected)),
            ),
          )
        : null,

      card(
        'Where to start',
        h(
          'p',
          { class: 'gu-small' },
          `The first-day check finds where each kind of problem should start for ${who}. If you already know roughly the level ${who} works at, choose it here before ${who} begins, and the check only asks about that range. Choose the level of the work ${who} can do, which may be below the grade ${who} is in. When the first questions turn out too hard, the check adds easier ones by itself. The child never sees a grade.`,
        ),
        h('div', { class: 'gu-actions' }, h('label', { class: 'gu-label' }, 'Works at about the level of ', startSelect)),
        h(
          'p',
          { class: 'gu-small' },
          startLocked
            ? `The check has started for ${who}, so this is fixed. To begin from another point, add a new player with "Players" on the title screen.`
            : (START_POINTS.find((s) => s.id === startNow)?.asks ?? ''),
        ),
      ),

      card(
        'Early number games',
        h(
          'p',
          { class: 'gu-small' },
          'For children who are not yet adding within 10: counting, comparing, making ten, and tens and ones. These are the Berry Patch games. The buttons open each one for a look, starting at the level chosen. Nothing is saved and nothing is earned.',
        ),
        h(
          'div',
          { class: 'gu-actions' },
          h('label', { class: 'gu-label' }, 'Start at level ', tryLevel),
          COUNT_KINDS.map((kind) =>
            button(TRY_LABEL[kind], () => app.go('early', { id: save.starter ? buddyOf(save) : 'puff', kind, practice: true, rung: Number(tryLevel.value) }), 'btn-small'),
          ),
        ),
      ),

      card(
        'Bakery games',
        h(
          'p',
          { class: 'gu-small' },
          'For children who already multiply and divide with small numbers: big trays (multiplying in parts), sharing fairly (dividing in parts), slices (adding and taking away fractions) and crumbs (decimals). The buttons open each one for a look, starting at the level chosen. Nothing is saved and nothing is earned.',
        ),
        h(
          'div',
          { class: 'gu-actions' },
          h('label', { class: 'gu-label' }, 'Start at level ', bakeLevel),
          UPPER_KINDS.map((kind, i) => button(BAKE_LABEL[kind], () => app.go('upper', { id: UPPER_ORDER[i] ?? 'belch', kind, practice: true, rung: Number(bakeLevel.value) }), 'btn-small')),
        ),
      ),

      card(
        'Player',
      h('div', { class: 'gu-actions' }, h('label', { class: 'gu-label' }, 'Name ', nameInput), button('Save name', rename, 'btn-small'), h('span', { class: 'gu-danger' }, resetBtn, removeBtn)),
      h('p', { class: 'gu-small' }, 'Add another child with "Players" on the title screen. Each player has separate progress.'),
      ),

      card(
        'Share and back up',
      h(
        'div',
        { class: 'gu-actions' },
        button('Copy summary for the teacher', copy, 'btn-small'),
        button('Save a backup file', download, 'btn-small'),
        button('Load a backup file', () => picker.click(), 'btn-small'),
        picker,
        note,
      ),
      h(
        'p',
        { class: 'gu-small' },
        'Progress is stored in this browser on this computer only, and clearing the browser data erases it. A backup file holds one player. Loading one never overwrites anyone: it fills the current player if they have not started yet, and otherwise adds a new player. To move to another computer, save a backup here and load it on this page there.',
      ),
      ),
      ),
    ),
  );

  return { el };
};
