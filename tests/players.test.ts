import { beforeEach, describe, expect, it } from 'vitest';
import { addPlayer, adoptBackup, befriend, currentPlayer, freshSave, loadSave, persist, players, readBackup, removePlayer, renamePlayer, switchPlayer, wipeSave } from '../src/state';

const started = (name?: string) => {
  const save = freshSave();
  save.starter = 'puff';
  save.introDone = true;
  befriend(save, 'puff');
  save.xp = 42;
  if (name) save.name = name;
  return save;
};

beforeEach(() => localStorage.clear());

describe('players', () => {
  it('starts with one player who owns the save from before players existed', () => {
    localStorage.setItem('monstermath.save.v1', JSON.stringify(started()));
    expect(players()).toEqual([{ id: 'p1', name: 'Player 1' }]);
    expect(loadSave().xp).toBe(42);
  });

  it('keeps progress apart for each player', () => {
    persist(started());
    const second = addPlayer('  Sam  ');
    expect(second.name).toBe('Sam');
    expect(currentPlayer().id).toBe(second.id);
    expect(loadSave().starter).toBeNull();
    const save = loadSave();
    save.xp = 7;
    persist(save);
    switchPlayer('p1');
    expect(loadSave().xp).toBe(42);
    switchPlayer(second.id);
    expect(loadSave().xp).toBe(7);
  });

  it('renames, resets and removes without touching the others', () => {
    persist(started());
    const second = addPlayer('Sam');
    persist(started());
    renamePlayer(second.id, 'Samantha the Great');
    expect(currentPlayer().name).toBe('Samantha the');
    wipeSave();
    expect(loadSave().starter).toBeNull();
    expect(loadSave('p1').xp).toBe(42);
    removePlayer(second.id);
    expect(players().map((p) => p.id)).toEqual(['p1']);
    expect(currentPlayer().id).toBe('p1');
    removePlayer('p1');
    expect(players()).toHaveLength(1);
  });

  it('writes the player name into the save', () => {
    renamePlayer('p1', 'Ada');
    persist(started());
    expect(loadSave().name).toBe('Ada');
  });
});

describe('backup files', () => {
  it('rejects text that is not a save', () => {
    expect(readBackup('hello')).toBeNull();
    expect(readBackup('{"version":2}')).toBeNull();
    expect(readBackup('[1,2]')).toBeNull();
    expect(readBackup(JSON.stringify({ ...freshSave(), monsters: [] }))).toBeNull();
  });

  it('drops monsters it does not know and a starter that is missing', () => {
    const save = started() as unknown as { monsters: Record<string, unknown>; starter: string };
    save.monsters.zzz = { id: 'zzz', friend: true };
    const back = readBackup(JSON.stringify(save));
    expect(back && Object.keys(back.monsters)).toEqual(['puff']);
    save.starter = 'zzz';
    expect(readBackup(JSON.stringify(save))?.introDone).toBe(false);
  });

  it('fills a player who has not started', () => {
    const back = readBackup(JSON.stringify(started('Ada')));
    expect(back).not.toBeNull();
    adoptBackup(back!);
    expect(players()).toEqual([{ id: 'p1', name: 'Ada' }]);
    expect(loadSave().xp).toBe(42);
  });

  it('becomes a new player when the current one has progress', () => {
    const mine = started();
    mine.xp = 5;
    persist(mine);
    adoptBackup(readBackup(JSON.stringify(started('Ada')))!);
    expect(players().map((p) => p.name)).toEqual(['Player 1', 'Ada']);
    expect(currentPlayer().name).toBe('Ada');
    expect(loadSave().xp).toBe(42);
    expect(loadSave('p1').xp).toBe(5);
  });
});
