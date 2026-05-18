(function attachVectorAuthoringHistory(global) {
  'use strict';

  const DEFAULT_LIMIT = 100;

  function createHistory(options = {}) {
    const limit = Math.max(1, Math.floor(Number(options.limit) || DEFAULT_LIMIT));
    let undoStack = [];
    let redoStack = [];

    function push(label, beforeSnapshot, afterSnapshot) {
      if (!beforeSnapshot || !afterSnapshot || snapshotsEqual(beforeSnapshot, afterSnapshot)) {
        return false;
      }
      undoStack.push({
        label: String(label || 'Edit'),
        snapshot: cloneSnapshot(beforeSnapshot),
      });
      if (undoStack.length > limit) {
        undoStack = undoStack.slice(undoStack.length - limit);
      }
      redoStack = [];
      return true;
    }

    function undo(currentSnapshot) {
      if (!canUndo() || !currentSnapshot) {
        return null;
      }
      const entry = undoStack.pop();
      redoStack.push({
        label: entry.label,
        snapshot: cloneSnapshot(currentSnapshot),
      });
      return {
        label: entry.label,
        snapshot: cloneSnapshot(entry.snapshot),
      };
    }

    function redo(currentSnapshot) {
      if (!canRedo() || !currentSnapshot) {
        return null;
      }
      const entry = redoStack.pop();
      undoStack.push({
        label: entry.label,
        snapshot: cloneSnapshot(currentSnapshot),
      });
      if (undoStack.length > limit) {
        undoStack = undoStack.slice(undoStack.length - limit);
      }
      return {
        label: entry.label,
        snapshot: cloneSnapshot(entry.snapshot),
      };
    }

    function reset() {
      undoStack = [];
      redoStack = [];
    }

    function canUndo() {
      return undoStack.length > 0;
    }

    function canRedo() {
      return redoStack.length > 0;
    }

    function counts() {
      return {
        undo: undoStack.length,
        redo: redoStack.length,
      };
    }

    return {
      push,
      undo,
      redo,
      reset,
      canUndo,
      canRedo,
      counts,
    };
  }

  function cloneSnapshot(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
  }

  function snapshotsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  global.VectorAuthoringHistory = {
    DEFAULT_LIMIT,
    createHistory,
    cloneSnapshot,
    snapshotsEqual,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
