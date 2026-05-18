(function attachVectorAuthoringCore(global) {
  'use strict';

  const VECTOR_PACK_KIND = 'duhrng-vector-pack';
  const VECTOR_PACK_VERSION = 1;
  const ANIMATION_SCHEMA_VERSION = 1;
  const ANIMATION_GRAPH_SCHEMA_VERSION = 2;
  const DEFAULT_CANVAS = Object.freeze({ width: 1536, height: 1024 });
  const DEFAULT_STYLE = Object.freeze({
    fill: '#7b4a22',
    stroke: '#21140d',
    strokeWidth: 5,
  });
  const LOOP_ROLES = Object.freeze([
    'outer',
    'cutout',
    'detail',
    'hitZone',
    'effectZone',
  ]);
  const TAG_PRESETS = Object.freeze([
    { group: 'Slots', value: 'slot:board' },
    { group: 'Slots', value: 'slot:roll_machine' },
    { group: 'Slots', value: 'slot:active_matches' },
    { group: 'Slots', value: 'slot:treasure_pool' },
    { group: 'Slots', value: 'slot:enemy_intent' },
    { group: 'Slots', value: 'slot:heroes' },
    { group: 'Slots', value: 'slot:formation' },
    { group: 'Slots', value: 'slot:actions' },
    { group: 'Parts', value: 'part:cabinet' },
    { group: 'Parts', value: 'part:trim' },
    { group: 'FX', value: 'fx:glow' },
    { group: 'Hit', value: 'hit:lever' },
  ]);
  const VALIDATION_STATUS = Object.freeze({
    ok: 'ok',
    warning: 'warning',
    error: 'error',
  });
  const PATH_OPTIMIZATION_DEFAULTS = Object.freeze({
    tolerance: 3,
    sampleSpacing: 4,
    minSampleDistance: 0.05,
    cornerAngleDegrees: 132,
    maxDepth: 12,
    maxSegments: 96,
  });
  const TRANSFORM_VALUE_KEYS = Object.freeze(['tx', 'ty', 'rotation', 'sx', 'sy', 'skewX', 'skewY']);
  const KNOWN_EASES = Object.freeze(['hold', 'linear', 'smooth', 'easeIn', 'easeOut', 'easeInOut', 'easeOutBack']);
  const GRAPH_NODE_TYPES = Object.freeze([
    'keyframes.number',
    'keyframes.vec2',
    'keyframes.color',
    'keyframes.transform',
  ]);
  const GRAPH_OUTPUT_PROPERTIES = Object.freeze([
    'loop.transform',
    'point.positionDelta',
    'point.inHandleDelta',
    'point.outHandleDelta',
    'shape.style.fill',
    'shape.style.stroke',
    'shape.style.strokeWidth',
    'shape.opacity',
  ]);
  const GRAPH_INTERPOLATIONS = Object.freeze(['hold', 'linear', 'smooth', 'easeIn', 'easeOut', 'easeInOut']);
  const ANIMATION_BINDING_PRESETS = Object.freeze([
    'pullPress',
    'pullRelease',
    'roll',
    'settle',
    'damage',
    'payout',
    'intentPulse',
    'click',
  ]);

  function createInitialState() {
    return {
      canvas: { ...DEFAULT_CANVAS },
      sourceImage: null,
      animation: null,
      animationIssues: [],
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      shapes: [
        createShape({
          id: 'traced_shape',
          label: 'Traced Shape',
          tagsText: 'cabinet',
          z: 10,
          loops: [createLoop({ role: 'outer' })],
        }),
      ],
      selectedShapeIndex: 0,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(0, 0)],
      selectedPoints: [],
    };
  }

  function createShape(overrides = {}) {
    const rawLoops = overrides.loops && overrides.loops.length
      ? overrides.loops
      : [createLoop({ role: 'outer' })];
    return {
      id: overrides.id || 'traced_shape',
      label: overrides.label || overrides.id || 'Traced Shape',
      tagsText: overrides.tagsText ?? 'cabinet',
      z: parseInteger(overrides.z, 10),
      style: cleanStyle(overrides.style || DEFAULT_STYLE),
      loops: normalizeShapeLoopIds(rawLoops.map(cleanLoop)),
    };
  }

  function createLoop(overrides = {}) {
    return cleanLoop({
      id: overrides.id,
      role: overrides.role || 'outer',
      closed: Boolean(overrides.closed),
      fillRule: overrides.fillRule || 'nonZero',
      points: overrides.points || [],
    });
  }

  function screenToCanvas(viewport, screenPoint) {
    return {
      x: (screenPoint.x - viewport.offsetX) / viewport.scale,
      y: (screenPoint.y - viewport.offsetY) / viewport.scale,
    };
  }

  function canvasToScreen(viewport, canvasPoint) {
    return {
      x: canvasPoint.x * viewport.scale + viewport.offsetX,
      y: canvasPoint.y * viewport.scale + viewport.offsetY,
    };
  }

  function zoomViewportAt(viewport, screenPoint, wheelDelta, minScale = 0.12, maxScale = 12) {
    const before = screenToCanvas(viewport, screenPoint);
    const factor = Math.exp(-wheelDelta * 0.001);
    const nextScale = clamp(viewport.scale * factor, minScale, maxScale);
    return {
      scale: nextScale,
      offsetX: screenPoint.x - before.x * nextScale,
      offsetY: screenPoint.y - before.y * nextScale,
    };
  }

  function panViewport(viewport, delta) {
    return {
      scale: viewport.scale,
      offsetX: viewport.offsetX + delta.x,
      offsetY: viewport.offsetY + delta.y,
    };
  }

  function getSelectedShape(state) {
    return state.shapes[state.selectedShapeIndex] || null;
  }

  function getSelectedLoop(state) {
    const shape = getSelectedShape(state);
    return shape ? shape.loops[state.selectedLoopIndex] || null : null;
  }

  function selectShape(state, index) {
    const selectedShapeIndex = clampIndex(index, state.shapes.length);
    const shape = state.shapes[selectedShapeIndex];
    const selectedLoopIndex = clampIndex(0, shape.loops.length);
    return {
      ...state,
      selectedShapeIndex,
      selectedLoopIndex,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(selectedShapeIndex, selectedLoopIndex)],
      selectedPoints: [],
    };
  }

  function selectLoop(state, index) {
    const shape = getSelectedShape(state);
    if (!shape) {
      return state;
    }
    return {
      ...state,
      selectedLoopIndex: clampIndex(index, shape.loops.length),
      selectedPointIndex: -1,
      selectedPaths: [
        createPathRef(state.selectedShapeIndex, clampIndex(index, shape.loops.length)),
      ],
      selectedPoints: [],
    };
  }

  function selectPoint(state, index) {
    return selectPointRef(state, state.selectedShapeIndex, state.selectedLoopIndex, index);
  }

  function selectPath(state, shapeIndex, loopIndex) {
    const ref = normalizePathRef(state, { shapeIndex, loopIndex });
    if (!ref) {
      return state;
    }
    return {
      ...state,
      selectedShapeIndex: ref.shapeIndex,
      selectedLoopIndex: ref.loopIndex,
      selectedPointIndex: -1,
      selectedPaths: [ref],
      selectedPoints: [],
    };
  }

  function togglePathSelection(state, shapeIndex, loopIndex) {
    const ref = normalizePathRef(state, { shapeIndex, loopIndex });
    if (!ref) {
      return state;
    }
    const selectedPaths = getSelectedPathRefs(state);
    const existingIndex = selectedPaths.findIndex((item) => samePathRef(item, ref));
    const nextPaths = selectedPaths.slice();
    if (existingIndex >= 0) {
      nextPaths.splice(existingIndex, 1);
    } else {
      nextPaths.push(ref);
    }
    const pathKeys = new Set(nextPaths.map(pathKey));
    return {
      ...state,
      selectedShapeIndex: ref.shapeIndex,
      selectedLoopIndex: ref.loopIndex,
      selectedPointIndex: -1,
      selectedPaths: nextPaths,
      selectedPoints: getSelectedPointRefs(state).filter((pointRef) => (
        pathKeys.has(pathKey(pointRef))
      )),
    };
  }

  function clearPathSelection(state) {
    return { ...state, selectedPaths: [], selectedPoints: [], selectedPointIndex: -1 };
  }

  function getSelectedPathRefs(state) {
    const refs = Array.isArray(state.selectedPaths) ? state.selectedPaths : [];
    const output = [];
    for (const ref of refs) {
      const normalized = normalizePathRef(state, ref);
      if (normalized && !output.some((item) => samePathRef(item, normalized))) {
        output.push(normalized);
      }
    }
    return output;
  }

  function isPathSelected(state, shapeIndex, loopIndex) {
    const ref = createPathRef(shapeIndex, loopIndex);
    return getSelectedPathRefs(state).some((item) => samePathRef(item, ref));
  }

  function getSelectedPointRefs(state) {
    const refs = Array.isArray(state.selectedPoints) ? state.selectedPoints : [];
    const output = [];
    for (const ref of refs) {
      const normalized = normalizePointRef(state, ref);
      if (normalized && !output.some((item) => samePointRef(item, normalized))) {
        output.push(normalized);
      }
    }
    return output;
  }

  function isPointSelected(state, shapeIndex, loopIndex, pointIndex) {
    const ref = createPointRef(shapeIndex, loopIndex, pointIndex);
    return getSelectedPointRefs(state).some((item) => samePointRef(item, ref));
  }

  function selectPointRef(state, shapeIndex, loopIndex, pointIndex) {
    const ref = normalizePointRef(state, { shapeIndex, loopIndex, pointIndex });
    if (!ref) {
      return { ...state, selectedPointIndex: -1, selectedPoints: [] };
    }
    return {
      ...state,
      selectedShapeIndex: ref.shapeIndex,
      selectedLoopIndex: ref.loopIndex,
      selectedPointIndex: ref.pointIndex,
      selectedPaths: [createPathRef(ref.shapeIndex, ref.loopIndex)],
      selectedPoints: [ref],
    };
  }

  function togglePointSelection(state, shapeIndex, loopIndex, pointIndex) {
    const ref = normalizePointRef(state, { shapeIndex, loopIndex, pointIndex });
    if (!ref) {
      return state;
    }
    const selectedPoints = getSelectedPointRefs(state);
    const existingIndex = selectedPoints.findIndex((item) => samePointRef(item, ref));
    const nextPoints = selectedPoints.slice();
    if (existingIndex >= 0) {
      nextPoints.splice(existingIndex, 1);
    } else {
      nextPoints.push(ref);
    }
    const selectedPaths = getSelectedPathRefs(state);
    const pointPath = createPathRef(ref.shapeIndex, ref.loopIndex);
    if (!selectedPaths.some((item) => samePathRef(item, pointPath))) {
      selectedPaths.push(pointPath);
    }
    return withSelectedPointRefs(state, nextPoints, {
      selectedShapeIndex: ref.shapeIndex,
      selectedLoopIndex: ref.loopIndex,
      selectedPaths,
    });
  }

  function clearPointSelection(state) {
    return { ...state, selectedPointIndex: -1, selectedPoints: [] };
  }

  function selectPointsInRect(state, rect, options = {}) {
    const minX = Math.min(Number(rect?.x1), Number(rect?.x2));
    const maxX = Math.max(Number(rect?.x1), Number(rect?.x2));
    const minY = Math.min(Number(rect?.y1), Number(rect?.y2));
    const maxY = Math.max(Number(rect?.y1), Number(rect?.y2));
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) {
      return withSelectedPointRefs(state, options.toggle ? getSelectedPointRefs(state) : []);
    }
    const refs = collectScopedPointRefs(state).filter(({ point }) => (
      point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    )).map((item) => item.ref);
    return applyPointSelection(state, refs, options);
  }

  function selectPointsInPolygon(state, polygon, options = {}) {
    const points = Array.isArray(polygon)
      ? polygon
        .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : [];
    if (points.length < 3) {
      return withSelectedPointRefs(state, options.toggle ? getSelectedPointRefs(state) : []);
    }
    const refs = collectScopedPointRefs(state).filter(({ point }) => (
      pointInPolygon(point, points)
    )).map((item) => item.ref);
    return applyPointSelection(state, refs, options);
  }

  function selectPathsInRect(state, rect, options = {}) {
    const bounds = normalizeSelectionRect(rect);
    if (!bounds) {
      return applyPathSelection(state, [], options);
    }
    const refs = collectLassoPathRefs(state, options).filter(({ loop }) => (
      loopHitsRect(loop, bounds)
    )).map((item) => item.ref);
    return applyPathSelection(state, refs, options);
  }

  function selectPathsInPolygon(state, polygon, options = {}) {
    const points = Array.isArray(polygon)
      ? polygon
        .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      : [];
    if (points.length < 3) {
      return applyPathSelection(state, [], options);
    }
    const refs = collectLassoPathRefs(state, options).filter(({ loop }) => (
      loopHitsPolygon(loop, points)
    )).map((item) => item.ref);
    return applyPathSelection(state, refs, options);
  }

  function groupSelectedPaths(state) {
    const selectedPaths = getSelectedPathRefs(state);
    if (selectedPaths.length < 2) {
      return state;
    }

    const lastRef = selectedPaths[selectedPaths.length - 1];
    const sourceShape = state.shapes[lastRef.shapeIndex];
    const selectedKeys = new Set(selectedPaths.map(pathKey));
    const movedLoops = selectedPaths.map((ref) => cloneLoop(state.shapes[ref.shapeIndex].loops[ref.loopIndex]));
    const shapes = [];

    state.shapes.forEach((shape, shapeIndex) => {
      const loops = shape.loops.filter((_, loopIndex) => (
        !selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
      ));
      if (loops.length > 0) {
        shapes.push(createShape({ ...cloneShape(shape), loops }));
      }
    });

    const groupId = uniquePathGroupId(state.shapes);
    const groupShape = createShape({
      id: groupId,
      label: titleFromId(groupId),
      tagsText: sourceShape.tagsText,
      z: parseInteger(sourceShape.z, nextZ(state.shapes)),
      style: sourceShape.style,
      loops: movedLoops,
    });
    const selectedShapeIndex = shapes.length;
    const selectedPathsForGroup = movedLoops.map((_, loopIndex) => (
      createPathRef(selectedShapeIndex, loopIndex)
    ));
    return {
      ...state,
      shapes: [...shapes, groupShape],
      selectedShapeIndex,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: selectedPathsForGroup,
      selectedPoints: [],
    };
  }

  function moveSelectedPaths(state, delta) {
    const selectedPaths = getSelectedPathRefs(state);
    if (!selectedPaths.length) {
      return state;
    }
    const dx = Number(delta?.dx) || 0;
    const dy = Number(delta?.dy) || 0;
    if (dx === 0 && dy === 0) {
      return state;
    }

    const selectedKeys = new Set(selectedPaths.map(pathKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => (
        selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
          ? translateLoop(loop, dx, dy)
          : cloneLoop(loop)
      )),
    }));
    return {
      ...state,
      shapes,
      selectedPaths,
    };
  }

  function moveSelectedPoints(state, delta) {
    const selectedPoints = getSelectedPointRefs(state);
    if (!selectedPoints.length) {
      return state;
    }
    const dx = Number(delta?.dx) || 0;
    const dy = Number(delta?.dy) || 0;
    if (dx === 0 && dy === 0) {
      return state;
    }
    const selectedKeys = new Set(selectedPoints.map(pointKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => cleanLoop({
        ...loop,
        points: loop.points.map((point, pointIndex) => (
          selectedKeys.has(pointKey(createPointRef(shapeIndex, loopIndex, pointIndex)))
            ? cleanPoint({
              ...clonePoint(point),
              x: point.x + dx,
              y: point.y + dy,
            })
            : clonePoint(point)
        )),
      })),
    }));
    return withSelectedPointRefs({
      ...state,
      shapes,
    }, selectedPoints);
  }

  function scaleSelection(state, options = {}) {
    return transformSelection(state, options);
  }

  function scaleSelectedPoints(state, options = {}) {
    return transformSelectedPoints(state, options);
  }

  function scaleSelectedPaths(state, options = {}) {
    return transformSelectedPaths(state, options);
  }

  function transformSelection(state, options = {}) {
    const selectedPoints = getSelectedPointRefs(state);
    if (selectedPoints.length) {
      return transformSelectedPoints(state, options);
    }
    return transformSelectedPaths(state, options);
  }

  function transformSelectedPoints(state, options = {}) {
    const target = resolveTransformTarget(state, 'points');
    return applySelectionTransformToTarget(state, target, options);
  }

  function transformSelectedPaths(state, options = {}) {
    const target = resolveTransformTarget(state, 'paths');
    return applySelectionTransformToTarget(state, target, options);
  }

  function previewSelectionTransform(state, options = {}) {
    const target = resolveTransformTarget(state);
    const transform = normalizeTransformOptions(options);
    const origin = resolveTransformOrigin(state, target, transform.origin);
    const stats = createTransformStats(target, transform, origin);
    if (!target.refs.length || !origin) {
      return { previews: [], stats };
    }
    return {
      previews: buildTransformPreviews(state, target, { ...transform, origin }),
      stats,
    };
  }

  function applySelectionTransformToTarget(state, target, options = {}) {
    const transform = normalizeTransformOptions(options);
    const origin = resolveTransformOrigin(state, target, transform.origin);
    const stats = createTransformStats(target, transform, origin);
    if (!target.refs.length || !origin) {
      return { state, stats };
    }

    if (target.type === 'points') {
      const selectedKeys = new Set(target.refs.map(pointKey));
      const shapes = state.shapes.map((shape, shapeIndex) => createShape({
        ...cloneShape(shape),
        loops: shape.loops.map((loop, loopIndex) => cleanLoop({
          ...loop,
          points: loop.points.map((point, pointIndex) => (
            selectedKeys.has(pointKey(createPointRef(shapeIndex, loopIndex, pointIndex)))
              ? transformPointAround(point, origin, transform)
              : clonePoint(point)
          )),
        })),
      }));
      return {
        state: withSelectedPointRefs({ ...state, shapes }, target.refs),
        stats,
      };
    }

    const selectedKeys = new Set(target.refs.map(pathKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => (
        selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
          ? transformLoopAround(loop, origin, transform)
          : cloneLoop(loop)
      )),
    }));
    return {
      state: {
        ...state,
        shapes,
        selectedPaths: getSelectedPathRefs(state),
      },
      stats,
    };
  }

  function deleteSelectedPoints(state) {
    const selectedPoints = getSelectedPointRefs(state);
    if (!selectedPoints.length) {
      return deleteSelectedPoint(state);
    }
    const selectedKeys = new Set(selectedPoints.map(pointKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => {
        const points = loop.points.filter((_, pointIndex) => (
          !selectedKeys.has(pointKey(createPointRef(shapeIndex, loopIndex, pointIndex)))
        )).map(clonePoint);
        return cleanLoop({
          ...loop,
          points,
          closed: points.length >= 3 ? loop.closed : false,
        });
      }),
    }));
    return {
      ...state,
      shapes,
      selectedPointIndex: -1,
      selectedPoints: [],
    };
  }

  function clearSelectedPointHandles(state) {
    const selectedPoints = getSelectedPointRefs(state);
    if (!selectedPoints.length) {
      return clearPointHandles(state);
    }
    const selectedKeys = new Set(selectedPoints.map(pointKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => cleanLoop({
        ...loop,
        points: loop.points.map((point, pointIndex) => (
          selectedKeys.has(pointKey(createPointRef(shapeIndex, loopIndex, pointIndex)))
            ? cleanPoint({ ...point, inHandle: null, outHandle: null })
            : clonePoint(point)
        )),
      })),
    }));
    return withSelectedPointRefs({
      ...state,
      shapes,
    }, selectedPoints);
  }

  function separateSelectedPaths(state) {
    const selectedPaths = getSelectedPathRefs(state);
    if (!selectedPaths.length) {
      return state;
    }

    const selectedKeys = new Set(selectedPaths.map(pathKey));
    const selectedItems = selectedPaths.map((ref) => ({
      ref,
      shape: state.shapes[ref.shapeIndex],
      loop: state.shapes[ref.shapeIndex].loops[ref.loopIndex],
    }));
    const shapes = [];

    state.shapes.forEach((shape, shapeIndex) => {
      const loops = shape.loops.filter((_, loopIndex) => (
        !selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
      ));
      if (loops.length > 0) {
        shapes.push(createShape({ ...cloneShape(shape), loops }));
      }
    });

    const usedIds = shapes.map((shape) => shape.id);
    const selectedShapeIndex = shapes.length;
    const separatedShapes = selectedItems.map((item) => {
      const baseId = `${normalizeId(item.shape.id)}_${normalizeId(item.loop.role)}_${item.ref.loopIndex + 1}`;
      const id = uniqueId(baseId, usedIds);
      usedIds.push(id);
      return createShape({
        id,
        label: `${item.shape.label || item.shape.id} ${titleFromId(item.loop.role)} ${item.ref.loopIndex + 1}`,
        tagsText: item.shape.tagsText,
        z: parseInteger(item.shape.z, 0),
        style: item.shape.style,
        loops: [cloneLoop(item.loop)],
      });
    });
    const selectedPathsForSeparated = separatedShapes.map((_, index) => (
      createPathRef(selectedShapeIndex + index, 0)
    ));

    return {
      ...state,
      shapes: [...shapes, ...separatedShapes],
      selectedShapeIndex,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: selectedPathsForSeparated,
      selectedPoints: [],
    };
  }

  function mergeSelectedPathsIntoActiveShape(state) {
    const selectedPaths = getSelectedPathRefs(state);
    const activeShape = getSelectedShape(state);
    if (!selectedPaths.length || !activeShape) {
      return state;
    }

    const activeShapeIndex = state.selectedShapeIndex;
    const selectedKeys = new Set(selectedPaths.map(pathKey));
    const movedItems = selectedPaths.filter((ref) => ref.shapeIndex !== activeShapeIndex).map((ref) => ({
      ref,
      loop: state.shapes[ref.shapeIndex].loops[ref.loopIndex],
    }));
    const appendedLoopIndexByKey = new Map();
    const appendedLoops = movedItems.map((item, index) => {
      const loopIndex = activeShape.loops.length + index;
      appendedLoopIndexByKey.set(pathKey(item.ref), loopIndex);
      return cloneLoop(item.loop);
    });

    const shapes = [];
    let selectedShapeIndex = -1;
    state.shapes.forEach((shape, shapeIndex) => {
      if (shapeIndex === activeShapeIndex) {
        selectedShapeIndex = shapes.length;
        shapes.push(createShape({
          ...cloneShape(shape),
          loops: [...shape.loops.map(cloneLoop), ...appendedLoops],
        }));
        return;
      }

      const loops = shape.loops.filter((_, loopIndex) => (
        !selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
      ));
      if (loops.length > 0) {
        shapes.push(createShape({ ...cloneShape(shape), loops }));
      }
    });

    const selectedPathsForMerge = selectedPaths.map((ref) => {
      if (ref.shapeIndex === activeShapeIndex) {
        return createPathRef(selectedShapeIndex, ref.loopIndex);
      }
      return createPathRef(selectedShapeIndex, appendedLoopIndexByKey.get(pathKey(ref)));
    });

    return {
      ...state,
      shapes,
      selectedShapeIndex,
      selectedLoopIndex: selectedPathsForMerge[0]?.loopIndex ?? 0,
      selectedPointIndex: -1,
      selectedPaths: selectedPathsForMerge,
      selectedPoints: [],
    };
  }

  function getLoopEditPathRefs(state) {
    const selectedPaths = getSelectedPathRefs(state);
    if (selectedPaths.length) {
      return selectedPaths;
    }
    const ref = normalizePathRef(state, createPathRef(state.selectedShapeIndex, state.selectedLoopIndex));
    return ref ? [ref] : [];
  }

  function countPathRefPoints(state, refs = getLoopEditPathRefs(state)) {
    return refs.reduce((total, ref) => {
      const normalized = normalizePathRef(state, ref);
      if (!normalized) {
        return total;
      }
      return total + state.shapes[normalized.shapeIndex].loops[normalized.loopIndex].points.length;
    }, 0);
  }

  function ensurePointIdsForRefs(state, refs = []) {
    const pointRefs = refs.map((ref) => normalizePointRef(state, ref)).filter(Boolean);
    if (!pointRefs.length) {
      return state;
    }
    const loopKeys = new Set(pointRefs.map(pathKey));
    let changed = false;
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => {
        if (!loopKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))) {
          return cloneLoop(loop);
        }
        const usedIds = new Set();
        const points = loop.points.map((point, pointIndex) => {
          const baseId = normalizeLoopId(point.id) || defaultPointId(pointIndex);
          const id = uniquePointId(baseId, usedIds);
          usedIds.add(id);
          if (point.id === id) {
            return clonePoint(point);
          }
          changed = true;
          return cleanPoint({ ...point, id });
        });
        return cleanLoop({ ...loop, points });
      }),
    }));
    if (!changed) {
      return state;
    }
    return withSelectedPointRefs({
      ...state,
      shapes,
      selectedPaths: getSelectedPathRefs(state),
    }, pointRefs);
  }

  function selectedPathBounds(state) {
    return pathRefsBounds(state, getSelectedPathRefs(state));
  }

  function selectedPointBounds(state) {
    return pointRefsBounds(state, getSelectedPointRefs(state));
  }

  function pathRefsBounds(state, refs) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const ref of refs || []) {
      const normalized = normalizePathRef(state, ref);
      if (!normalized) {
        continue;
      }
      const loop = state.shapes[normalized.shapeIndex].loops[normalized.loopIndex];
      for (const point of loop.points) {
        addBoundsPoint(point);
        for (const handleName of ['inHandle', 'outHandle']) {
          const handle = point[handleName];
          if (handle) {
            addBoundsPoint({ x: point.x + handle.x, y: point.y + handle.y });
          }
        }
      }
    }

    if (!Number.isFinite(minX)) {
      return null;
    }
    return {
      minX: round(minX),
      minY: round(minY),
      maxX: round(maxX),
      maxY: round(maxY),
      width: round(maxX - minX),
      height: round(maxY - minY),
    };

    function addBoundsPoint(point) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  function pointRefsBounds(state, refs) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const ref of refs || []) {
      const normalized = normalizePointRef(state, ref);
      if (!normalized) {
        continue;
      }
      const point = state.shapes[normalized.shapeIndex].loops[normalized.loopIndex].points[normalized.pointIndex];
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    if (!Number.isFinite(minX)) {
      return null;
    }
    return {
      minX: round(minX),
      minY: round(minY),
      maxX: round(maxX),
      maxY: round(maxY),
      width: round(maxX - minX),
      height: round(maxY - minY),
    };
  }

  function removeNearDuplicateSelectedLoops(state, threshold = 1.5) {
    return updateLoopEditRefs(state, (loop) => removeNearDuplicateLoop(loop, threshold));
  }

  function simplifyStraightSelectedLoops(state, tolerance = 0.75) {
    return updateLoopEditRefs(state, (loop) => simplifyStraightLoop(loop, tolerance));
  }

  function closeSelectedLoopGaps(state, threshold = 8) {
    return updateLoopEditRefs(state, (loop) => closeLoopGap(loop, threshold));
  }

  function reverseSelectedLoops(state) {
    return updateLoopEditRefs(state, reverseLoop);
  }

  function brushFalloffWeight(distance, radius, options = {}) {
    const safeRadius = Math.max(0.001, Number(radius) || 0);
    const safeDistance = Math.max(0, Number(distance) || 0);
    if (safeDistance >= safeRadius) {
      return 0;
    }

    const t = clamp(safeDistance / safeRadius, 0, 1);
    const remaining = 1 - t;
    const falloff = normalizeUnit(options.falloff, 0.55);
    const pinch = normalizeUnit(options.pinch, 0);
    const bubble = normalizeUnit(options.bubble, 0);

    const linear = remaining;
    const diffuse = Math.pow(remaining, 0.45);
    const base = lerp(linear, diffuse, falloff);
    const pinched = Math.pow(base, 1 + pinch * 3.5);
    const midBand = Math.sin(Math.PI * t);
    const bubbleLift = bubble * 0.55 * midBand * (1 - pinched);
    return clamp(pinched + bubbleLift, 0, 1);
  }

  function warpSelectedLoopsWithBrush(state, brush = {}) {
    const options = normalizeBrush(brush);
    const refs = brushTargetRefs(state, options);
    const stats = createBrushStats(0);
    if (!refs.length || (Math.abs(options.dx) < 0.0001 && Math.abs(options.dy) < 0.0001)) {
      return { state, stats };
    }

    const targetKeys = new Set(refs.map(pathKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => {
        if (!targetKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))) {
          return cloneLoop(loop);
        }
        const result = warpLoopWithBrush(loop, options);
        mergeBrushStats(stats, result.stats);
        return result.loop;
      }),
    }));

    return {
      state: {
        ...state,
        shapes,
        selectedPointIndex: -1,
        selectedPaths: getSelectedPathRefs(state),
        selectedPoints: [],
      },
      stats,
    };
  }

  function brushTargetRefs(state, options) {
    if (options.selectedOnly) {
      return getLoopEditPathRefs(state);
    }
    const refs = [];
    state.shapes.forEach((shape, shapeIndex) => {
      shape.loops.forEach((_, loopIndex) => {
        refs.push(createPathRef(shapeIndex, loopIndex));
      });
    });
    return refs;
  }

  function sampleLoopPath(loop, options = {}) {
    return sampleLoopPathDetails(loop, options).points;
  }

  function optimizeLoopPath(loop, options = {}) {
    const sourceLoop = cleanLoop(loop);
    const beforePoints = sourceLoop.points.length;
    const tolerance = optimizeTolerance(options);
    const maxDepth = parseInteger(options.maxDepth, PATH_OPTIMIZATION_DEFAULTS.maxDepth);
    const maxSegments = parseInteger(options.maxSegments, PATH_OPTIMIZATION_DEFAULTS.maxSegments);
    const emptyStats = createOptimizationStats({
      beforePoints,
      afterPoints: beforePoints,
      maxError: 0,
      skipped: true,
      reason: 'too few points',
    });

    if (sourceLoop.closed ? beforePoints < 4 : beforePoints < 3) {
      return { loop: sourceLoop, stats: emptyStats };
    }

    const details = sampleLoopPathDetails(sourceLoop, {
      sampleSpacing: optimizeSampleSpacing(options),
    });
    const samples = details.points;
    if (sourceLoop.closed ? samples.length < 6 : samples.length < 3) {
      return { loop: sourceLoop, stats: emptyStats };
    }

    const splitIndices = optimizationSplitIndices(sourceLoop, details, options);
    const spans = optimizationSpans(samples, splitIndices, sourceLoop.closed);
    if (!spans.length) {
      return {
        loop: sourceLoop,
        stats: createOptimizationStats({
          beforePoints,
          afterPoints: beforePoints,
          maxError: 0,
          skipped: true,
          reason: 'no fit spans',
        }),
      };
    }

    const segments = [];
    let fitMaxError = 0;
    for (const span of spans) {
      const fitted = fitCubicSpan(span, tolerance, maxDepth);
      fitMaxError = Math.max(fitMaxError, fitted.maxError);
      segments.push(...fitted.segments);
      if (segments.length > maxSegments) {
        return {
          loop: sourceLoop,
          stats: createOptimizationStats({
            beforePoints,
            afterPoints: beforePoints,
            maxError: fitMaxError,
            skipped: true,
            reason: 'too many segments',
          }),
        };
      }
    }

    if (!segments.length) {
      return {
        loop: sourceLoop,
        stats: createOptimizationStats({
          beforePoints,
          afterPoints: beforePoints,
          maxError: 0,
          skipped: true,
          reason: 'fit failed',
        }),
      };
    }

    const optimizedLoop = buildLoopFromCubicSegments(sourceLoop, segments);
    const afterPoints = optimizedLoop.points.length;
    const minimumClosedPoints = sourceLoop.closed ? 3 : 2;
    const maxError = Math.max(
      fitMaxError,
      estimateLoopMaxError(optimizedLoop, samples, sourceLoop.closed),
    );

    if (
      afterPoints < minimumClosedPoints ||
      afterPoints >= beforePoints ||
      maxError > tolerance * 1.5
    ) {
      return {
        loop: sourceLoop,
        stats: createOptimizationStats({
          beforePoints,
          afterPoints: beforePoints,
          maxError,
          skipped: true,
          reason: afterPoints >= beforePoints ? 'not reduced' : 'over tolerance',
        }),
      };
    }

    return {
      loop: optimizedLoop,
      stats: createOptimizationStats({
        beforePoints,
        afterPoints,
        maxError,
        optimized: true,
      }),
    };
  }

  function previewSelectedLoopOptimization(state, options = {}) {
    const refs = getLoopEditPathRefs(state);
    const previews = [];
    for (const ref of refs) {
      const loop = state.shapes[ref.shapeIndex]?.loops[ref.loopIndex];
      if (!loop) {
        continue;
      }
      const result = optimizeLoopPath(loop, options);
      previews.push({
        ref,
        originalLoop: cloneLoop(loop),
        loop: result.loop,
        stats: result.stats,
      });
    }
    return {
      previews,
      stats: aggregateOptimizationStats(previews.map((item) => item.stats)),
    };
  }

  function applySelectedLoopOptimization(state, options = {}) {
    const refs = getLoopEditPathRefs(state);
    if (!refs.length) {
      return {
        state,
        stats: aggregateOptimizationStats([]),
      };
    }

    const resultByKey = new Map();
    const stats = [];
    for (const ref of refs) {
      const loop = state.shapes[ref.shapeIndex]?.loops[ref.loopIndex];
      if (!loop) {
        continue;
      }
      const result = optimizeLoopPath(loop, options);
      resultByKey.set(pathKey(ref), result.loop);
      stats.push(result.stats);
    }

    const shapes = state.shapes.map((shape, shapeIndex) => ({
      ...shape,
      style: { ...shape.style },
      loops: shape.loops.map((loop, loopIndex) => {
        const optimizedLoop = resultByKey.get(pathKey(createPathRef(shapeIndex, loopIndex)));
        return optimizedLoop ? cloneLoop(optimizedLoop) : cloneLoop(loop);
      }),
    }));

    return {
      state: {
        ...state,
        shapes,
        selectedPaths: getSelectedPathRefs(state),
        selectedPoints: [],
      },
      stats: aggregateOptimizationStats(stats),
    };
  }

  function updateLoopEditRefs(state, updater) {
    const refs = getLoopEditPathRefs(state);
    if (!refs.length) {
      return state;
    }
    const targetKeys = new Set(refs.map(pathKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => (
        targetKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
          ? updater(cloneLoop(loop), createPathRef(shapeIndex, loopIndex))
          : cloneLoop(loop)
      )),
    }));
    return {
      ...state,
      shapes,
      selectedPointIndex: -1,
      selectedPoints: [],
    };
  }

  function updateSelectedShapeFields(state, fields) {
    return updateSelectedShape(state, (shape) => ({
      ...shape,
      id: fields.id ?? shape.id,
      label: fields.label ?? shape.label,
      tagsText: fields.tagsText ?? shape.tagsText,
      z: fields.z ?? shape.z,
      style: cleanStyle({ ...shape.style, ...(fields.style || {}) }),
    }));
  }

  function addTagPresetToSelectedShape(state, tag, applySemanticRole = false) {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return state;
    }
    let nextState = updateSelectedShape(state, (shape) => ({
      ...shape,
      tagsText: addTagToTagsText(shape.tagsText, normalizedTag),
    }));
    if (applySemanticRole) {
      const role = tagPresetLoopRole(normalizedTag);
      if (role) {
        nextState = setSelectedLoopRole(nextState, role);
      }
    }
    return nextState;
  }

  function addShape(state) {
    const baseId = 'traced_shape';
    const id = uniqueId(baseId, state.shapes.map((shape) => shape.id));
    const shape = createShape({
      id,
      label: titleFromId(id),
      tagsText: 'cabinet',
      z: nextZ(state.shapes),
    });
    return {
      ...state,
      shapes: [...state.shapes, shape],
      selectedShapeIndex: state.shapes.length,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(state.shapes.length, 0)],
      selectedPoints: [],
    };
  }

  function duplicateSelectedShape(state) {
    const shape = getSelectedShape(state);
    if (!shape) {
      return state;
    }
    const id = uniqueId(`${normalizeId(shape.id)}_copy`, state.shapes.map((item) => item.id));
    const copy = createShape({
      ...cloneShape(shape),
      id,
      label: `${shape.label || shape.id} Copy`,
      z: parseInteger(shape.z, 0) + 1,
    });
    const shapes = state.shapes.slice();
    shapes.splice(state.selectedShapeIndex + 1, 0, copy);
    return {
      ...state,
      shapes,
      selectedShapeIndex: state.selectedShapeIndex + 1,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(state.selectedShapeIndex + 1, 0)],
      selectedPoints: [],
    };
  }

  function deleteSelectedShape(state) {
    if (state.shapes.length <= 1) {
      return state;
    }
    const shapes = state.shapes.slice();
    shapes.splice(state.selectedShapeIndex, 1);
    const selectedShapeIndex = clampIndex(state.selectedShapeIndex, shapes.length);
    return {
      ...state,
      shapes,
      selectedShapeIndex,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(selectedShapeIndex, 0)],
      selectedPoints: [],
    };
  }

  function nudgeSelectedShapeZ(state, delta) {
    return updateSelectedShape(state, (shape) => ({
      ...shape,
      z: parseInteger(shape.z, 0) + delta,
    }));
  }

  function addLoop(state, role = 'outer') {
    return updateSelectedShape(state, (shape) => {
      const loops = [...shape.loops, createLoop({ role })];
      return { ...shape, loops };
    }, {
      selectedLoopIndex: getSelectedShape(state).loops.length,
      selectedPointIndex: -1,
      selectedPaths: [
        createPathRef(state.selectedShapeIndex, getSelectedShape(state).loops.length),
      ],
      selectedPoints: [],
    });
  }

  function duplicateSelectedLoop(state) {
    const loop = getSelectedLoop(state);
    if (!loop) {
      return state;
    }
    return updateSelectedShape(state, (shape) => {
      const loops = shape.loops.slice();
      loops.splice(state.selectedLoopIndex + 1, 0, cleanLoop(cloneLoop(loop)));
      return { ...shape, loops };
    }, {
      selectedLoopIndex: state.selectedLoopIndex + 1,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(state.selectedShapeIndex, state.selectedLoopIndex + 1)],
      selectedPoints: [],
    });
  }

  function deleteSelectedLoop(state) {
    const shape = getSelectedShape(state);
    if (!shape || shape.loops.length <= 1) {
      return state;
    }
    const loops = shape.loops.slice();
    loops.splice(state.selectedLoopIndex, 1);
    const selectedLoopIndex = clampIndex(state.selectedLoopIndex, loops.length);
    return updateSelectedShape(state, (current) => ({ ...current, loops }), {
      selectedLoopIndex,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(state.selectedShapeIndex, selectedLoopIndex)],
      selectedPoints: [],
    });
  }

  function moveSelectedLoop(state, delta) {
    const shape = getSelectedShape(state);
    if (!shape) {
      return state;
    }
    const from = state.selectedLoopIndex;
    const to = from + delta;
    if (to < 0 || to >= shape.loops.length) {
      return state;
    }
    const loops = shape.loops.slice();
    const [loop] = loops.splice(from, 1);
    loops.splice(to, 0, loop);
    return updateSelectedShape(state, (current) => ({ ...current, loops }), {
      selectedLoopIndex: to,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(state.selectedShapeIndex, to)],
      selectedPoints: [],
    });
  }

  function setSelectedLoopRole(state, role) {
    const safeRole = LOOP_ROLES.includes(role) ? role : 'outer';
    return updateSelectedLoop(state, (loop) => ({
      ...loop,
      role: safeRole,
      fillRule: safeRole === 'cutout' ? 'evenOdd' : loop.fillRule,
    }));
  }

  function setSelectedLoopId(state, id) {
    const loop = getSelectedLoop(state);
    if (!loop) {
      return state;
    }
    const safeId = normalizeLoopId(id) || defaultLoopId(loop, state.selectedLoopIndex);
    return updateSelectedLoop(state, (current) => ({
      ...current,
      id: safeId,
    }));
  }

  function addPoint(state, point, handles = {}) {
    const loop = getSelectedLoop(state);
    if (!loop || loop.closed) {
      return state;
    }
    const points = [...loop.points, cleanPoint({ ...point, ...handles })];
    return updateSelectedLoop(state, (current) => ({ ...current, points }), {
      selectedPointIndex: points.length - 1,
      selectedPoints: [createPointRef(state.selectedShapeIndex, state.selectedLoopIndex, points.length - 1)],
    });
  }

  function movePoint(state, index, point) {
    const loop = getSelectedLoop(state);
    if (!loop || index < 0 || index >= loop.points.length) {
      return state;
    }
    const points = loop.points.slice();
    points[index] = cleanPoint({
      ...points[index],
      x: point.x,
      y: point.y,
    });
    return updateSelectedLoop(state, (current) => ({ ...current, points }), {
      selectedPointIndex: index,
      selectedPoints: [createPointRef(state.selectedShapeIndex, state.selectedLoopIndex, index)],
    });
  }

  function deleteSelectedPoint(state) {
    const loop = getSelectedLoop(state);
    const index = state.selectedPointIndex;
    if (!loop || index < 0 || index >= loop.points.length) {
      return state;
    }
    const points = loop.points.slice();
    points.splice(index, 1);
    return updateSelectedLoop(state, (current) => ({
      ...current,
      points,
      closed: points.length >= 3 ? current.closed : false,
    }), {
      selectedPointIndex: clampIndex(index, points.length),
      selectedPoints: [],
    });
  }

  function movePointHandle(state, index, handleName, canvasPoint) {
    const loop = getSelectedLoop(state);
    if (
      !loop ||
      index < 0 ||
      index >= loop.points.length ||
      !['inHandle', 'outHandle'].includes(handleName)
    ) {
      return state;
    }
    const points = loop.points.slice();
    const point = points[index];
    points[index] = cleanPoint({
      ...point,
      [handleName]: {
        x: Number(canvasPoint.x) - point.x,
        y: Number(canvasPoint.y) - point.y,
      },
    });
    return updateSelectedLoop(state, (current) => ({ ...current, points }), {
      selectedPointIndex: index,
      selectedPoints: [createPointRef(state.selectedShapeIndex, state.selectedLoopIndex, index)],
    });
  }

  function createPointOutHandle(state, index, canvasPoint) {
    return movePointHandle(state, index, 'outHandle', canvasPoint);
  }

  function clearPointHandles(state, index = state.selectedPointIndex) {
    const loop = getSelectedLoop(state);
    if (!loop || index < 0 || index >= loop.points.length) {
      return state;
    }
    const points = loop.points.slice();
    points[index] = cleanPoint({
      ...points[index],
      inHandle: null,
      outHandle: null,
    });
    return updateSelectedLoop(state, (current) => ({ ...current, points }), {
      selectedPointIndex: index,
      selectedPoints: [createPointRef(state.selectedShapeIndex, state.selectedLoopIndex, index)],
    });
  }

  function closeLoop(state) {
    const loop = getSelectedLoop(state);
    if (!loop || loop.points.length < 3) {
      return state;
    }
    return updateSelectedLoop(state, (current) => ({ ...current, closed: true }));
  }

  function openLoop(state) {
    return updateSelectedLoop(state, (loop) => ({ ...loop, closed: false }));
  }

  function clearPoints(state) {
    return updateSelectedLoop(state, (loop) => ({
      ...loop,
      points: [],
      closed: false,
    }), {
      selectedPointIndex: -1,
      selectedPoints: [],
    });
  }

  function setCanvasFromImage(state, width, height, sourceImage) {
    return {
      ...state,
      canvas: {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      },
      sourceImage: sourceImage || null,
    };
  }

  function buildVectorPack(state, options = {}) {
    const pack = {
      version: VECTOR_PACK_VERSION,
      kind: VECTOR_PACK_KIND,
      sourceImage: state.sourceImage || null,
      canvas: {
        width: Math.round(state.canvas.width),
        height: Math.round(state.canvas.height),
      },
      shapes: state.shapes.map(buildShapeJson),
    };
    const animation = animationForExport(cleanAnimation(state.animation), options);
    if (shouldExportAnimation(animation)) {
      pack.animation = animation;
    }
    return pack;
  }

  function exportVectorPackJson(state, options = {}) {
    return `${JSON.stringify(buildVectorPack(state, options), null, 2)}\n`;
  }

  function importVectorPack(source) {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    if (!parsed || parsed.kind !== VECTOR_PACK_KIND || parsed.version !== VECTOR_PACK_VERSION) {
      throw new Error('Unsupported vector pack.');
    }
    if (!Array.isArray(parsed.shapes) || parsed.shapes.length === 0) {
      throw new Error('Vector pack must contain at least one shape.');
    }
    const animationResult = importAnimation(parsed.animation);
    const importedShapes = parsed.shapes.map(importShape);
    const graphPointRepair = repairGraphPointIdentityOnImport(importedShapes, animationResult.animation);
    return {
      canvas: {
        width: Number(parsed.canvas?.width) || DEFAULT_CANVAS.width,
        height: Number(parsed.canvas?.height) || DEFAULT_CANVAS.height,
      },
      sourceImage: parsed.sourceImage || null,
      animation: graphPointRepair.animation,
      animationIssues: animationResult.issues.concat(graphPointRepair.issues),
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      shapes: graphPointRepair.shapes,
      selectedShapeIndex: 0,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(0, 0)],
      selectedPoints: [],
    };
  }

  function repairGraphPointIdentityOnImport(shapes, animation) {
    if (
      !animation ||
      parseInteger(animation.schemaVersion, ANIMATION_SCHEMA_VERSION) !== ANIMATION_GRAPH_SCHEMA_VERSION
    ) {
      return { shapes, animation, issues: [] };
    }
    const issues = [];
    const nextShapes = shapes.map(cloneShape);
    const stateRef = () => ({ shapes: nextShapes });
    const repairedLoopKeys = new Set();
    const loopIdsByKey = new Map();

    function repairLoop(shapeIndex, loopIndex) {
      const key = pathKey(createPathRef(shapeIndex, loopIndex));
      if (repairedLoopKeys.has(key)) {
        return loopIdsByKey.get(key) || [];
      }
      repairedLoopKeys.add(key);
      const shape = nextShapes[shapeIndex];
      const loop = shape?.loops?.[loopIndex];
      if (!loop) {
        loopIdsByKey.set(key, []);
        return [];
      }
      const duplicateCounts = pointIdCountMap(loop.points);
      for (const [pointId, count] of duplicateCounts.entries()) {
        if (count > 1) {
          issues.push(createValidationIssue(
            'point-id-duplicate-repaired',
            VALIDATION_STATUS.warning,
            `Imported graph loop "${normalizeLoopId(loop.id) || loopIndex + 1}" had duplicate point id "${pointId}"; duplicates were repaired.`,
          ));
        }
      }
      const usedIds = new Set();
      let changed = false;
      const ids = [];
      const points = loop.points.map((point, pointIndex) => {
        const rawId = normalizeLoopId(point.id);
        const baseId = rawId || defaultPointId(pointIndex);
        const id = uniquePointId(baseId, usedIds);
        usedIds.add(id);
        ids.push(id);
        if (rawId === id) {
          return clonePoint(point);
        }
        changed = true;
        return cleanPoint({ ...point, id });
      });
      if (changed) {
        const loops = shape.loops.slice();
        loops[loopIndex] = cleanLoop({ ...loop, points });
        nextShapes[shapeIndex] = createShape({ ...shape, loops });
      }
      loopIdsByKey.set(key, ids);
      return ids;
    }

    let changedAnimation = false;
    const clips = (animation.clips || []).map((clip, clipIndex) => {
      if (!clip.graph?.outputs?.length) {
        return clip;
      }
      let outputChanged = false;
      const outputs = clip.graph.outputs.map((output) => {
        if (!String(output.property || '').startsWith('point.')) {
          return output;
        }
        const refs = resolveGraphPathRefs(stateRef(), output.target);
        for (const ref of refs) {
          repairLoop(ref.shapeIndex, ref.loopIndex);
        }
        const target = { ...(output.target || {}) };
        const pointIndex = Number(target.pointIndex);
        if (!normalizeLoopId(target.pointId) && Number.isInteger(pointIndex) && pointIndex >= 0 && refs.length) {
          const idsAtIndex = new Set();
          for (const ref of refs) {
            const ids = repairLoop(ref.shapeIndex, ref.loopIndex);
            if (ids[pointIndex]) {
              idsAtIndex.add(ids[pointIndex]);
            }
          }
          if (idsAtIndex.size === 1) {
            target.pointId = Array.from(idsAtIndex)[0];
            delete target.pointIndex;
            outputChanged = true;
            changedAnimation = true;
            return cleanAnimationGraphOutput({ ...output, target }) || output;
          }
          issues.push(createValidationIssue(
            'point-index-target-not-migrated',
            VALIDATION_STATUS.warning,
            'Imported graph pointIndex target spans loops with different point ids and was left as pointIndex.',
          ));
        }
        return output;
      });
      if (!outputChanged) {
        return clip;
      }
      return cleanAnimationClip({
        ...clip,
        graph: {
          nodes: clip.graph.nodes,
          outputs,
        },
      }, clipIndex);
    });

    const repairedAnimation = changedAnimation
      ? cleanAnimation({
        ...animation,
        clips,
      })
      : animation;
    return {
      shapes: nextShapes,
      animation: repairedAnimation,
      issues,
    };
  }

  function importAnimation(animation) {
    if (animation == null) {
      return { animation: null, issues: [] };
    }
    const result = normalizeAnimation(animation);
    return {
      animation: result.animation,
      issues: result.issues,
    };
  }

  function cleanAnimation(animation) {
    return normalizeAnimation(animation).animation;
  }

  function animationForExport(animation, options = {}) {
    const cleaned = cleanAnimation(animation);
    if (!cleaned) {
      return null;
    }
    if (options.animationMode === 'graph' || options.includeGraphAnimation === true) {
      return cleaned;
    }
    if (parseInteger(cleaned.schemaVersion, ANIMATION_SCHEMA_VERSION) !== ANIMATION_GRAPH_SCHEMA_VERSION) {
      return cleaned;
    }
    const clips = (cleaned.clips || [])
      .map((clip, index) => cleanAnimationClip({
        ...clip,
        graph: null,
        tracks: Array.isArray(clip.tracks) ? clip.tracks : [],
      }, index))
      .filter((clip) => (clip.tracks || []).length > 0);
    const output = {
      schemaVersion: ANIMATION_SCHEMA_VERSION,
      clips,
      bindings: clips.length ? cleanAnimationBindings(cleaned.bindings) : {},
    };
    return shouldExportAnimation(output) ? output : null;
  }

  function normalizeAnimation(animation) {
    const issues = [];
    if (animation == null) {
      return { animation: null, issues };
    }
    if (!isPlainObject(animation)) {
      return {
        animation: null,
        issues: [
          createValidationIssue(
            'animation-malformed',
            VALIDATION_STATUS.warning,
            'Animation metadata must be an object and was ignored.',
          ),
        ],
      };
    }

    const requestedSchemaVersion = parseInteger(animation.schemaVersion, ANIMATION_SCHEMA_VERSION);
    const schemaVersion = requestedSchemaVersion === ANIMATION_GRAPH_SCHEMA_VERSION
      ? ANIMATION_GRAPH_SCHEMA_VERSION
      : ANIMATION_SCHEMA_VERSION;
    const clips = [];
    if (animation.clips == null) {
      // Empty is fine; static exports omit the animation object.
    } else if (!Array.isArray(animation.clips)) {
      issues.push(createValidationIssue(
        'animation-clips-malformed',
        VALIDATION_STATUS.warning,
        'Animation clips must be a list.',
      ));
    } else {
      animation.clips.forEach((clip, index) => {
        if (!isPlainObject(clip)) {
          issues.push(createValidationIssue(
            'animation-clip-malformed',
            VALIDATION_STATUS.warning,
            `Animation clip ${index + 1} is not an object and was skipped.`,
          ));
          return;
        }
        clips.push(cleanAnimationClip(clip, index));
      });
    }

    const bindings = cleanAnimationBindings(animation.bindings, issues);
    const output = {
      schemaVersion,
      clips,
      bindings,
    };
    return {
      animation: shouldExportAnimation(output) ? output : null,
      issues,
    };
  }

  function cleanAnimationClip(clip, index) {
    const id = normalizeLoopId(clip.id) || `clip_${index + 1}`;
    const output = {
      id,
      label: String(clip.label || titleFromId(id)),
      durationMs: Math.max(0, Number(clip.durationMs) || 0),
      loop: Boolean(clip.loop),
      tracks: Array.isArray(clip.tracks)
        ? clip.tracks.map(cleanAnimationTrack).filter(Boolean)
        : [],
    };
    const graph = cleanAnimationGraph(clip.graph);
    if (graph) {
      output.graph = graph;
    }
    return output;
  }

  function cleanAnimationTrack(track) {
    if (!isPlainObject(track)) {
      return null;
    }
    const output = {
      target: cleanAnimationTarget(track.target),
      property: String(track.property || 'transform'),
      blend: track.blend === 'replace' ? 'replace' : 'add',
    };
    const origin = cleanAnimationOrigin(track.origin);
    if (origin) {
      output.origin = origin;
    }
    if (Array.isArray(track.keyframes)) {
      output.keyframes = track.keyframes
        .filter(isPlainObject)
        .map(cleanAnimationKeyframe);
    }
    if (isPlainObject(track.params)) {
      output.params = cloneJsonCompatible(track.params);
    }
    return output;
  }

  function cleanAnimationGraph(graph) {
    if (!isPlainObject(graph)) {
      return null;
    }
    const nodes = Array.isArray(graph.nodes)
      ? graph.nodes.map(cleanAnimationGraphNode).filter(Boolean)
      : [];
    const outputs = Array.isArray(graph.outputs)
      ? graph.outputs.map(cleanAnimationGraphOutput).filter(Boolean)
      : [];
    if (!nodes.length && !outputs.length) {
      return null;
    }
    return { nodes, outputs };
  }

  function cleanAnimationGraphNode(node) {
    if (!isPlainObject(node)) {
      return null;
    }
    const id = normalizeLoopId(node.id);
    if (!id) {
      return null;
    }
    const type = String(node.type || '');
    const output = {
      id,
      type: GRAPH_NODE_TYPES.includes(type) ? type : type || 'keyframes.number',
      keys: Array.isArray(node.keys)
        ? node.keys.filter(isPlainObject).map(cleanAnimationGraphKeyframe)
        : [],
    };
    const origin = cleanAnimationOrigin(node.origin);
    if (origin) {
      output.origin = origin;
    }
    return output;
  }

  function cleanAnimationGraphKeyframe(keyframe) {
    const output = {
      timeMs: Math.max(0, Number(keyframe.timeMs) || 0),
    };
    const interp = String(keyframe.interp ?? keyframe.ease ?? 'smooth');
    if (interp) {
      output.interp = interp;
    }
    if (keyframe.value != null) {
      output.value = cloneJsonCompatible(keyframe.value);
    } else {
      output.value = null;
    }
    return output;
  }

  function cleanAnimationGraphOutput(output) {
    if (!isPlainObject(output)) {
      return null;
    }
    const source = normalizeLoopId(output.source ?? output.nodeId);
    if (!source) {
      return null;
    }
    const property = String(output.property || '');
    const cleaned = {
      source,
      target: cleanAnimationGraphTarget(output.target),
      property: GRAPH_OUTPUT_PROPERTIES.includes(property) ? property : property,
      blend: graphOutputDefaultBlend(property, output.blend),
    };
    const origin = cleanAnimationOrigin(output.origin);
    if (origin) {
      cleaned.origin = origin;
    }
    if (isPlainObject(output.params)) {
      cleaned.params = cloneJsonCompatible(output.params);
    }
    return cleaned;
  }

  function graphOutputDefaultBlend(property, requestedBlend) {
    const normalizedProperty = String(property || '');
    if (normalizedProperty.startsWith('shape.style.') || normalizedProperty === 'shape.opacity') {
      return 'replace';
    }
    return requestedBlend === 'replace' ? 'replace' : 'add';
  }

  function cleanAnimationGraphTarget(target) {
    const output = cleanAnimationTarget(target);
    if (!isPlainObject(target)) {
      return output;
    }
    const pointId = normalizeLoopId(target.pointId);
    const pointIndex = Number(target.pointIndex);
    if (pointId) {
      output.pointId = pointId;
    }
    if (Number.isInteger(pointIndex) && pointIndex >= 0) {
      output.pointIndex = pointIndex;
    }
    return output;
  }

  function cleanAnimationTarget(target) {
    const output = {};
    if (!isPlainObject(target)) {
      return output;
    }
    const shapeId = normalizeLoopId(target.shapeId);
    const loopId = normalizeLoopId(target.loopId);
    const loopIndex = Number(target.loopIndex);
    const tags = Array.isArray(target.tags)
      ? target.tags.map(normalizeTag).filter(Boolean)
      : [];
    if (shapeId) {
      output.shapeId = shapeId;
    }
    if (loopId) {
      output.loopId = loopId;
    }
    if (Number.isInteger(loopIndex) && loopIndex >= 0) {
      output.loopIndex = loopIndex;
    }
    if (tags.length) {
      output.tags = Array.from(new Set(tags));
    }
    return output;
  }

  function cleanAnimationOrigin(origin) {
    if (!isPlainObject(origin) || origin.mode !== 'canvas') {
      return null;
    }
    const x = Number(origin.x);
    const y = Number(origin.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return { mode: 'canvas', x: round(x), y: round(y) };
  }

  function cleanAnimationKeyframe(keyframe) {
    const output = {
      timeMs: Math.max(0, Number(keyframe.timeMs) || 0),
    };
    if (keyframe.ease != null) {
      output.ease = String(keyframe.ease);
    }
    if (isPlainObject(keyframe.value)) {
      output.value = cloneJsonCompatible(keyframe.value);
    } else {
      output.value = {};
    }
    return output;
  }

  function cleanAnimationBindings(bindings, issues = []) {
    if (bindings == null) {
      return {};
    }
    if (!isPlainObject(bindings)) {
      issues.push(createValidationIssue(
        'animation-bindings-malformed',
        VALIDATION_STATUS.warning,
        'Animation bindings must be an object.',
      ));
      return {};
    }
    const output = {};
    for (const [key, value] of Object.entries(bindings)) {
      const binding = String(key || '').trim();
      const clipId = normalizeLoopId(value);
      if (binding && clipId) {
        output[binding] = clipId;
      }
    }
    return output;
  }

  function shouldExportAnimation(animation) {
    return Boolean(
      animation &&
      (
        (Array.isArray(animation.clips) && animation.clips.length > 0) ||
        (isPlainObject(animation.bindings) && Object.keys(animation.bindings).length > 0)
      )
    );
  }

  function animationSummary(animation) {
    const cleaned = cleanAnimation(animation);
    if (!shouldExportAnimation(cleaned)) {
      return 'No animation';
    }
    const clipCount = cleaned.clips.length;
    const bindingCount = Object.keys(cleaned.bindings).length;
    const clipText = clipCount === 1 ? '1 clip' : `${clipCount} clips`;
    const bindingText = bindingCount === 1 ? '1 binding' : `${bindingCount} bindings`;
    return `${clipText} | ${bindingText} | schema ${cleaned.schemaVersion}`;
  }

  function addAnimationClip(state, overrides = {}) {
    const animation = editableAnimation(state.animation);
    const id = uniqueAnimationClipId(
      overrides.id || `clip_${animation.clips.length + 1}`,
      animation.clips,
    );
    const clip = cleanAnimationClip({
      id,
      label: overrides.label || titleFromId(id),
      durationMs: overrides.durationMs ?? 1000,
      loop: overrides.loop ?? true,
      tracks: Array.isArray(overrides.tracks) ? overrides.tracks : [],
    }, animation.clips.length);
    return withCleanAnimation(state, {
      ...animation,
      clips: [...animation.clips, clip],
    });
  }

  function updateAnimationClip(state, clipId, updates = {}) {
    const animation = editableAnimation(state.animation);
    const normalizedId = normalizeLoopId(clipId);
    const index = animation.clips.findIndex((clip) => clip.id === normalizedId);
    if (index < 0) {
      return state;
    }
    const previousClip = animation.clips[index];
    const requestedId = updates.id != null ? normalizeLoopId(updates.id) : previousClip.id;
    const siblingClips = animation.clips.filter((_, clipIndex) => clipIndex !== index);
    const nextId = requestedId === previousClip.id
      ? previousClip.id
      : uniqueAnimationClipId(requestedId || previousClip.id, siblingClips);
    const nextClip = cleanAnimationClip({
      ...previousClip,
      ...updates,
      id: nextId,
      durationMs: Math.max(1, Number(updates.durationMs ?? previousClip.durationMs) || previousClip.durationMs || 1),
      loop: updates.loop ?? previousClip.loop,
      tracks: Array.isArray(updates.tracks) ? updates.tracks : previousClip.tracks,
    }, index);
    const clips = animation.clips.slice();
    clips[index] = nextClip;
    const bindings = { ...animation.bindings };
    if (nextId !== previousClip.id) {
      for (const [bindingName, bindingClipId] of Object.entries(bindings)) {
        if (bindingClipId === previousClip.id) {
          bindings[bindingName] = nextId;
        }
      }
    }
    return withCleanAnimation(state, { ...animation, clips, bindings });
  }

  function duplicateAnimationClip(state, clipId) {
    const animation = editableAnimation(state.animation);
    const source = animation.clips.find((clip) => clip.id === normalizeLoopId(clipId));
    if (!source) {
      return state;
    }
    const id = uniqueAnimationClipId(`${source.id}_copy`, animation.clips);
    const clip = cleanAnimationClip({
      ...cloneJsonCompatible(source),
      id,
      label: `${source.label || titleFromId(source.id)} Copy`,
    }, animation.clips.length);
    return withCleanAnimation(state, {
      ...animation,
      clips: [...animation.clips, clip],
    });
  }

  function deleteAnimationClip(state, clipId) {
    const animation = editableAnimation(state.animation);
    const normalizedId = normalizeLoopId(clipId);
    const clips = animation.clips.filter((clip) => clip.id !== normalizedId);
    const bindings = Object.fromEntries(
      Object.entries(animation.bindings).filter(([, bindingClipId]) => bindingClipId !== normalizedId),
    );
    return withCleanAnimation(state, { ...animation, clips, bindings });
  }

  function addTransformTracksFromSelection(state, clipId, options = {}) {
    const animation = editableAnimation(state.animation);
    const clipIndex = animation.clips.findIndex((clip) => clip.id === normalizeLoopId(clipId));
    if (clipIndex < 0) {
      return state;
    }
    const origin = animationCanvasOrigin(state, options.origin);
    const targets = animationTargetsFromSelection(state);
    if (!targets.length || !origin) {
      return state;
    }
    const clip = animation.clips[clipIndex];
    const tracks = [
      ...clip.tracks,
      ...targets.map((target) => cleanAnimationTrack({
        target,
        property: 'transform',
        blend: 'add',
        origin,
        keyframes: [neutralTransformKeyframe(0)],
      })),
    ].filter(Boolean);
    const clips = animation.clips.slice();
    clips[clipIndex] = cleanAnimationClip({ ...clip, tracks }, clipIndex);
    return withCleanAnimation(state, { ...animation, clips });
  }

  function upsertTransformKeyframe(state, clipId, trackIndex, keyframe) {
    return updateAnimationTrack(state, clipId, trackIndex, (track, clip) => {
      const timeMs = clampAnimationTime(keyframe.timeMs, clip.durationMs);
      const nextKeyframe = cleanAnimationKeyframe({
        ...keyframe,
        timeMs,
        value: normalizeTransformKeyframeValue(keyframe.value),
      });
      const keyframes = Array.isArray(track.keyframes)
        ? track.keyframes.map(cleanAnimationKeyframe)
        : [];
      const existingIndex = keyframes.findIndex((item) => Number(item.timeMs) === timeMs);
      if (existingIndex >= 0) {
        keyframes[existingIndex] = nextKeyframe;
      } else {
        keyframes.push(nextKeyframe);
      }
      keyframes.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      return { ...track, keyframes };
    });
  }

  function deleteTransformKeyframe(state, clipId, trackIndex, keyframeIndex) {
    return updateAnimationTrack(state, clipId, trackIndex, (track) => {
      const keyframes = Array.isArray(track.keyframes)
        ? track.keyframes.map(cleanAnimationKeyframe)
        : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keyframes.length) {
        return track;
      }
      keyframes.splice(index, 1);
      return { ...track, keyframes };
    });
  }

  function moveTransformKeyframe(state, clipId, trackIndex, keyframeIndex, timeMs) {
    return updateAnimationTrack(state, clipId, trackIndex, (track, clip) => {
      const keyframes = Array.isArray(track.keyframes)
        ? track.keyframes.map(cleanAnimationKeyframe)
        : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keyframes.length) {
        return track;
      }
      keyframes[index] = cleanAnimationKeyframe({
        ...keyframes[index],
        timeMs: clampAnimationTime(timeMs, clip.durationMs),
      });
      keyframes.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      return { ...track, keyframes };
    });
  }

  function setRestTransformKeyframe(state, clipId, trackIndex, timeMs, options = {}) {
    return upsertTransformKeyframe(state, clipId, trackIndex, {
      timeMs,
      ease: options.ease || 'linear',
      value: restTransformValue(),
    });
  }

  function copyTransformKeyframeToTime(state, clipId, trackIndex, keyframeIndex, timeMs) {
    return updateAnimationTrack(state, clipId, trackIndex, (track, clip) => {
      const keyframes = Array.isArray(track.keyframes)
        ? track.keyframes.map(cleanAnimationKeyframe)
        : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keyframes.length) {
        return track;
      }
      const source = keyframes[index];
      const nextKeyframe = cleanAnimationKeyframe({
        ...source,
        timeMs: clampAnimationTime(timeMs, clip.durationMs),
        value: normalizeTransformKeyframeValue(source.value),
      });
      const existingIndex = keyframes.findIndex((item) => Number(item.timeMs) === Number(nextKeyframe.timeMs));
      if (existingIndex >= 0) {
        keyframes[existingIndex] = nextKeyframe;
      } else {
        keyframes.push(nextKeyframe);
      }
      keyframes.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      return { ...track, keyframes };
    });
  }

  function copyPreviousTransformKeyframeToTime(state, clipId, trackIndex, timeMs) {
    return updateAnimationTrack(state, clipId, trackIndex, (track, clip) => {
      const keyframes = Array.isArray(track.keyframes)
        ? track.keyframes.map(cleanAnimationKeyframe).sort((a, b) => Number(a.timeMs) - Number(b.timeMs))
        : [];
      const targetTime = clampAnimationTime(timeMs, clip.durationMs);
      let source = null;
      for (const keyframe of keyframes) {
        if (Number(keyframe.timeMs) < targetTime) {
          source = keyframe;
        }
      }
      if (!source) {
        return track;
      }
      const nextKeyframe = cleanAnimationKeyframe({
        ...source,
        timeMs: targetTime,
        value: normalizeTransformKeyframeValue(source.value),
      });
      const existingIndex = keyframes.findIndex((item) => Number(item.timeMs) === Number(nextKeyframe.timeMs));
      if (existingIndex >= 0) {
        keyframes[existingIndex] = nextKeyframe;
      } else {
        keyframes.push(nextKeyframe);
      }
      keyframes.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      return { ...track, keyframes };
    });
  }

  function updateAnimationBinding(state, bindingName, clipId) {
    const binding = String(bindingName || '').trim();
    if (!binding) {
      return state;
    }
    const animation = editableAnimation(state.animation);
    const bindings = { ...animation.bindings };
    const normalizedClipId = normalizeLoopId(clipId);
    if (normalizedClipId) {
      bindings[binding] = normalizedClipId;
    } else {
      delete bindings[binding];
    }
    return withCleanAnimation(state, { ...animation, bindings });
  }

  function upsertLoopTransformGraphKeys(state, clipId, refs = getLoopEditPathRefs(state), keyframe = {}, options = {}) {
    let nextState = state;
    const normalizedRefs = refs.map((ref) => normalizePathRef(nextState, ref)).filter(Boolean);
    if (!normalizedRefs.length) {
      return nextState;
    }
    for (const ref of normalizedRefs) {
      const origin = options.origin || animationCanvasOrigin(nextState, { mode: 'activeLoop' });
      nextState = upsertGraphValueKey(nextState, clipId, {
        property: 'loop.transform',
        target: pathRefToAnimationTarget(nextState, ref),
        value: normalizeTransformKeyframeValue(keyframe.value || keyframe),
        timeMs: keyframe.timeMs ?? options.timeMs ?? 0,
        interp: keyframe.interp || keyframe.ease || options.interp || 'smooth',
        origin,
      });
    }
    return nextState;
  }

  function upsertPointDeltaGraphKeys(state, clipId, items = [], keyOptions = {}) {
    const refs = items.map((item) => normalizePointRef(state, item.ref || item)).filter(Boolean);
    let nextState = ensurePointIdsForRefs(state, refs);
    for (const item of items) {
      const ref = normalizePointRef(nextState, item.ref || item);
      if (!ref) {
        continue;
      }
      nextState = upsertGraphValueKey(nextState, clipId, {
        property: 'point.positionDelta',
        target: pointRefToAnimationTarget(nextState, ref),
        value: normalizeVec2Value(item.value || item.delta || item),
        timeMs: keyOptions.timeMs ?? item.timeMs ?? 0,
        interp: keyOptions.interp || item.interp || item.ease || 'smooth',
      });
    }
    return nextState;
  }

  function upsertPointHandleDeltaGraphKey(state, clipId, ref, handleName, keyframe = {}, options = {}) {
    const normalized = normalizePointRef(state, ref);
    if (!normalized || !['inHandle', 'outHandle'].includes(handleName)) {
      return state;
    }
    let nextState = ensurePointIdsForRefs(state, [normalized]);
    const property = handleName === 'inHandle' ? 'point.inHandleDelta' : 'point.outHandleDelta';
    nextState = upsertGraphValueKey(nextState, clipId, {
      property,
      target: pointRefToAnimationTarget(nextState, normalized),
      value: normalizeVec2Value(keyframe.value || keyframe.delta || keyframe),
      timeMs: keyframe.timeMs ?? options.timeMs ?? 0,
      interp: keyframe.interp || keyframe.ease || options.interp || 'smooth',
    });
    return nextState;
  }

  function upsertShapeStyleGraphKey(state, clipId, shapeIndex, property, value, keyOptions = {}) {
    const shape = state.shapes[shapeIndex];
    const graphProperty = `shape.style.${property}`;
    if (!shape || !GRAPH_OUTPUT_PROPERTIES.includes(graphProperty)) {
      return state;
    }
    return upsertGraphValueKey(state, clipId, {
      property: graphProperty,
      target: { shapeId: normalizeId(shape.id) },
      blend: 'replace',
      value: normalizeGraphValueForProperty(graphProperty, value),
      timeMs: keyOptions.timeMs ?? 0,
      interp: keyOptions.interp || 'smooth',
    });
  }

  function upsertShapeOpacityGraphKey(state, clipId, shapeIndex, value, keyOptions = {}) {
    const shape = state.shapes[shapeIndex];
    if (!shape) {
      return state;
    }
    return upsertGraphValueKey(state, clipId, {
      property: 'shape.opacity',
      target: { shapeId: normalizeId(shape.id) },
      blend: 'replace',
      value: normalizeGraphValueForProperty('shape.opacity', value),
      timeMs: keyOptions.timeMs ?? 0,
      interp: keyOptions.interp || 'smooth',
    });
  }

  function upsertGraphOutputKeyframe(state, clipId, outputIndex, keyframe = {}) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node, output, clip) => {
      const property = String(output.property || '');
      const timeMs = clampAnimationTime(keyframe.timeMs, clip.durationMs);
      const nextKey = cleanAnimationGraphKeyframe({
        timeMs,
        interp: keyframe.interp || keyframe.ease || 'smooth',
        value: normalizeGraphValueForProperty(property, keyframe.value),
      });
      return {
        ...node,
        keys: upsertSortedGraphKeys(node.keys, nextKey),
      };
    });
  }

  function deleteGraphOutputKeyframe(state, clipId, outputIndex, keyframeIndex) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node) => {
      const keys = Array.isArray(node.keys) ? node.keys.map(cleanAnimationGraphKeyframe) : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keys.length) {
        return node;
      }
      keys.splice(index, 1);
      return { ...node, keys };
    });
  }

  function moveGraphOutputKeyframe(state, clipId, outputIndex, keyframeIndex, timeMs) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node, output, clip) => {
      const keys = Array.isArray(node.keys) ? node.keys.map(cleanAnimationGraphKeyframe) : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keys.length) {
        return node;
      }
      keys[index] = cleanAnimationGraphKeyframe({
        ...keys[index],
        timeMs: clampAnimationTime(timeMs, clip.durationMs),
      });
      keys.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      return { ...node, keys };
    });
  }

  function setRestGraphOutputKeyframe(state, clipId, outputIndex, timeMs, options = {}) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node, output, clip) => {
      const nextKey = cleanAnimationGraphKeyframe({
        timeMs: clampAnimationTime(timeMs, clip.durationMs),
        interp: options.interp || options.ease || 'smooth',
        value: restGraphOutputValue(state, output),
      });
      return {
        ...node,
        keys: upsertSortedGraphKeys(node.keys, nextKey),
      };
    });
  }

  function copyGraphOutputKeyframeToTime(state, clipId, outputIndex, keyframeIndex, timeMs) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node, output, clip) => {
      const keys = Array.isArray(node.keys) ? node.keys.map(cleanAnimationGraphKeyframe) : [];
      const index = parseInteger(keyframeIndex, -1);
      if (index < 0 || index >= keys.length) {
        return node;
      }
      const nextKey = cleanAnimationGraphKeyframe({
        ...keys[index],
        timeMs: clampAnimationTime(timeMs, clip.durationMs),
      });
      return {
        ...node,
        keys: upsertSortedGraphKeys(keys, nextKey),
      };
    });
  }

  function copyPreviousGraphOutputKeyframeToTime(state, clipId, outputIndex, timeMs) {
    return updateGraphOutputNode(state, clipId, outputIndex, (node, output, clip) => {
      const keys = (Array.isArray(node.keys) ? node.keys : [])
        .map(cleanAnimationGraphKeyframe)
        .sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
      const targetTime = clampAnimationTime(timeMs, clip.durationMs);
      let source = null;
      for (const key of keys) {
        if (Number(key.timeMs) < targetTime) {
          source = key;
        }
      }
      if (!source) {
        return node;
      }
      const nextKey = cleanAnimationGraphKeyframe({
        ...source,
        timeMs: targetTime,
      });
      return {
        ...node,
        keys: upsertSortedGraphKeys(keys, nextKey),
      };
    });
  }

  function brushPointDeltas(state, brush = {}) {
    const options = normalizeBrush(brush);
    const refs = brushTargetRefs(state, options);
    const output = [];
    for (const pathRef of refs) {
      const ref = normalizePathRef(state, pathRef);
      if (!ref) {
        continue;
      }
      const loop = state.shapes[ref.shapeIndex].loops[ref.loopIndex];
      loop.points.forEach((point, pointIndex) => {
        const distance = Math.hypot(point.x - options.center.x, point.y - options.center.y);
        const weight = brushFalloffWeight(distance, options.radius, options);
        if (weight <= 0) {
          return;
        }
        output.push({
          ref: createPointRef(ref.shapeIndex, ref.loopIndex, pointIndex),
          value: {
            x: round(options.dx * options.strength * weight),
            y: round(options.dy * options.strength * weight),
          },
          weight,
        });
      });
    }
    return output;
  }

  function evaluateGraphClip(state, clipId, timeMs = 0) {
    const animation = cleanAnimation(state.animation);
    const clip = animation?.clips.find((item) => item.id === normalizeLoopId(clipId));
    if (!clip?.graph) {
      return { previews: [], stats: { clipId: '', timeMs: 0, nodeCount: 0, outputCount: 0, targetCount: 0 } };
    }
    const durationMs = Math.max(1, Number(clip.durationMs) || 1);
    const clampedTime = clip.loop
      ? ((Number(timeMs) || 0) % durationMs + durationMs) % durationMs
      : clampAnimationTime(timeMs, durationMs);
    const nodeMap = new Map((clip.graph.nodes || []).map((node) => [node.id, node]));
    const loopPoseMap = new Map();
    const shapeStyleMap = new Map();
    const shapeOpacityMap = new Map();

    function ensureLoopPose(ref) {
      const normalized = normalizePathRef(state, ref);
      if (!normalized) {
        return null;
      }
      const key = pathKey(normalized);
      if (loopPoseMap.has(key)) {
        return loopPoseMap.get(key);
      }
      const shape = state.shapes[normalized.shapeIndex];
      const sourceLoop = shape.loops[normalized.loopIndex];
      const item = {
        ref: normalized,
        originalLoop: cloneLoop(sourceLoop),
        loop: cloneLoop(sourceLoop),
        style: { ...shape.style },
        opacity: 1,
      };
      loopPoseMap.set(key, item);
      return item;
    }

    for (const output of graphOutputsInEvaluationOrder(clip.graph.outputs || [])) {
      const node = nodeMap.get(output.source);
      if (!node) {
        continue;
      }
      const property = String(output.property || '');
      const value = evaluateGraphNodeValue(node, property, clampedTime);
      if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
        const pointRefs = resolveGraphPointRefs(state, output.target);
        for (const pointRef of pointRefs) {
          const pose = ensureLoopPose(pointRef);
          if (!pose) {
            continue;
          }
          const point = pose.loop.points[pointRef.pointIndex];
          if (!point) {
            continue;
          }
          const delta = normalizeVec2Value(value);
          if (property === 'point.positionDelta') {
            pose.loop.points[pointRef.pointIndex] = cleanPoint({
              ...point,
              x: point.x + delta.x,
              y: point.y + delta.y,
            });
          } else {
            const handleName = property === 'point.inHandleDelta' ? 'inHandle' : 'outHandle';
            const base = point[handleName] || { x: 0, y: 0 };
            const nextHandle = {
              x: round(base.x + delta.x),
              y: round(base.y + delta.y),
            };
            pose.loop.points[pointRef.pointIndex] = cleanPoint({
              ...point,
              [handleName]: isZeroVec2(nextHandle) ? null : nextHandle,
            });
          }
        }
      } else if (property === 'loop.transform') {
        const transformValue = normalizeTransformKeyframeValue(value);
        const refs = resolveGraphPathRefs(state, output.target);
        for (const ref of refs) {
          const pose = ensureLoopPose(ref);
          if (!pose) {
            continue;
          }
          const origin = output.origin && output.origin.mode === 'canvas'
            ? { x: Number(output.origin.x), y: Number(output.origin.y) }
            : originFromBounds(pathRefsBounds({ ...state, shapes: state.shapes.map(cloneShape) }, [ref]), 'selection');
          if (!origin) {
            continue;
          }
          pose.loop = translateLoop(
            transformLoopAround(pose.loop, origin, {
              scaleX: transformValue.sx,
              scaleY: transformValue.sy,
              skewX: transformValue.skewX,
              skewY: transformValue.skewY,
              rotation: transformValue.rotation,
            }),
            transformValue.tx,
            transformValue.ty,
          );
        }
      } else if (property.startsWith('shape.style.') || property === 'shape.opacity') {
        const shapeRefs = resolveGraphShapeRefs(state, output.target);
        for (const shapeIndex of shapeRefs) {
          const shape = state.shapes[shapeIndex];
          if (!shape) {
            continue;
          }
          shape.loops.forEach((_, loopIndex) => ensureLoopPose(createPathRef(shapeIndex, loopIndex)));
          if (property === 'shape.opacity') {
            shapeOpacityMap.set(shapeIndex, normalizeGraphValueForProperty(property, value));
            continue;
          }
          const style = shapeStyleMap.get(shapeIndex) || { ...shape.style };
          if (property === 'shape.style.fill') {
            style.fill = normalizeGraphValueForProperty(property, value);
          } else if (property === 'shape.style.stroke') {
            style.stroke = normalizeGraphValueForProperty(property, value);
          } else if (property === 'shape.style.strokeWidth') {
            style.strokeWidth = normalizeGraphValueForProperty(property, value);
          }
          shapeStyleMap.set(shapeIndex, style);
        }
      }
    }

    const previews = Array.from(loopPoseMap.values()).map((preview) => ({
      ...preview,
      style: shapeStyleMap.get(preview.ref.shapeIndex) || preview.style,
      opacity: shapeOpacityMap.get(preview.ref.shapeIndex) ?? preview.opacity,
    }));
    return {
      previews,
      stats: {
        clipId: clip.id,
        timeMs: clampedTime,
        nodeCount: clip.graph.nodes.length,
        outputCount: clip.graph.outputs.length,
        targetCount: previews.length,
      },
    };
  }

  function evaluateTransformClip(state, clipId, timeMs = 0) {
    const animation = cleanAnimation(state.animation);
    const clip = animation?.clips.find((item) => item.id === normalizeLoopId(clipId));
    if (!clip) {
      return { previews: [], stats: { clipId: '', timeMs: 0, trackCount: 0, targetCount: 0 } };
    }
    const durationMs = Math.max(1, Number(clip.durationMs) || 1);
    const clampedTime = clip.loop
      ? ((Number(timeMs) || 0) % durationMs + durationMs) % durationMs
      : clampAnimationTime(timeMs, durationMs);
    const loopMap = new Map();
    for (const track of clip.tracks || []) {
      if (track.property !== 'transform') {
        continue;
      }
      const refs = resolveAnimationTrackPathRefs(state, track);
      const value = evaluateTransformKeyframes(track.keyframes, clampedTime);
      const origin = track.origin && track.origin.mode === 'canvas'
        ? { x: Number(track.origin.x), y: Number(track.origin.y) }
        : null;
      if (!origin) {
        continue;
      }
      for (const ref of refs) {
        const key = pathKey(ref);
        const sourceLoop = state.shapes[ref.shapeIndex].loops[ref.loopIndex];
        const currentLoop = loopMap.get(key)?.loop || cloneLoop(sourceLoop);
        const transformed = translateLoop(
          transformLoopAround(currentLoop, origin, {
            scaleX: value.sx,
            scaleY: value.sy,
            skewX: value.skewX,
            skewY: value.skewY,
            rotation: value.rotation,
          }),
          value.tx,
          value.ty,
        );
        loopMap.set(key, {
          ref,
          originalLoop: cloneLoop(sourceLoop),
          loop: transformed,
        });
      }
    }
    return {
      previews: Array.from(loopMap.values()),
      stats: {
        clipId: clip.id,
        timeMs: clampedTime,
        trackCount: clip.tracks.length,
        targetCount: loopMap.size,
      },
    };
  }

  function previewAnimationTrackPose(state, clipId, trackIndex, value = {}) {
    const animation = cleanAnimation(state.animation);
    const normalizedClipId = normalizeLoopId(clipId);
    const clip = animation?.clips.find((item) => item.id === normalizedClipId);
    const index = parseInteger(trackIndex, -1);
    const track = clip?.tracks?.[index];
    const stats = {
      clipId: clip?.id || normalizedClipId || '',
      trackIndex: index,
      trackCount: clip?.tracks?.length || 0,
      targetCount: 0,
    };
    if (!clip || !track || track.property !== 'transform') {
      return { previews: [], stats };
    }
    const origin = track.origin && track.origin.mode === 'canvas'
      ? { x: Number(track.origin.x), y: Number(track.origin.y) }
      : null;
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
      return { previews: [], stats };
    }
    const refs = resolveAnimationTrackPathRefs(state, track);
    const transformValue = normalizeTransformKeyframeValue(value);
    const previews = refs.map((ref) => {
      const sourceLoop = state.shapes[ref.shapeIndex].loops[ref.loopIndex];
      return {
        ref,
        originalLoop: cloneLoop(sourceLoop),
        loop: translateLoop(
          transformLoopAround(sourceLoop, origin, {
            scaleX: transformValue.sx,
            scaleY: transformValue.sy,
            skewX: transformValue.skewX,
            skewY: transformValue.skewY,
            rotation: transformValue.rotation,
          }),
          transformValue.tx,
          transformValue.ty,
        ),
      };
    });
    return {
      previews,
      stats: {
        ...stats,
        targetCount: previews.length,
      },
    };
  }

  function validateState(state) {
    const shapeReports = state.shapes.map((_, shapeIndex) => validateShape(state, shapeIndex));
    const animationReport = validateAnimation(state);
    const issues = [...animationReport.issues];
    for (const shapeReport of shapeReports) {
      issues.push(...shapeReport.issues);
      for (const loopReport of shapeReport.loopReports) {
        issues.push(...loopReport.issues);
      }
    }
    return {
      status: statusFromIssues(issues),
      issues,
      shapeReports,
      animationReport,
      errorCount: issues.filter((issue) => issue.status === VALIDATION_STATUS.error).length,
      warningCount: issues.filter((issue) => issue.status === VALIDATION_STATUS.warning).length,
    };
  }

  function validateShape(state, shapeIndex) {
    const shape = state.shapes[shapeIndex];
    if (!shape) {
      const issues = [
        createValidationIssue('shape-missing', VALIDATION_STATUS.error, 'Shape is missing.'),
      ];
      return {
        status: VALIDATION_STATUS.error,
        issues,
        loopReports: [],
      };
    }

    const issues = [];
    const normalizedId = normalizeId(shape.id);
    const duplicateCount = state.shapes.filter((item) => normalizeId(item.id) === normalizedId).length;
    if (duplicateCount > 1) {
      issues.push(createValidationIssue(
        'shape-duplicate-id',
        VALIDATION_STATUS.warning,
        `Shape id "${normalizedId}" is duplicated.`,
      ));
    }
    if (!Array.isArray(shape.loops) || shape.loops.length === 0) {
      issues.push(createValidationIssue(
        'shape-empty',
        VALIDATION_STATUS.error,
        'Shape has no loops and cannot export as a useful v1 shape.',
      ));
    }

    const loopIdCounts = loopIdCountMap(shape.loops || []);
    const loopReports = (shape.loops || []).map((loop, loopIndex) => (
      validateLoop(loop, loopIndex, loopIdCounts)
    ));
    const combinedIssues = issues.concat(loopReports.flatMap((report) => report.issues));
    return {
      status: statusFromIssues(combinedIssues),
      issues,
      loopReports,
    };
  }

  function validateLoop(loop, loopIndex = 0, loopIdCounts = new Map()) {
    const issues = [];
    const role = LOOP_ROLES.includes(loop?.role) ? loop.role : 'outer';
    const points = Array.isArray(loop?.points) ? loop.points : [];
    const closed = Boolean(loop?.closed);
    const label = `Loop ${loopIndex + 1}`;
    const loopId = normalizeLoopId(loop?.id);

    if (!loopId) {
      issues.push(createValidationIssue(
        'loop-id-missing',
        VALIDATION_STATUS.warning,
        `${label} is missing a stable loop id.`,
      ));
    } else if ((loopIdCounts.get(loopId) || 0) > 1) {
      issues.push(createValidationIssue(
        'loop-id-duplicate',
        VALIDATION_STATUS.warning,
        `${label} uses duplicate loop id "${loopId}".`,
      ));
    }

    if (!LOOP_ROLES.includes(loop?.role)) {
      issues.push(createValidationIssue(
        'loop-role',
        VALIDATION_STATUS.warning,
        `${label} has an unknown role and will export as outer.`,
      ));
    }
    if (points.length === 0) {
      issues.push(createValidationIssue(
        'loop-empty',
        VALIDATION_STATUS.error,
        `${label} has no points and will fail Flutter validation.`,
      ));
    } else if (closed && points.length < 3) {
      issues.push(createValidationIssue(
        'loop-closed-too-few-points',
        VALIDATION_STATUS.error,
        `${label} is closed but has fewer than 3 points.`,
      ));
    } else if (!closed) {
      issues.push(createValidationIssue(
        'loop-open',
        VALIDATION_STATUS.warning,
        `${label} is open.`,
      ));
    }
    if (!closed && role === 'cutout') {
      issues.push(createValidationIssue(
        'loop-open-cutout',
        VALIDATION_STATUS.error,
        `${label} is a cutout but is open, so it will not cut a hole.`,
      ));
    }
    if (!closed && points.length === 1) {
      issues.push(createValidationIssue(
        'loop-single-open-point',
        VALIDATION_STATUS.warning,
        `${label} has only 1 point.`,
      ));
    }

    const pointIdCounts = pointIdCountMap(points);
    points.forEach((point, pointIndex) => {
      const pointId = normalizeLoopId(point?.id);
      if (pointId && (pointIdCounts.get(pointId) || 0) > 1) {
        issues.push(createValidationIssue(
          'point-id-duplicate',
          VALIDATION_STATUS.warning,
          `${label} point ${pointIndex + 1} uses duplicate point id "${pointId}".`,
        ));
      }
    });

    return {
      status: statusFromIssues(issues),
      issues,
    };
  }

  function validateAnimation(state) {
    const issues = Array.isArray(state.animationIssues)
      ? state.animationIssues.map((issue) => ({ ...issue }))
      : [];
    const animation = state.animation;
    const clipReports = [];
    if (animation == null) {
      return {
        status: statusFromIssues(issues),
        issues,
        clipReports,
      };
    }
    if (!isPlainObject(animation)) {
      issues.push(createValidationIssue(
        'animation-malformed',
        VALIDATION_STATUS.warning,
        'Animation metadata must be an object.',
      ));
      return {
        status: statusFromIssues(issues),
        issues,
        clipReports,
      };
    }
    const schemaVersion = parseInteger(animation.schemaVersion, ANIMATION_SCHEMA_VERSION);
    if (![ANIMATION_SCHEMA_VERSION, ANIMATION_GRAPH_SCHEMA_VERSION].includes(schemaVersion)) {
      issues.push(createValidationIssue(
        'animation-schema-version',
        VALIDATION_STATUS.warning,
        `Animation schemaVersion should be ${ANIMATION_SCHEMA_VERSION} or ${ANIMATION_GRAPH_SCHEMA_VERSION}.`,
      ));
    }
    if (!Array.isArray(animation.clips)) {
      issues.push(createValidationIssue(
        'animation-clips-malformed',
        VALIDATION_STATUS.warning,
        'Animation clips must be a list.',
      ));
    } else {
      const clipIdCounts = animationIdCountMap(animation.clips);
      animation.clips.forEach((clip, clipIndex) => {
        const clipReport = validateAnimationClip(state, clip, clipIndex, clipIdCounts, schemaVersion);
        clipReports.push(clipReport);
        issues.push(...clipReport.issues);
      });
    }
    if (!isPlainObject(animation.bindings)) {
      issues.push(createValidationIssue(
        'animation-bindings-malformed',
        VALIDATION_STATUS.warning,
        'Animation bindings must be an object.',
      ));
    } else {
      issues.push(...validateAnimationBindings(animation.bindings, animation.clips));
    }
    return {
      status: statusFromIssues(issues),
      issues,
      clipReports,
    };
  }

  function validateAnimationBindings(bindings, clips) {
    const issues = [];
    const clipIds = new Set(
      (Array.isArray(clips) ? clips : [])
        .map((clip) => normalizeLoopId(clip?.id))
        .filter(Boolean),
    );
    for (const [bindingName, clipId] of Object.entries(bindings)) {
      const normalizedBinding = String(bindingName || '').trim();
      const normalizedClipId = normalizeLoopId(clipId);
      if (!normalizedBinding || !normalizedClipId) {
        issues.push(createValidationIssue(
          'animation-binding-invalid',
          VALIDATION_STATUS.warning,
          'Animation binding names and clip ids must be non-empty.',
        ));
      } else if (!clipIds.has(normalizedClipId)) {
        issues.push(createValidationIssue(
          'animation-binding-missing-clip',
          VALIDATION_STATUS.warning,
          `Animation binding "${normalizedBinding}" targets missing clip "${normalizedClipId}".`,
        ));
      }
    }
    return issues;
  }

  function validateAnimationClip(state, clip, clipIndex, clipIdCounts, schemaVersion = ANIMATION_SCHEMA_VERSION) {
    const issues = [];
    const clipId = normalizeLoopId(clip?.id);
    const label = clipId || `clip ${clipIndex + 1}`;
    if (!clipId) {
      issues.push(createValidationIssue(
        'animation-clip-id-missing',
        VALIDATION_STATUS.warning,
        `Animation clip ${clipIndex + 1} is missing an id.`,
      ));
    } else if ((clipIdCounts.get(clipId) || 0) > 1) {
      issues.push(createValidationIssue(
        'animation-clip-id-duplicate',
        VALIDATION_STATUS.warning,
        `Animation clip id "${clipId}" is duplicated.`,
      ));
    }
    if (!(Number(clip?.durationMs) > 0)) {
      issues.push(createValidationIssue(
        'animation-duration',
        VALIDATION_STATUS.warning,
        `Animation clip "${label}" should have a positive durationMs.`,
      ));
    }
    if (!Array.isArray(clip?.tracks)) {
      issues.push(createValidationIssue(
        'animation-tracks-malformed',
        VALIDATION_STATUS.warning,
        `Animation clip "${label}" tracks must be a list.`,
      ));
    } else {
      clip.tracks.forEach((track, trackIndex) => {
        issues.push(...validateAnimationTrack(state, track, `${label} track ${trackIndex + 1}`));
      });
    }
    if (schemaVersion === ANIMATION_GRAPH_SCHEMA_VERSION) {
      issues.push(...validateAnimationGraph(state, clip?.graph, label));
    }
    return {
      status: statusFromIssues(issues),
      issues,
    };
  }

  function validateAnimationGraph(state, graph, label) {
    const issues = [];
    if (graph == null) {
      return issues;
    }
    if (!isPlainObject(graph)) {
      return [
        createValidationIssue(
          'animation-graph-malformed',
          VALIDATION_STATUS.warning,
          `Animation clip "${label}" graph must be an object.`,
        ),
      ];
    }
    if (!Array.isArray(graph.nodes)) {
      issues.push(createValidationIssue(
        'animation-graph-nodes-malformed',
        VALIDATION_STATUS.warning,
        `Animation clip "${label}" graph nodes must be a list.`,
      ));
    }
    if (!Array.isArray(graph.outputs)) {
      issues.push(createValidationIssue(
        'animation-graph-outputs-malformed',
        VALIDATION_STATUS.warning,
        `Animation clip "${label}" graph outputs must be a list.`,
      ));
    }
    const nodeIdCounts = animationIdCountMap(graph.nodes || []);
    const nodeIds = new Set();
    (graph.nodes || []).forEach((node, nodeIndex) => {
      const nodeLabel = `${label} graph node ${nodeIndex + 1}`;
      const id = normalizeLoopId(node?.id);
      if (!id) {
        issues.push(createValidationIssue(
          'animation-graph-node-id-missing',
          VALIDATION_STATUS.warning,
          `${nodeLabel} is missing an id.`,
        ));
      } else {
        nodeIds.add(id);
        if ((nodeIdCounts.get(id) || 0) > 1) {
          issues.push(createValidationIssue(
            'animation-graph-node-id-duplicate',
            VALIDATION_STATUS.warning,
            `${nodeLabel} uses duplicate id "${id}".`,
          ));
        }
      }
      if (!GRAPH_NODE_TYPES.includes(String(node?.type || ''))) {
        issues.push(createValidationIssue(
          'animation-graph-node-type-unknown',
          VALIDATION_STATUS.warning,
          `${nodeLabel} uses unknown type "${node?.type || '(missing)'}".`,
        ));
      }
      issues.push(...validateGraphKeyframes(node?.keys, nodeLabel));
    });
    (graph.outputs || []).forEach((output, outputIndex) => {
      const outputLabel = `${label} graph output ${outputIndex + 1}`;
      const property = String(output?.property || '');
      const source = normalizeLoopId(output?.source);
      if (!source || !nodeIds.has(source)) {
        issues.push(createValidationIssue(
          'animation-graph-output-source-missing',
          VALIDATION_STATUS.warning,
          `${outputLabel} targets missing source node "${source || '(missing)'}".`,
        ));
      }
      if (!GRAPH_OUTPUT_PROPERTIES.includes(property)) {
        issues.push(createValidationIssue(
          'animation-graph-output-property-unknown',
          VALIDATION_STATUS.warning,
          `${outputLabel} uses unknown property "${property || '(missing)'}".`,
        ));
      }
      if (property.startsWith('point.')) {
        if (!resolveGraphPointRefs(state, output?.target).length) {
          issues.push(createValidationIssue(
            'animation-graph-target-zero-points',
            VALIDATION_STATUS.warning,
            `${outputLabel} point target resolves zero points.`,
          ));
        }
      } else if (property.startsWith('shape.')) {
        if (!resolveGraphShapeRefs(state, output?.target).length) {
          issues.push(createValidationIssue(
            'animation-graph-target-zero-shapes',
            VALIDATION_STATUS.warning,
            `${outputLabel} shape target resolves zero shapes.`,
          ));
        }
      } else if (!resolveGraphPathRefs(state, output?.target).length) {
        issues.push(createValidationIssue(
          'animation-graph-target-zero-loops',
          VALIDATION_STATUS.warning,
          `${outputLabel} loop target resolves zero loops.`,
        ));
      }
    });
    return issues;
  }

  function validateGraphKeyframes(keys, label) {
    const issues = [];
    if (!Array.isArray(keys) || !keys.length) {
      issues.push(createValidationIssue(
        'animation-graph-keyframes-malformed',
        VALIDATION_STATUS.warning,
        `${label} needs graph keyframes.`,
      ));
      return issues;
    }
    let previousTime = -Infinity;
    keys.forEach((keyframe, index) => {
      const frameLabel = `${label} key ${index + 1}`;
      const time = Number(keyframe?.timeMs);
      if (!Number.isFinite(time)) {
        issues.push(createValidationIssue(
          'animation-graph-keyframe-time',
          VALIDATION_STATUS.warning,
          `${frameLabel} needs numeric timeMs.`,
        ));
      } else if (time < previousTime) {
        issues.push(createValidationIssue(
          'animation-graph-keyframes-order',
          VALIDATION_STATUS.warning,
          `${label} graph keyframes must be ordered by timeMs.`,
        ));
      }
      previousTime = Number.isFinite(time) ? time : previousTime;
      const interp = String(keyframe?.interp ?? keyframe?.ease ?? 'smooth');
      if (!GRAPH_INTERPOLATIONS.includes(interp)) {
        issues.push(createValidationIssue(
          'animation-graph-interp-unknown',
          VALIDATION_STATUS.warning,
          `${frameLabel} uses unknown interpolation "${interp}".`,
        ));
      }
    });
    return issues;
  }

  function validateAnimationTrack(state, track, label) {
    const issues = [];
    if (!isPlainObject(track)) {
      return [
        createValidationIssue(
          'animation-track-malformed',
          VALIDATION_STATUS.warning,
          `${label} must be an object.`,
        ),
      ];
    }
    const property = String(track.property || '');
    if (property !== 'transform') {
      issues.push(createValidationIssue(
        'animation-property-unknown',
        VALIDATION_STATUS.warning,
        `${label} uses unsupported property "${property || '(missing)'}".`,
      ));
    }
    if (track.blend != null && track.blend !== 'add' && track.blend !== 'replace') {
      issues.push(createValidationIssue(
        'animation-blend-unknown',
        VALIDATION_STATUS.warning,
        `${label} uses unsupported blend "${track.blend}".`,
      ));
    }
    issues.push(...validateAnimationTarget(state, track.target, label));
    if (property === 'transform') {
      issues.push(...validateAnimationOrigin(track.origin, label));
      issues.push(...validateTransformKeyframes(track.keyframes, label));
    }
    return issues;
  }

  function validateAnimationTarget(state, target, label) {
    const issues = [];
    if (!isPlainObject(target)) {
      return [
        createValidationIssue(
          'animation-target-invalid',
          VALIDATION_STATUS.warning,
          `${label} has no valid target.`,
        ),
      ];
    }
    const shapeId = normalizeLoopId(target.shapeId);
    const loopId = normalizeLoopId(target.loopId);
    const loopIndex = Number(target.loopIndex);
    const tags = Array.isArray(target.tags)
      ? target.tags.map(normalizeTag).filter(Boolean)
      : [];
    if (!shapeId && !tags.length) {
      issues.push(createValidationIssue(
        'animation-target-invalid',
        VALIDATION_STATUS.warning,
        `${label} target needs shapeId or tags.`,
      ));
      return issues;
    }
    if (shapeId) {
      const shape = state.shapes.find((item) => normalizeId(item.id) === shapeId);
      if (!shape) {
        issues.push(createValidationIssue(
          'animation-target-missing-shape',
          VALIDATION_STATUS.warning,
          `${label} target shape "${shapeId}" does not exist.`,
        ));
      } else if (loopId && !shape.loops.some((loop) => normalizeLoopId(loop.id) === loopId)) {
        issues.push(createValidationIssue(
          'animation-target-missing-loop',
          VALIDATION_STATUS.warning,
          `${label} target loop "${loopId}" does not exist on shape "${shapeId}".`,
        ));
      } else if (target.loopIndex != null && (!Number.isInteger(loopIndex) || loopIndex < 0 || loopIndex >= shape.loops.length)) {
        issues.push(createValidationIssue(
          'animation-target-loop-index',
          VALIDATION_STATUS.warning,
          `${label} target loopIndex is outside shape "${shapeId}".`,
        ));
      }
    }
    if (tags.length) {
      const matches = state.shapes.filter((shape) => {
        const shapeTags = new Set(parseTags(shape.tagsText));
        return tags.every((tag) => shapeTags.has(tag));
      });
      if (!matches.length) {
        issues.push(createValidationIssue(
          'animation-target-zero-tags',
          VALIDATION_STATUS.warning,
          `${label} target tags resolve zero shapes.`,
        ));
      }
    }
    return issues;
  }

  function validateAnimationOrigin(origin, label) {
    if (
      isPlainObject(origin) &&
      origin.mode === 'canvas' &&
      Number.isFinite(Number(origin.x)) &&
      Number.isFinite(Number(origin.y))
    ) {
      return [];
    }
    return [
      createValidationIssue(
        'animation-origin-invalid',
        VALIDATION_STATUS.warning,
        `${label} transform origin must be a canvas x/y origin.`,
      ),
    ];
  }

  function validateTransformKeyframes(keyframes, label) {
    const issues = [];
    if (!Array.isArray(keyframes) || keyframes.length === 0) {
      return [
        createValidationIssue(
          'animation-keyframes-malformed',
          VALIDATION_STATUS.warning,
          `${label} transform keyframes must be a non-empty list.`,
        ),
      ];
    }
    let previousTime = -Infinity;
    keyframes.forEach((keyframe, index) => {
      const time = Number(keyframe?.timeMs);
      const frameLabel = `${label} keyframe ${index + 1}`;
      if (!Number.isFinite(time)) {
        issues.push(createValidationIssue(
          'animation-keyframe-time',
          VALIDATION_STATUS.warning,
          `${frameLabel} needs numeric timeMs.`,
        ));
      } else if (time < previousTime) {
        issues.push(createValidationIssue(
          'animation-keyframes-order',
          VALIDATION_STATUS.warning,
          `${label} keyframes must be ordered by timeMs.`,
        ));
      }
      previousTime = Number.isFinite(time) ? time : previousTime;
      if (keyframe?.ease != null && !KNOWN_EASES.includes(String(keyframe.ease))) {
        issues.push(createValidationIssue(
          'animation-ease-unknown',
          VALIDATION_STATUS.warning,
          `${frameLabel} uses unknown ease "${keyframe.ease}".`,
        ));
      }
      if (!isPlainObject(keyframe?.value)) {
        issues.push(createValidationIssue(
          'animation-keyframe-value',
          VALIDATION_STATUS.warning,
          `${frameLabel} needs a transform value object.`,
        ));
      } else {
        for (const key of TRANSFORM_VALUE_KEYS) {
          if (keyframe.value[key] != null && !Number.isFinite(Number(keyframe.value[key]))) {
            issues.push(createValidationIssue(
              'animation-transform-value',
              VALIDATION_STATUS.warning,
              `${frameLabel} transform value "${key}" must be numeric.`,
            ));
          }
        }
      }
    });
    return issues;
  }

  function nearestPointIndex(points, canvasPoint, radius) {
    let bestIndex = -1;
    let bestDistance = radius;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const distance = Math.hypot(point.x - canvasPoint.x, point.y - canvasPoint.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function nearestPointHit(state, canvasPoint, radius) {
    let best = null;
    for (let shapeIndex = 0; shapeIndex < state.shapes.length; shapeIndex += 1) {
      const shape = state.shapes[shapeIndex];
      for (let loopIndex = 0; loopIndex < shape.loops.length; loopIndex += 1) {
        const loop = shape.loops[loopIndex];
        const pointIndex = nearestPointIndex(loop.points, canvasPoint, radius);
        if (pointIndex >= 0) {
          const point = loop.points[pointIndex];
          const distance = Math.hypot(point.x - canvasPoint.x, point.y - canvasPoint.y);
          if (!best || distance < best.distance) {
            best = { shapeIndex, loopIndex, pointIndex, distance };
          }
        }
      }
    }
    return best;
  }

  function nearestHandleHit(state, canvasPoint, radius) {
    const loop = getSelectedLoop(state);
    if (!loop) {
      return null;
    }
    let best = null;
    loop.points.forEach((point, pointIndex) => {
      for (const handleName of ['inHandle', 'outHandle']) {
        const handle = point[handleName];
        if (!handle) {
          continue;
        }
        const absolute = handleAbsolutePoint(point, handleName);
        const distance = Math.hypot(absolute.x - canvasPoint.x, absolute.y - canvasPoint.y);
        if (distance <= radius && (!best || distance < best.distance)) {
          best = { pointIndex, handleName, distance };
        }
      }
    });
    return best;
  }

  function canCloseLoop(points, canvasPoint, radius) {
    if (points.length < 3) {
      return false;
    }
    return Math.hypot(points[0].x - canvasPoint.x, points[0].y - canvasPoint.y) <= radius;
  }

  function handleAbsolutePoint(point, handleName) {
    const handle = point[handleName];
    return handle
      ? { x: point.x + handle.x, y: point.y + handle.y }
      : null;
  }

  function parseTags(tagsText) {
    return String(tagsText || '')
      .split(',')
      .map(normalizeTag)
      .filter(Boolean);
  }

  function addTagToTagsText(tagsText, tag) {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return String(tagsText || '').trim();
    }
    const tags = parseTags(tagsText);
    const existing = new Set(tags.map((item) => item.toLowerCase()));
    if (!existing.has(normalizedTag.toLowerCase())) {
      tags.push(normalizedTag);
    }
    return tags.join(', ');
  }

  function tagPresetLoopRole(tag) {
    const normalizedTag = normalizeTag(tag);
    if (normalizedTag.startsWith('slot:') || normalizedTag.startsWith('fx:')) {
      return 'effectZone';
    }
    if (normalizedTag.startsWith('hit:')) {
      return 'hitZone';
    }
    return null;
  }

  function normalizeTag(tag) {
    return String(tag || '').trim();
  }

  function normalizeId(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'traced_shape';
  }

  function normalizeLoopId(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function defaultLoopId(loop, loopIndex) {
    const role = normalizeLoopId(loop?.role) || 'loop';
    return `${role}_${Math.max(0, parseInteger(loopIndex, 0)) + 1}`;
  }

  function defaultPointId(pointIndex) {
    return `pt_${Math.max(0, parseInteger(pointIndex, 0)) + 1}`;
  }

  function normalizeShapeLoopIds(loops) {
    const usedIds = new Set();
    return (Array.isArray(loops) ? loops : []).map((loop, index) => {
      const cleaned = cleanLoop(loop);
      const baseId = normalizeLoopId(cleaned.id) || defaultLoopId(cleaned, index);
      const id = uniqueLoopId(baseId, usedIds);
      usedIds.add(id);
      return { ...cleaned, id };
    });
  }

  function uniqueLoopId(baseId, usedIds) {
    const normalized = normalizeLoopId(baseId) || 'loop';
    if (!usedIds.has(normalized)) {
      return normalized;
    }
    let suffix = 2;
    while (usedIds.has(`${normalized}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalized}_${suffix}`;
  }

  function uniquePointId(baseId, usedIds) {
    const normalized = normalizeLoopId(baseId) || 'pt';
    if (!usedIds.has(normalized)) {
      return normalized;
    }
    let suffix = 2;
    while (usedIds.has(`${normalized}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalized}_${suffix}`;
  }

  function loopIdCountMap(loops) {
    const counts = new Map();
    for (const loop of Array.isArray(loops) ? loops : []) {
      const id = normalizeLoopId(loop?.id);
      if (id) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }

  function pointIdCountMap(points) {
    const counts = new Map();
    for (const point of Array.isArray(points) ? points : []) {
      const id = normalizeLoopId(point?.id);
      if (id) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }

  function animationIdCountMap(clips) {
    const counts = new Map();
    for (const clip of Array.isArray(clips) ? clips : []) {
      const id = normalizeLoopId(clip?.id);
      if (id) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }

  function normalizeColor(value, fallback) {
    const source = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(source) ? source : fallback;
  }

  function parseInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJsonCompatible(value) {
    if (Array.isArray(value)) {
      return value.map(cloneJsonCompatible);
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined && typeof item !== 'function')
          .map(([key, item]) => [key, cloneJsonCompatible(item)]),
      );
    }
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    ) {
      return value;
    }
    return null;
  }

  function cleanPoint(point) {
    const id = normalizeLoopId(point.id);
    const output = {
      x: round(Number(point.x) || 0),
      y: round(Number(point.y) || 0),
      inHandle: cleanHandle(point.inHandle ?? point.in),
      outHandle: cleanHandle(point.outHandle ?? point.out),
    };
    if (id) {
      output.id = id;
    }
    return output;
  }

  function exportPoint(point) {
    const output = {
      x: round(point.x),
      y: round(point.y),
    };
    const id = normalizeLoopId(point.id);
    if (id) {
      output.id = id;
    }
    if (point.inHandle) {
      output.in = cleanHandle(point.inHandle);
    }
    if (point.outHandle) {
      output.out = cleanHandle(point.outHandle);
    }
    return output;
  }

  function cleanHandle(handle) {
    if (!handle) {
      return null;
    }
    return {
      x: round(Number(handle.x) || 0),
      y: round(Number(handle.y) || 0),
    };
  }

  function cleanLoop(loop) {
    const role = LOOP_ROLES.includes(loop.role) ? loop.role : 'outer';
    return {
      id: normalizeLoopId(loop.id) || defaultLoopId({ role }, 0),
      role,
      closed: Boolean(loop.closed),
      fillRule: loop.fillRule === 'evenOdd' || role === 'cutout' ? 'evenOdd' : 'nonZero',
      points: Array.isArray(loop.points) ? loop.points.map(cleanPoint) : [],
    };
  }

  function cleanStyle(style) {
    return {
      fill: normalizeColor(style.fill, DEFAULT_STYLE.fill),
      stroke: normalizeColor(style.stroke, DEFAULT_STYLE.stroke),
      strokeWidth: Math.max(0, Number(style.strokeWidth) || DEFAULT_STYLE.strokeWidth),
    };
  }

  function updateSelectedShape(state, updater, selectionOverrides = {}) {
    const shape = getSelectedShape(state);
    if (!shape) {
      return state;
    }
    const shapes = state.shapes.slice();
    shapes[state.selectedShapeIndex] = createShape(updater(shape));
    return {
      ...state,
      shapes,
      ...selectionOverrides,
    };
  }

  function updateSelectedLoop(state, updater, selectionOverrides = {}) {
    const shape = getSelectedShape(state);
    const loop = getSelectedLoop(state);
    if (!shape || !loop) {
      return state;
    }
    const loops = shape.loops.slice();
    loops[state.selectedLoopIndex] = cleanLoop(updater(loop));
    return updateSelectedShape(state, (current) => ({ ...current, loops }), selectionOverrides);
  }

  function buildShapeJson(shape) {
    const loops = normalizeShapeLoopIds((shape.loops || []).map(cleanLoop));
    const exportShape = { ...shape, loops };
    return {
      id: normalizeId(shape.id),
      label: shape.label || normalizeId(shape.id),
      tags: parseTags(shape.tagsText),
      z: parseInteger(shape.z, 0),
      loops: loops.map((loop) => buildLoopJson(loop, exportShape)),
      style: cleanStyle(shape.style),
    };
  }

  function buildLoopJson(loop, shape) {
    const hasCutout = shape.loops.some((item) => item.role === 'cutout');
    const fillRule = hasCutout || loop.role === 'cutout' ? 'evenOdd' : loop.fillRule;
    return {
      role: loop.role,
      id: normalizeLoopId(loop.id) || defaultLoopId(loop, 0),
      closed: Boolean(loop.closed),
      fillRule,
      points: loop.points.map(exportPoint),
    };
  }

  function importShape(shape) {
    return createShape({
      id: shape.id || 'traced_shape',
      label: shape.label || shape.id || 'Traced Shape',
      tagsText: Array.isArray(shape.tags) ? shape.tags.join(', ') : '',
      z: parseInteger(shape.z, 0),
      style: shape.style || DEFAULT_STYLE,
      loops: Array.isArray(shape.loops) && shape.loops.length
        ? shape.loops.map(createLoop)
        : [createLoop({ role: 'outer' })],
    });
  }

  function cloneShape(shape) {
    return {
      ...shape,
      style: { ...shape.style },
      loops: shape.loops.map(cloneLoop),
    };
  }

  function cloneLoop(loop) {
    return {
      ...loop,
      points: loop.points.map((point) => ({
        ...point,
        inHandle: point.inHandle ? { ...point.inHandle } : null,
        outHandle: point.outHandle ? { ...point.outHandle } : null,
      })),
    };
  }

  function translateLoop(loop, dx, dy) {
    return cleanLoop({
      ...loop,
      points: loop.points.map((point) => ({
        ...point,
        x: point.x + dx,
        y: point.y + dy,
        inHandle: point.inHandle ? { ...point.inHandle } : null,
        outHandle: point.outHandle ? { ...point.outHandle } : null,
      })),
    });
  }

  function scaleLoopAround(loop, origin, scaleX, scaleY) {
    return transformLoopAround(loop, origin, { scaleX, scaleY, skewX: 0, skewY: 0, rotation: 0 });
  }

  function transformLoopAround(loop, origin, transform) {
    return cleanLoop({
      ...loop,
      points: loop.points.map((point) => transformPointAround(point, origin, transform)),
    });
  }

  function scalePointAround(point, origin, scaleX, scaleY) {
    return transformPointAround(point, origin, { scaleX, scaleY, skewX: 0, skewY: 0, rotation: 0 });
  }

  function transformPointAround(point, origin, transform) {
    const local = transformLinearVector(
      { x: point.x - origin.x, y: point.y - origin.y },
      transform,
    );
    return cleanPoint({
      ...point,
      x: origin.x + local.x,
      y: origin.y + local.y,
      inHandle: transformHandle(point.inHandle, transform),
      outHandle: transformHandle(point.outHandle, transform),
    });
  }

  function scaleHandle(handle, scaleX, scaleY) {
    return transformHandle(handle, { scaleX, scaleY, skewX: 0, skewY: 0, rotation: 0 });
  }

  function transformHandle(handle, transform) {
    return handle
      ? cleanHandle(transformLinearVector(handle, transform))
      : null;
  }

  function transformLinearVector(vector, transform = {}) {
    const scaleX = finiteOr(transform.scaleX ?? transform.sx, 1);
    const scaleY = finiteOr(transform.scaleY ?? transform.sy, 1);
    const skewX = finiteOr(transform.skewX, 0);
    const skewY = finiteOr(transform.skewY, 0);
    const scaled = {
      x: Number(vector.x) * scaleX,
      y: Number(vector.y) * scaleY,
    };
    const skewed = {
      x: scaled.x + Math.tan(skewX) * scaled.y,
      y: Math.tan(skewY) * scaled.x + scaled.y,
    };
    return rotateVector(skewed, finiteOr(transform.rotation, 0));
  }

  function rotateVector(vector, radians) {
    if (!radians) {
      return { x: round(vector.x), y: round(vector.y) };
    }
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      x: round(vector.x * cos - vector.y * sin),
      y: round(vector.x * sin + vector.y * cos),
    };
  }

  function removeNearDuplicateLoop(loop, threshold) {
    const points = loop.points.map(clonePoint);
    if (points.length < 2) {
      return cleanLoop({ ...loop, points });
    }

    const kept = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
      if (distanceBetweenPoints(kept[kept.length - 1], points[index]) >= threshold) {
        kept.push(points[index]);
      }
    }
    if (
      loop.closed &&
      kept.length > 3 &&
      distanceBetweenPoints(kept[0], kept[kept.length - 1]) < threshold
    ) {
      kept.pop();
    }
    if (loop.closed && kept.length < 3) {
      return cleanLoop(loop);
    }
    return cleanLoop({
      ...loop,
      points: kept,
      closed: loop.closed && kept.length >= 3,
    });
  }

  function simplifyStraightLoop(loop, tolerance) {
    const points = loop.points.map(clonePoint);
    const count = points.length;
    if (count < 3 || (loop.closed && count <= 3)) {
      return cleanLoop({ ...loop, points });
    }

    const keep = [];
    for (let index = 0; index < count; index += 1) {
      const point = points[index];
      if (!loop.closed && (index === 0 || index === count - 1)) {
        keep.push(point);
        continue;
      }
      const previous = points[(index - 1 + count) % count];
      const next = points[(index + 1) % count];
      const hasHandles =
        Boolean(point.inHandle || point.outHandle || previous.outHandle || next.inHandle);
      const tooFewClosedPoints = loop.closed && keep.length + (count - index - 1) <= 3;
      const straightEnough =
        distancePointToSegment(point, previous, next) <= tolerance &&
        distanceBetweenPoints(previous, next) > 0;
      if (hasHandles || tooFewClosedPoints || !straightEnough) {
        keep.push(point);
      }
    }
    if (loop.closed && keep.length < 3) {
      return cleanLoop(loop);
    }
    return cleanLoop({
      ...loop,
      points: keep,
      closed: loop.closed && keep.length >= 3,
    });
  }

  function closeLoopGap(loop, threshold) {
    const points = loop.points.map(clonePoint);
    if (loop.closed || points.length < 3) {
      return cleanLoop({ ...loop, points });
    }
    const first = points[0];
    const last = points[points.length - 1];
    if (distanceBetweenPoints(first, last) > threshold) {
      return cleanLoop({ ...loop, points });
    }
    points[points.length - 1] = cleanPoint({
      ...last,
      x: first.x,
      y: first.y,
    });
    return cleanLoop({
      ...loop,
      points,
      closed: true,
    });
  }

  function reverseLoop(loop) {
    return cleanLoop({
      ...loop,
      points: loop.points.slice().reverse().map((point) => cleanPoint({
        ...point,
        inHandle: point.outHandle ? { ...point.outHandle } : null,
        outHandle: point.inHandle ? { ...point.inHandle } : null,
      })),
    });
  }

  function normalizeBrush(brush) {
    return {
      center: {
        x: Number(brush.center?.x) || 0,
        y: Number(brush.center?.y) || 0,
      },
      dx: Number(brush.delta?.dx ?? brush.dx) || 0,
      dy: Number(brush.delta?.dy ?? brush.dy) || 0,
      radius: clamp(Number(brush.radius) || 80, 0.001, 10000),
      strength: normalizeUnit(brush.strength, 0.55),
      falloff: normalizeUnit(brush.falloff, 0.55),
      pinch: normalizeUnit(brush.pinch, 0),
      bubble: normalizeUnit(brush.bubble, 0),
      affectHandles: Boolean(brush.affectHandles),
      selectedOnly: Boolean(brush.selectedOnly),
    };
  }

  function warpLoopWithBrush(loop, options) {
    const stats = createBrushStats(0);
    const points = loop.points.map((point) => {
      const original = clonePoint(point);
      const pointWeight = brushFalloffWeight(
        distanceBetweenPoints(original, options.center),
        options.radius,
        options,
      );
      const move = {
        x: options.dx * options.strength * pointWeight,
        y: options.dy * options.strength * pointWeight,
      };
      const movedPoint = {
        ...original,
        x: original.x + move.x,
        y: original.y + move.y,
      };
      const displacement = Math.hypot(move.x, move.y);
      if (displacement > 0.0001) {
        stats.affectedPointCount += 1;
        stats.maxDisplacement = Math.max(stats.maxDisplacement, displacement);
      }
      movedPoint.inHandle = warpHandleWithBrush(original, movedPoint, 'inHandle', options, stats);
      movedPoint.outHandle = warpHandleWithBrush(original, movedPoint, 'outHandle', options, stats);
      return cleanPoint(movedPoint);
    });
    stats.maxDisplacement = round(stats.maxDisplacement);
    if (stats.affectedPointCount || stats.affectedHandleCount) {
      stats.loopCount = 1;
    }
    return {
      loop: cleanLoop({ ...loop, points }),
      stats,
    };
  }

  function warpHandleWithBrush(originalPoint, movedPoint, handleName, options, stats) {
    const handle = originalPoint[handleName];
    if (!handle) {
      return null;
    }
    if (!options.affectHandles) {
      return { ...handle };
    }
    const absolute = {
      x: originalPoint.x + handle.x,
      y: originalPoint.y + handle.y,
    };
    const weight = brushFalloffWeight(
      distanceBetweenPoints(absolute, options.center),
      options.radius,
      options,
    );
    const move = {
      x: options.dx * options.strength * weight,
      y: options.dy * options.strength * weight,
    };
    const displacement = Math.hypot(move.x, move.y);
    if (displacement > 0.0001) {
      stats.affectedHandleCount += 1;
    }
    return {
      x: absolute.x + move.x - movedPoint.x,
      y: absolute.y + move.y - movedPoint.y,
    };
  }

  function createBrushStats(loopCount = 0) {
    return {
      loopCount,
      affectedPointCount: 0,
      affectedHandleCount: 0,
      maxDisplacement: 0,
    };
  }

  function mergeBrushStats(target, source) {
    target.affectedPointCount += source.affectedPointCount || 0;
    target.affectedHandleCount += source.affectedHandleCount || 0;
    target.maxDisplacement = round(Math.max(
      target.maxDisplacement,
      Number(source.maxDisplacement) || 0,
    ));
  }

  function sampleLoopPathDetails(loop, options = {}) {
    const points = (loop.points || []).map(clonePoint);
    const sampleSpacing = Math.max(0.5, Number(options.sampleSpacing) || 4);
    const samples = [];
    const anchorSampleIndices = new Array(points.length).fill(-1);
    if (!points.length) {
      return { points: samples, anchorSampleIndices };
    }

    pushSample(samples, points[0]);
    anchorSampleIndices[0] = 0;
    const segmentCount = loop.closed ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const current = points[index];
      const nextIndex = (index + 1) % points.length;
      const next = points[nextIndex];
      const segment = cubicSegmentFromPoints(current, next);
      const estimatedLength =
        distanceBetweenPoints(segment.p0, segment.c1) +
        distanceBetweenPoints(segment.c1, segment.c2) +
        distanceBetweenPoints(segment.c2, segment.p3);
      const steps = Math.max(1, Math.min(64, Math.ceil(estimatedLength / sampleSpacing)));
      for (let step = 1; step <= steps; step += 1) {
        const point = segment.hasCurve
          ? cubicPoint(segment, step / steps)
          : lerpPoint(segment.p0, segment.p3, step / steps);
        if (loop.closed && nextIndex === 0 && step === steps) {
          continue;
        }
        pushSample(samples, point);
      }
      if (!(loop.closed && nextIndex === 0)) {
        anchorSampleIndices[nextIndex] = samples.length - 1;
      }
    }

    return {
      points: removeSequentialSampleDuplicates(
        samples,
        Number(options.minSampleDistance) || PATH_OPTIMIZATION_DEFAULTS.minSampleDistance,
        Boolean(loop.closed),
      ),
      anchorSampleIndices,
    };
  }

  function optimizeTolerance(options) {
    return clamp(
      Number(options.tolerance) || PATH_OPTIMIZATION_DEFAULTS.tolerance,
      0.1,
      100,
    );
  }

  function optimizeSampleSpacing(options) {
    if (Number.isFinite(Number(options.sampleSpacing))) {
      return clamp(Number(options.sampleSpacing), 0.5, 32);
    }
    return clamp(optimizeTolerance(options) * 0.75, 1.5, PATH_OPTIMIZATION_DEFAULTS.sampleSpacing);
  }

  function createOptimizationStats(overrides = {}) {
    const beforePoints = parseInteger(overrides.beforePoints, 0);
    const afterPoints = parseInteger(overrides.afterPoints, beforePoints);
    return {
      loopCount: parseInteger(overrides.loopCount, 1),
      optimizedCount: overrides.optimized ? 1 : parseInteger(overrides.optimizedCount, 0),
      skippedCount: overrides.skipped ? 1 : parseInteger(overrides.skippedCount, 0),
      beforePoints,
      afterPoints,
      removedPoints: Math.max(0, beforePoints - afterPoints),
      maxError: round(Number(overrides.maxError) || 0),
      optimized: Boolean(overrides.optimized),
      skipped: Boolean(overrides.skipped),
      reason: overrides.reason || '',
    };
  }

  function aggregateOptimizationStats(stats) {
    const output = createOptimizationStats({
      loopCount: stats.length,
      beforePoints: 0,
      afterPoints: 0,
      maxError: 0,
    });
    output.optimizedCount = 0;
    output.skippedCount = 0;
    output.removedPoints = 0;
    for (const item of stats) {
      output.beforePoints += item.beforePoints || 0;
      output.afterPoints += item.afterPoints || 0;
      output.maxError = round(Math.max(output.maxError, Number(item.maxError) || 0));
      if (item.optimized) {
        output.optimizedCount += 1;
      }
      if (item.skipped) {
        output.skippedCount += 1;
      }
    }
    output.removedPoints = Math.max(0, output.beforePoints - output.afterPoints);
    output.optimized = output.optimizedCount > 0;
    output.skipped = output.skippedCount > 0 && output.optimizedCount === 0;
    return output;
  }

  function optimizationSplitIndices(loop, details, options = {}) {
    const samples = details.points;
    const count = samples.length;
    if (!count) {
      return [];
    }
    if (!loop.closed) {
      const splits = [0, count - 1];
      for (const index of cornerAnchorIndices(loop, options)) {
        const sampleIndex = details.anchorSampleIndices[index];
        if (sampleIndex > 0 && sampleIndex < count - 1) {
          splits.push(sampleIndex);
        }
      }
      return uniqueSortedIndices(splits, count);
    }

    const splits = [];
    for (const index of cornerAnchorIndices(loop, options)) {
      const sampleIndex = details.anchorSampleIndices[index];
      if (sampleIndex >= 0 && sampleIndex < count) {
        splits.push(sampleIndex);
      }
    }

    if (splits.length < 3) {
      splits.push(0, Math.round(count * 0.25), Math.round(count * 0.5), Math.round(count * 0.75));
    }
    return uniqueSortedIndices(splits, count);
  }

  function cornerAnchorIndices(loop, options = {}) {
    if (options.keepCorners === false) {
      return [];
    }
    const points = loop.points || [];
    const count = points.length;
    if (count < 3) {
      return [];
    }
    const angleLimit = Number(options.cornerAngleDegrees) || PATH_OPTIMIZATION_DEFAULTS.cornerAngleDegrees;
    const indices = [];
    const start = loop.closed ? 0 : 1;
    const end = loop.closed ? count : count - 1;
    for (let index = start; index < end; index += 1) {
      const previous = points[(index - 1 + count) % count];
      const point = points[index];
      const next = points[(index + 1) % count];
      if (point.inHandle || point.outHandle) {
        continue;
      }
      const angle = angleBetweenPoints(previous, point, next);
      if (angle > 0 && angle <= angleLimit) {
        indices.push(index);
      }
    }
    return indices;
  }

  function optimizationSpans(samples, splitIndices, closed) {
    const count = samples.length;
    const spans = [];
    if (!count || splitIndices.length < (closed ? 3 : 2)) {
      return spans;
    }
    if (!closed) {
      for (let index = 0; index < splitIndices.length - 1; index += 1) {
        const start = splitIndices[index];
        const end = splitIndices[index + 1];
        if (end > start) {
          spans.push(samples.slice(start, end + 1));
        }
      }
      return spans;
    }

    for (let index = 0; index < splitIndices.length; index += 1) {
      const start = splitIndices[index];
      const end = splitIndices[(index + 1) % splitIndices.length];
      const span = [];
      let cursor = start;
      span.push(samples[cursor]);
      while (cursor !== end) {
        cursor = (cursor + 1) % count;
        span.push(samples[cursor]);
      }
      if (span.length >= 2) {
        spans.push(span);
      }
    }
    return spans;
  }

  function fitCubicSpan(points, tolerance, maxDepth) {
    const segments = [];
    const maxError = fitCubicRecursive(
      points,
      tolerance,
      0,
      maxDepth,
      segments,
    );
    return { segments, maxError };
  }

  function fitCubicRecursive(points, tolerance, depth, maxDepth, segments) {
    if (points.length < 2) {
      return 0;
    }
    if (points.length === 2) {
      segments.push(lineCubic(points[0], points[1]));
      return 0;
    }

    const parameters = chordLengthParameterize(points);
    const cubic = generateFittedCubic(
      points,
      estimateStartTangent(points),
      estimateEndTangent(points),
      parameters,
    );
    const error = maxCubicFitError(points, cubic, parameters);
    if (error.maxError <= tolerance || depth >= maxDepth || error.index <= 0 || error.index >= points.length - 1) {
      segments.push(cubic);
      return error.maxError;
    }

    const left = points.slice(0, error.index + 1);
    const right = points.slice(error.index);
    const leftError = fitCubicRecursive(left, tolerance, depth + 1, maxDepth, segments);
    const rightError = fitCubicRecursive(right, tolerance, depth + 1, maxDepth, segments);
    return Math.max(leftError, rightError);
  }

  function generateFittedCubic(points, tangentStart, tangentEnd, parameters) {
    const first = points[0];
    const last = points[points.length - 1];
    const matrix = [
      [0, 0],
      [0, 0],
    ];
    const vector = [0, 0];

    for (let index = 0; index < points.length; index += 1) {
      const u = parameters[index];
      const b0 = Math.pow(1 - u, 3);
      const b1 = 3 * u * Math.pow(1 - u, 2);
      const b2 = 3 * u * u * (1 - u);
      const b3 = u * u * u;
      const a1 = scalePoint(tangentStart, b1);
      const a2 = scalePoint(tangentEnd, b2);
      const base = addPoints(
        scalePoint(first, b0 + b1),
        scalePoint(last, b2 + b3),
      );
      const pointVector = subtractPoints(points[index], base);

      matrix[0][0] += dotPoints(a1, a1);
      matrix[0][1] += dotPoints(a1, a2);
      matrix[1][0] = matrix[0][1];
      matrix[1][1] += dotPoints(a2, a2);
      vector[0] += dotPoints(a1, pointVector);
      vector[1] += dotPoints(a2, pointVector);
    }

    const determinant = matrix[0][0] * matrix[1][1] - matrix[1][0] * matrix[0][1];
    const chordLength = distanceBetweenPoints(first, last);
    let alphaStart = chordLength / 3;
    let alphaEnd = chordLength / 3;
    if (Math.abs(determinant) > 1e-9) {
      alphaStart = (vector[0] * matrix[1][1] - vector[1] * matrix[0][1]) / determinant;
      alphaEnd = (matrix[0][0] * vector[1] - matrix[1][0] * vector[0]) / determinant;
    }

    const epsilon = Math.max(1e-6, chordLength * 1e-4);
    if (!Number.isFinite(alphaStart) || !Number.isFinite(alphaEnd) || alphaStart < epsilon || alphaEnd < epsilon) {
      alphaStart = chordLength / 3;
      alphaEnd = chordLength / 3;
    }

    return {
      p0: cloneSamplePoint(first),
      c1: addPoints(first, scalePoint(tangentStart, alphaStart)),
      c2: addPoints(last, scalePoint(tangentEnd, alphaEnd)),
      p3: cloneSamplePoint(last),
    };
  }

  function maxCubicFitError(points, cubic, parameters) {
    let maxError = 0;
    let maxIndex = Math.floor(points.length / 2);
    for (let index = 1; index < points.length - 1; index += 1) {
      const distance = distanceBetweenPoints(points[index], cubicPoint(cubic, parameters[index]));
      if (distance > maxError) {
        maxError = distance;
        maxIndex = index;
      }
    }
    return { maxError, index: maxIndex };
  }

  function buildLoopFromCubicSegments(loop, segments) {
    if (!segments.length) {
      return cleanLoop(loop);
    }
    const points = [];
    if (loop.closed) {
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        points.push(cleanPoint({
          x: segment.p0.x,
          y: segment.p0.y,
          inHandle: null,
          outHandle: relativeHandle(segment.p0, segment.c1),
        }));
      }
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const nextIndex = (index + 1) % points.length;
        points[nextIndex] = cleanPoint({
          ...points[nextIndex],
          inHandle: relativeHandle(points[nextIndex], segment.c2),
        });
      }
    } else {
      const first = segments[0];
      points.push(cleanPoint({
        x: first.p0.x,
        y: first.p0.y,
        inHandle: null,
        outHandle: relativeHandle(first.p0, first.c1),
      }));
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const nextSegment = segments[index + 1];
        points.push(cleanPoint({
          x: segment.p3.x,
          y: segment.p3.y,
          inHandle: relativeHandle(segment.p3, segment.c2),
          outHandle: nextSegment ? relativeHandle(nextSegment.p0, nextSegment.c1) : null,
        }));
      }
    }
    return cleanLoop({
      ...loop,
      points,
      closed: loop.closed,
    });
  }

  function estimateLoopMaxError(candidateLoop, sourceSamples, closed) {
    const candidateSamples = sampleLoopPath(candidateLoop, { sampleSpacing: 2 });
    if (candidateSamples.length < 2 || !sourceSamples.length) {
      return 0;
    }
    let maxError = 0;
    for (const point of sourceSamples) {
      maxError = Math.max(
        maxError,
        distancePointToPolyline(point, candidateSamples, closed),
      );
    }
    return round(maxError);
  }

  function cubicSegmentFromPoints(current, next) {
    const p0 = pointToSample(current);
    const p3 = pointToSample(next);
    const c1 = current.outHandle
      ? { x: current.x + current.outHandle.x, y: current.y + current.outHandle.y }
      : p0;
    const c2 = next.inHandle
      ? { x: next.x + next.inHandle.x, y: next.y + next.inHandle.y }
      : p3;
    return {
      p0,
      c1,
      c2,
      p3,
      hasCurve: Boolean(current.outHandle || next.inHandle),
    };
  }

  function lineCubic(start, end) {
    const delta = subtractPoints(end, start);
    return {
      p0: cloneSamplePoint(start),
      c1: addPoints(start, scalePoint(delta, 1 / 3)),
      c2: addPoints(start, scalePoint(delta, 2 / 3)),
      p3: cloneSamplePoint(end),
    };
  }

  function chordLengthParameterize(points) {
    const output = [0];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      total += distanceBetweenPoints(points[index - 1], points[index]);
      output.push(total);
    }
    if (total <= 0) {
      return output.map((_, index) => index / Math.max(1, output.length - 1));
    }
    return output.map((value) => value / total);
  }

  function estimateStartTangent(points) {
    for (let index = 1; index < points.length; index += 1) {
      const tangent = normalizePoint(subtractPoints(points[index], points[0]));
      if (tangent) {
        return tangent;
      }
    }
    return { x: 1, y: 0 };
  }

  function estimateEndTangent(points) {
    const last = points[points.length - 1];
    for (let index = points.length - 2; index >= 0; index -= 1) {
      const tangent = normalizePoint(subtractPoints(points[index], last));
      if (tangent) {
        return tangent;
      }
    }
    return { x: -1, y: 0 };
  }

  function relativeHandle(anchor, handle) {
    const relative = {
      x: handle.x - anchor.x,
      y: handle.y - anchor.y,
    };
    if (Math.hypot(relative.x, relative.y) < 0.001) {
      return null;
    }
    return relative;
  }

  function pointToSample(point) {
    return {
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
    };
  }

  function cloneSamplePoint(point) {
    return { x: point.x, y: point.y };
  }

  function pushSample(samples, point) {
    samples.push(pointToSample(point));
  }

  function removeSequentialSampleDuplicates(points, threshold, closed) {
    if (!points.length) {
      return [];
    }
    const output = [cloneSamplePoint(points[0])];
    for (let index = 1; index < points.length; index += 1) {
      if (distanceBetweenPoints(output[output.length - 1], points[index]) >= threshold) {
        output.push(cloneSamplePoint(points[index]));
      }
    }
    if (closed && output.length > 1 && distanceBetweenPoints(output[0], output[output.length - 1]) < threshold) {
      output.pop();
    }
    return output;
  }

  function uniqueSortedIndices(indices, length) {
    return Array.from(new Set(indices.map((index) => clamp(Math.round(index), 0, length - 1))))
      .sort((a, b) => a - b);
  }

  function cubicPoint(segment, t) {
    const inverse = 1 - t;
    const b0 = inverse * inverse * inverse;
    const b1 = 3 * t * inverse * inverse;
    const b2 = 3 * t * t * inverse;
    const b3 = t * t * t;
    return {
      x: segment.p0.x * b0 + segment.c1.x * b1 + segment.c2.x * b2 + segment.p3.x * b3,
      y: segment.p0.y * b0 + segment.c1.y * b1 + segment.c2.y * b2 + segment.p3.y * b3,
    };
  }

  function lerpPoint(start, end, t) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  }

  function addPoints(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function subtractPoints(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  function scalePoint(point, scale) {
    return { x: point.x * scale, y: point.y * scale };
  }

  function dotPoints(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function normalizePoint(point) {
    const length = Math.hypot(point.x, point.y);
    if (length <= 1e-9) {
      return null;
    }
    return { x: point.x / length, y: point.y / length };
  }

  function angleBetweenPoints(previous, point, next) {
    const a = normalizePoint(subtractPoints(previous, point));
    const b = normalizePoint(subtractPoints(next, point));
    if (!a || !b) {
      return 0;
    }
    const cosine = clamp(dotPoints(a, b), -1, 1);
    return Math.acos(cosine) * 180 / Math.PI;
  }

  function distancePointToPolyline(point, points, closed) {
    let minDistance = Infinity;
    const segmentCount = closed ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      minDistance = Math.min(minDistance, distancePointToSegment(point, start, end));
    }
    return Number.isFinite(minDistance) ? minDistance : 0;
  }

  function clonePoint(point) {
    return {
      ...point,
      inHandle: point.inHandle ? { ...point.inHandle } : null,
      outHandle: point.outHandle ? { ...point.outHandle } : null,
    };
  }

  function createPathRef(shapeIndex, loopIndex) {
    return {
      shapeIndex: parseInteger(shapeIndex, 0),
      loopIndex: parseInteger(loopIndex, 0),
    };
  }

  function createPointRef(shapeIndex, loopIndex, pointIndex) {
    return {
      shapeIndex: parseInteger(shapeIndex, 0),
      loopIndex: parseInteger(loopIndex, 0),
      pointIndex: parseInteger(pointIndex, 0),
    };
  }

  function normalizePathRef(state, ref) {
    if (!ref) {
      return null;
    }
    const shapeIndex = parseInteger(ref.shapeIndex, -1);
    const loopIndex = parseInteger(ref.loopIndex, -1);
    const shape = state.shapes[shapeIndex];
    if (!shape || loopIndex < 0 || loopIndex >= shape.loops.length) {
      return null;
    }
    return createPathRef(shapeIndex, loopIndex);
  }

  function normalizePointRef(state, ref) {
    if (!ref) {
      return null;
    }
    const shapeIndex = parseInteger(ref.shapeIndex, -1);
    const loopIndex = parseInteger(ref.loopIndex, -1);
    const pointIndex = parseInteger(ref.pointIndex, -1);
    const shape = state.shapes[shapeIndex];
    const loop = shape?.loops[loopIndex];
    if (!loop || pointIndex < 0 || pointIndex >= loop.points.length) {
      return null;
    }
    return createPointRef(shapeIndex, loopIndex, pointIndex);
  }

  function samePathRef(a, b) {
    return a.shapeIndex === b.shapeIndex && a.loopIndex === b.loopIndex;
  }

  function samePointRef(a, b) {
    return (
      a.shapeIndex === b.shapeIndex &&
      a.loopIndex === b.loopIndex &&
      a.pointIndex === b.pointIndex
    );
  }

  function pathKey(ref) {
    return `${ref.shapeIndex}:${ref.loopIndex}`;
  }

  function pointKey(ref) {
    return `${ref.shapeIndex}:${ref.loopIndex}:${ref.pointIndex}`;
  }

  function collectScopedPointRefs(state) {
    const refs = [];
    for (const pathRef of getPointSelectionScopePathRefs(state)) {
      const loop = state.shapes[pathRef.shapeIndex]?.loops[pathRef.loopIndex];
      if (!loop) {
        continue;
      }
      loop.points.forEach((point, pointIndex) => {
        refs.push({
          ref: createPointRef(pathRef.shapeIndex, pathRef.loopIndex, pointIndex),
          point,
        });
      });
    }
    return refs;
  }

  function getPointSelectionScopePathRefs(state) {
    const selectedPaths = getSelectedPathRefs(state);
    if (selectedPaths.length) {
      return selectedPaths;
    }
    const activeRef = normalizePathRef(state, createPathRef(state.selectedShapeIndex, state.selectedLoopIndex));
    return activeRef ? [activeRef] : [];
  }

  function applyPointSelection(state, refs, options = {}) {
    const selectedPoints = options.toggle ? getSelectedPointRefs(state) : [];
    const nextPoints = selectedPoints.slice();
    const normalizedRefs = uniquePointRefs(state, refs);
    for (const ref of normalizedRefs) {
      const existingIndex = nextPoints.findIndex((item) => samePointRef(item, ref));
      if (options.toggle) {
        if (existingIndex >= 0) {
          nextPoints.splice(existingIndex, 1);
        } else {
          nextPoints.push(ref);
        }
      } else if (existingIndex < 0) {
        nextPoints.push(ref);
      }
    }
    return withSelectedPointRefs(state, nextPoints);
  }

  function applyPathSelection(state, refs, options = {}) {
    const selectedPaths = options.toggle ? getSelectedPathRefs(state) : [];
    const nextPaths = selectedPaths.slice();
    const normalizedRefs = uniquePathRefs(state, refs);
    for (const ref of normalizedRefs) {
      const existingIndex = nextPaths.findIndex((item) => samePathRef(item, ref));
      if (options.toggle) {
        if (existingIndex >= 0) {
          nextPaths.splice(existingIndex, 1);
        } else {
          nextPaths.push(ref);
        }
      } else if (existingIndex < 0) {
        nextPaths.push(ref);
      }
    }

    const selectedPathsAfter = uniquePathRefs(state, nextPaths);
    const activeRef = selectedPathsAfter[selectedPathsAfter.length - 1] || null;
    return {
      ...state,
      selectedShapeIndex: activeRef?.shapeIndex ?? state.selectedShapeIndex,
      selectedLoopIndex: activeRef?.loopIndex ?? state.selectedLoopIndex,
      selectedPointIndex: -1,
      selectedPaths: selectedPathsAfter,
      selectedPoints: [],
    };
  }

  function collectLassoPathRefs(state, options = {}) {
    const refs = [];
    state.shapes.forEach((shape, shapeIndex) => {
      shape.loops.forEach((loop, loopIndex) => {
        if (options.filledOnly && !isFilledLassoLoop(loop)) {
          return;
        }
        if (!loop.points.length) {
          return;
        }
        refs.push({
          ref: createPathRef(shapeIndex, loopIndex),
          loop,
        });
      });
    });
    return refs;
  }

  function isFilledLassoLoop(loop) {
    return loop.closed && loop.role !== 'detail' && loop.points.length >= 3;
  }

  function normalizeSelectionRect(rect) {
    const x1 = Number(rect?.x1);
    const x2 = Number(rect?.x2);
    const y1 = Number(rect?.y1);
    const y2 = Number(rect?.y2);
    if (![x1, x2, y1, y2].every(Number.isFinite)) {
      return null;
    }
    return {
      minX: Math.min(x1, x2),
      maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2),
      maxY: Math.max(y1, y2),
    };
  }

  function loopHitsRect(loop, rect) {
    const samples = loopSelectionSamples(loop);
    if (samples.some((point) => pointInRect(point, rect))) {
      return true;
    }
    if (!loop.closed || samples.length < 3) {
      return false;
    }
    if (pointInPolygon(rectCenter(rect), samples)) {
      return true;
    }
    return rectCorners(rect).some((point) => pointInPolygon(point, samples));
  }

  function loopHitsPolygon(loop, polygon) {
    const samples = loopSelectionSamples(loop);
    if (samples.some((point) => pointInPolygon(point, polygon))) {
      return true;
    }
    if (!loop.closed || samples.length < 3) {
      return false;
    }
    if (pointInPolygon(polygonBoundsCenter(polygon), samples)) {
      return true;
    }
    return polygon.some((point) => pointInPolygon(point, samples));
  }

  function loopSelectionSamples(loop) {
    const samples = sampleLoopPath(loop, {
      sampleSpacing: 4,
      minSampleDistance: 0.01,
    });
    return samples.length
      ? samples
      : loop.points.map((point) => ({ x: point.x, y: point.y }));
  }

  function pointInRect(point, rect) {
    return (
      point.x >= rect.minX &&
      point.x <= rect.maxX &&
      point.y >= rect.minY &&
      point.y <= rect.maxY
    );
  }

  function rectCenter(rect) {
    return {
      x: (rect.minX + rect.maxX) / 2,
      y: (rect.minY + rect.maxY) / 2,
    };
  }

  function rectCorners(rect) {
    return [
      { x: rect.minX, y: rect.minY },
      { x: rect.maxX, y: rect.minY },
      { x: rect.maxX, y: rect.maxY },
      { x: rect.minX, y: rect.maxY },
    ];
  }

  function polygonBoundsCenter(polygon) {
    const bounds = polygon.reduce((acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }), {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    });
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }

  function withSelectedPointRefs(state, refs, overrides = {}) {
    const selectedPoints = uniquePointRefs(state, refs);
    const activeRef = selectedPoints[selectedPoints.length - 1] || null;
    return {
      ...state,
      ...overrides,
      selectedShapeIndex: activeRef?.shapeIndex ?? overrides.selectedShapeIndex ?? state.selectedShapeIndex,
      selectedLoopIndex: activeRef?.loopIndex ?? overrides.selectedLoopIndex ?? state.selectedLoopIndex,
      selectedPointIndex: activeRef?.pointIndex ?? -1,
      selectedPoints,
    };
  }

  function uniquePointRefs(state, refs) {
    const output = [];
    for (const ref of Array.isArray(refs) ? refs : []) {
      const normalized = normalizePointRef(state, ref);
      if (normalized && !output.some((item) => samePointRef(item, normalized))) {
        output.push(normalized);
      }
    }
    return output;
  }

  function uniquePathRefs(state, refs) {
    const output = [];
    for (const ref of Array.isArray(refs) ? refs : []) {
      const normalized = normalizePathRef(state, ref);
      if (normalized && !output.some((item) => samePathRef(item, normalized))) {
        output.push(normalized);
      }
    }
    return output;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const currentPoint = polygon[index];
      const previousPoint = polygon[previous];
      if (isPointOnSegment(point, previousPoint, currentPoint)) {
        return true;
      }
      const intersects = (
        currentPoint.y > point.y
      ) !== (
        previousPoint.y > point.y
      ) && point.x <= (
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) +
        currentPoint.x
      );
      if (intersects) {
        inside = !inside;
      }
    }
    return inside;
  }

  function isPointOnSegment(point, start, end) {
    return distancePointToSegment(point, start, end) < 0.0001;
  }

  function uniqueId(baseId, existingIds) {
    const normalized = normalizeId(baseId);
    const existing = new Set(existingIds.map(normalizeId));
    if (!existing.has(normalized)) {
      return normalized;
    }
    let suffix = 2;
    while (existing.has(`${normalized}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalized}_${suffix}`;
  }

  function uniqueAnimationClipId(baseId, clips) {
    const normalized = normalizeLoopId(baseId) || 'clip';
    const existing = new Set((Array.isArray(clips) ? clips : []).map((clip) => normalizeLoopId(clip?.id)));
    if (!existing.has(normalized)) {
      return normalized;
    }
    let suffix = 2;
    while (existing.has(`${normalized}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalized}_${suffix}`;
  }

  function uniqueGraphNodeId(baseId, nodes) {
    const normalized = normalizeLoopId(baseId) || 'node';
    const existing = new Set((Array.isArray(nodes) ? nodes : []).map((node) => normalizeLoopId(node?.id)));
    if (!existing.has(normalized)) {
      return normalized;
    }
    let suffix = 2;
    while (existing.has(`${normalized}_${suffix}`)) {
      suffix += 1;
    }
    return `${normalized}_${suffix}`;
  }

  function nodeTypeForGraphProperty(property) {
    if (property === 'loop.transform') {
      return 'keyframes.transform';
    }
    if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
      return 'keyframes.vec2';
    }
    if (property === 'shape.style.fill' || property === 'shape.style.stroke') {
      return 'keyframes.color';
    }
    return 'keyframes.number';
  }

  function graphNodeIdBase(property, target) {
    const targetId = [
      target?.shapeId,
      target?.loopId ?? (target?.loopIndex != null ? `loop_${target.loopIndex}` : ''),
      target?.pointId ?? (target?.pointIndex != null ? `point_${target.pointIndex}` : ''),
      Array.isArray(target?.tags) ? target.tags.join('_') : '',
    ].filter(Boolean).join('_');
    return `${property.replace(/\./g, '_')}_${targetId || 'target'}`;
  }

  function graphOutputMatchKey(output) {
    return stableStringify({
      property: output?.property || '',
      target: output?.target || {},
      origin: output?.origin || null,
    });
  }

  function graphOutputsInEvaluationOrder(outputs) {
    return (Array.isArray(outputs) ? outputs : [])
      .map((output, index) => ({ output, index, priority: graphOutputPriority(output?.property) }))
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map((item) => item.output);
  }

  function graphOutputPriority(property) {
    if (String(property || '').startsWith('point.')) {
      return 0;
    }
    if (String(property || '').startsWith('shape.')) {
      return 1;
    }
    if (property === 'loop.transform') {
      return 2;
    }
    return 3;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(',')}]`;
    }
    if (isPlainObject(value)) {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function isZeroVec2(value) {
    return Math.abs(Number(value?.x) || 0) < 0.0001 && Math.abs(Number(value?.y) || 0) < 0.0001;
  }

  function interpolateColor(fromValue, toValue, t) {
    const from = parseHexColor(normalizeColor(fromValue, '#ffffff'));
    const to = parseHexColor(normalizeColor(toValue, '#ffffff'));
    return rgbToHex({
      r: Math.round(lerp(from.r, to.r, t)),
      g: Math.round(lerp(from.g, to.g, t)),
      b: Math.round(lerp(from.b, to.b, t)),
    });
  }

  function parseHexColor(value) {
    const normalized = String(value || '#ffffff').replace('#', '').slice(0, 6).padEnd(6, 'f');
    const parsed = Number.parseInt(normalized, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  }

  function rgbToHex(color) {
    return `#${hexByte(color.r)}${hexByte(color.g)}${hexByte(color.b)}`;
  }

  function hexByte(value) {
    return clamp(Math.round(Number(value) || 0), 0, 255).toString(16).padStart(2, '0');
  }

  function editableAnimation(animation) {
    return cleanAnimation(animation) || {
      schemaVersion: ANIMATION_SCHEMA_VERSION,
      clips: [],
      bindings: {},
    };
  }

  function editableGraphAnimation(animation) {
    const cleaned = cleanAnimation(animation) || {
      schemaVersion: ANIMATION_GRAPH_SCHEMA_VERSION,
      clips: [],
      bindings: {},
    };
    return {
      schemaVersion: ANIMATION_GRAPH_SCHEMA_VERSION,
      clips: (cleaned.clips || []).map((clip, index) => cleanAnimationClip({
        ...clip,
        graph: clip.graph || { nodes: [], outputs: [] },
      }, index)),
      bindings: cleanAnimationBindings(cleaned.bindings),
    };
  }

  function withCleanAnimation(state, animation) {
    const cleaned = cleanAnimation(animation);
    return {
      ...state,
      animation: shouldExportAnimation(cleaned) ? cleaned : null,
      animationIssues: [],
    };
  }

  function upsertGraphValueKey(state, clipId, descriptor) {
    const property = String(descriptor.property || '');
    if (!GRAPH_OUTPUT_PROPERTIES.includes(property)) {
      return state;
    }
    const animation = editableGraphAnimation(state.animation);
    const ensured = ensureGraphClip(animation, clipId);
    const clipIndex = ensured.clipIndex;
    const clip = ensured.clip;
    const graph = clip.graph || { nodes: [], outputs: [] };
    const target = cleanAnimationGraphTarget(descriptor.target);
    const origin = cleanAnimationOrigin(descriptor.origin);
    const outputMatch = graphOutputMatchKey({ property, target, origin });
    let outputs = graph.outputs.map(cleanAnimationGraphOutput).filter(Boolean);
    let nodes = graph.nodes.map(cleanAnimationGraphNode).filter(Boolean);
    let outputIndex = outputs.findIndex((output) => graphOutputMatchKey(output) === outputMatch);
    let node = null;
    if (outputIndex >= 0) {
      node = nodes.find((item) => item.id === outputs[outputIndex].source) || null;
    }
    if (!node) {
      const nodeId = uniqueGraphNodeId(graphNodeIdBase(property, target), nodes);
      node = {
        id: nodeId,
        type: nodeTypeForGraphProperty(property),
        keys: [],
      };
      nodes = [...nodes, node];
      const output = cleanAnimationGraphOutput({
        source: nodeId,
        target,
        property,
        blend: descriptor.blend || graphOutputDefaultBlend(property),
        origin,
      });
      outputs = [...outputs, output];
      outputIndex = outputs.length - 1;
    }
    const timeMs = clampAnimationTime(descriptor.timeMs, clip.durationMs);
    const nextKey = cleanAnimationGraphKeyframe({
      timeMs,
      interp: descriptor.interp || descriptor.ease || 'smooth',
      value: normalizeGraphValueForProperty(property, descriptor.value),
    });
    nodes = nodes.map((item) => (
      item.id === node.id
        ? { ...item, type: nodeTypeForGraphProperty(property), keys: upsertSortedGraphKeys(item.keys, nextKey) }
        : item
    ));
    outputs[outputIndex] = cleanAnimationGraphOutput({
      ...outputs[outputIndex],
      target,
      property,
      origin: origin || outputs[outputIndex].origin,
    });
    const clips = animation.clips.slice();
    clips[clipIndex] = cleanAnimationClip({
      ...clip,
      graph: { nodes, outputs },
    }, clipIndex);
    return withCleanAnimation(state, { ...animation, clips });
  }

  function updateGraphOutputNode(state, clipId, outputIndex, updater) {
    const animation = editableGraphAnimation(state.animation);
    const normalizedClipId = normalizeLoopId(clipId);
    const clipIndex = animation.clips.findIndex((clip) => clip.id === normalizedClipId);
    const clip = animation.clips[clipIndex];
    const index = parseInteger(outputIndex, -1);
    const output = clip?.graph?.outputs?.[index];
    if (!clip || !output) {
      return state;
    }
    const nodes = (clip.graph.nodes || []).map(cleanAnimationGraphNode).filter(Boolean);
    const nodeIndex = nodes.findIndex((node) => node.id === output.source);
    if (nodeIndex < 0) {
      return state;
    }
    nodes[nodeIndex] = cleanAnimationGraphNode(updater(nodes[nodeIndex], output, clip)) || nodes[nodeIndex];
    const clips = animation.clips.slice();
    clips[clipIndex] = cleanAnimationClip({
      ...clip,
      graph: {
        nodes,
        outputs: clip.graph.outputs,
      },
    }, clipIndex);
    return withCleanAnimation(state, { ...animation, clips });
  }

  function ensureGraphClip(animation, clipId) {
    const normalizedClipId = normalizeLoopId(clipId) || `clip_${animation.clips.length + 1}`;
    let clipIndex = animation.clips.findIndex((clip) => clip.id === normalizedClipId);
    const clips = animation.clips.slice();
    if (clipIndex < 0) {
      clipIndex = clips.length;
      clips.push(cleanAnimationClip({
        id: uniqueAnimationClipId(normalizedClipId, clips),
        label: titleFromId(normalizedClipId),
        durationMs: 1000,
        loop: true,
        tracks: [],
        graph: { nodes: [], outputs: [] },
      }, clipIndex));
    } else if (!clips[clipIndex].graph) {
      clips[clipIndex] = cleanAnimationClip({
        ...clips[clipIndex],
        graph: { nodes: [], outputs: [] },
      }, clipIndex);
    }
    animation.clips = clips;
    return { clipIndex, clip: clips[clipIndex] };
  }

  function upsertSortedGraphKeys(keys, nextKey) {
    const output = (Array.isArray(keys) ? keys : []).map(cleanAnimationGraphKeyframe);
    const existingIndex = output.findIndex((item) => Number(item.timeMs) === Number(nextKey.timeMs));
    if (existingIndex >= 0) {
      output[existingIndex] = nextKey;
    } else {
      output.push(nextKey);
    }
    output.sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
    return output;
  }

  function updateAnimationTrack(state, clipId, trackIndex, updater) {
    const animation = editableAnimation(state.animation);
    const normalizedClipId = normalizeLoopId(clipId);
    const clipIndex = animation.clips.findIndex((clip) => clip.id === normalizedClipId);
    const normalizedTrackIndex = parseInteger(trackIndex, -1);
    const clip = animation.clips[clipIndex];
    if (!clip || normalizedTrackIndex < 0 || normalizedTrackIndex >= clip.tracks.length) {
      return state;
    }
    const track = clip.tracks[normalizedTrackIndex];
    const tracks = clip.tracks.slice();
    tracks[normalizedTrackIndex] = cleanAnimationTrack(updater(track, clip));
    const clips = animation.clips.slice();
    clips[clipIndex] = cleanAnimationClip({ ...clip, tracks }, clipIndex);
    return withCleanAnimation(state, { ...animation, clips });
  }

  function animationCanvasOrigin(state, originOptions = {}) {
    const resolved = resolveTransformOrigin(state, { origin: originOptions }) || {
      x: (Number(state.canvas?.width) || DEFAULT_CANVAS.width) / 2,
      y: (Number(state.canvas?.height) || DEFAULT_CANVAS.height) / 2,
    };
    return { mode: 'canvas', x: round(resolved.x), y: round(resolved.y) };
  }

  function animationTargetsFromSelection(state) {
    const selectedPaths = getSelectedPathRefs(state);
    if (selectedPaths.length) {
      return selectedPaths.map((ref) => {
        return pathRefToAnimationTarget(state, ref);
      });
    }
    const shape = getSelectedShape(state);
    return shape ? [{ shapeId: normalizeId(shape.id) }] : [];
  }

  function pathRefToAnimationTarget(state, ref) {
    const normalized = normalizePathRef(state, ref);
    const shape = normalized ? state.shapes[normalized.shapeIndex] : null;
    const loop = normalized ? shape?.loops[normalized.loopIndex] : null;
    const target = { shapeId: normalizeId(shape?.id) };
    const loopId = normalizeLoopId(loop?.id);
    if (loopId) {
      target.loopId = loopId;
    } else if (normalized) {
      target.loopIndex = normalized.loopIndex;
    }
    return target;
  }

  function pointRefToAnimationTarget(state, ref) {
    const normalized = normalizePointRef(state, ref);
    const target = pathRefToAnimationTarget(state, normalized);
    const point = normalized
      ? state.shapes[normalized.shapeIndex].loops[normalized.loopIndex].points[normalized.pointIndex]
      : null;
    const pointId = normalizeLoopId(point?.id);
    if (pointId) {
      target.pointId = pointId;
    } else if (normalized) {
      target.pointIndex = normalized.pointIndex;
    }
    return target;
  }

  function neutralTransformKeyframe(timeMs) {
    return {
      timeMs: Math.max(0, Number(timeMs) || 0),
      value: restTransformValue(),
    };
  }

  function restTransformValue() {
    return { tx: 0, ty: 0, rotation: 0, sx: 1, sy: 1, skewX: 0, skewY: 0 };
  }

  function normalizeTransformKeyframeValue(value = {}) {
    const source = isPlainObject(value) ? value : {};
    return {
      tx: finiteOr(source.tx, 0),
      ty: finiteOr(source.ty, 0),
      rotation: finiteOr(source.rotation, 0),
      sx: finiteOr(source.sx, 1),
      sy: finiteOr(source.sy, 1),
      skewX: finiteOr(source.skewX, 0),
      skewY: finiteOr(source.skewY, 0),
    };
  }

  function normalizeVec2Value(value = {}) {
    const source = isPlainObject(value) ? value : {};
    return {
      x: round(finiteOr(source.x ?? source.dx, 0)),
      y: round(finiteOr(source.y ?? source.dy, 0)),
    };
  }

  function normalizeGraphValueForProperty(property, value) {
    if (property === 'loop.transform') {
      return normalizeTransformKeyframeValue(value);
    }
    if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
      return normalizeVec2Value(value);
    }
    if (property === 'shape.style.fill' || property === 'shape.style.stroke') {
      return normalizeColor(value, '#ffffff').slice(0, 7);
    }
    if (property === 'shape.style.strokeWidth') {
      return Math.max(0, round(Number(value) || 0));
    }
    if (property === 'shape.opacity') {
      const parsed = Number(value);
      return clamp(Number.isFinite(parsed) ? parsed : 1, 0, 1);
    }
    return cloneJsonCompatible(value);
  }

  function restGraphOutputValue(state, output) {
    const property = String(output?.property || '');
    if (property === 'loop.transform') {
      return restTransformValue();
    }
    if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
      return { x: 0, y: 0 };
    }
    const shapeIndex = resolveGraphShapeRefs(state, output.target)[0];
    const shape = state.shapes[shapeIndex] || getSelectedShape(state);
    if (property === 'shape.style.fill') {
      return shape?.style?.fill || DEFAULT_STYLE.fill;
    }
    if (property === 'shape.style.stroke') {
      return shape?.style?.stroke || DEFAULT_STYLE.stroke;
    }
    if (property === 'shape.style.strokeWidth') {
      return shape?.style?.strokeWidth ?? DEFAULT_STYLE.strokeWidth;
    }
    if (property === 'shape.opacity') {
      return 1;
    }
    return null;
  }

  function clampAnimationTime(timeMs, durationMs) {
    const duration = Math.max(0, Number(durationMs) || 0);
    const time = Number(timeMs);
    return round(clamp(Number.isFinite(time) ? time : 0, 0, duration));
  }

  function snapAnimationTimeToFrame(timeMs, options = {}) {
    const durationMs = options.durationMs == null ? null : Math.max(0, Number(options.durationMs) || 0);
    const rawTime = Number(timeMs);
    const unclampedTime = Number.isFinite(rawTime) ? rawTime : 0;
    const time = durationMs == null
      ? Math.max(0, unclampedTime)
      : clamp(unclampedTime, 0, durationMs);
    if (options.snap === false) {
      return round(time);
    }
    const fps = Math.max(1, Number(options.fps) || 24);
    const frameMs = 1000 / fps;
    const snapped = Math.round(time / frameMs) * frameMs;
    return round(durationMs == null ? Math.max(0, snapped) : clamp(snapped, 0, durationMs));
  }

  function resolveAnimationTrackPathRefs(state, track) {
    const target = track?.target;
    if (!isPlainObject(target)) {
      return [];
    }
    const refs = [];
    const tags = Array.isArray(target.tags)
      ? target.tags.map(normalizeTag).filter(Boolean)
      : [];
    if (tags.length) {
      state.shapes.forEach((shape, shapeIndex) => {
        const shapeTags = new Set(parseTags(shape.tagsText));
        if (tags.every((tag) => shapeTags.has(tag))) {
          shape.loops.forEach((_, loopIndex) => refs.push(createPathRef(shapeIndex, loopIndex)));
        }
      });
    }
    const shapeId = normalizeId(target.shapeId);
    const hasShapeId = Boolean(normalizeLoopId(target.shapeId));
    if (hasShapeId) {
      const shapeIndex = state.shapes.findIndex((shape) => normalizeId(shape.id) === shapeId);
      const shape = state.shapes[shapeIndex];
      if (shape) {
        const loopId = normalizeLoopId(target.loopId);
        if (loopId) {
          const loopIndex = shape.loops.findIndex((loop) => normalizeLoopId(loop.id) === loopId);
          if (loopIndex >= 0) {
            refs.push(createPathRef(shapeIndex, loopIndex));
          }
        } else if (target.loopIndex != null) {
          const loopIndex = Number(target.loopIndex);
          if (Number.isInteger(loopIndex) && loopIndex >= 0 && loopIndex < shape.loops.length) {
            refs.push(createPathRef(shapeIndex, loopIndex));
          }
        } else {
          shape.loops.forEach((_, loopIndex) => refs.push(createPathRef(shapeIndex, loopIndex)));
        }
      }
    }
    return uniquePathRefs(state, refs);
  }

  function resolveGraphPathRefs(state, target) {
    return resolveAnimationTrackPathRefs(state, { target });
  }

  function resolveGraphShapeRefs(state, target) {
    if (!isPlainObject(target)) {
      return [];
    }
    const refs = [];
    const tags = Array.isArray(target.tags)
      ? target.tags.map(normalizeTag).filter(Boolean)
      : [];
    if (tags.length) {
      state.shapes.forEach((shape, shapeIndex) => {
        const shapeTags = new Set(parseTags(shape.tagsText));
        if (tags.every((tag) => shapeTags.has(tag))) {
          refs.push(shapeIndex);
        }
      });
    }
    const shapeId = normalizeId(target.shapeId);
    if (normalizeLoopId(target.shapeId)) {
      const shapeIndex = state.shapes.findIndex((shape) => normalizeId(shape.id) === shapeId);
      if (shapeIndex >= 0) {
        refs.push(shapeIndex);
      }
    }
    return Array.from(new Set(refs)).filter((index) => index >= 0 && index < state.shapes.length);
  }

  function resolveGraphPointRefs(state, target) {
    const pathRefs = resolveGraphPathRefs(state, target);
    const pointRefs = [];
    const pointId = normalizeLoopId(target?.pointId);
    const pointIndex = Number(target?.pointIndex);
    for (const pathRef of pathRefs) {
      const loop = state.shapes[pathRef.shapeIndex].loops[pathRef.loopIndex];
      if (pointId) {
        const index = loop.points.findIndex((point) => normalizeLoopId(point.id) === pointId);
        if (index >= 0) {
          pointRefs.push(createPointRef(pathRef.shapeIndex, pathRef.loopIndex, index));
        }
      } else if (Number.isInteger(pointIndex) && pointIndex >= 0 && pointIndex < loop.points.length) {
        pointRefs.push(createPointRef(pathRef.shapeIndex, pathRef.loopIndex, pointIndex));
      } else {
        loop.points.forEach((_, index) => {
          pointRefs.push(createPointRef(pathRef.shapeIndex, pathRef.loopIndex, index));
        });
      }
    }
    const output = [];
    for (const ref of pointRefs) {
      const normalized = normalizePointRef(state, ref);
      if (normalized && !output.some((item) => samePointRef(item, normalized))) {
        output.push(normalized);
      }
    }
    return output;
  }

  function evaluateTransformKeyframes(keyframes, timeMs) {
    const sorted = (Array.isArray(keyframes) ? keyframes : [])
      .map(cleanAnimationKeyframe)
      .sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
    if (!sorted.length) {
      return normalizeTransformKeyframeValue();
    }
    if (timeMs <= Number(sorted[0].timeMs)) {
      return normalizeTransformKeyframeValue(sorted[0].value);
    }
    const last = sorted[sorted.length - 1];
    if (timeMs >= Number(last.timeMs)) {
      return normalizeTransformKeyframeValue(last.value);
    }
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const next = sorted[index];
      if (timeMs <= Number(next.timeMs)) {
        const span = Math.max(1, Number(next.timeMs) - Number(previous.timeMs));
        const t = easeProgress((timeMs - Number(previous.timeMs)) / span, next.ease);
        return interpolateTransformValues(previous.value, next.value, t);
      }
    }
    return normalizeTransformKeyframeValue(last.value);
  }

  function evaluateGraphNodeValue(node, property, timeMs) {
    const sorted = (Array.isArray(node?.keys) ? node.keys : [])
      .map(cleanAnimationGraphKeyframe)
      .sort((a, b) => Number(a.timeMs) - Number(b.timeMs));
    if (!sorted.length) {
      return restGraphValueForProperty(property);
    }
    if (timeMs <= Number(sorted[0].timeMs)) {
      return normalizeGraphValueForProperty(property, sorted[0].value);
    }
    const last = sorted[sorted.length - 1];
    if (timeMs >= Number(last.timeMs)) {
      return normalizeGraphValueForProperty(property, last.value);
    }
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const next = sorted[index];
      if (timeMs <= Number(next.timeMs)) {
        const interp = String(next.interp || 'smooth');
        if (interp === 'hold') {
          return normalizeGraphValueForProperty(property, previous.value);
        }
        const span = Math.max(1, Number(next.timeMs) - Number(previous.timeMs));
        const t = easeProgress((timeMs - Number(previous.timeMs)) / span, interp);
        return interpolateGraphValues(property, previous.value, next.value, t);
      }
    }
    return normalizeGraphValueForProperty(property, last.value);
  }

  function graphValueForTarget(state, clipId, property, target, timeMs = 0, options = {}) {
    const animation = cleanAnimation(state.animation);
    const clip = animation?.clips.find((item) => item.id === normalizeLoopId(clipId));
    const cleanProperty = String(property || '');
    const cleanTarget = cleanAnimationGraphTarget(target);
    const origin = cleanAnimationOrigin(options.origin);
    if (!clip?.graph || !GRAPH_OUTPUT_PROPERTIES.includes(cleanProperty)) {
      return restGraphOutputValue(state, { property: cleanProperty, target: cleanTarget });
    }
    const durationMs = Math.max(1, Number(clip.durationMs) || 1);
    const clampedTime = clip.loop
      ? ((Number(timeMs) || 0) % durationMs + durationMs) % durationMs
      : clampAnimationTime(timeMs, durationMs);
    const match = graphOutputMatchKey({ property: cleanProperty, target: cleanTarget, origin });
    const output = (clip.graph.outputs || []).find((item) => graphOutputMatchKey(item) === match);
    if (!output) {
      return restGraphOutputValue(state, { property: cleanProperty, target: cleanTarget });
    }
    const node = (clip.graph.nodes || []).find((item) => item.id === output.source);
    if (!node) {
      return restGraphOutputValue(state, output);
    }
    return evaluateGraphNodeValue(node, cleanProperty, clampedTime);
  }

  function restGraphValueForProperty(property) {
    if (property === 'loop.transform') {
      return restTransformValue();
    }
    if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
      return { x: 0, y: 0 };
    }
    if (property === 'shape.style.fill' || property === 'shape.style.stroke') {
      return '#ffffff';
    }
    if (property === 'shape.style.strokeWidth') {
      return DEFAULT_STYLE.strokeWidth;
    }
    if (property === 'shape.opacity') {
      return 1;
    }
    return null;
  }

  function interpolateGraphValues(property, fromValue, toValue, t) {
    if (property === 'loop.transform') {
      return interpolateTransformValues(fromValue, toValue, t);
    }
    if (property === 'point.positionDelta' || property === 'point.inHandleDelta' || property === 'point.outHandleDelta') {
      const from = normalizeVec2Value(fromValue);
      const to = normalizeVec2Value(toValue);
      return {
        x: round(lerp(from.x, to.x, t)),
        y: round(lerp(from.y, to.y, t)),
      };
    }
    if (property === 'shape.style.fill' || property === 'shape.style.stroke') {
      return interpolateColor(fromValue, toValue, t);
    }
    if (property === 'shape.style.strokeWidth' || property === 'shape.opacity') {
      return round(lerp(Number(fromValue) || 0, Number(toValue) || 0, t));
    }
    return t < 1 ? cloneJsonCompatible(fromValue) : cloneJsonCompatible(toValue);
  }

  function interpolateTransformValues(fromValue, toValue, t) {
    const from = normalizeTransformKeyframeValue(fromValue);
    const to = normalizeTransformKeyframeValue(toValue);
    return {
      tx: round(lerp(from.tx, to.tx, t)),
      ty: round(lerp(from.ty, to.ty, t)),
      rotation: round(lerp(from.rotation, to.rotation, t)),
      sx: round(lerp(from.sx, to.sx, t)),
      sy: round(lerp(from.sy, to.sy, t)),
      skewX: round(lerp(from.skewX, to.skewX, t)),
      skewY: round(lerp(from.skewY, to.skewY, t)),
    };
  }

  function easeProgress(value, ease = 'linear') {
    const t = clamp(value, 0, 1);
    if (ease === 'hold') {
      return 0;
    }
    if (ease === 'smooth') {
      return t * t * (3 - 2 * t);
    }
    if (ease === 'easeIn') {
      return t * t;
    }
    if (ease === 'easeOut') {
      return 1 - (1 - t) * (1 - t);
    }
    if (ease === 'easeInOut') {
      return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    }
    if (ease === 'easeOutBack') {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * ((t - 1) ** 3) + c1 * ((t - 1) ** 2);
    }
    return t;
  }

  function finiteOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function resolveTransformTarget(state, forceType = '') {
    if (forceType === 'points' || (!forceType && getSelectedPointRefs(state).length)) {
      const refs = getSelectedPointRefs(state);
      return {
        type: 'points',
        refs,
        bounds: pointRefsBounds(state, refs),
        pointCount: refs.length,
      };
    }
    const refs = getLoopEditPathRefs(state);
    return {
      type: 'paths',
      refs,
      bounds: pathRefsBounds(state, refs),
      pointCount: countPathRefPoints(state, refs),
    };
  }

  function resolveTransformOrigin(state, targetOrOptions = {}, maybeOptions = null) {
    const target = targetOrOptions?.type && Array.isArray(targetOrOptions.refs)
      ? targetOrOptions
      : resolveTransformTarget(state);
    const options = maybeOptions || targetOrOptions || {};
    const requested = options.origin || options;
    const rawX = Number(requested?.x);
    const rawY = Number(requested?.y);
    const hasPoint = requested?.x !== '' && requested?.x != null &&
      requested?.y !== '' && requested?.y != null &&
      Number.isFinite(rawX) && Number.isFinite(rawY);
    const mode = requested?.mode || (hasPoint ? 'custom' : 'selection');
    if ((mode === 'custom' || mode === 'canvas') && hasPoint) {
      return { mode, x: round(rawX), y: round(rawY) };
    }
    if (mode === 'activeLoop') {
      const ref = normalizePathRef(state, createPathRef(state.selectedShapeIndex, state.selectedLoopIndex));
      const bounds = ref ? pathRefsBounds(state, [ref]) : null;
      return originFromBounds(bounds, 'activeLoop');
    }
    if (mode === 'canvasCenter') {
      return {
        mode: 'canvasCenter',
        x: round((Number(state.canvas?.width) || DEFAULT_CANVAS.width) / 2),
        y: round((Number(state.canvas?.height) || DEFAULT_CANVAS.height) / 2),
      };
    }
    return originFromBounds(target.bounds, 'selection');
  }

  function originFromBounds(bounds, mode) {
    if (!bounds) {
      return null;
    }
    return {
      mode,
      x: round((bounds.minX + bounds.maxX) / 2),
      y: round((bounds.minY + bounds.maxY) / 2),
    };
  }

  function buildTransformPreviews(state, target, transform) {
    if (target.type === 'points') {
      const selectedKeys = new Set(target.refs.map(pointKey));
      const pathRefs = uniquePathRefs(state, target.refs.map((ref) => createPathRef(ref.shapeIndex, ref.loopIndex)));
      return pathRefs.map((ref) => {
        const sourceLoop = state.shapes[ref.shapeIndex].loops[ref.loopIndex];
        return {
          ref,
          originalLoop: cloneLoop(sourceLoop),
          loop: cleanLoop({
            ...sourceLoop,
            points: sourceLoop.points.map((point, pointIndex) => (
              selectedKeys.has(pointKey(createPointRef(ref.shapeIndex, ref.loopIndex, pointIndex)))
                ? transformPointAround(point, transform.origin, transform)
                : clonePoint(point)
            )),
          }),
        };
      });
    }
    return target.refs.map((ref) => {
      const sourceLoop = state.shapes[ref.shapeIndex].loops[ref.loopIndex];
      return {
        ref,
        originalLoop: cloneLoop(sourceLoop),
        loop: transformLoopAround(sourceLoop, transform.origin, transform),
      };
    });
  }

  function normalizeTransformOptions(options = {}) {
    const scaleX = normalizeScaleValue(options.scaleX, 1);
    const scaleY = normalizeScaleValue(options.scaleY ?? options.scaleX, scaleX);
    return {
      scaleX,
      scaleY,
      rotation: normalizeRotationValue(options.rotation ?? options.angle, 0),
      origin: options.origin,
    };
  }

  function normalizeScaleOptions(options = {}) {
    return normalizeTransformOptions(options);
  }

  function normalizeScaleValue(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return round(clamp(parsed, 0.01, 20));
  }

  function normalizeRotationValue(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return parsed;
  }

  function createTransformStats(target, transform, origin) {
    return {
      target: target.type,
      targetCount: target.refs.length,
      pointCount: target.pointCount,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      rotation: transform.rotation,
      origin: origin || null,
    };
  }

  function uniquePathGroupId(shapes) {
    const existing = new Set(shapes.map((shape) => normalizeId(shape.id)));
    let suffix = 1;
    while (existing.has(`path_group_${suffix}`)) {
      suffix += 1;
    }
    return `path_group_${suffix}`;
  }

  function nextZ(shapes) {
    return shapes.reduce((max, shape) => Math.max(max, parseInteger(shape.z, 0)), 0) + 1;
  }

  function titleFromId(id) {
    return normalizeId(id)
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function createValidationIssue(code, status, message) {
    return { code, status, message };
  }

  function statusFromIssues(issues) {
    if (issues.some((issue) => issue.status === VALIDATION_STATUS.error)) {
      return VALIDATION_STATUS.error;
    }
    if (issues.some((issue) => issue.status === VALIDATION_STATUS.warning)) {
      return VALIDATION_STATUS.warning;
    }
    return VALIDATION_STATUS.ok;
  }

  function distanceBetweenPoints(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function distancePointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      return distanceBetweenPoints(point, start);
    }
    const t = clamp(
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      0,
      1,
    );
    return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
  }

  function round(value) {
    return Math.round(value * 1000) / 1000;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeUnit(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return clamp(parsed > 1 ? parsed / 100 : parsed, 0, 1);
  }

  function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
  }

  function clampIndex(index, length) {
    if (length <= 0) {
      return -1;
    }
    const parsed = Number.parseInt(index, 10);
    return Math.min(length - 1, Math.max(0, Number.isFinite(parsed) ? parsed : 0));
  }

  global.VectorAuthoringCore = {
    VECTOR_PACK_KIND,
    VECTOR_PACK_VERSION,
    ANIMATION_SCHEMA_VERSION,
    ANIMATION_GRAPH_SCHEMA_VERSION,
    DEFAULT_CANVAS,
    DEFAULT_STYLE,
    LOOP_ROLES,
    TAG_PRESETS,
    VALIDATION_STATUS,
    KNOWN_EASES,
    GRAPH_NODE_TYPES,
    GRAPH_OUTPUT_PROPERTIES,
    GRAPH_INTERPOLATIONS,
    ANIMATION_BINDING_PRESETS,
    createInitialState,
    createLoop,
    createShape,
    screenToCanvas,
    canvasToScreen,
    zoomViewportAt,
    panViewport,
    getSelectedShape,
    getSelectedLoop,
    selectShape,
    selectLoop,
    selectPoint,
    selectPath,
    togglePathSelection,
    clearPathSelection,
    getSelectedPathRefs,
    getSelectedPointRefs,
    ensurePointIdsForRefs,
    selectPointRef,
    togglePointSelection,
    clearPointSelection,
    selectPointsInRect,
    selectPointsInPolygon,
    selectPathsInRect,
    selectPathsInPolygon,
    moveSelectedPoints,
    deleteSelectedPoints,
    clearSelectedPointHandles,
    isPointSelected,
    getLoopEditPathRefs,
    countPathRefPoints,
    selectedPathBounds,
    selectedPointBounds,
    isPathSelected,
    groupSelectedPaths,
    moveSelectedPaths,
    scaleSelection,
    scaleSelectedPoints,
    scaleSelectedPaths,
    transformSelection,
    transformSelectedPoints,
    transformSelectedPaths,
    previewSelectionTransform,
    resolveTransformOrigin,
    addAnimationClip,
    updateAnimationClip,
    duplicateAnimationClip,
    deleteAnimationClip,
    addTransformTracksFromSelection,
    upsertTransformKeyframe,
    deleteTransformKeyframe,
    moveTransformKeyframe,
    setRestTransformKeyframe,
    copyTransformKeyframeToTime,
    copyPreviousTransformKeyframeToTime,
    snapAnimationTimeToFrame,
    restTransformValue,
    updateAnimationBinding,
    pathRefToAnimationTarget,
    pointRefToAnimationTarget,
    upsertLoopTransformGraphKeys,
    upsertPointDeltaGraphKeys,
    upsertPointHandleDeltaGraphKey,
    upsertShapeStyleGraphKey,
    upsertShapeOpacityGraphKey,
    upsertGraphOutputKeyframe,
    deleteGraphOutputKeyframe,
    moveGraphOutputKeyframe,
    setRestGraphOutputKeyframe,
    copyGraphOutputKeyframeToTime,
    copyPreviousGraphOutputKeyframeToTime,
    graphValueForTarget,
    brushPointDeltas,
    evaluateTransformClip,
    evaluateGraphClip,
    previewAnimationTrackPose,
    separateSelectedPaths,
    mergeSelectedPathsIntoActiveShape,
    removeNearDuplicateSelectedLoops,
    simplifyStraightSelectedLoops,
    closeSelectedLoopGaps,
    reverseSelectedLoops,
    brushFalloffWeight,
    warpSelectedLoopsWithBrush,
    sampleLoopPath,
    optimizeLoopPath,
    previewSelectedLoopOptimization,
    applySelectedLoopOptimization,
    updateSelectedShapeFields,
    addTagPresetToSelectedShape,
    addShape,
    duplicateSelectedShape,
    deleteSelectedShape,
    nudgeSelectedShapeZ,
    addLoop,
    duplicateSelectedLoop,
    deleteSelectedLoop,
    moveSelectedLoop,
    setSelectedLoopRole,
    setSelectedLoopId,
    addPoint,
    movePoint,
    deleteSelectedPoint,
    movePointHandle,
    createPointOutHandle,
    clearPointHandles,
    closeLoop,
    openLoop,
    clearPoints,
    setCanvasFromImage,
    buildVectorPack,
    exportVectorPackJson,
    importVectorPack,
    animationSummary,
    validateState,
    validateShape,
    validateLoop,
    validateAnimation,
    nearestPointIndex,
    nearestPointHit,
    nearestHandleHit,
    canCloseLoop,
    handleAbsolutePoint,
    parseTags,
    addTagToTagsText,
    tagPresetLoopRole,
    normalizeId,
    normalizeLoopId,
  };
})(globalThis);
