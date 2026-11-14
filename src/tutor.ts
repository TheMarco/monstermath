import type { SpeciesId } from './data/monsters';
import { canReplay, LESSON_BEFORE, lessonSeen, type LessonId } from './lessons';
import { dayKey } from './state';
import type { App, ScreenName } from './ui/common';

/**
 * Decides when the game teaches. A lesson plays before a new skill's monster
 * is first met; it replays when she asks, or when the game sees she is stuck
 * (at most once a day per lesson when the game decides by itself).
 */

type Back = { screen: ScreenName; params?: Record<string, unknown> };

/** Go to a monster's game, by way of its lesson if she has not had it yet. */
export function goWithLesson(app: App, screen: ScreenName, id: SpeciesId): void {
  const lesson = LESSON_BEFORE[id];
  const params = { id };
  if (lesson && !lessonSeen(app.save.lessons, lesson) && !app.save.monsters[id]?.friend) {
    app.go('lesson', { id: lesson, back: { screen, params } });
  } else {
    app.go(screen, params);
  }
}

/** She asked to be taught: always allowed. */
export function teach(app: App, lesson: LessonId, back: Back): void {
  app.go('lesson', { id: lesson, back });
}

/** The game noticed a struggle. Returns false when this lesson already replayed today. */
export function teachIfDue(app: App, lesson: LessonId | undefined, back: Back): boolean {
  if (!lesson || !canReplay(app.save.lessons, lesson, dayKey())) return false;
  app.go('lesson', { id: lesson, back });
  return true;
}

/** How many misses or easy answers in a row count as "stuck". */
export const STUCK_AFTER = 3;
