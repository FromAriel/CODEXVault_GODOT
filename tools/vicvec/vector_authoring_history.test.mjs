import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function loadHistory() {
  const source = readFileSync(
    new URL('./vector_authoring_history.js', import.meta.url),
    'utf8',
  );
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, {
    filename: 'vector_authoring_history.js',
  });
  return sandbox.VectorAuthoringHistory;
}

const historyCore = loadHistory();

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('history push, undo, and redo restore snapshots in order', () => {
  const history = historyCore.createHistory({ limit: 10 });
  const initial = { state: { value: 0 }, selected: 'a' };
  const first = { state: { value: 1 }, selected: 'b' };
  const second = { state: { value: 2 }, selected: 'c' };

  assert.equal(history.push('First edit', initial, first), true);
  assert.equal(history.push('Second edit', first, second), true);
  assert.deepEqual(plain(history.counts()), { undo: 2, redo: 0 });

  const undoSecond = history.undo(second);
  assert.equal(undoSecond.label, 'Second edit');
  assert.deepEqual(plain(undoSecond.snapshot), first);
  assert.deepEqual(plain(history.counts()), { undo: 1, redo: 1 });

  const undoFirst = history.undo(first);
  assert.equal(undoFirst.label, 'First edit');
  assert.deepEqual(plain(undoFirst.snapshot), initial);
  assert.deepEqual(plain(history.counts()), { undo: 0, redo: 2 });

  const redoFirst = history.redo(initial);
  assert.equal(redoFirst.label, 'First edit');
  assert.deepEqual(plain(redoFirst.snapshot), first);
  assert.deepEqual(plain(history.counts()), { undo: 1, redo: 1 });
});

test('history skips identical snapshots and clears redo after a new edit', () => {
  const history = historyCore.createHistory({ limit: 10 });
  const initial = { state: { value: 0 } };
  const first = { state: { value: 1 } };
  const branch = { state: { value: 9 } };

  assert.equal(history.push('No-op', initial, initial), false);
  assert.deepEqual(plain(history.counts()), { undo: 0, redo: 0 });

  assert.equal(history.push('First edit', initial, first), true);
  assert.deepEqual(plain(history.undo(first).snapshot), initial);
  assert.deepEqual(plain(history.counts()), { undo: 0, redo: 1 });

  assert.equal(history.push('Branch edit', initial, branch), true);
  assert.deepEqual(plain(history.counts()), { undo: 1, redo: 0 });
});

test('history limit trims oldest undo entries', () => {
  const history = historyCore.createHistory({ limit: 2 });
  const zero = { value: 0 };
  const one = { value: 1 };
  const two = { value: 2 };
  const three = { value: 3 };

  history.push('one', zero, one);
  history.push('two', one, two);
  history.push('three', two, three);

  assert.deepEqual(plain(history.counts()), { undo: 2, redo: 0 });
  assert.deepEqual(plain(history.undo(three).snapshot), two);
  assert.deepEqual(plain(history.undo(two).snapshot), one);
  assert.equal(history.undo(one), null);
});
