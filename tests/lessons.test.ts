import { describe, expect, it } from 'vitest';
import { canReplay, LESSON_BEFORE, LESSON_FOR_KIND, LESSONS, lessonSeen, markLesson, type LessonLog } from '../src/lessons';
import { recordingScript } from '../src/voice/lines';

describe('lessons', () => {
  it('every step has a recording and the right shape', () => {
    const recorded = new Set(recordingScript().map(([key]) => key));
    for (const lesson of Object.values(LESSONS)) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(6);
      // Watch me first, and end on a statement, not a question.
      expect(lesson.steps[0]?.ask).toBeUndefined();
      expect(lesson.steps.at(-1)?.ask).toBeUndefined();
      // She does at least one thing herself.
      expect(lesson.steps.some((s) => s.ask)).toBe(true);
      for (const step of lesson.steps) {
        expect(recorded.has(step.clip), step.clip).toBe(true);
        if (step.ask?.kind === 'choice') expect(step.ask.choices).toContain(step.ask.expected);
      }
    }
    for (const clip of ['l_intro', 'l_try', 'l_show_answer', 'show_you', 'w_add', 'w_pack', 'w_sub', 'w_open', 'w_feed', 'w_count', 'help_hint']) {
      expect(recorded.has(clip), clip).toBe(true);
    }
  });

  it('the pictures agree with the numbers in the lesson', () => {
    for (const step of LESSONS.pack.steps) if (step.scene.t === 'mat' && step.ask?.kind === 'number') expect(step.scene.tens * 10 + step.scene.ones).toBe(step.ask.expected);
    for (const step of LESSONS.open.steps) if (step.scene.t === 'mat' && step.ask?.kind === 'number') expect(step.scene.tens * 10 + step.scene.ones).toBe(step.ask.expected);
    for (const step of LESSONS.rows.steps) if (step.scene.t === 'array' && step.ask?.kind === 'number') expect(step.scene.rows * step.scene.cols).toBe(step.ask.expected);
    for (const step of LESSONS.share.steps) if (step.scene.t === 'groups' && step.ask?.kind === 'number') expect(step.scene.total / step.scene.groups).toBe(step.ask.expected);
  });

  it('each new skill has a lesson before its monster', () => {
    expect(LESSON_BEFORE).toEqual({ dab: 'parts', glim: 'rows', fenn: 'share', plum: 'pack', chip: 'open', bix: 'frac', tam: 'same', zim: 'ftimes', lux: 'ftray', fig: 'count', flam: 'more', kelp: 'ten', beary: 'place', belch: 'mult', drift: 'div', bug: 'fadd', cook: 'dec' });
    expect(LESSON_FOR_KIND.addR).toBe('pack');
    expect(LESSON_FOR_KIND.subR).toBe('open');
    expect(LESSON_FOR_KIND.mul).toBe('rows');
    expect(LESSON_FOR_KIND.div).toBe('share');
  });

  it('replays by itself at most once a day', () => {
    const log: Record<string, LessonLog> = {};
    expect(lessonSeen(log, 'pack')).toBe(false);
    expect(canReplay(log, 'pack', '2026-11-13')).toBe(true);
    markLesson(log, 'pack', '2026-11-13');
    expect(lessonSeen(log, 'pack')).toBe(true);
    expect(canReplay(log, 'pack', '2026-11-13')).toBe(false);
    expect(canReplay(log, 'pack', '2026-11-14')).toBe(true);
    markLesson(log, 'pack', '2026-11-14');
    expect(log.pack?.seen).toBe(2);
  });
});
