import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function loadCore() {
  const source = readFileSync(
    new URL('./vector_authoring_core.js', import.meta.url),
    'utf8',
  );
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, {
    filename: 'vector_authoring_core.js',
  });
  return sandbox.VectorAuthoringCore;
}

const core = loadCore();

test('point creation and loop closure use the selected loop', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 20 });
  state = core.addPoint(state, { x: 110, y: 20 });
  state = core.addPoint(state, { x: 110, y: 120 });

  const loop = core.getSelectedLoop(state);
  assert.equal(loop.points.length, 3);
  assert.equal(loop.closed, false);
  assert.equal(core.canCloseLoop(loop.points, { x: 12, y: 22 }, 8), true);

  state = core.closeLoop(state);
  assert.equal(core.getSelectedLoop(state).closed, true);
});

test('screen and canvas coordinate conversion respects pan and zoom', () => {
  const viewport = { scale: 2, offsetX: 100, offsetY: 50 };
  const canvasPoint = core.screenToCanvas(viewport, { x: 300, y: 250 });

  assert.equal(canvasPoint.x, 100);
  assert.equal(canvasPoint.y, 100);
  const screenPoint = core.canvasToScreen(viewport, canvasPoint);
  assert.equal(screenPoint.x, 300);
  assert.equal(screenPoint.y, 250);

  const panned = core.panViewport(viewport, { x: 12, y: -8 });
  assert.equal(panned.offsetX, 112);
  assert.equal(panned.offsetY, 42);
});

test('multi-loop export preserves loop roles and even-odd cutout fill', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 100, y: 0 });
  state = core.addPoint(state, { x: 100, y: 100 });
  state = core.closeLoop(state);
  state = core.addLoop(state, 'cutout');
  state = core.addPoint(state, { x: 25, y: 25 });
  state = core.addPoint(state, { x: 75, y: 25 });
  state = core.addPoint(state, { x: 75, y: 75 });
  state = core.closeLoop(state);

  const exported = core.buildVectorPack(state);
  const loops = exported.shapes[0].loops;

  assert.equal(exported.version, 1);
  assert.equal(exported.kind, 'duhrng-vector-pack');
  assert.equal(JSON.stringify(exported.canvas), '{"width":1536,"height":1024}');
  assert.equal(loops.length, 2);
  assert.equal(loops[0].role, 'outer');
  assert.equal(loops[0].fillRule, 'evenOdd');
  assert.equal(loops[1].role, 'cutout');
  assert.equal(loops[1].fillRule, 'evenOdd');
});

test('validator marks empty, open, and broken cutout loops', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 300, height: 200 },
    shapes: [
      {
        id: 'mixed_shape',
        loops: [
          {
            role: 'outer',
            closed: false,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
          },
          {
            role: 'cutout',
            closed: false,
            points: [
              { x: 20, y: 20 },
              { x: 80, y: 20 },
            ],
          },
          {
            role: 'detail',
            closed: false,
            points: [],
          },
        ],
      },
    ],
  });

  const validation = core.validateState(state);
  const loopReports = validation.shapeReports[0].loopReports;

  assert.equal(validation.status, core.VALIDATION_STATUS.error);
  assert.equal(loopReports[0].status, core.VALIDATION_STATUS.warning);
  assert.equal(loopReports[1].status, core.VALIDATION_STATUS.error);
  assert.equal(loopReports[2].status, core.VALIDATION_STATUS.error);
  assert.equal(loopReports[0].issues[0].code, 'loop-open');
  assert.equal(
    loopReports[1].issues.some((issue) => issue.code === 'loop-open-cutout'),
    true,
  );
  assert.equal(loopReports[2].issues[0].code, 'loop-empty');
});

test('validator warns on duplicate shape ids without changing v1 export', () => {
  const pack = {
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 300, height: 200 },
    shapes: [
      {
        id: 'same_shape',
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
            ],
          },
        ],
      },
      {
        id: 'same_shape',
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 120, y: 0 },
              { x: 220, y: 0 },
              { x: 220, y: 80 },
            ],
          },
        ],
      },
    ],
  };
  const state = core.importVectorPack(pack);
  const validation = core.validateState(state);
  const exported = JSON.stringify(core.buildVectorPack(state));

  assert.equal(validation.status, core.VALIDATION_STATUS.warning);
  assert.equal(validation.shapeReports[0].issues[0].code, 'shape-duplicate-id');
  assert.equal(exported.includes('validation'), false);
  assert.equal(exported.includes('shapeReports'), false);
});

test('Bezier handles export as relative in and out handles', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 20 });
  state = core.addPoint(state, { x: 100, y: 20 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: 45, y: 5 });
  state = core.movePointHandle(state, 1, 'inHandle', { x: 72, y: 48 });

  const points = core.buildVectorPack(state).shapes[0].loops[0].points;

  assert.equal(JSON.stringify(points[0].out), '{"x":35,"y":-15}');
  assert.equal(JSON.stringify(points[1].in), '{"x":-28,"y":28}');
});

test('createPointOutHandle adds a missing Alt-drag out handle', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 40, y: 60 });
  state = core.createPointOutHandle(state, 0, { x: 90, y: 45 });

  const point = core.buildVectorPack(state).shapes[0].loops[0].points[0];

  assert.equal(JSON.stringify(point.out), '{"x":50,"y":-15}');
  assert.equal(state.selectedPointIndex, 0);
});

test('shape and loop mutation supports selection, duplicate, delete, and reorder', () => {
  let state = core.createInitialState();
  state = core.addShape(state);
  assert.equal(state.shapes.length, 2);
  assert.equal(state.selectedShapeIndex, 1);

  state = core.duplicateSelectedShape(state);
  assert.equal(state.shapes.length, 3);
  assert.match(core.getSelectedShape(state).id, /copy/);

  state = core.deleteSelectedShape(state);
  assert.equal(state.shapes.length, 2);

  state = core.selectShape(state, 0);
  state = core.addLoop(state, 'detail');
  state = core.addLoop(state, 'hitZone');
  assert.equal(core.getSelectedShape(state).loops.length, 3);
  assert.equal(state.selectedLoopIndex, 2);

  state = core.moveSelectedLoop(state, -1);
  assert.equal(state.selectedLoopIndex, 1);
  assert.equal(core.getSelectedLoop(state).role, 'hitZone');

  state = core.duplicateSelectedLoop(state);
  assert.equal(core.getSelectedShape(state).loops.length, 4);

  state = core.deleteSelectedLoop(state);
  assert.equal(core.getSelectedShape(state).loops.length, 3);
});

test('static v1 export assigns stable loop ids and omits empty animation', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 80, y: 0 });
  state = core.addPoint(state, { x: 80, y: 80 });
  state = core.addLoop(state, 'detail');
  state = core.addPoint(state, { x: 10, y: 10 });
  state = core.addPoint(state, { x: 70, y: 70 });

  const exported = core.buildVectorPack(state);

  assert.equal(exported.version, 1);
  assert.equal(exported.kind, 'duhrng-vector-pack');
  assert.equal(exported.animation, undefined);
  assert.equal(
    JSON.stringify(exported.shapes[0].loops.map((loop) => loop.id)),
    '["outer_1","detail_1"]',
  );
  assert.equal(JSON.stringify(exported).includes('selectedPoints'), false);
});

test('import repairs duplicate loop ids while preserving valid loop ids', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 300, height: 200 },
    shapes: [
      {
        id: 'board_cells',
        loops: [
          {
            role: 'effectZone',
            id: 'board_cell_00',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
            ],
          },
          {
            role: 'effectZone',
            id: 'board_cell_00',
            closed: true,
            points: [
              { x: 20, y: 0 },
              { x: 30, y: 0 },
              { x: 30, y: 10 },
            ],
          },
          {
            role: 'hitZone',
            closed: true,
            points: [
              { x: 40, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 10 },
            ],
          },
        ],
      },
    ],
  });

  const ids = core.buildVectorPack(state).shapes[0].loops.map((loop) => loop.id);

  assert.equal(JSON.stringify(ids), '["board_cell_00","board_cell_00_2","hitzone_1"]');
});

test('path selection supports single select, multi-toggle, and cleanup', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 80, y: 0 });
  state = core.addPoint(state, { x: 80, y: 80 });
  state = core.closeLoop(state);
  state = core.addLoop(state, 'detail');
  state = core.addPoint(state, { x: 10, y: 10 });
  state = core.addPoint(state, { x: 70, y: 70 });

  state = core.selectPath(state, 0, 0);
  assert.equal(
    JSON.stringify(core.getSelectedPathRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0}]',
  );

  state = core.togglePathSelection(state, 0, 1);
  assert.equal(
    JSON.stringify(core.getSelectedPathRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0},{"shapeIndex":0,"loopIndex":1}]',
  );
  assert.equal(state.selectedLoopIndex, 1);

  state = core.deleteSelectedLoop(state);
  assert.equal(
    JSON.stringify(core.getSelectedPathRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0}]',
  );
});

test('point multi-selection refs normalize, dedupe, and toggle', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 80, y: 0 });
  state = core.addPoint(state, { x: 80, y: 80 });
  state = core.closeLoop(state);
  state = core.addLoop(state, 'detail');
  state = core.addPoint(state, { x: 10, y: 10 });
  state = core.addPoint(state, { x: 70, y: 70 });

  state = core.selectPointRef(state, 0, 0, 1);
  assert.equal(
    JSON.stringify(core.getSelectedPointRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0,"pointIndex":1}]',
  );

  state = core.togglePointSelection(state, 0, 1, 0);
  state = core.togglePointSelection(state, 0, 1, 0);
  assert.equal(
    JSON.stringify(core.getSelectedPointRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0,"pointIndex":1}]',
  );
  assert.equal(state.selectedPointIndex, 1);
});

test('box and polygon lasso select points only inside selected paths', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 10 });
  state = core.addPoint(state, { x: 80, y: 10 });
  state = core.addPoint(state, { x: 80, y: 80 });
  state = core.closeLoop(state);
  state = core.addLoop(state, 'detail');
  state = core.addPoint(state, { x: 15, y: 15 });
  state = core.addPoint(state, { x: 25, y: 25 });
  state = core.addPoint(state, { x: 100, y: 100 });

  state = core.selectPath(state, 0, 0);
  state = core.selectPointsInRect(state, { x1: 0, y1: 0, x2: 90, y2: 90 });
  assert.equal(
    JSON.stringify(core.getSelectedPointRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0,"pointIndex":0},{"shapeIndex":0,"loopIndex":0,"pointIndex":1},{"shapeIndex":0,"loopIndex":0,"pointIndex":2}]',
  );

  state = core.togglePathSelection(state, 0, 1);
  state = core.selectPointsInPolygon(state, [
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 0, y: 60 },
  ]);
  assert.equal(
    JSON.stringify(core.getSelectedPointRefs(state)),
    '[{"shapeIndex":0,"loopIndex":0,"pointIndex":0},{"shapeIndex":0,"loopIndex":1,"pointIndex":0},{"shapeIndex":0,"loopIndex":1,"pointIndex":1}]',
  );

  state = core.selectPointsInRect(state, { x1: 0, y1: 0, x2: 20, y2: 20 }, { toggle: true });
  assert.equal(
    JSON.stringify(core.getSelectedPointRefs(state)),
    '[{"shapeIndex":0,"loopIndex":1,"pointIndex":1}]',
  );
});

test('moving selected points preserves relative Bezier handles and export schema', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 20 });
  state = core.addPoint(state, { x: 60, y: 20 });
  state = core.addPoint(state, { x: 60, y: 70 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: 30, y: 10 });
  state = core.movePointHandle(state, 1, 'inHandle', { x: 40, y: 40 });
  state = core.clearPointSelection(state);
  state = core.togglePointSelection(state, 0, 0, 0);
  state = core.togglePointSelection(state, 0, 0, 1);

  const moved = core.moveSelectedPoints(state, { dx: 5, dy: -10 });
  const points = core.buildVectorPack(moved).shapes[0].loops[0].points;

  assert.equal(JSON.stringify(points[0]), '{"x":15,"y":10,"out":{"x":20,"y":-10}}');
  assert.equal(JSON.stringify(points[1]), '{"x":65,"y":10,"in":{"x":-20,"y":20}}');
  assert.equal(JSON.stringify(points[2]), '{"x":60,"y":70}');
  assert.equal(JSON.stringify(core.buildVectorPack(moved)).includes('selectedPoints'), false);
});

test('deleting selected points opens closed loops that fall below three anchors', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 40, y: 0 });
  state = core.addPoint(state, { x: 40, y: 40 });
  state = core.addPoint(state, { x: 0, y: 40 });
  state = core.closeLoop(state);
  state = core.clearPointSelection(state);
  state = core.togglePointSelection(state, 0, 0, 0);
  state = core.togglePointSelection(state, 0, 0, 1);

  state = core.deleteSelectedPoints(state);
  const loop = core.getSelectedLoop(state);
  assert.equal(loop.points.length, 2);
  assert.equal(loop.closed, false);
  assert.equal(core.getSelectedPointRefs(state).length, 0);
});

test('groupSelectedPaths moves loops into a new v1-compatible shape group', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 640, height: 420 },
    shapes: [
      {
        id: 'left_panel',
        label: 'Left Panel',
        tags: ['cabinet'],
        z: 2,
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          },
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 10, y: 10 },
              { x: 90, y: 10 },
            ],
          },
        ],
        style: { fill: '#111111', stroke: '#222222', strokeWidth: 3 },
      },
      {
        id: 'right_panel',
        label: 'Right Panel',
        tags: ['cabinet', 'trim'],
        z: 9,
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 200, y: 0 },
              { x: 300, y: 0 },
              { x: 300, y: 100 },
            ],
          },
        ],
        style: { fill: '#333333', stroke: '#444444', strokeWidth: 7 },
      },
    ],
  });

  let next = core.selectPath(state, 0, 0);
  next = core.togglePathSelection(next, 1, 0);
  next = core.groupSelectedPaths(next);

  assert.equal(next.shapes.length, 2);
  assert.equal(next.shapes[0].id, 'left_panel');
  assert.equal(next.shapes[0].loops.length, 1);
  assert.equal(next.shapes[1].id, 'path_group_1');
  assert.equal(next.shapes[1].loops.length, 2);
  assert.equal(next.shapes[1].tagsText, 'cabinet, trim');
  assert.equal(next.shapes[1].style.fill, '#333333');
  assert.equal(
    JSON.stringify(core.getSelectedPathRefs(next)),
    '[{"shapeIndex":1,"loopIndex":0},{"shapeIndex":1,"loopIndex":1}]',
  );
  assert.equal(JSON.stringify(core.buildVectorPack(next)).includes('selectedPaths'), false);
});

test('moveSelectedPaths translates selected loop points while preserving v1 export shape', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 20 });
  state = core.addPoint(state, { x: 60, y: 20 });
  state = core.addPoint(state, { x: 60, y: 70 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: 30, y: 10 });
  state = core.closeLoop(state);
  state = core.selectPath(state, 0, 0);

  const moved = core.moveSelectedPaths(state, { dx: 15, dy: -5 });
  const points = core.buildVectorPack(moved).shapes[0].loops[0].points;

  assert.equal(JSON.stringify(points[0]), '{"x":25,"y":15,"out":{"x":20,"y":-10}}');
  assert.equal(JSON.stringify(points[2]), '{"x":75,"y":65}');
  assert.equal(JSON.stringify(core.getSelectedPathRefs(moved)), '[{"shapeIndex":0,"loopIndex":0}]');
  assert.equal(JSON.stringify(core.buildVectorPack(moved)).includes('selectedPaths'), false);
});

test('scaleSelection uniformly scales selected paths around their bounds center', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 100, y: 0 });
  state = core.addPoint(state, { x: 100, y: 100 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: 50, y: 0 });
  state = core.selectPath(state, 0, 0);

  const result = core.scaleSelection(state, { scaleX: 2, scaleY: 2 });
  const points = core.buildVectorPack(result.state).shapes[0].loops[0].points;

  assert.equal(result.stats.target, 'paths');
  assert.equal(result.stats.targetCount, 1);
  assert.equal(result.stats.pointCount, 3);
  assert.equal(JSON.stringify(points[0]), '{"x":-50,"y":-50,"out":{"x":100,"y":0}}');
  assert.equal(JSON.stringify(points[2]), '{"x":150,"y":150}');
  assert.equal(JSON.stringify(core.getSelectedPathRefs(result.state)), '[{"shapeIndex":0,"loopIndex":0}]');
  assert.equal(JSON.stringify(core.buildVectorPack(result.state)).includes('scaleSelection'), false);
});

test('scaleSelection non-uniformly scales selected points before paths', () => {
  let state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 200, height: 160 },
    shapes: [
      {
        id: 'point_scale',
        loops: [
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 0, y: 0, out: { x: 20, y: 10 } },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          },
        ],
      },
    ],
  });
  state = core.clearPointSelection(state);
  state = core.togglePointSelection(state, 0, 0, 0);
  state = core.togglePointSelection(state, 0, 0, 1);

  const result = core.scaleSelection(state, { scaleX: 0.5, scaleY: 2 });
  const points = core.buildVectorPack(result.state).shapes[0].loops[0].points;

  assert.equal(result.stats.target, 'points');
  assert.equal(result.stats.targetCount, 2);
  assert.equal(JSON.stringify(points[0]), '{"x":25,"y":0,"out":{"x":10,"y":20}}');
  assert.equal(JSON.stringify(points[1]), '{"x":75,"y":0}');
  assert.equal(JSON.stringify(points[2]), '{"x":100,"y":100}');
  assert.equal(JSON.stringify(core.getSelectedPointRefs(result.state)), '[{"shapeIndex":0,"loopIndex":0,"pointIndex":0},{"shapeIndex":0,"loopIndex":0,"pointIndex":1}]');
  assert.equal(JSON.stringify(core.buildVectorPack(result.state)).includes('selectedPoints'), false);
});

test('selectedPathBounds includes points and Bezier control handles', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 10, y: 20 });
  state = core.addPoint(state, { x: 50, y: 60 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: -10, y: 25 });
  state = core.movePointHandle(state, 1, 'inHandle', { x: 80, y: 10 });
  state = core.selectPath(state, 0, 0);

  assert.equal(
    JSON.stringify(core.selectedPathBounds(state)),
    '{"minX":-10,"minY":10,"maxX":80,"maxY":60,"width":90,"height":50}',
  );
});

test('loop cleanup removes near duplicates and simplifies handle-free straight points', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 0.4, y: 0.3 });
  state = core.addPoint(state, { x: 10, y: 0.1 });
  state = core.addPoint(state, { x: 20, y: 0 });
  state = core.addPoint(state, { x: 20, y: 12 });

  state = core.removeNearDuplicateSelectedLoops(state, 1.5);
  assert.equal(core.countPathRefPoints(state), 4);

  state = core.simplifyStraightSelectedLoops(state, 0.75);
  const points = core.buildVectorPack(state).shapes[0].loops[0].points;

  assert.equal(JSON.stringify(points), '[{"x":0,"y":0},{"x":20,"y":0},{"x":20,"y":12}]');
  assert.equal(JSON.stringify(core.buildVectorPack(state)).includes('selectedPaths'), false);
});

test('closeSelectedLoopGaps snaps a small open gap and closes the loop', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 20, y: 0 });
  state = core.addPoint(state, { x: 20, y: 20 });
  state = core.addPoint(state, { x: 1, y: 1 });

  state = core.closeSelectedLoopGaps(state, 2);
  const loop = core.buildVectorPack(state).shapes[0].loops[0];

  assert.equal(loop.closed, true);
  assert.equal(JSON.stringify(loop.points[3]), '{"x":0,"y":0}');
});

test('reverseSelectedLoops reverses point order and swaps relative handles', () => {
  let state = core.createInitialState();
  state = core.addPoint(state, { x: 0, y: 0 });
  state = core.addPoint(state, { x: 40, y: 0 });
  state = core.addPoint(state, { x: 40, y: 40 });
  state = core.movePointHandle(state, 0, 'outHandle', { x: 12, y: 0 });
  state = core.movePointHandle(state, 1, 'inHandle', { x: 30, y: 5 });

  state = core.reverseSelectedLoops(state);
  const points = core.buildVectorPack(state).shapes[0].loops[0].points;

  assert.equal(JSON.stringify(points[0]), '{"x":40,"y":40}');
  assert.equal(JSON.stringify(points[1]), '{"x":40,"y":0,"out":{"x":-10,"y":5}}');
  assert.equal(JSON.stringify(points[2]), '{"x":0,"y":0,"in":{"x":12,"y":0}}');
  assert.equal(JSON.stringify(core.buildVectorPack(state)).includes('selectedPaths'), false);
});

test('path optimization reduces dense straight paths without export-only fields', () => {
  const points = Array.from({ length: 11 }, (_, index) => ({
    x: index * 10,
    y: index % 2 ? 0.25 : 0,
  }));
  let state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 180, height: 80 },
    shapes: [
      {
        id: 'dense_line',
        loops: [{ role: 'detail', closed: false, points }],
      },
    ],
  });

  const result = core.applySelectedLoopOptimization(state, {
    tolerance: 1,
    keepCorners: true,
  });
  state = result.state;
  const exported = JSON.stringify(core.buildVectorPack(state));
  const loop = core.buildVectorPack(state).shapes[0].loops[0];

  assert.equal(result.stats.beforePoints, 11);
  assert.equal(loop.points.length, 2);
  assert.equal(exported.includes('selectedPaths'), false);
  assert.equal(exported.includes('tolerance'), false);
  assert.equal(exported.includes('preview'), false);
  assert.equal(exported.includes('stats'), false);
});

test('path optimization refits a dense oval into fewer Bezier anchors', () => {
  const points = ellipsePoints(20, 100, 100, 50, 30);
  const result = core.optimizeLoopPath(core.createLoop({
    role: 'outer',
    closed: true,
    points,
  }), {
    tolerance: 3,
    keepCorners: true,
  });

  assert.equal(result.stats.optimized, true);
  assert.equal(result.stats.beforePoints, 20);
  assert.ok(result.stats.afterPoints <= 6);
  assert.equal(result.loop.closed, true);
  assert.ok(result.loop.points.some((point) => point.inHandle || point.outHandle));
});

test('path optimization preserves sharp corners when requested', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 30 },
    { x: 60, y: 60 },
    { x: 90, y: 60 },
    { x: 120, y: 60 },
  ];
  const keepCorners = core.optimizeLoopPath(core.createLoop({
    role: 'detail',
    closed: false,
    points,
  }), {
    tolerance: 8,
    keepCorners: true,
  });
  const smooth = core.optimizeLoopPath(core.createLoop({
    role: 'detail',
    closed: false,
    points,
  }), {
    tolerance: 20,
    keepCorners: false,
  });

  assert.equal(keepCorners.stats.optimized, true);
  assert.ok(keepCorners.loop.points.some((point) => nearPoint(point, { x: 60, y: 0 })));
  assert.ok(keepCorners.loop.points.some((point) => nearPoint(point, { x: 60, y: 60 })));
  assert.ok(smooth.loop.points.length < keepCorners.loop.points.length);
});

test('path optimization applies to selected loops or active fallback', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 240, height: 180 },
    shapes: [
      {
        id: 'multi',
        loops: [
          {
            role: 'outer',
            closed: true,
            points: ellipsePoints(16, 80, 80, 40, 28),
          },
          {
            role: 'detail',
            closed: false,
            points: Array.from({ length: 8 }, (_, index) => ({ x: 20 + index * 20, y: 140 })),
          },
        ],
      },
    ],
  });

  let selected = core.selectPath(state, 0, 0);
  selected = core.togglePathSelection(selected, 0, 1);
  const multiResult = core.applySelectedLoopOptimization(selected, {
    tolerance: 3,
    keepCorners: true,
  });

  assert.equal(multiResult.stats.loopCount, 2);
  assert.equal(multiResult.stats.optimizedCount, 2);
  assert.equal(JSON.stringify(core.getSelectedPathRefs(multiResult.state)), '[{"shapeIndex":0,"loopIndex":0},{"shapeIndex":0,"loopIndex":1}]');
  assert.ok(core.buildVectorPack(multiResult.state).shapes[0].loops[0].points.length < 16);
  assert.ok(core.buildVectorPack(multiResult.state).shapes[0].loops[1].points.length < 8);

  const noSelection = core.clearPathSelection(state);
  const fallbackResult = core.applySelectedLoopOptimization(noSelection, {
    tolerance: 3,
    keepCorners: true,
  });
  assert.equal(fallbackResult.stats.loopCount, 1);
  assert.equal(core.getSelectedPathRefs(fallbackResult.state).length, 0);
  assert.ok(core.buildVectorPack(fallbackResult.state).shapes[0].loops[0].points.length < 16);
});

test('brush falloff moves center-near points more and leaves outside points alone', () => {
  const state = brushPack([
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 80, y: 0 },
    { x: 160, y: 0 },
  ]);
  const result = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 0, y: 0 },
    delta: { dx: 20, dy: 0 },
    radius: 100,
    strength: 1,
    falloff: 0.5,
    pinch: 0,
    bubble: 0,
  });
  const points = core.buildVectorPack(result.state).shapes[0].loops[0].points;

  assert.equal(result.stats.affectedPointCount, 3);
  assert.ok(points[0].x - 0 > points[1].x - 40);
  assert.ok(points[1].x - 40 > points[2].x - 80);
  assert.equal(points[3].x, 160);
});

test('brush pinch concentrates influence toward the center', () => {
  const looseMid = core.brushFalloffWeight(45, 100, {
    falloff: 0.55,
    pinch: 0,
    bubble: 0,
  });
  const pinchedMid = core.brushFalloffWeight(45, 100, {
    falloff: 0.55,
    pinch: 1,
    bubble: 0,
  });
  const looseCenter = core.brushFalloffWeight(0, 100, {
    falloff: 0.55,
    pinch: 0,
    bubble: 0,
  });
  const pinchedCenter = core.brushFalloffWeight(0, 100, {
    falloff: 0.55,
    pinch: 1,
    bubble: 0,
  });

  assert.ok(pinchedMid < looseMid);
  assert.equal(looseCenter, 1);
  assert.equal(pinchedCenter, 1);
});

test('brush bubble lifts the middle band without reversing drag direction', () => {
  const state = brushPack([
    { x: 0, y: 0 },
    { x: 55, y: 0 },
    { x: 100, y: 0 },
  ]);
  const plain = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 0, y: 0 },
    delta: { dx: 20, dy: 0 },
    radius: 100,
    strength: 1,
    falloff: 0.55,
    pinch: 0,
    bubble: 0,
  });
  const bubbled = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 0, y: 0 },
    delta: { dx: 20, dy: 0 },
    radius: 100,
    strength: 1,
    falloff: 0.55,
    pinch: 0,
    bubble: 1,
  });
  const plainPoint = core.buildVectorPack(plain.state).shapes[0].loops[0].points[1];
  const bubbledPoint = core.buildVectorPack(bubbled.state).shapes[0].loops[0].points[1];

  assert.ok(bubbledPoint.x > plainPoint.x);
  assert.ok(bubbledPoint.x > 55);
  assert.equal(bubbledPoint.y, 0);
});

test('brush defaults to all loops across shapes and can scope to selected-only', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 240, height: 180 },
    shapes: [
      {
        id: 'multi',
        loops: [
          {
            role: 'outer',
            closed: false,
            points: [
              { x: 0, y: 0 },
              { x: 20, y: 0 },
            ],
          },
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 0, y: 50 },
              { x: 20, y: 50 },
            ],
          },
        ],
      },
      {
        id: 'other',
        loops: [
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 0, y: 0 },
              { x: 20, y: 0 },
            ],
          },
        ],
      },
    ],
  });

  let selected = core.selectPath(state, 0, 1);
  let result = core.warpSelectedLoopsWithBrush(selected, {
    center: { x: 0, y: 0 },
    delta: { dx: 10, dy: 0 },
    radius: 40,
    strength: 1,
  });
  let pack = core.buildVectorPack(result.state);
  assert.ok(pack.shapes[0].loops[0].points[0].x > 0);
  assert.equal(pack.shapes[0].loops[1].points[0].x, 0);
  assert.ok(pack.shapes[1].loops[0].points[0].x > 0);
  assert.equal(JSON.stringify(core.getSelectedPathRefs(result.state)), '[{"shapeIndex":0,"loopIndex":1}]');

  result = core.warpSelectedLoopsWithBrush(selected, {
    center: { x: 0, y: 50 },
    delta: { dx: 10, dy: 0 },
    radius: 40,
    strength: 1,
    selectedOnly: true,
  });
  pack = core.buildVectorPack(result.state);
  assert.equal(pack.shapes[0].loops[0].points[0].x, 0);
  assert.ok(pack.shapes[0].loops[1].points[0].x > 0);
  assert.equal(pack.shapes[1].loops[0].points[0].x, 0);
  assert.equal(JSON.stringify(core.getSelectedPathRefs(result.state)), '[{"shapeIndex":0,"loopIndex":1}]');

  const noSelection = core.clearPathSelection(state);
  result = core.warpSelectedLoopsWithBrush(noSelection, {
    center: { x: 0, y: 0 },
    delta: { dx: 10, dy: 0 },
    radius: 40,
    strength: 1,
    selectedOnly: true,
  });
  pack = core.buildVectorPack(result.state);
  assert.ok(pack.shapes[0].loops[0].points[0].x > 0);
  assert.equal(pack.shapes[0].loops[1].points[0].x, 0);
  assert.equal(pack.shapes[1].loops[0].points[0].x, 0);
  assert.equal(core.getSelectedPathRefs(result.state).length, 0);
});

test('brush leaves relative handles alone by default and can sculpt them when enabled', () => {
  const state = brushPack([
    { x: 0, y: 0, out: { x: 30, y: 0 } },
    { x: 80, y: 0, in: { x: -30, y: 0 } },
  ]);
  const defaultHandles = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 0, y: 0 },
    delta: { dx: 20, dy: 0 },
    radius: 60,
    strength: 1,
    affectHandles: false,
  });
  const sculptHandles = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 0, y: 0 },
    delta: { dx: 20, dy: 0 },
    radius: 60,
    strength: 1,
    affectHandles: true,
  });
  const defaultOut = core.buildVectorPack(defaultHandles.state).shapes[0].loops[0].points[0].out;
  const sculptOut = core.buildVectorPack(sculptHandles.state).shapes[0].loops[0].points[0].out;

  assert.equal(JSON.stringify(defaultOut), '{"x":30,"y":0}');
  assert.notEqual(JSON.stringify(sculptOut), '{"x":30,"y":0}');
  assert.ok(sculptHandles.stats.affectedHandleCount > 0);
});

test('brush export stays Duhrng v1 without editor brush state', () => {
  const result = core.warpSelectedLoopsWithBrush(brushPack([
    { x: 0, y: 0 },
    { x: 40, y: 0 },
  ]), {
    center: { x: 0, y: 0 },
    delta: { dx: 10, dy: 0 },
    radius: 80,
    strength: 1,
    falloff: 0.55,
    pinch: 0.4,
    bubble: 0.5,
  });
  const exported = JSON.stringify(core.buildVectorPack(result.state));

  assert.equal(exported.includes('brush'), false);
  assert.equal(exported.includes('radius'), false);
  assert.equal(exported.includes('pinch'), false);
  assert.equal(exported.includes('bubble'), false);
  assert.equal(exported.includes('selectedOnly'), false);
  assert.equal(exported.includes('selectedPaths'), false);
});

test('separateSelectedPaths moves selected loops into standalone v1 shapes', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 640, height: 420 },
    shapes: [
      {
        id: 'panel',
        label: 'Panel',
        tags: ['cabinet', 'trim'],
        z: 3,
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
            ],
          },
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 10, y: 10 },
              { x: 90, y: 10 },
            ],
          },
        ],
        style: { fill: '#111111', stroke: '#222222', strokeWidth: 4 },
      },
    ],
  });

  let next = core.selectPath(state, 0, 1);
  next = core.separateSelectedPaths(next);

  assert.equal(next.shapes.length, 2);
  assert.equal(next.shapes[0].id, 'panel');
  assert.equal(next.shapes[0].loops.length, 1);
  assert.equal(next.shapes[1].id, 'panel_detail_2');
  assert.equal(next.shapes[1].tagsText, 'cabinet, trim');
  assert.equal(next.shapes[1].style.strokeWidth, 4);
  assert.equal(next.shapes[1].loops[0].role, 'detail');
  assert.equal(JSON.stringify(core.getSelectedPathRefs(next)), '[{"shapeIndex":1,"loopIndex":0}]');
  assert.equal(JSON.stringify(core.buildVectorPack(next)).includes('selectedPaths'), false);
});

test('mergeSelectedPathsIntoActiveShape moves external loops into the active shape', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 640, height: 420 },
    shapes: [
      {
        id: 'target',
        label: 'Target',
        tags: ['cabinet'],
        z: 2,
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
            ],
          },
        ],
        style: { fill: '#111111', stroke: '#222222', strokeWidth: 4 },
      },
      {
        id: 'source',
        label: 'Source',
        tags: ['trim'],
        z: 6,
        loops: [
          {
            role: 'detail',
            closed: false,
            points: [
              { x: 10, y: 10 },
              { x: 90, y: 10 },
            ],
          },
        ],
        style: { fill: '#333333', stroke: '#444444', strokeWidth: 7 },
      },
    ],
  });

  let next = core.selectPath(state, 1, 0);
  next = core.togglePathSelection(next, 0, 0);
  next = core.mergeSelectedPathsIntoActiveShape(next);

  assert.equal(next.shapes.length, 1);
  assert.equal(next.shapes[0].id, 'target');
  assert.equal(next.shapes[0].loops.length, 2);
  assert.equal(next.shapes[0].loops[1].role, 'detail');
  assert.equal(next.shapes[0].style.strokeWidth, 4);
  assert.equal(JSON.stringify(core.getSelectedPathRefs(next)), '[{"shapeIndex":0,"loopIndex":1},{"shapeIndex":0,"loopIndex":0}]');
  assert.equal(JSON.stringify(core.buildVectorPack(next)).includes('selectedPaths'), false);
});

test('loop ids survive duplicate, separate, merge, optimize, brush, and lasso edits', () => {
  let state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 240, height: 180 },
    shapes: [
      {
        id: 'target',
        loops: [
          {
            role: 'outer',
            id: 'outline',
            closed: true,
            points: ellipsePoints(12, 60, 60, 30, 22),
          },
          {
            role: 'detail',
            id: 'trim_line',
            closed: false,
            points: [
              { x: 0, y: 120 },
              { x: 40, y: 120 },
              { x: 80, y: 120 },
            ],
          },
        ],
      },
      {
        id: 'source',
        loops: [
          {
            role: 'effectZone',
            id: 'board_cell_00',
            closed: true,
            points: [
              { x: 120, y: 0 },
              { x: 160, y: 0 },
              { x: 160, y: 40 },
            ],
          },
        ],
      },
    ],
  });

  state = core.selectLoop(state, 1);
  state = core.duplicateSelectedLoop(state);
  assert.equal(
    JSON.stringify(core.buildVectorPack(state).shapes[0].loops.map((loop) => loop.id)),
    '["outline","trim_line","trim_line_2"]',
  );

  state = core.selectPath(state, 0, 2);
  state = core.separateSelectedPaths(state);
  assert.equal(core.buildVectorPack(state).shapes[2].loops[0].id, 'trim_line_2');

  state = core.selectPath(state, 1, 0);
  state = core.togglePathSelection(state, 0, 0);
  state = core.mergeSelectedPathsIntoActiveShape(state);
  assert.equal(
    JSON.stringify(core.buildVectorPack(state).shapes[0].loops.map((loop) => loop.id)),
    '["outline","trim_line","board_cell_00"]',
  );

  state = core.selectPath(state, 0, 0);
  state = core.applySelectedLoopOptimization(state, { tolerance: 3, keepCorners: true }).state;
  state = core.warpSelectedLoopsWithBrush(state, {
    center: { x: 60, y: 60 },
    delta: { dx: 2, dy: 0 },
    radius: 80,
    strength: 0.5,
    selectedOnly: true,
  }).state;
  state = core.selectPointsInRect(state, { x1: 0, y1: 0, x2: 120, y2: 120 });

  assert.equal(core.buildVectorPack(state).shapes[0].loops[0].id, 'outline');
  assert.ok(core.getSelectedPointRefs(state).length > 0);
});

test('import and export round trip preserves metadata, loops, and handles', () => {
  const pack = {
    version: 1,
    kind: 'duhrng-vector-pack',
    sourceImage: 'cabinet.png',
    canvas: { width: 640, height: 420 },
    shapes: [
      {
        id: 'main_cabinet_body',
        label: 'Main Cabinet Body',
        tags: ['cabinet', 'machine-shell'],
        z: 7,
        loops: [
          {
            role: 'outer',
            closed: true,
            fillRule: 'evenOdd',
            points: [
              { x: 10, y: 20, out: { x: 25, y: 0 } },
              { x: 200, y: 20, in: { x: -25, y: 0 } },
              { x: 200, y: 180 },
            ],
          },
          {
            role: 'cutout',
            closed: true,
            fillRule: 'evenOdd',
            points: [
              { x: 40, y: 50 },
              { x: 160, y: 50 },
              { x: 160, y: 140 },
            ],
          },
        ],
        style: {
          fill: '#7b4a22',
          stroke: '#21140d',
          strokeWidth: 6,
        },
      },
    ],
  };

  const state = core.importVectorPack(pack);
  const exported = core.buildVectorPack(state);
  const shape = core.getSelectedShape(state);

  assert.equal(state.sourceImage, 'cabinet.png');
  assert.equal(shape.tagsText, 'cabinet, machine-shell');
  assert.equal(exported.shapes[0].id, 'main_cabinet_body');
  assert.equal(exported.shapes[0].label, 'Main Cabinet Body');
  assert.equal(JSON.stringify(exported.shapes[0].tags), '["cabinet","machine-shell"]');
  assert.equal(exported.shapes[0].loops.length, 2);
  assert.equal(JSON.stringify(exported.shapes[0].loops[0].points[0].out), '{"x":25,"y":0}');
  assert.equal(JSON.stringify(exported.shapes[0].loops[0].points[1].in), '{"x":-25,"y":0}');
});

test('animation metadata round trips when clips or bindings are present', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 640, height: 420 },
    animation: {
      schemaVersion: 1,
      clips: [
        {
          id: 'roll_bounce',
          label: 'Roll Bounce',
          durationMs: 2500,
          loop: false,
          tracks: [
            {
              target: { tags: ['part:cabinet'] },
              property: 'transform',
              origin: { mode: 'canvas', x: 320, y: 300 },
              blend: 'add',
              keyframes: [
                { timeMs: 0, value: { tx: 0, ty: 0, sx: 1, sy: 1, rotation: 0 } },
                { timeMs: 360, ease: 'easeOutBack', value: { tx: -3, ty: 4, sx: 1.01, sy: 0.985, skewX: -0.006 } },
              ],
            },
          ],
        },
      ],
      bindings: {
        pullPress: 'roll_bounce',
      },
    },
    shapes: [
      {
        id: 'cabinet',
        tags: ['part:cabinet'],
        loops: [
          {
            role: 'outer',
            id: 'outline',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
            ],
          },
        ],
      },
    ],
  });

  const exported = core.buildVectorPack(state);
  const serialized = JSON.stringify(exported);

  assert.equal(exported.animation.schemaVersion, 1);
  assert.equal(exported.animation.clips[0].tracks[0].property, 'transform');
  assert.equal(exported.animation.clips[0].tracks[0].origin.x, 320);
  assert.equal(exported.animation.bindings.pullPress, 'roll_bounce');
  assert.equal(core.animationSummary(state.animation), '1 clip | 1 binding | schema 1');
  assert.equal(serialized.includes('selectedPaths'), false);
  assert.equal(serialized.includes('scrub'), false);
});

test('animation bindings validate against clips while preserving bindings-only exports', () => {
  const bindingsOnly = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 640, height: 420 },
    animation: {
      schemaVersion: 1,
      clips: [],
      bindings: {
        roll: 'missing_clip',
      },
    },
    shapes: [
      {
        id: 'cabinet',
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 80 },
            ],
          },
        ],
      },
    ],
  });
  const exported = core.buildVectorPack(bindingsOnly);
  const codes = core.validateState(bindingsOnly).issues.map((issue) => issue.code);

  assert.equal(exported.animation.bindings.roll, 'missing_clip');
  assert.equal(exported.animation.clips.length, 0);
  assert.ok(codes.includes('animation-binding-missing-clip'));

  const valid = core.importVectorPack({
    ...exported,
    animation: {
      schemaVersion: 1,
      clips: [
        {
          id: 'missing_clip',
          durationMs: 100,
          tracks: [
            {
              target: { shapeId: 'cabinet' },
              property: 'transform',
              origin: { mode: 'canvas', x: 0, y: 0 },
              keyframes: [{ timeMs: 0, value: { tx: 0 } }],
            },
          ],
        },
      ],
      bindings: {
        roll: 'missing_clip',
      },
    },
  });
  const validCodes = core.validateState(valid).issues.map((issue) => issue.code);

  assert.equal(validCodes.includes('animation-binding-missing-clip'), false);
});

test('animation and loop-id validation catches contract issues', () => {
  const state = core.createInitialState();
  const invalid = {
    ...state,
    shapes: [
      {
        ...state.shapes[0],
        loops: state.shapes[0].loops.map((loop) => ({ ...loop, id: 'same_loop' })).concat({
          ...state.shapes[0].loops[0],
          id: 'same_loop',
        }),
      },
    ],
    animation: {
      schemaVersion: 1,
      clips: [
        {
          id: 'bad_clip',
          durationMs: 0,
          tracks: [
            {
              target: { shapeId: 'missing_shape' },
              property: 'transform',
              origin: { mode: 'selection' },
              keyframes: [
                { timeMs: 50, ease: 'wobble', value: { tx: 'far' } },
                { timeMs: 10, value: {} },
              ],
            },
            {
              target: { tags: ['part:missing'] },
              property: 'procedural.rattle',
            },
          ],
        },
        {
          id: 'bad_clip',
          durationMs: 100,
          tracks: [],
        },
      ],
      bindings: {
        roll: 'missing_clip',
      },
    },
  };

  const codes = core.validateState(invalid).issues.map((issue) => issue.code);

  assert.ok(codes.includes('loop-id-duplicate'));
  assert.ok(codes.includes('animation-clip-id-duplicate'));
  assert.ok(codes.includes('animation-duration'));
  assert.ok(codes.includes('animation-target-missing-shape'));
  assert.ok(codes.includes('animation-origin-invalid'));
  assert.ok(codes.includes('animation-keyframes-order'));
  assert.ok(codes.includes('animation-ease-unknown'));
  assert.ok(codes.includes('animation-transform-value'));
  assert.ok(codes.includes('animation-property-unknown'));
  assert.ok(codes.includes('animation-target-zero-tags'));
  assert.ok(codes.includes('animation-binding-missing-clip'));
});

test('malformed imported animation is not exported but remains visible to validation', () => {
  const state = core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 100, height: 100 },
    animation: 'not an object',
    shapes: [
      {
        id: 'shape',
        loops: [
          {
            role: 'outer',
            closed: true,
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 50 },
            ],
          },
        ],
      },
    ],
  });

  const exported = core.buildVectorPack(state);
  const validation = core.validateState(state);

  assert.equal(exported.animation, undefined);
  assert.ok(validation.issues.some((issue) => issue.code === 'animation-malformed'));
});

test('tag presets add semantic tags and optional zone roles', () => {
  let state = core.createInitialState();

  assert.ok(core.TAG_PRESETS.some((preset) => preset.value === 'slot:board'));
  assert.equal(core.tagPresetLoopRole('slot:board'), 'effectZone');
  assert.equal(core.tagPresetLoopRole('fx:glow'), 'effectZone');
  assert.equal(core.tagPresetLoopRole('hit:lever'), 'hitZone');
  assert.equal(core.tagPresetLoopRole('part:cabinet'), null);

  state = core.addTagPresetToSelectedShape(state, 'slot:board');
  assert.equal(core.getSelectedShape(state).tagsText, 'cabinet, slot:board');
  assert.equal(core.getSelectedLoop(state).role, 'outer');

  state = core.addTagPresetToSelectedShape(state, 'slot:board');
  assert.equal(core.getSelectedShape(state).tagsText, 'cabinet, slot:board');

  state = core.addTagPresetToSelectedShape(state, 'slot:board', true);
  assert.equal(core.getSelectedShape(state).tagsText, 'cabinet, slot:board');
  assert.equal(core.getSelectedLoop(state).role, 'effectZone');

  state = core.addTagPresetToSelectedShape(state, 'hit:lever', true);
  assert.equal(core.getSelectedShape(state).tagsText, 'cabinet, slot:board, hit:lever');
  assert.equal(core.getSelectedLoop(state).role, 'hitZone');

  const exported = core.buildVectorPack(state);
  assert.equal(JSON.stringify(exported.shapes[0].tags), '["cabinet","slot:board","hit:lever"]');
  assert.equal(exported.shapes[0].loops[0].role, 'hitZone');
});

function ellipsePoints(count, centerX, centerY, radiusX, radiusY) {
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI * 2 * index / count;
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
}

function nearPoint(point, target, tolerance = 0.5) {
  return Math.hypot(point.x - target.x, point.y - target.y) <= tolerance;
}

function brushPack(points) {
  return core.importVectorPack({
    version: 1,
    kind: 'duhrng-vector-pack',
    canvas: { width: 240, height: 180 },
    shapes: [
      {
        id: 'target',
        loops: [
          {
            role: 'detail',
            closed: false,
            points,
          },
        ],
      },
    ],
  });
}
