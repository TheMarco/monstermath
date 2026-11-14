import { ALL_SPECIES, SPECIES } from '../data/monsters';
import { OP_SYMBOL, type Kind } from '../math/expr';
import { FRAC_ERROR_TEXT } from '../math/fractions';
import { ERROR_TEXT } from '../math/regroup';
import { daysAgo, exprStats, FRAC_TEXT, fracStats, levelRows, intakeRows, intakeWarning, tutoringRows, walkthroughCount, KIND_TEXT, monsterStatus, pct, teacherSummary, tripStats, TYPE_TEXT } from '../report';
import { daysPlayed } from '../state';
import { button, type Screen } from '../ui/common';
import { h, replace } from '../ui/dom';

/** Plain progress page for the parent. No game styling, no speech. */
export const grownupsScreen: Screen = (app) => {
  const { save } = app;
  const days = daysPlayed(save);
  const all = exprStats(save);
  const week = exprStats(save, daysAgo(6));
  const trips = tripStats(save);
  const note = h('span', { class: 'gu-note' });

  const row = (...cells: Array<string | number>): HTMLElement => h('tr', null, cells.map((c) => h('td', null, String(c))));
  const head = (...cells: string[]): HTMLElement => h('tr', null, cells.map((c) => h('th', null, c)));

  const copy = (): void => {
    const text = teacherSummary(save);
    const done = (): void => replace(note, 'Copied.');
    const fail = (): void => replace(note, 'Could not copy. Use the download instead.');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  };

  const download = (): void => {
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: 'monstermath-progress.json' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  let armed = false;
  const resetBtn = button('Reset all progress', () => {
    if (!armed) {
      armed = true;
      replace(resetBtn, 'Click again to erase everything');
      resetBtn.classList.add('btn-danger');
      return;
    }
    app.reset();
  }, 'btn-small');

  const openBtn = button(save.openAll ? 'Monsters: all open (click to follow her progress again)' : 'Open all monsters now', () => {
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
        } over the last 7 days. This is the habit her teacher described; the share should fall over time.`;

  const el = h(
    'div',
    { class: 'screen grownups-screen' },
    h(
      'div',
      { class: 'gu-scroll' },
      h(
        'div',
        { class: 'gu-top' },
        h('h1', null, 'For grown-ups'),
        button('Back to the game', () => app.go(save.introDone ? 'home' : 'title'), 'btn-small'),
      ),
      h(
        'p',
        { class: 'gu-lead' },
        days.length === 0
          ? 'No play recorded yet.'
          : `Played on ${days.length} ${days.length === 1 ? 'day' : 'days'}. First ${days[0]}, latest ${days[days.length - 1]}. A session of 10 to 15 minutes a day is the target; the three "Today" goals take about that long.`,
      ),

      h('h2', null, 'Where she is now'),
      h(
        'p',
        null,
        'Every skill is a ladder. She works at her level, and about one problem in four comes from the level above. She moves up when at least five of her last six problems were right the first time without help, and down after two misses in a row. A miss on a problem from the level above never counts against her.',
      ),
      h(
        'table',
        null,
        head('Skill', 'Monster', 'Level', 'Working on', 'Lately'),
        levelRows(save).map((x) => row(x.skill, x.monster, x.level, x.working, x.recent)),
      ),
      h(
        'p',
        null,
        'A new monster comes out when the skill before it is secure (six or more problems, most of the recent ones right the first time). If her class has moved on and she needs a topic now, open everything: ',
        openBtn,
      ),

      h('h2', null, 'Number sentences (make the number)'),
      h('p', null, easyNote),
      h(
        'table',
        null,
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

      h('h2', null, 'Berry Canyon (2-digit addition and subtraction)'),
      h(
        'table',
        null,
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

      h('h2', null, 'Honey Hollow (fractions)'),
      h(
        'table',
        null,
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

      h('h2', null, 'Teaching'),
      h(
        'p',
        null,
        `Each lesson plays once before its skill, again whenever she presses "Teach me", and by itself (at most once a day) when she is stuck. Step-by-step help on a berry trip was used ${walkthroughCount(save)} times.`,
      ),
      h('table', null, head('Lesson', 'What it teaches', 'Times seen'), tutoringRows(save).map((x) => row(x.lesson, x.teaches, x.seen))),

      h('h2', null, 'Skills by monster'),
      h(
        'table',
        null,
        head('Monster', 'Skill', 'Status'),
        ALL_SPECIES.map((id) => row(SPECIES[id].name, SPECIES[id].skill, monsterStatus(save, id))),
      ),

      save.placement.length
        ? [
            h('h2', null, 'First-day check'),
            intakeRows(save).length
              ? h(
                  'table',
                  null,
                  head('Strand', 'Highest level passed', 'Where it stopped'),
                  intakeRows(save).map((x) => row(x.strand, x.reached, x.next)),
                )
              : null,
            intakeWarning(save) ? h('p', null, intakeWarning(save)) : null,
            h('p', null, 'Every question she was asked:'),
            h(
              'table',
              null,
              head('Question', 'Her answer', 'Expected'),
              save.placement.map((p) => row(p.prompt, p.unsure ? 'not sure' : (p.given ?? ''), p.correct ? 'correct' : p.expected)),
            ),
          ]
        : null,

      h('h2', null, 'Share or reset'),
      h('div', { class: 'gu-actions' }, button('Copy summary for the teacher', copy, 'btn-small'), button('Download data (JSON)', download, 'btn-small'), resetBtn, note),
      h(
        'p',
        { class: 'gu-small' },
        'Progress is stored in this browser on this computer only. Clearing the browser data erases it, so download a copy now and then.',
      ),
    ),
  );

  return { el };
};
