import { describe, expect, it } from 'vitest';
import { advance, belowFloor, fastTrack, currentItem, MAX_MISSES, newRun, reached, startSteps, STRANDS } from '../src/intake';
import { recordingScript } from '../src/voice/lines';

describe('intake staircases', () => {
  it('every question has a sensible answer and recorded speech', () => {
    const recorded = new Set(recordingScript().map(([key]) => key));
    for (const strand of STRANDS) {
      for (const level of strand.levels) {
        for (const item of level.items) {
          if (item.choices) expect(item.choices).toContain(item.expected);
          else expect(item.expected).toMatch(/^\d+$/);
          for (const clip of item.clips) if (clip) expect(recorded.has(clip), `${clip} for ${item.show}`).toBe(true);
        }
        // The retry is a different question of the same kind.
        expect(level.items[0]).not.toEqual(level.items[1]);
      }
    }
  });

  it('typed answers are computed correctly', () => {
    const add = STRANDS.find((s) => s.id === 'add')!;
    for (const level of add.levels) {
      for (const item of level.items) {
        const [a, b] = item.show.split(' + ').map(Number);
        expect(Number(item.expected)).toBe((a as number) + (b as number));
      }
    }
    const sub = STRANDS.find((s) => s.id === 'sub')!;
    for (const level of sub.levels) {
      for (const item of level.items) {
        const [a, b] = item.show.split(' − ').map(Number);
        expect(Number(item.expected)).toBe((a as number) - (b as number));
      }
    }
  });

  it('climbs on right answers and stops after two misses at one level', () => {
    const strand = STRANDS[1]!;
    let run = newRun();
    run = advance(strand, run, true);
    run = advance(strand, run, true);
    expect(run).toMatchObject({ level: 2, passed: 2, done: false });
    run = advance(strand, run, false);
    expect(run).toMatchObject({ level: 2, attempt: 1, done: false });
    expect(currentItem(strand, run)).toBe(strand.levels[2]!.items[1]);
    run = advance(strand, run, false);
    expect(run).toMatchObject({ passed: 2, done: true });
    expect(currentItem(strand, run)).toBeNull();
  });

  it('a right answer on the retry carries on', () => {
    const strand = STRANDS[1]!;
    let run = advance(strand, newRun(), false);
    run = advance(strand, run, true);
    expect(run).toMatchObject({ level: 1, attempt: 0, passed: 1, done: false });
  });

  it('ends a strand on the third miss even with right answers between', () => {
    const strand = STRANDS[1]!;
    let run = newRun();
    let asked = 0;
    for (const correct of [false, true, false, true, false, true, true]) {
      if (run.done) break;
      run = advance(strand, run, correct);
      asked += 1;
    }
    expect(run.done).toBe(true);
    expect(run.misses).toBe(MAX_MISSES);
    expect(asked).toBe(5);
  });

  it('finishes when every level is passed', () => {
    const strand = STRANDS[0]!;
    let run = newRun();
    let asked = 0;
    while (!run.done) {
      run = advance(strand, run, true);
      asked += 1;
    }
    expect(run).toMatchObject({ passed: strand.levels.length, done: true });
    // One question per typed level and two for the pick-one level.
    expect(asked).toBe(strand.levels.length + 1);
  });

  it('a pick-one level needs both of its questions right', () => {
    const strand = STRANDS.find((s) => s.id === 'frac')!;
    let run = advance(strand, newRun(), true);
    expect(run).toMatchObject({ level: 0, attempt: 1, passed: 0, done: false });
    expect(currentItem(strand, run)).toBe(strand.levels[0]!.items[1]);
    expect(advance(strand, run, true)).toMatchObject({ level: 1, attempt: 0, passed: 1, done: false });
    // Right then wrong: the level is not passed and the strand ends.
    expect(advance(strand, run, false)).toMatchObject({ passed: 0, done: true });
    // Wrong on the first question: no second question, because the level can no longer be passed.
    run = advance(strand, newRun(), false);
    expect(run).toMatchObject({ passed: 0, done: true });
  });

  it('sets the starting problem size from what she passed', () => {
    // Rungs: she starts on the first thing she has not shown yet.
    expect(startSteps({})).toEqual({ add: 0, addR: 0, sub: 0, subR: 0 });
    expect(startSteps({ add: 1, sub: 2 })).toEqual({ add: 1, addR: 0, sub: 2, subR: 1 });
    expect(startSteps({ add: 3, sub: 4 })).toEqual({ add: 3, addR: 1, sub: 3, subR: 2 });
    expect(startSteps({ add: 5, sub: 6 })).toEqual({ add: 4, addR: 2, sub: 4, subR: 3 });
    expect(startSteps({ add: 7, sub: 7 })).toEqual({ add: 4, addR: 4, sub: 4, subR: 4 });
    expect(fastTrack({ add: 5, sub: 6 })).toEqual({ add: true, addR: false, sub: true, subR: true });
  });

  it('flags strands below what the game can teach', () => {
    expect(belowFloor({ add: 0, sub: 2 })).toEqual(['add']);
    expect(belowFloor({ add: 1, sub: 2 })).toEqual([]);
    expect(belowFloor({ add: 4, sub: 3 })).toEqual([]);
  });

  it('describes the result for a parent', () => {
    const add = STRANDS[1]!;
    expect(reached(add, 0).reached).toBe('Did not pass the first level');
    expect(reached(add, 3)).toEqual({
      reached: 'Two-digit plus one-digit, no regrouping (grade 2)',
      next: 'Two-digit plus one-digit, with regrouping (grade 2)',
    });
    expect(reached(add, 7).next).toBeNull();
  });
});
