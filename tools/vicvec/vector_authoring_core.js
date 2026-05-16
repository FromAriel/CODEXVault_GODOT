(function attachVectorAuthoringCore(global) {
  'use strict';

  const VECTOR_PACK_KIND = 'duhrng-vector-pack';
  const VECTOR_PACK_VERSION = 1;
  const ANIMATION_SCHEMA_VERSION = 1;
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
  const KNOWN_EASES = Object.freeze(['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeOutBack']);

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
    const selectedPoints = getSelectedPointRefs(state);
    if (selectedPoints.length) {
      return scaleSelectedPoints(state, options);
    }
    return scaleSelectedPaths(state, options);
  }

  function scaleSelectedPoints(state, options = {}) {
    const selectedPoints = getSelectedPointRefs(state);
    if (!selectedPoints.length) {
      return createScaleResult(state, 'points', 0, 0, options);
    }
    const scale = normalizeScaleOptions(options);
    if (scale.scaleX === 1 && scale.scaleY === 1) {
      return createScaleResult(state, 'points', selectedPoints.length, selectedPoints.length, scale);
    }
    const bounds = pointRefsBounds(state, selectedPoints);
    if (!bounds) {
      return createScaleResult(state, 'points', 0, 0, scale);
    }
    const origin = normalizeScaleOrigin(scale.origin, bounds);
    const selectedKeys = new Set(selectedPoints.map(pointKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => cleanLoop({
        ...loop,
        points: loop.points.map((point, pointIndex) => (
          selectedKeys.has(pointKey(createPointRef(shapeIndex, loopIndex, pointIndex)))
            ? scalePointAround(point, origin, scale.scaleX, scale.scaleY)
            : clonePoint(point)
        )),
      })),
    }));
    return createScaleResult(
      withSelectedPointRefs({ ...state, shapes }, selectedPoints),
      'points',
      selectedPoints.length,
      selectedPoints.length,
      { ...scale, origin },
    );
  }

  function scaleSelectedPaths(state, options = {}) {
    const refs = getLoopEditPathRefs(state);
    if (!refs.length) {
      return createScaleResult(state, 'paths', 0, 0, options);
    }
    const scale = normalizeScaleOptions(options);
    if (scale.scaleX === 1 && scale.scaleY === 1) {
      return createScaleResult(state, 'paths', refs.length, countPathRefPoints(state, refs), scale);
    }
    const bounds = pathRefsBounds(state, refs);
    if (!bounds) {
      return createScaleResult(state, 'paths', 0, 0, scale);
    }
    const origin = normalizeScaleOrigin(scale.origin, bounds);
    const selectedKeys = new Set(refs.map(pathKey));
    const shapes = state.shapes.map((shape, shapeIndex) => createShape({
      ...cloneShape(shape),
      loops: shape.loops.map((loop, loopIndex) => (
        selectedKeys.has(pathKey(createPathRef(shapeIndex, loopIndex)))
          ? scaleLoopAround(loop, origin, scale.scaleX, scale.scaleY)
          : cloneLoop(loop)
      )),
    }));
    return createScaleResult(
      {
        ...state,
        shapes,
        selectedPaths: getSelectedPathRefs(state),
      },
      'paths',
      refs.length,
      countPathRefPoints(state, refs),
      { ...scale, origin },
    );
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

  function buildVectorPack(state) {
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
    const animation = cleanAnimation(state.animation);
    if (shouldExportAnimation(animation)) {
      pack.animation = animation;
    }
    return pack;
  }

  function exportVectorPackJson(state) {
    return `${JSON.stringify(buildVectorPack(state), null, 2)}\n`;
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
    return {
      canvas: {
        width: Number(parsed.canvas?.width) || DEFAULT_CANVAS.width,
        height: Number(parsed.canvas?.height) || DEFAULT_CANVAS.height,
      },
      sourceImage: parsed.sourceImage || null,
      animation: animationResult.animation,
      animationIssues: animationResult.issues,
      viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      shapes: parsed.shapes.map(importShape),
      selectedShapeIndex: 0,
      selectedLoopIndex: 0,
      selectedPointIndex: -1,
      selectedPaths: [createPathRef(0, 0)],
      selectedPoints: [],
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

    const schemaVersion = parseInteger(animation.schemaVersion, ANIMATION_SCHEMA_VERSION);
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
    return {
      id,
      label: String(clip.label || titleFromId(id)),
      durationMs: Math.max(0, Number(clip.durationMs) || 0),
      loop: Boolean(clip.loop),
      tracks: Array.isArray(clip.tracks)
        ? clip.tracks.map(cleanAnimationTrack).filter(Boolean)
        : [],
    };
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
    if (parseInteger(animation.schemaVersion, ANIMATION_SCHEMA_VERSION) !== ANIMATION_SCHEMA_VERSION) {
      issues.push(createValidationIssue(
        'animation-schema-version',
        VALIDATION_STATUS.warning,
        `Animation schemaVersion should be ${ANIMATION_SCHEMA_VERSION}.`,
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
        const clipReport = validateAnimationClip(state, clip, clipIndex, clipIdCounts);
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

  function validateAnimationClip(state, clip, clipIndex, clipIdCounts) {
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
    return {
      status: statusFromIssues(issues),
      issues,
    };
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
    return {
      x: round(Number(point.x) || 0),
      y: round(Number(point.y) || 0),
      inHandle: cleanHandle(point.inHandle ?? point.in),
      outHandle: cleanHandle(point.outHandle ?? point.out),
    };
  }

  function exportPoint(point) {
    const output = {
      x: round(point.x),
      y: round(point.y),
    };
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
    return cleanLoop({
      ...loop,
      points: loop.points.map((point) => scalePointAround(point, origin, scaleX, scaleY)),
    });
  }

  function scalePointAround(point, origin, scaleX, scaleY) {
    return cleanPoint({
      ...point,
      x: origin.x + (point.x - origin.x) * scaleX,
      y: origin.y + (point.y - origin.y) * scaleY,
      inHandle: scaleHandle(point.inHandle, scaleX, scaleY),
      outHandle: scaleHandle(point.outHandle, scaleX, scaleY),
    });
  }

  function scaleHandle(handle, scaleX, scaleY) {
    return handle
      ? cleanHandle({ x: handle.x * scaleX, y: handle.y * scaleY })
      : null;
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

  function normalizeScaleOptions(options = {}) {
    const scaleX = normalizeScaleValue(options.scaleX, 1);
    const scaleY = normalizeScaleValue(options.scaleY ?? options.scaleX, scaleX);
    return {
      scaleX,
      scaleY,
      origin: options.origin,
    };
  }

  function normalizeScaleValue(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return round(clamp(parsed, 0.01, 20));
  }

  function normalizeScaleOrigin(origin, bounds) {
    const x = Number(origin?.x);
    const y = Number(origin?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x: round(x), y: round(y) };
    }
    return {
      x: round((bounds.minX + bounds.maxX) / 2),
      y: round((bounds.minY + bounds.maxY) / 2),
    };
  }

  function createScaleResult(state, target, targetCount, pointCount, options = {}) {
    const scale = normalizeScaleOptions(options);
    return {
      state,
      stats: {
        target,
        targetCount,
        pointCount,
        scaleX: scale.scaleX,
        scaleY: scale.scaleY,
        origin: scale.origin || null,
      },
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
    DEFAULT_CANVAS,
    DEFAULT_STYLE,
    LOOP_ROLES,
    TAG_PRESETS,
    VALIDATION_STATUS,
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
    selectPointRef,
    togglePointSelection,
    clearPointSelection,
    selectPointsInRect,
    selectPointsInPolygon,
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
