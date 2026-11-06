// PlannerHistory: undo/redo as a stack of snapshots (JSON strings of the whole store).
//   checkpoint(key) is called BEFORE a change. Same non-empty key within 1.2 s = one undo step (typing).
//   Capped at 100 steps and ~6 MB of snapshots (oldest dropped first).
(function (G) {
  'use strict';
  if (G.PlannerHistory) return;
  G.PlannerHistory = {
    create(snapshot, restore, opts) {
      opts = opts || {};
      const cap = opts.cap || 100,
        maxChars = opts.maxChars || 6e6;
      let undo = [],
        redo = [],
        lastKey = null,
        lastAt = 0,
        chars = 0;
      const trim = () => {
        while (undo.length > cap || (chars > maxChars && undo.length > 1)) chars -= undo.shift().length;
      };
      return {
        checkpoint(key) {
          const now = Date.now();
          if (key && key === lastKey && now - lastAt < 1200) {
            lastAt = now;
            return;
          }
          lastKey = key || null;
          lastAt = now;
          const s = snapshot();
          undo.push(s);
          chars += s.length;
          redo = [];
          trim();
        },
        undo() {
          if (!undo.length) return false;
          redo.push(snapshot());
          const s = undo.pop();
          chars -= s.length;
          lastKey = null;
          restore(s);
          return true;
        },
        redo() {
          if (!redo.length) return false;
          const s = snapshot();
          undo.push(s);
          chars += s.length;
          lastKey = null;
          restore(redo.pop());
          return true;
        },
        canUndo: () => undo.length > 0,
        canRedo: () => redo.length > 0,
        clear() {
          undo = [];
          redo = [];
          chars = 0;
          lastKey = null;
        },
      };
    },
  };
})(window);
