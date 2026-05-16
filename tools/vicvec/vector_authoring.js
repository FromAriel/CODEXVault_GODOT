(function bootVectorAuthoringTool() {
  'use strict';

  const core = globalThis.VectorAuthoringCore;
  const canvas = document.getElementById('authoring-canvas');
  const ctx = canvas.getContext('2d');
  const fields = {
    imageInput: document.getElementById('image-input'),
    jsonInput: document.getElementById('json-input'),
    imageOpacity: document.getElementById('image-opacity'),
    imageOpacityValue: document.getElementById('image-opacity-value'),
    shapeSelect: document.getElementById('shape-select'),
    loopSelect: document.getElementById('loop-select'),
    loopId: document.getElementById('loop-id'),
    loopRole: document.getElementById('loop-role'),
    shapeId: document.getElementById('shape-id'),
    shapeLabel: document.getElementById('shape-label'),
    shapeTags: document.getElementById('shape-tags'),
    shapeZ: document.getElementById('shape-z'),
    shapeFill: document.getElementById('shape-fill'),
    shapeStroke: document.getElementById('shape-stroke'),
    shapeStrokeWidth: document.getElementById('shape-stroke-width'),
    pickFillColor: document.getElementById('pick-fill-color'),
    pickStrokeColor: document.getElementById('pick-stroke-color'),
    addShape: document.getElementById('add-shape'),
    duplicateShape: document.getElementById('duplicate-shape'),
    deleteShape: document.getElementById('delete-shape'),
    zDown: document.getElementById('z-down'),
    zUp: document.getElementById('z-up'),
    tagPreset: document.getElementById('tag-preset'),
    addTagPreset: document.getElementById('add-tag-preset'),
    applyTagZone: document.getElementById('apply-tag-zone'),
    addLoop: document.getElementById('add-loop'),
    duplicateLoop: document.getElementById('duplicate-loop'),
    deleteLoop: document.getElementById('delete-loop'),
    loopUp: document.getElementById('loop-up'),
    loopDown: document.getElementById('loop-down'),
    openLoop: document.getElementById('open-loop'),
    closeLoop: document.getElementById('close-loop'),
    clearPoints: document.getElementById('clear-points'),
    modeButtons: Array.from(document.querySelectorAll('[data-tool-mode]')),
    modeHint: document.getElementById('mode-hint'),
    activeTarget: document.getElementById('active-target'),
    groupPaths: document.getElementById('group-paths'),
    separatePaths: document.getElementById('separate-paths'),
    mergeIntoActive: document.getElementById('merge-into-active'),
    clearPathSelection: document.getElementById('clear-path-selection'),
    scaleUniform: document.getElementById('scale-uniform'),
    scaleX: document.getElementById('scale-x'),
    scaleY: document.getElementById('scale-y'),
    scaleApply: document.getElementById('scale-apply'),
    scaleReset: document.getElementById('scale-reset'),
    removeNearDuplicates: document.getElementById('remove-near-duplicates'),
    simplifyStraight: document.getElementById('simplify-straight'),
    closeGap: document.getElementById('close-gap'),
    reverseLoop: document.getElementById('reverse-loop'),
    optimizeTolerance: document.getElementById('optimize-tolerance'),
    optimizeToleranceValue: document.getElementById('optimize-tolerance-value'),
    optimizeKeepCorners: document.getElementById('optimize-keep-corners'),
    optimizePreview: document.getElementById('optimize-preview'),
    optimizeApply: document.getElementById('optimize-apply'),
    optimizeCancel: document.getElementById('optimize-cancel'),
    optimizeStatus: document.getElementById('optimize-status'),
    animationReadout: document.getElementById('animation-readout'),
    brushRadius: document.getElementById('brush-radius'),
    brushRadiusValue: document.getElementById('brush-radius-value'),
    brushStrength: document.getElementById('brush-strength'),
    brushStrengthValue: document.getElementById('brush-strength-value'),
    brushFalloff: document.getElementById('brush-falloff'),
    brushFalloffValue: document.getElementById('brush-falloff-value'),
    brushPinch: document.getElementById('brush-pinch'),
    brushPinchValue: document.getElementById('brush-pinch-value'),
    brushBubble: document.getElementById('brush-bubble'),
    brushBubbleValue: document.getElementById('brush-bubble-value'),
    brushAffectHandles: document.getElementById('brush-affect-handles'),
    brushSelectedOnly: document.getElementById('brush-selected-only'),
    lassoModeInputs: Array.from(document.querySelectorAll('input[name="lasso-mode"]')),
    deletePoint: document.getElementById('delete-point'),
    clearHandles: document.getElementById('clear-handles'),
    exportJson: document.getElementById('export-json'),
    saveJson: document.getElementById('save-json'),
    jsonOutput: document.getElementById('json-output'),
    status: document.getElementById('status'),
    stats: document.getElementById('stats'),
    activeToolReadout: document.getElementById('active-tool-readout'),
    appShell: document.getElementById('app-shell'),
    inspectorTabs: Array.from(document.querySelectorAll('[data-inspector-tab]')),
    inspectorPages: Array.from(document.querySelectorAll('[data-inspector-page]')),
    inspectorTabShortcuts: Array.from(document.querySelectorAll('[data-inspector-tab-shortcut]')),
    inspectorToggleButtons: Array.from(document.querySelectorAll('[data-inspector-toggle]')),
    menuButtons: Array.from(document.querySelectorAll('[data-menu-toggle]')),
    menus: Array.from(document.querySelectorAll('.app-menu')),
    clickTargetButtons: Array.from(document.querySelectorAll('[data-click-target]')),
    openExportButtons: Array.from(document.querySelectorAll('[data-open-export]')),
    drawerCloseButtons: Array.from(document.querySelectorAll('[data-drawer-close]')),
    exportDrawer: document.getElementById('export-drawer'),
    drawerBackdrop: document.querySelector('.drawer-backdrop'),
    toolContextPanels: Array.from(document.querySelectorAll('[data-tool-context]')),
  };

  let state = core.createInitialState();
  let image = null;
  let imageUrl = null;
  let sourceImageOpacity = 1;
  let activePointer = null;
  let dragMode = null;
  let dragCanvasPoint = null;
  let dragPointIndex = -1;
  let dragHandleName = null;
  let pointerMoved = false;
  let activeToolMode = 'point';
  let colorPickTarget = null;
  let spaceDown = false;
  let selectFillDown = false;
  let revealDown = false;
  let revealAnimationFrame = 0;
  let drawAnimationFrame = 0;
  let optimizationPreview = null;
  let optimizationPreviewTimer = 0;
  let hoverCanvasPoint = null;
  let brushStrokeStats = null;
  let inspectorUserToggled = false;
  let lassoStartCanvasPoint = null;
  let lassoCurrentCanvasPoint = null;
  let lassoPoints = [];
  let lassoToggleSelection = false;
  const hitCanvas = document.createElement('canvas');
  const hitCtx = hitCanvas.getContext('2d');
  const sourceSampleCanvas = document.createElement('canvas');
  const sourceSampleCtx = sourceSampleCanvas.getContext('2d', { willReadFrequently: true });
  const loopPathCache = new WeakMap();
  const FULL_POINT_MARKER_LIMIT = 900;
  const JSON_OUTPUT_INLINE_LIMIT = 180000;
  const TOOL_MODES = Object.freeze({
    point: 'point',
    path: 'path',
    move: 'move',
    brush: 'brush',
    lasso: 'lasso',
  });
  const MODE_LABELS = Object.freeze({
    point: 'Point',
    path: 'Path Select',
    move: 'Move',
    brush: 'Brush',
    lasso: 'Lasso',
  });
  const MODE_HINTS = Object.freeze({
    point: 'Point: click to add/select points. Shift-click toggles points.',
    path: 'Path Select: click a filled loop. Shift-click toggles multiple paths.',
    move: 'Move: drag selected paths or selected points. Shift-click toggles selection.',
    brush: 'Brush: drag to pull nearby points with the falloff curve.',
    lasso: 'Lasso: drag a box or freehand loop around points in selected paths.',
  });

  function populateTagPresetOptions() {
    const groups = new Map();
    for (const preset of core.TAG_PRESETS) {
      if (!groups.has(preset.group)) {
        groups.set(preset.group, []);
      }
      groups.get(preset.group).push(preset.value);
    }
    fields.tagPreset.innerHTML = '';
    for (const [group, values] of groups.entries()) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group;
      for (const value of values) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        optgroup.appendChild(option);
      }
      fields.tagPreset.appendChild(optgroup);
    }
  }

  function syncFieldsFromState() {
    const validation = core.validateState(state);
    syncShapeList(validation);
    syncLoopList(validation);
    const shape = core.getSelectedShape(state);
    const loop = core.getSelectedLoop(state);
    fields.shapeId.value = shape?.id || '';
    fields.shapeLabel.value = shape?.label || '';
    fields.shapeTags.value = shape?.tagsText || '';
    fields.shapeZ.value = shape?.z ?? 0;
    fields.shapeFill.value = (shape?.style.fill || core.DEFAULT_STYLE.fill).slice(0, 7);
    fields.shapeStroke.value = (shape?.style.stroke || core.DEFAULT_STYLE.stroke).slice(0, 7);
    fields.shapeStrokeWidth.value = shape?.style.strokeWidth ?? core.DEFAULT_STYLE.strokeWidth;
    fields.loopId.value = loop?.id || '';
    fields.loopRole.value = loop?.role || 'outer';
    syncActiveTargetReadout();
    syncAnimationReadout(validation);
    updateStats(validation);
  }

  function applySelectedTagPreset(applySemanticRole) {
    syncStateFromFields();
    const tag = fields.tagPreset.value;
    const role = applySemanticRole ? core.tagPresetLoopRole(tag) : null;
    state = core.addTagPresetToSelectedShape(state, tag, applySemanticRole);
    setStatus(
      role
        ? `Added ${tag} and set selected loop to ${role}.`
        : `Added ${tag} to selected shape.`,
    );
    syncFieldsFromState();
    draw();
  }

  function setToolMode(mode, announce = true) {
    if (!Object.values(TOOL_MODES).includes(mode)) {
      return;
    }
    activeToolMode = mode;
    colorPickTarget = null;
    if (mode !== TOOL_MODES.brush) {
      hoverCanvasPoint = null;
    }
    if (mode !== TOOL_MODES.lasso) {
      clearLassoPreview();
    }
    syncToolUi();
    if (mode === TOOL_MODES.brush || mode === TOOL_MODES.lasso) {
      activateInspectorTab('tools');
    }
    if (announce) {
      setStatus(MODE_HINTS[mode]);
    }
    draw();
  }

  function syncToolUi() {
    for (const button of fields.modeButtons) {
      const isActive = button.dataset.toolMode === activeToolMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
    fields.modeHint.textContent = MODE_HINTS[activeToolMode];
    if (fields.activeToolReadout) {
      fields.activeToolReadout.textContent = MODE_LABELS[activeToolMode] || activeToolMode;
    }
    canvas.dataset.toolMode = activeToolMode;
    if (colorPickTarget) {
      canvas.dataset.colorPickTarget = colorPickTarget;
    } else {
      delete canvas.dataset.colorPickTarget;
    }
    canvas.classList.toggle('fill-select-active', isPathSelectActive());
    updateContextualPanels();
  }

  function isPathSelectActive() {
    return activeToolMode === TOOL_MODES.path || selectFillDown;
  }

  function beginColorPick(target) {
    colorPickTarget = target;
    syncToolUi();
    const label = target === 'stroke' ? 'stroke' : 'fill';
    const sourceNote = image ? '' : ' Load a source image first.';
    if (fields.activeToolReadout) {
      fields.activeToolReadout.textContent = `Pick ${label}`;
    }
    fields.modeHint.textContent = `Pick ${label}: click the source image to set selected shape ${label}.`;
    setStatus(`Pick ${label}: click the source image to set selected shape ${label}.${sourceNote}`);
    draw();
  }

  function clearColorPick() {
    colorPickTarget = null;
    syncToolUi();
  }

  function closeMenus() {
    for (const menu of fields.menus) {
      menu.classList.remove('open');
      const button = menu.querySelector('[data-menu-toggle]');
      button?.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleMenu(name) {
    for (const menu of fields.menus) {
      const button = menu.querySelector('[data-menu-toggle]');
      const isTarget = button?.dataset.menuToggle === name;
      const shouldOpen = isTarget && !menu.classList.contains('open');
      menu.classList.toggle('open', shouldOpen);
      button?.setAttribute('aria-expanded', String(shouldOpen));
    }
  }

  function activateInspectorTab(name) {
    const target = name || 'object';
    for (const tab of fields.inspectorTabs) {
      const isActive = tab.dataset.inspectorTab === target;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    }
    for (const page of fields.inspectorPages) {
      page.classList.toggle('active', page.dataset.inspectorPage === target);
    }
    fields.appShell?.classList.remove('inspector-collapsed');
    inspectorUserToggled = true;
    resizeCanvas();
  }

  function toggleInspector(forceOpen = null) {
    if (!fields.appShell) {
      return;
    }
    const shouldCollapse = forceOpen === null
      ? !fields.appShell.classList.contains('inspector-collapsed')
      : !forceOpen;
    inspectorUserToggled = true;
    fields.appShell.classList.toggle('inspector-collapsed', shouldCollapse);
    resizeCanvas();
  }

  function syncInspectorForViewport() {
    if (!fields.appShell || inspectorUserToggled) {
      return;
    }
    fields.appShell.classList.toggle('inspector-collapsed', window.innerWidth <= 980);
  }

  function updateContextualPanels() {
    fields.appShell?.setAttribute('data-active-tool', activeToolMode);
    for (const panel of fields.toolContextPanels) {
      panel.classList.toggle('is-visible', panel.dataset.toolContext === activeToolMode);
    }
  }

  function clearLassoPreview() {
    lassoStartCanvasPoint = null;
    lassoCurrentCanvasPoint = null;
    lassoPoints = [];
    lassoToggleSelection = false;
  }

  function openExportDrawer(refreshOutput = false) {
    if (refreshOutput) {
      exportJson();
    }
    fields.exportDrawer?.removeAttribute('hidden');
    fields.drawerBackdrop?.removeAttribute('hidden');
    requestAnimationFrame(() => {
      fields.exportDrawer?.classList.add('open');
      fields.exportDrawer?.setAttribute('aria-hidden', 'false');
    });
  }

  function closeExportDrawer() {
    fields.exportDrawer?.classList.remove('open');
    fields.exportDrawer?.setAttribute('aria-hidden', 'true');
    fields.drawerBackdrop?.setAttribute('hidden', '');
    fields.exportDrawer?.setAttribute('hidden', '');
  }

  function syncActiveTargetReadout() {
    const shape = core.getSelectedShape(state);
    const loop = core.getSelectedLoop(state);
    const selectedCount = core.getSelectedPathRefs(state).length;
    const selectedPointCount = core.getSelectedPointRefs(state).length;
    const shapeName = shape ? shape.label || shape.id : 'None';
    const loopNumber = loop ? state.selectedLoopIndex + 1 : '-';
    const loopId = loop?.id ? ` (${loop.id})` : '';
    const role = loop?.role || '-';
    fields.activeTarget.textContent =
      `Active: ${shapeName} / loop ${loopNumber}${loopId} / ${role} | ` +
      `${selectedCount} paths | ${selectedPointCount} pts`;
  }

  function syncAnimationReadout(validation = core.validateState(state)) {
    const issueText = validation.animationReport?.issues?.length
      ? ` | ${validation.animationReport.issues.length} warnings`
      : '';
    fields.animationReadout.textContent = `${core.animationSummary(state.animation)}${issueText}`;
  }

  function updateImageOpacityLabel() {
    fields.imageOpacityValue.textContent = `${Math.round(sourceImageOpacity * 100)}%`;
  }

  function updateOptimizeToleranceLabel() {
    fields.optimizeToleranceValue.textContent = `${formatPixels(Number(fields.optimizeTolerance.value) || 3)}`;
  }

  function readOptimizationOptions() {
    return {
      tolerance: Number(fields.optimizeTolerance.value) || 3,
      keepCorners: fields.optimizeKeepCorners.checked,
    };
  }

  function updateBrushControlLabels() {
    fields.brushRadiusValue.textContent = formatPixels(Number(fields.brushRadius.value) || 80);
    fields.brushStrengthValue.textContent = formatPercent(Number(fields.brushStrength.value) || 0);
    fields.brushFalloffValue.textContent = formatPercent(Number(fields.brushFalloff.value) || 0);
    fields.brushPinchValue.textContent = formatPercent(Number(fields.brushPinch.value) || 0);
    fields.brushBubbleValue.textContent = formatPercent(Number(fields.brushBubble.value) || 0);
  }

  function readBrushOptions() {
    return {
      radius: Number(fields.brushRadius.value) || 80,
      strength: Number(fields.brushStrength.value) / 100,
      falloff: Number(fields.brushFalloff.value) / 100,
      pinch: Number(fields.brushPinch.value) / 100,
      bubble: Number(fields.brushBubble.value) / 100,
      affectHandles: fields.brushAffectHandles.checked,
      selectedOnly: fields.brushSelectedOnly.checked,
    };
  }

  function readLassoMode() {
    return fields.lassoModeInputs.find((input) => input.checked)?.value === 'freehand'
      ? 'freehand'
      : 'box';
  }

  function formatBrushStats(stats) {
    if (!stats) {
      return 'Brush stroke complete.';
    }
    const loopText = stats.loopCount === 1 ? '1 loop' : `${stats.loopCount} loops`;
    const handleText = stats.affectedHandleCount
      ? `, ${stats.affectedHandleCount} handles`
      : '';
    return `Brush moved ${stats.affectedPointCount} points${handleText} across ${loopText}.`;
  }

  function syncScaleControls(changedAxis = 'x') {
    if (!fields.scaleUniform) {
      return;
    }
    fields.scaleY.disabled = fields.scaleUniform.checked;
    if (!fields.scaleUniform.checked) {
      return;
    }
    if (changedAxis === 'y') {
      fields.scaleX.value = fields.scaleY.value;
    } else {
      fields.scaleY.value = fields.scaleX.value;
    }
  }

  function readScaleOptions() {
    const scaleX = readScalePercent(fields.scaleX.value);
    const scaleY = fields.scaleUniform.checked
      ? scaleX
      : readScalePercent(fields.scaleY.value);
    return { scaleX, scaleY };
  }

  function readScalePercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return parsed / 100;
  }

  function applyScaleSelection() {
    syncStateFromFields();
    discardOptimizationPreview();
    const selectedPointCount = core.getSelectedPointRefs(state).length;
    const result = core.scaleSelection(state, readScaleOptions());
    state = result.state;
    const stats = result.stats;
    const target = selectedPointCount ? 'points' : 'paths';
    const targetText = target === 'points'
      ? `${stats.targetCount} selected point${stats.targetCount === 1 ? '' : 's'}`
      : `${stats.targetCount} selected path${stats.targetCount === 1 ? '' : 's'}`;
    setStatus(
      stats.targetCount
        ? `Scaled ${targetText} (${formatScale(stats.scaleX)} x ${formatScale(stats.scaleY)}).`
        : 'Select points or paths before scaling.',
    );
    syncFieldsFromState();
    draw();
  }

  function resetScaleControls() {
    fields.scaleX.value = '100';
    fields.scaleY.value = '100';
    syncScaleControls();
  }

  function clearOptimizationPreview(announce = true) {
    discardOptimizationPreview();
    if (announce) {
      setStatus('Optimize preview cleared.');
    }
    draw();
  }

  function discardOptimizationPreview() {
    if (optimizationPreviewTimer) {
      clearTimeout(optimizationPreviewTimer);
      optimizationPreviewTimer = 0;
    }
    optimizationPreview = null;
    fields.optimizeStatus.textContent = 'No preview.';
  }

  function scheduleOptimizationPreview() {
    updateOptimizeToleranceLabel();
    if (!optimizationPreview) {
      return;
    }
    if (optimizationPreviewTimer) {
      clearTimeout(optimizationPreviewTimer);
    }
    optimizationPreviewTimer = setTimeout(() => {
      optimizationPreviewTimer = 0;
      buildOptimizationPreview(false);
    }, 120);
  }

  function buildOptimizationPreview(announce = true) {
    syncStateFromFields();
    optimizationPreview = core.previewSelectedLoopOptimization(state, readOptimizationOptions());
    const summary = formatOptimizationStats(optimizationPreview.stats);
    fields.optimizeStatus.textContent = summary;
    if (announce) {
      setStatus(`Optimize preview: ${summary}.`);
    }
    syncFieldsFromState();
    draw();
  }

  function applyOptimizationPreview() {
    syncStateFromFields();
    const result = core.applySelectedLoopOptimization(state, readOptimizationOptions());
    state = result.state;
    optimizationPreview = null;
    const summary = formatOptimizationStats(result.stats);
    fields.optimizeStatus.textContent = summary;
    setStatus(`Optimize applied: ${summary}.`);
    syncFieldsFromState();
    draw();
  }

  function formatOptimizationStats(stats) {
    if (!stats || !stats.loopCount) {
      return 'No editable loops.';
    }
    const errorText = `max error ${formatPixels(stats.maxError || 0)}`;
    const loopText = stats.loopCount === 1 ? '1 loop' : `${stats.loopCount} loops`;
    const skippedText = stats.skippedCount ? ` | ${stats.skippedCount} skipped` : '';
    return `${stats.beforePoints} pts -> ${stats.afterPoints} pts | ${errorText} | ${loopText}${skippedText}`;
  }

  function formatPixels(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}px`;
  }

  function formatPercent(value) {
    return `${Math.round(Number(value) || 0)}%`;
  }

  function formatScale(value) {
    return `${Math.round(Number(value) * 100)}%`;
  }

  function syncShapeList(validation = core.validateState(state)) {
    const current = String(state.selectedShapeIndex);
    fields.shapeSelect.innerHTML = '';
    state.shapes.forEach((shape, index) => {
      const report = validation.shapeReports[index];
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent =
        `${validationBadge(report?.status)}${index + 1}: ${shape.label || shape.id} (z ${shape.z})`;
      option.className = validationClass(report?.status);
      option.title = validationMessages(report).join('\n');
      fields.shapeSelect.appendChild(option);
    });
    fields.shapeSelect.value = current;
    applyValidationClass(
      fields.shapeSelect,
      validation.shapeReports[state.selectedShapeIndex]?.status,
    );
  }

  function syncLoopList(validation = core.validateState(state)) {
    const shape = core.getSelectedShape(state);
    const shapeReport = validation.shapeReports[state.selectedShapeIndex];
    const current = String(state.selectedLoopIndex);
    fields.loopSelect.innerHTML = '';
    if (!shape) {
      applyValidationClass(fields.loopSelect, core.VALIDATION_STATUS.error);
      return;
    }
    shape.loops.forEach((loop, index) => {
      const report = shapeReport?.loopReports[index];
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${validationBadge(report?.status)}${index + 1}: ${loop.id || 'loop'} | ${loop.role} | ${loop.points.length} pts | ${
        loop.closed ? 'closed' : 'open'
      }`;
      option.className = validationClass(report?.status);
      option.title = validationMessages(report).join('\n');
      fields.loopSelect.appendChild(option);
    });
    fields.loopSelect.value = current;
    applyValidationClass(
      fields.loopSelect,
      shapeReport?.loopReports[state.selectedLoopIndex]?.status,
    );
  }

  function validationBadge(status) {
    if (status === core.VALIDATION_STATUS.error) {
      return 'BAD ';
    }
    if (status === core.VALIDATION_STATUS.warning) {
      return 'WARN ';
    }
    return '';
  }

  function validationClass(status) {
    if (status === core.VALIDATION_STATUS.error) {
      return 'validation-error';
    }
    if (status === core.VALIDATION_STATUS.warning) {
      return 'validation-warning';
    }
    return 'validation-ok';
  }

  function applyValidationClass(element, status) {
    element.classList.remove('validation-ok', 'validation-warning', 'validation-error');
    element.classList.add(validationClass(status));
  }

  function validationMessages(report) {
    if (!report) {
      return [];
    }
    const messages = report.issues.map((issue) => issue.message);
    if (report.loopReports) {
      for (const loopReport of report.loopReports) {
        messages.push(...loopReport.issues.map((issue) => issue.message));
      }
    }
    return messages;
  }

  function syncStateFromFields() {
    state = core.updateSelectedShapeFields(state, {
      id: fields.shapeId.value,
      label: fields.shapeLabel.value,
      tagsText: fields.shapeTags.value,
      z: fields.shapeZ.value,
      style: {
        fill: fields.shapeFill.value,
        stroke: fields.shapeStroke.value,
        strokeWidth: Number(fields.shapeStrokeWidth.value),
      },
    });
    state = core.setSelectedLoopRole(state, fields.loopRole.value);
    state = core.setSelectedLoopId(state, fields.loopId.value);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function fitCanvasToView() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(
      rect.width / state.canvas.width,
      rect.height / state.canvas.height,
    ) * 0.82;
    state = {
      ...state,
      viewport: {
        scale,
        offsetX: (rect.width - state.canvas.width * scale) / 2,
        offsetY: (rect.height - state.canvas.height * scale) / 2,
      },
    };
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    canvas.classList.toggle('reveal-active', revealDown);
    canvas.classList.toggle('fill-select-active', isPathSelectActive());
    canvas.dataset.toolMode = activeToolMode;
    if (colorPickTarget) {
      canvas.dataset.colorPickTarget = colorPickTarget;
    } else {
      delete canvas.dataset.colorPickTarget;
    }
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(state.viewport.offsetX, state.viewport.offsetY);
    ctx.scale(state.viewport.scale, state.viewport.scale);

    ctx.fillStyle = '#11100d';
    ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    if (image) {
      ctx.save();
      ctx.globalAlpha = sourceImageOpacity;
      ctx.drawImage(image, 0, 0, state.canvas.width, state.canvas.height);
      ctx.restore();
    }
    drawCanvasBounds();
    drawShapes();
    drawSelectedBounds();
    drawOptimizationPreview();
    drawSelectedHandles();
    drawLassoPreview();
    drawBrushCursor();

    ctx.restore();
  }

  function drawCanvasBounds() {
    ctx.strokeStyle = 'rgba(72, 229, 255, 0.55)';
    ctx.lineWidth = 1 / state.viewport.scale;
    ctx.strokeRect(0, 0, state.canvas.width, state.canvas.height);
  }

  function drawShapes() {
    const drawAllPointMarkers = countPackPoints() <= FULL_POINT_MARKER_LIMIT;
    const sorted = state.shapes
      .map((shape, index) => ({ shape, index }))
      .sort((a, b) => {
        const zSort = Number(a.shape.z) - Number(b.shape.z);
        return zSort === 0 ? a.index - b.index : zSort;
      });
    for (const item of sorted) {
      drawShape(item.shape, item.index, drawAllPointMarkers);
    }
  }

  function drawShape(shape, shapeIndex, drawAllPointMarkers) {
    const fillPath = new Path2D();
    const strokeLoops = [];
    const fillLoops = [];
    let hasFill = false;
    const hasCutout = shape.loops.some((loop) => loop.role === 'cutout');

    for (const loop of shape.loops) {
      const path = buildLoopPath(loop);
      if (loop.role === 'detail' || !loop.closed) {
        strokeLoops.push({ loop, path });
      } else {
        fillPath.addPath(path);
        fillLoops.push({ loop, path });
        hasFill = true;
      }
    }

    if (hasFill) {
      ctx.fillStyle = previewFillForShape(shape, shapeIndex);
      ctx.fill(fillPath, hasCutout ? 'evenodd' : 'nonzero');
    }

    for (const item of fillLoops) {
      ctx.strokeStyle = strokeForLoop(shape, item.loop, shapeIndex);
      ctx.lineWidth = Math.max(1, Number(shape.style.strokeWidth) || 1) / state.viewport.scale;
      ctx.setLineDash(dashForLoop(item.loop));
      ctx.stroke(item.path);
    }
    for (const item of strokeLoops) {
      ctx.strokeStyle = strokeForLoop(shape, item.loop, shapeIndex);
      ctx.lineWidth = Math.max(1, Number(shape.style.strokeWidth) || 1) / state.viewport.scale;
      ctx.setLineDash(dashForLoop(item.loop));
      ctx.stroke(item.path);
    }
    ctx.setLineDash([]);

    shape.loops.forEach((loop, loopIndex) => {
      if (selectFillDown && isFillSelectTarget(loop)) {
        drawFillSelectLoop(loop, shapeIndex, loopIndex);
      }
      if (revealDown) {
        drawRevealLoop(loop);
      }
      if (shouldDrawLoopPoints(shapeIndex, loopIndex, drawAllPointMarkers)) {
        drawLoopPoints(loop, shapeIndex, loopIndex);
      }
    });
  }

  function drawFillSelectLoop(loop, shapeIndex, loopIndex) {
    const path = buildLoopPath(loop);
    const isSelected = core.isPathSelected(state, shapeIndex, loopIndex);
    const color = isSelected ? '#ffffff' : roleGlowColor(loop.role);
    ctx.save();
    ctx.setLineDash([]);
    ctx.shadowColor = color;
    ctx.shadowBlur = (isSelected ? 18 : 10) / state.viewport.scale;
    ctx.fillStyle = rgbaFromHex(color, isSelected ? 0.28 : 0.18);
    ctx.strokeStyle = rgbaFromHex(color, isSelected ? 0.95 : 0.76);
    ctx.lineWidth = (isSelected ? 5 : 3) / state.viewport.scale;
    ctx.fill(path, fillRuleForLoop(loop));
    ctx.stroke(path);
    ctx.restore();
  }

  function drawRevealLoop(loop) {
    const path = buildLoopPath(loop);
    const pulse = 0.5 + Math.sin(performance.now() / 140) * 0.5;
    const width = (7 + pulse * 6) / state.viewport.scale;
    const alpha = 0.35 + pulse * 0.3;
    ctx.save();
    ctx.setLineDash([]);
    ctx.shadowColor = roleGlowColor(loop.role);
    ctx.shadowBlur = (14 + pulse * 10) / state.viewport.scale;
    ctx.strokeStyle = rgbaFromHex(roleGlowColor(loop.role), alpha);
    ctx.lineWidth = width;
    ctx.stroke(path);
    if (loop.closed) {
      ctx.fillStyle = rgbaFromHex(roleGlowColor(loop.role), 0.08 + pulse * 0.07);
      ctx.fill(path, loop.fillRule === 'evenOdd' || loop.role === 'cutout' ? 'evenodd' : 'nonzero');
    }
    ctx.restore();
  }

  function isFillSelectTarget(loop) {
    return loop.closed && loop.role !== 'detail' && loop.points.length >= 3;
  }

  function countFillSelectTargets() {
    return state.shapes.reduce(
      (total, shape) => total + shape.loops.filter(isFillSelectTarget).length,
      0,
    );
  }

  function countPackPoints() {
    return state.shapes.reduce(
      (shapeTotal, shape) =>
        shapeTotal + shape.loops.reduce(
          (loopTotal, loop) => loopTotal + loop.points.length,
          0,
        ),
      0,
    );
  }

  function shouldDrawLoopPoints(shapeIndex, loopIndex, drawAllPointMarkers) {
    return (
      drawAllPointMarkers ||
      (shapeIndex === state.selectedShapeIndex && loopIndex === state.selectedLoopIndex) ||
      core.isPathSelected(state, shapeIndex, loopIndex) ||
      core.getSelectedPointRefs(state).some((ref) => (
        ref.shapeIndex === shapeIndex && ref.loopIndex === loopIndex
      ))
    );
  }

  function fillRuleForLoop(loop) {
    return loop.fillRule === 'evenOdd' || loop.role === 'cutout' ? 'evenodd' : 'nonzero';
  }

  function buildLoopPath(loop) {
    const cached = loopPathCache.get(loop);
    if (cached) {
      return cached;
    }
    const path = new Path2D();
    const points = loop.points;
    if (!points.length) {
      return path;
    }
    path.moveTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      appendSegment(path, points[index], points[index + 1]);
    }
    if (loop.closed) {
      appendSegment(path, points[points.length - 1], points[0]);
      path.closePath();
    }
    loopPathCache.set(loop, path);
    return path;
  }

  function appendSegment(path, current, next) {
    const outHandle = current.outHandle;
    const inHandle = next.inHandle;
    if (outHandle || inHandle) {
      const controlA = outHandle
        ? { x: current.x + outHandle.x, y: current.y + outHandle.y }
        : { x: current.x, y: current.y };
      const controlB = inHandle
        ? { x: next.x + inHandle.x, y: next.y + inHandle.y }
        : { x: next.x, y: next.y };
      path.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, next.x, next.y);
    } else {
      path.lineTo(next.x, next.y);
    }
  }

  function previewFillForShape(shape, shapeIndex) {
    const alpha = shapeIndex === state.selectedShapeIndex ? '88' : '55';
    const source = String(shape.style.fill || '#7b4a22');
    if (/^#[0-9a-fA-F]{8}$/.test(source)) {
      return source;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(source)) {
      return `${source}${alpha}`;
    }
    if (shapeIndex === state.selectedShapeIndex) {
      return '#7b4a2288';
    }
    return '#7b4a2255';
  }

  function strokeForLoop(shape, loop, shapeIndex) {
    if (shapeIndex === state.selectedShapeIndex && loop === core.getSelectedLoop(state)) {
      return '#48e5ff';
    }
    const loopIndex = shape.loops.indexOf(loop);
    if (core.isPathSelected(state, shapeIndex, loopIndex)) {
      return '#ffffff';
    }
    if (loop.role === 'hitZone') {
      return '#ffb07a';
    }
    if (loop.role === 'effectZone') {
      return '#a681ff';
    }
    if (loop.role === 'cutout') {
      return '#f4df9f';
    }
    return shape.style.stroke;
  }

  function dashForLoop(loop) {
    if (loop.role === 'hitZone') {
      return [10 / state.viewport.scale, 7 / state.viewport.scale];
    }
    if (loop.role === 'effectZone') {
      return [4 / state.viewport.scale, 5 / state.viewport.scale];
    }
    return [];
  }

  function roleGlowColor(role) {
    if (role === 'cutout') {
      return '#ffe07a';
    }
    if (role === 'detail') {
      return '#ff8f5b';
    }
    if (role === 'hitZone') {
      return '#ff5d8f';
    }
    if (role === 'effectZone') {
      return '#a681ff';
    }
    return '#48e5ff';
  }

  function rgbaFromHex(hex, alpha) {
    const normalized = String(hex || '#ffffff').replace('#', '').slice(0, 6);
    const value = Number.parseInt(normalized, 16);
    if (!Number.isFinite(value)) {
      return `rgba(255, 255, 255, ${alpha})`;
    }
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  function drawLoopPoints(loop, shapeIndex, loopIndex) {
    loop.points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6 / state.viewport.scale, 0, Math.PI * 2);
      const isSelected =
        shapeIndex === state.selectedShapeIndex &&
        loopIndex === state.selectedLoopIndex &&
        index === state.selectedPointIndex;
      const isMultiSelected = core.isPointSelected(state, shapeIndex, loopIndex, index);
      const isPathSelected = core.isPathSelected(state, shapeIndex, loopIndex);
      if (isMultiSelected) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 9 / state.viewport.scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(84, 216, 255, 0.82)';
        ctx.lineWidth = 1.5 / state.viewport.scale;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = isSelected
        ? '#ffffff'
        : isMultiSelected
          ? '#eafdff'
          : isPathSelected
          ? '#d7fbff'
          : index === 0 ? '#48e5ff' : '#f4df9f';
      ctx.fill();
      ctx.strokeStyle = '#050403';
      ctx.lineWidth = 2 / state.viewport.scale;
      ctx.stroke();
    });
  }

  function drawSelectedBounds() {
    if (!(activeToolMode === TOOL_MODES.path || activeToolMode === TOOL_MODES.move || selectFillDown)) {
      return;
    }
    const bounds = core.selectedPathBounds(state);
    if (!bounds) {
      return;
    }
    const padding = 3 / state.viewport.scale;
    ctx.save();
    ctx.setLineDash([5 / state.viewport.scale, 5 / state.viewport.scale]);
    ctx.strokeStyle = 'rgba(215, 251, 255, 0.32)';
    ctx.lineWidth = 1 / state.viewport.scale;
    ctx.strokeRect(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
    );
    ctx.restore();
  }

  function drawOptimizationPreview() {
    const previews = optimizationPreview?.previews || [];
    if (!previews.length) {
      return;
    }
    ctx.save();
    for (const preview of previews) {
      if (!preview?.originalLoop || !preview?.loop) {
        continue;
      }
      const originalPath = buildLoopPath(preview.originalLoop);
      ctx.setLineDash([2 / state.viewport.scale, 5 / state.viewport.scale]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1 / state.viewport.scale;
      ctx.stroke(originalPath);

      if (preview.stats?.skipped) {
        continue;
      }
      const optimizedPath = buildLoopPath(preview.loop);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(215, 251, 255, 0.82)';
      ctx.lineWidth = 1.5 / state.viewport.scale;
      ctx.stroke(optimizedPath);
    }
    ctx.restore();
  }

  function drawSelectedHandles() {
    const loop = core.getSelectedLoop(state);
    if (!loop) {
      return;
    }
    loop.points.forEach((point, index) => {
      drawHandle(point, index, 'inHandle', '#9fb4ff');
      drawHandle(point, index, 'outHandle', '#ffbe66');
    });
  }

  function drawLassoPreview() {
    if (dragMode !== 'lasso' || !lassoStartCanvasPoint || !lassoCurrentCanvasPoint) {
      return;
    }
    ctx.save();
    ctx.setLineDash([6 / state.viewport.scale, 5 / state.viewport.scale]);
    ctx.strokeStyle = 'rgba(84, 216, 255, 0.82)';
    ctx.lineWidth = 1.25 / state.viewport.scale;
    ctx.fillStyle = 'rgba(84, 216, 255, 0.06)';
    if (readLassoMode() === 'freehand') {
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (const point of lassoPoints.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(lassoCurrentCanvasPoint.x, lassoCurrentCanvasPoint.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const x = Math.min(lassoStartCanvasPoint.x, lassoCurrentCanvasPoint.x);
      const y = Math.min(lassoStartCanvasPoint.y, lassoCurrentCanvasPoint.y);
      const width = Math.abs(lassoCurrentCanvasPoint.x - lassoStartCanvasPoint.x);
      const height = Math.abs(lassoCurrentCanvasPoint.y - lassoStartCanvasPoint.y);
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
    ctx.restore();
  }

  function drawBrushCursor() {
    if (activeToolMode !== TOOL_MODES.brush || !hoverCanvasPoint) {
      return;
    }
    const options = readBrushOptions();
    const radius = options.radius;
    const pinch = Math.max(0, Math.min(1, options.pinch));
    const bubble = Math.max(0, Math.min(1, options.bubble));
    const coreRadius = radius * (0.45 - pinch * 0.3);
    const bubbleRadius = radius * (0.52 + bubble * 0.18);

    ctx.save();
    ctx.setLineDash([]);
    ctx.lineWidth = 1 / state.viewport.scale;
    ctx.strokeStyle = 'rgba(215, 251, 255, 0.48)';
    ctx.beginPath();
    ctx.arc(hoverCanvasPoint.x, hoverCanvasPoint.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.arc(hoverCanvasPoint.x, hoverCanvasPoint.y, Math.max(4, coreRadius), 0, Math.PI * 2);
    ctx.stroke();

    if (bubble > 0) {
      ctx.setLineDash([4 / state.viewport.scale, 5 / state.viewport.scale]);
      ctx.strokeStyle = `rgba(72, 229, 255, ${0.18 + bubble * 0.34})`;
      ctx.beginPath();
      ctx.arc(hoverCanvasPoint.x, hoverCanvasPoint.y, bubbleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHandle(point, pointIndex, handleName, color) {
    const handle = point[handleName];
    if (!handle) {
      return;
    }
    const absolute = core.handleAbsolutePoint(point, handleName);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(absolute.x, absolute.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 / state.viewport.scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(
      absolute.x - 5 / state.viewport.scale,
      absolute.y - 5 / state.viewport.scale,
      10 / state.viewport.scale,
      10 / state.viewport.scale,
    );
    ctx.fillStyle =
      pointIndex === state.selectedPointIndex && handleName === dragHandleName ? '#ffffff' : color;
    ctx.fill();
    ctx.strokeStyle = '#050403';
    ctx.lineWidth = 1.5 / state.viewport.scale;
    ctx.stroke();
  }

  function pointerToScreen(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitRadiusCanvas() {
    return 14 / state.viewport.scale;
  }

  function syncHitCanvasSize() {
    const width = Math.max(1, Math.ceil(state.canvas.width));
    const height = Math.max(1, Math.ceil(state.canvas.height));
    if (hitCanvas.width !== width) {
      hitCanvas.width = width;
    }
    if (hitCanvas.height !== height) {
      hitCanvas.height = height;
    }
  }

  function findFilledPathHit(canvasPoint) {
    syncHitCanvasSize();
    const candidates = [];
    state.shapes.forEach((shape, shapeIndex) => {
      shape.loops.forEach((loop, loopIndex) => {
        if (!isFillSelectTarget(loop)) {
          return;
        }
        candidates.push({ shape, shapeIndex, loop, loopIndex });
      });
    });
    candidates.sort((a, b) => {
      const zSort = Number(b.shape.z) - Number(a.shape.z);
      if (zSort !== 0) {
        return zSort;
      }
      if (a.shapeIndex !== b.shapeIndex) {
        return b.shapeIndex - a.shapeIndex;
      }
      return b.loopIndex - a.loopIndex;
    });
    for (const item of candidates) {
      if (
        hitCtx.isPointInPath(
          buildLoopPath(item.loop),
          canvasPoint.x,
          canvasPoint.y,
          fillRuleForLoop(item.loop),
        )
      ) {
        return item;
      }
    }
    return null;
  }

  function activateFillSelect(value) {
    if (selectFillDown === value) {
      return;
    }
    selectFillDown = value;
    canvas.classList.toggle('fill-select-active', isPathSelectActive());
    draw();
  }

  function activateReveal(value) {
    if (revealDown === value) {
      return;
    }
    revealDown = value;
    if (revealDown) {
      scheduleRevealFrame();
    } else if (revealAnimationFrame) {
      cancelAnimationFrame(revealAnimationFrame);
      revealAnimationFrame = 0;
      draw();
    } else {
      draw();
    }
  }

  function scheduleRevealFrame() {
    if (!revealDown || revealAnimationFrame) {
      return;
    }
    revealAnimationFrame = requestAnimationFrame(() => {
      revealAnimationFrame = 0;
      draw();
      scheduleRevealFrame();
    });
  }

  function requestDraw() {
    if (drawAnimationFrame) {
      return;
    }
    drawAnimationFrame = requestAnimationFrame(() => {
      drawAnimationFrame = 0;
      draw();
    });
  }

  function createBrushStrokeStats(loopCount) {
    return {
      loopCount,
      affectedPointCount: 0,
      affectedHandleCount: 0,
      maxDisplacement: 0,
    };
  }

  function addBrushStrokeStats(source) {
    if (!brushStrokeStats || !source) {
      return;
    }
    brushStrokeStats.affectedPointCount = Math.max(
      brushStrokeStats.affectedPointCount,
      source.affectedPointCount || 0,
    );
    brushStrokeStats.affectedHandleCount = Math.max(
      brushStrokeStats.affectedHandleCount,
      source.affectedHandleCount || 0,
    );
    brushStrokeStats.maxDisplacement = Math.max(
      brushStrokeStats.maxDisplacement,
      source.maxDisplacement || 0,
    );
  }

  function handleArrowNudge(event) {
    const deltaByKey = {
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
    };
    const delta = deltaByKey[event.key];
    if (!delta) {
      return false;
    }
    const selectedPointCount = core.getSelectedPointRefs(state).length;
    const selectedCount = core.getSelectedPathRefs(state).length;
    if (!selectedPointCount && !selectedCount) {
      setStatus('Select paths or points before nudging.');
      return true;
    }
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    syncStateFromFields();
    discardOptimizationPreview();
    const moveDelta = {
      dx: delta.dx * step,
      dy: delta.dy * step,
    };
    if (selectedPointCount) {
      state = core.moveSelectedPoints(state, moveDelta);
      setStatus(`Nudged ${selectedPointCount} selected points by ${step}px.`);
    } else {
      state = core.moveSelectedPaths(state, moveDelta);
      setStatus(`Nudged ${selectedCount} selected paths by ${step}px.`);
    }
    syncFieldsFromState();
    draw();
    return true;
  }

  function applyLoopCleanup(label, updater) {
    syncStateFromFields();
    discardOptimizationPreview();
    const refs = core.getLoopEditPathRefs(state);
    const before = core.countPathRefPoints(state, refs);
    state = updater(state);
    const after = core.countPathRefPoints(state, refs);
    const selectedLabel = refs.length === 1 ? 'loop' : 'loops';
    setStatus(`${label}: ${before} -> ${after} points across ${refs.length} ${selectedLabel}.`);
    syncFieldsFromState();
    draw();
  }

  function selectFilledPathAt(canvasPoint, addToSelection) {
    const pathHit = findFilledPathHit(canvasPoint);
    if (!pathHit) {
      setStatus('No closed filled path under cursor.');
      syncFieldsFromState();
      draw();
      return null;
    }
    state = addToSelection
      ? core.togglePathSelection(state, pathHit.shapeIndex, pathHit.loopIndex)
      : core.selectPath(state, pathHit.shapeIndex, pathHit.loopIndex);
    const selectedCount = core.getSelectedPathRefs(state).length;
    setStatus(
      addToSelection
        ? `${selectedCount} paths selected.`
        : `Selected ${pathHit.shape.label || pathHit.shape.id} loop ${pathHit.loopIndex + 1}.`,
    );
    syncFieldsFromState();
    draw();
    return pathHit;
  }

  function startLassoSelection(canvasPoint, toggleSelection) {
    dragMode = 'lasso';
    dragCanvasPoint = canvasPoint;
    lassoStartCanvasPoint = canvasPoint;
    lassoCurrentCanvasPoint = canvasPoint;
    lassoPoints = [canvasPoint];
    lassoToggleSelection = Boolean(toggleSelection);
    pointerMoved = false;
    setStatus(`${readLassoMode() === 'freehand' ? 'Freehand' : 'Box'} lasso: drag around points in selected paths.`);
    syncFieldsFromState();
    draw();
  }

  function updateLassoSelection(canvasPoint) {
    lassoCurrentCanvasPoint = canvasPoint;
    if (readLassoMode() === 'freehand') {
      const last = lassoPoints[lassoPoints.length - 1];
      if (!last || Math.hypot(canvasPoint.x - last.x, canvasPoint.y - last.y) >= 2 / state.viewport.scale) {
        lassoPoints.push(canvasPoint);
      }
    }
  }

  function finishLassoSelection() {
    if (!lassoStartCanvasPoint || !lassoCurrentCanvasPoint || !pointerMoved) {
      setStatus('Lasso canceled.');
      return;
    }
    const before = core.getSelectedPointRefs(state).length;
    if (readLassoMode() === 'freehand') {
      const polygon = lassoPoints.length >= 3 ? lassoPoints : [
        lassoStartCanvasPoint,
        lassoCurrentCanvasPoint,
        lassoStartCanvasPoint,
      ];
      state = core.selectPointsInPolygon(state, polygon, { toggle: lassoToggleSelection });
    } else {
      state = core.selectPointsInRect(state, {
        x1: lassoStartCanvasPoint.x,
        y1: lassoStartCanvasPoint.y,
        x2: lassoCurrentCanvasPoint.x,
        y2: lassoCurrentCanvasPoint.y,
      }, { toggle: lassoToggleSelection });
    }
    const after = core.getSelectedPointRefs(state).length;
    setStatus(
      lassoToggleSelection
        ? `Point lasso toggled selection: ${before} -> ${after} points.`
        : `Point lasso selected ${after} points.`,
    );
  }

  function sampleSourceImageColor(canvasPoint) {
    if (!image || !sourceSampleCanvas.width || !sourceSampleCanvas.height) {
      setStatus('Load a source image before picking a color.');
      return null;
    }
    const x = Math.floor(canvasPoint.x);
    const y = Math.floor(canvasPoint.y);
    if (x < 0 || y < 0 || x >= sourceSampleCanvas.width || y >= sourceSampleCanvas.height) {
      setStatus('Eyedropper is outside the source image.');
      return null;
    }
    const [red, green, blue] = sourceSampleCtx.getImageData(x, y, 1, 1).data;
    return `#${hexByte(red)}${hexByte(green)}${hexByte(blue)}`;
  }

  function applySampledColor(color, target) {
    if (!color) {
      return false;
    }
    const applyToStroke = target === 'stroke';
    state = core.updateSelectedShapeFields(state, {
      style: applyToStroke ? { stroke: color } : { fill: color },
    });
    setStatus(`${applyToStroke ? 'Stroke' : 'Fill'} sampled ${color} from source image.`);
    syncFieldsFromState();
    draw();
    return true;
  }

  function hexByte(value) {
    return Number(value).toString(16).padStart(2, '0');
  }

  function resetSourceSampleCanvas() {
    sourceSampleCanvas.width = 0;
    sourceSampleCanvas.height = 0;
  }

  function handlePointerDown(event) {
    canvas.setPointerCapture(event.pointerId);
    activePointer = pointerToScreen(event);
    const canvasPoint = core.screenToCanvas(state.viewport, activePointer);
    const wantsPan = event.button === 1 || event.button === 2 || spaceDown;
    if (wantsPan) {
      dragMode = 'pan';
      return;
    }

    syncStateFromFields();
    discardOptimizationPreview();
    if (colorPickTarget) {
      if (applySampledColor(sampleSourceImageColor(canvasPoint), colorPickTarget)) {
        clearColorPick();
      }
      return;
    }

    if (isPathSelectActive()) {
      selectFilledPathAt(canvasPoint, event.shiftKey);
      return;
    }

    if (activeToolMode === TOOL_MODES.lasso) {
      startLassoSelection(canvasPoint, event.shiftKey);
      return;
    }

    if (activeToolMode === TOOL_MODES.brush) {
      const brushOptions = readBrushOptions();
      const refs = brushOptions.selectedOnly
        ? core.getLoopEditPathRefs(state)
        : state.shapes.flatMap((shape) => shape.loops);
      dragMode = 'brush';
      dragCanvasPoint = canvasPoint;
      hoverCanvasPoint = canvasPoint;
      brushStrokeStats = createBrushStrokeStats(refs.length);
      pointerMoved = false;
      setStatus(
        brushOptions.selectedOnly
          ? `Brush ready: selected-only target ${refs.length === 1 ? '1 loop' : `${refs.length} loops`}.`
          : `Brush ready: whole pack target ${refs.length === 1 ? '1 loop' : `${refs.length} loops`}.`,
      );
      if (!refs.length) {
        setStatus(
          brushOptions.selectedOnly
            ? 'Brush has no selected or active loop target.'
          : 'Brush has no editable loop target.',
        );
      }
      syncFieldsFromState();
      draw();
      return;
    }

    if (activeToolMode === TOOL_MODES.move) {
      const pointHit = core.nearestPointHit(state, canvasPoint, hitRadiusCanvas());
      if (pointHit) {
        if (event.shiftKey) {
          state = core.togglePointSelection(
            state,
            pointHit.shapeIndex,
            pointHit.loopIndex,
            pointHit.pointIndex,
          );
          setStatus(`${core.getSelectedPointRefs(state).length} points selected.`);
          syncFieldsFromState();
          draw();
          return;
        }
        if (!core.isPointSelected(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex)) {
          state = core.selectPointRef(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex);
        }
        dragMode = 'point-move';
        dragCanvasPoint = canvasPoint;
        pointerMoved = false;
        setStatus('Drag to move selected points.');
        syncFieldsFromState();
        draw();
        return;
      }
      const pathHit = findFilledPathHit(canvasPoint);
      if (!pathHit) {
        setStatus('Move mode: click a filled path or loop point first.');
        syncFieldsFromState();
        draw();
        return;
      }
      if (event.shiftKey) {
        state = core.togglePathSelection(state, pathHit.shapeIndex, pathHit.loopIndex);
        setStatus(`${core.getSelectedPathRefs(state).length} paths selected.`);
        syncFieldsFromState();
        draw();
        return;
      }
      if (!core.isPathSelected(state, pathHit.shapeIndex, pathHit.loopIndex)) {
        state = core.selectPath(state, pathHit.shapeIndex, pathHit.loopIndex);
      }
      dragMode = 'path-move';
      dragCanvasPoint = canvasPoint;
      pointerMoved = false;
      setStatus('Drag to move selected paths.');
      syncFieldsFromState();
      draw();
      return;
    }

    const pointHitForToggle = core.nearestPointHit(state, canvasPoint, hitRadiusCanvas());
    if (pointHitForToggle && event.shiftKey) {
      state = core.togglePointSelection(
        state,
        pointHitForToggle.shapeIndex,
        pointHitForToggle.loopIndex,
        pointHitForToggle.pointIndex,
      );
      setStatus(`${core.getSelectedPointRefs(state).length} points selected.`);
      syncFieldsFromState();
      draw();
      return;
    }

    const handleHit = core.nearestHandleHit(state, canvasPoint, hitRadiusCanvas());
    if (handleHit) {
      state = core.selectPoint(state, handleHit.pointIndex);
      dragMode = 'handle';
      dragPointIndex = handleHit.pointIndex;
      dragHandleName = handleHit.handleName;
      pointerMoved = false;
      syncFieldsFromState();
      draw();
      return;
    }

    const pointHit = core.nearestPointHit(state, canvasPoint, hitRadiusCanvas());
    if (pointHit) {
      state = core.selectPointRef(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex);
      if (event.altKey) {
        dragMode = 'alt-out-handle';
        dragPointIndex = pointHit.pointIndex;
        dragHandleName = 'outHandle';
        pointerMoved = false;
        setStatus('Alt-drag to create or edit this point out handle.');
        syncFieldsFromState();
        draw();
        return;
      }
      const loop = core.getSelectedLoop(state);
      if (!loop.closed && pointHit.pointIndex === 0 && core.canCloseLoop(loop.points, canvasPoint, hitRadiusCanvas())) {
        dragMode = 'maybe-close';
      } else {
        dragMode = 'point';
      }
      dragPointIndex = pointHit.pointIndex;
      pointerMoved = false;
      syncFieldsFromState();
      draw();
      return;
    }

    if (event.altKey) {
      setStatus('Alt-drag starts from an existing point.');
      syncFieldsFromState();
      draw();
      return;
    }

    const loop = core.getSelectedLoop(state);
    if (!loop || loop.closed) {
      setStatus('Selected loop is closed. Open it or create another loop.');
      return;
    }
    state = core.addPoint(state, canvasPoint);
    dragMode = 'new-handle';
    dragPointIndex = state.selectedPointIndex;
    pointerMoved = false;
    setStatus('Point added.');
    syncFieldsFromState();
    draw();
  }

  function handlePointerMove(event) {
    const nextScreen = pointerToScreen(event);
    const canvasPoint = core.screenToCanvas(state.viewport, nextScreen);
    hoverCanvasPoint = canvasPoint;
    if (!dragMode || !activePointer) {
      if (activeToolMode === TOOL_MODES.brush) {
        requestDraw();
      }
      return;
    }
    const movedDistance = Math.hypot(
      nextScreen.x - activePointer.x,
      nextScreen.y - activePointer.y,
    );
    if (movedDistance > 4) {
      pointerMoved = true;
    }

    if (dragMode === 'pan') {
      state = {
        ...state,
        viewport: core.panViewport(state.viewport, {
          x: nextScreen.x - activePointer.x,
          y: nextScreen.y - activePointer.y,
        }),
      };
      activePointer = nextScreen;
    } else if (dragMode === 'path-move') {
      if (dragCanvasPoint) {
        state = core.moveSelectedPaths(state, {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        });
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'point-move') {
      if (dragCanvasPoint) {
        state = core.moveSelectedPoints(state, {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        });
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'lasso') {
      updateLassoSelection(canvasPoint);
      activePointer = nextScreen;
    } else if (dragMode === 'brush') {
      if (dragCanvasPoint) {
        const delta = {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        };
        if (Math.hypot(delta.dx, delta.dy) > 0.001) {
          const result = core.warpSelectedLoopsWithBrush(state, {
            center: dragCanvasPoint,
            delta,
            ...readBrushOptions(),
          });
          state = result.state;
          addBrushStrokeStats(result.stats);
          pointerMoved = true;
        }
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'maybe-close') {
      if (pointerMoved) {
        dragMode = 'point';
        state = core.movePoint(state, dragPointIndex, canvasPoint);
      }
    } else if (dragMode === 'point') {
      state = core.movePoint(state, dragPointIndex, canvasPoint);
    } else if (dragMode === 'handle') {
      state = core.movePointHandle(state, dragPointIndex, dragHandleName, canvasPoint);
    } else if (dragMode === 'alt-out-handle' && pointerMoved) {
      state = core.createPointOutHandle(state, dragPointIndex, canvasPoint);
    } else if (dragMode === 'new-handle' && pointerMoved) {
      state = core.movePointHandle(state, dragPointIndex, 'outHandle', canvasPoint);
      dragHandleName = 'outHandle';
    }
    updateStats();
    requestDraw();
  }

  function handlePointerUp(event) {
    if (event.pointerId != null) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (dragMode === 'maybe-close' && !pointerMoved) {
      state = core.closeLoop(state);
      setStatus('Loop closed.');
    } else if (dragMode === 'path-move' && pointerMoved) {
      setStatus(`Moved ${core.getSelectedPathRefs(state).length} selected paths.`);
    } else if (dragMode === 'point-move' && pointerMoved) {
      setStatus(`Moved ${core.getSelectedPointRefs(state).length} selected points.`);
    } else if (dragMode === 'lasso') {
      finishLassoSelection();
    } else if (dragMode === 'brush') {
      setStatus(pointerMoved ? formatBrushStats(brushStrokeStats) : 'Brush stroke canceled.');
    }
    activePointer = null;
    dragMode = null;
    dragCanvasPoint = null;
    dragPointIndex = -1;
    dragHandleName = null;
    brushStrokeStats = null;
    clearLassoPreview();
    pointerMoved = false;
    syncFieldsFromState();
    draw();
  }

  function handleWheel(event) {
    event.preventDefault();
    state = {
      ...state,
      viewport: core.zoomViewportAt(
        state.viewport,
        pointerToScreen(event),
        event.deltaY,
      ),
    };
    requestDraw();
  }

  function handlePointerLeave() {
    if (dragMode) {
      return;
    }
    hoverCanvasPoint = null;
    if (activeToolMode === TOOL_MODES.brush) {
      requestDraw();
    }
  }

  function handleImageLoad(file) {
    if (!file) {
      return;
    }
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    imageUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      image = nextImage;
      sourceSampleCanvas.width = image.width;
      sourceSampleCanvas.height = image.height;
      sourceSampleCtx.clearRect(0, 0, sourceSampleCanvas.width, sourceSampleCanvas.height);
      sourceSampleCtx.drawImage(image, 0, 0);
      state = core.setCanvasFromImage(state, image.width, image.height, file.name);
      discardOptimizationPreview();
      fitCanvasToView();
      setStatus(`Loaded ${file.name}.`);
      syncFieldsFromState();
      draw();
    };
    nextImage.src = imageUrl;
  }

  function handleJsonImport(file) {
    if (!file) {
      return;
    }
    file.text().then((source) => {
      try {
        state = core.importVectorPack(source);
        image = null;
        resetSourceSampleCanvas();
        discardOptimizationPreview();
        fitCanvasToView();
        syncFieldsFromState();
        const pointCount = countPackPoints();
        if (source.length > JSON_OUTPUT_INLINE_LIMIT) {
          fields.jsonOutput.value =
            `Imported ${file.name} (${state.shapes.length} shapes, ${pointCount} points).\n` +
            'Large import kept out of this text box for responsiveness. Use Export JSON or Save JSON when needed.';
        } else {
          fields.jsonOutput.value = core.exportVectorPackJson(state);
        }
        setStatus(`Imported ${file.name} (${state.shapes.length} shapes, ${pointCount} points).`);
        draw();
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    });
  }

  function exportJson() {
    syncStateFromFields();
    const output = core.exportVectorPackJson(state);
    fields.jsonOutput.value = output;
    navigator.clipboard?.writeText(output).catch(() => {});
    setStatus('Exported JSON.');
    syncFieldsFromState();
  }

  async function saveJson() {
    syncStateFromFields();
    const output = core.exportVectorPackJson(state);
    fields.jsonOutput.value = output;
    const fileName = suggestedJsonFileName();
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Duhrng vector pack JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(output);
        await writable.close();
        setStatus(`Saved ${fileName}.`);
      } else {
        downloadJson(output, fileName);
        setStatus(`Download started for ${fileName}.`);
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setStatus('Save canceled.');
      } else {
        downloadJson(output, fileName);
        setStatus(`Save picker failed; download started for ${fileName}.`);
      }
    }
    syncFieldsFromState();
  }

  function suggestedJsonFileName() {
    const sourceName = state.sourceImage
      ? state.sourceImage.replace(/\.[^.]+$/, '')
      : core.getSelectedShape(state)?.id || 'vector_pack';
    return `${core.normalizeId(sourceName)}.vpack.json`;
  }

  function downloadJson(output, fileName) {
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function updateStats(validation = core.validateState(state)) {
    const shape = core.getSelectedShape(state);
    const loop = core.getSelectedLoop(state);
    const pointCount = countPackPoints();
    const validationText = validation.errorCount
      ? `${validation.errorCount} validation errors`
      : validation.warningCount
        ? `${validation.warningCount} validation warnings`
        : 'valid';
    fields.stats.textContent =
      `${Math.round(state.canvas.width)}x${Math.round(state.canvas.height)} | ` +
      `${state.shapes.length} shapes | ` +
      `${shape?.loops.length || 0} loops | ` +
      `${loop?.points.length || 0} points | ` +
      `${pointCount} total pts | ` +
      `${loop?.closed ? 'closed' : 'open'} | ` +
      `${core.getSelectedPathRefs(state).length} paths selected | ` +
      `${core.getSelectedPointRefs(state).length} points selected | ` +
      `${validationText} | ` +
      `${pointCount > FULL_POINT_MARKER_LIMIT ? 'context markers' : 'all markers'}`;
  }

  function setStatus(message) {
    fields.status.textContent = message;
  }

  function isTypingTarget(target) {
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
  }

  function wireEvents() {
    window.addEventListener('resize', () => {
      syncInspectorForViewport();
      resizeCanvas();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenus();
        closeExportDrawer();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (handleArrowNudge(event)) {
        return;
      }
      if (event.code === 'Space') {
        spaceDown = true;
      } else if (event.code === 'Digit1' || event.code === 'KeyP') {
        setToolMode(TOOL_MODES.point);
      } else if (event.code === 'Digit2') {
        setToolMode(TOOL_MODES.path);
      } else if (event.code === 'Digit3' || event.code === 'KeyM') {
        setToolMode(TOOL_MODES.move);
      } else if (event.code === 'Digit4' || event.code === 'KeyB') {
        setToolMode(TOOL_MODES.brush);
      } else if (event.code === 'Digit5' || event.code === 'KeyL') {
        setToolMode(TOOL_MODES.lasso);
      } else if (event.code === 'KeyS') {
        activateFillSelect(true);
        const targetCount = countFillSelectTargets();
        setStatus(
          targetCount
            ? `Fill select: ${targetCount} filled closed-loop targets visible. Click one to select it.`
            : 'Fill select: no closed filled-loop targets yet.',
        );
      } else if (event.code === 'KeyG') {
        activateReveal(true);
        setStatus('Reveal active: all paths are pulsing.');
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        discardOptimizationPreview();
        const selectedPointCount = core.getSelectedPointRefs(state).length;
        state = core.deleteSelectedPoints(state);
        setStatus(selectedPointCount > 1 ? `Deleted ${selectedPointCount} selected points.` : 'Deleted selected point.');
        syncFieldsFromState();
        draw();
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        spaceDown = false;
      } else if (event.code === 'KeyS') {
        activateFillSelect(false);
        setStatus('Fill select released.');
      } else if (event.code === 'KeyG') {
        activateReveal(false);
        setStatus('Reveal released.');
      }
    });
    window.addEventListener('blur', () => {
      spaceDown = false;
      activateFillSelect(false);
      activateReveal(false);
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.app-menu')) {
        closeMenus();
      }
    });

    for (const button of fields.menuButtons) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMenu(button.dataset.menuToggle);
      });
    }

    for (const tab of fields.inspectorTabs) {
      tab.addEventListener('click', () => {
        activateInspectorTab(tab.dataset.inspectorTab);
      });
    }

    for (const shortcut of fields.inspectorTabShortcuts) {
      shortcut.addEventListener('click', () => {
        activateInspectorTab(shortcut.dataset.inspectorTabShortcut);
        closeMenus();
      });
    }

    for (const button of fields.inspectorToggleButtons) {
      button.addEventListener('click', () => {
        toggleInspector();
        closeMenus();
      });
    }

    for (const button of fields.clickTargetButtons) {
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.clickTarget)?.click();
        closeMenus();
      });
    }

    for (const button of fields.openExportButtons) {
      button.addEventListener('click', () => {
        openExportDrawer(true);
        closeMenus();
      });
    }

    for (const button of fields.drawerCloseButtons) {
      button.addEventListener('click', () => {
        closeExportDrawer();
      });
    }

    for (const button of fields.modeButtons) {
      button.addEventListener('click', () => {
        setToolMode(button.dataset.toolMode);
      });
    }
    fields.imageInput.addEventListener('change', () => {
      handleImageLoad(fields.imageInput.files[0]);
    });
    fields.imageOpacity.addEventListener('input', () => {
      sourceImageOpacity = Math.max(0, Math.min(1, Number(fields.imageOpacity.value) / 100));
      updateImageOpacityLabel();
      draw();
    });
    fields.jsonInput.addEventListener('change', () => {
      handleJsonImport(fields.jsonInput.files[0]);
    });
    fields.shapeSelect.addEventListener('change', () => {
      discardOptimizationPreview();
      state = core.selectShape(state, Number(fields.shapeSelect.value));
      syncFieldsFromState();
      draw();
    });
    fields.loopSelect.addEventListener('change', () => {
      discardOptimizationPreview();
      state = core.selectLoop(state, Number(fields.loopSelect.value));
      syncFieldsFromState();
      draw();
    });
    fields.loopRole.addEventListener('change', () => {
      state = core.setSelectedLoopRole(state, fields.loopRole.value);
      syncFieldsFromState();
      draw();
    });
    fields.loopId.addEventListener('input', () => {
      state = core.setSelectedLoopId(state, fields.loopId.value);
      syncLoopList();
      syncActiveTargetReadout();
      updateStats();
      draw();
    });
    fields.pickFillColor.addEventListener('click', () => {
      syncStateFromFields();
      beginColorPick('fill');
    });
    fields.pickStrokeColor.addEventListener('click', () => {
      syncStateFromFields();
      beginColorPick('stroke');
    });
    fields.addShape.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      state = core.addShape(state);
      setStatus('Shape added.');
      syncFieldsFromState();
      draw();
    });
    fields.duplicateShape.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      state = core.duplicateSelectedShape(state);
      setStatus('Shape duplicated.');
      syncFieldsFromState();
      draw();
    });
    fields.deleteShape.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.deleteSelectedShape(state);
      setStatus('Shape deleted.');
      syncFieldsFromState();
      draw();
    });
    fields.zDown.addEventListener('click', () => {
      state = core.nudgeSelectedShapeZ(state, -1);
      syncFieldsFromState();
      draw();
    });
    fields.zUp.addEventListener('click', () => {
      state = core.nudgeSelectedShapeZ(state, 1);
      syncFieldsFromState();
      draw();
    });
    fields.addTagPreset.addEventListener('click', () => {
      applySelectedTagPreset(false);
    });
    fields.applyTagZone.addEventListener('click', () => {
      applySelectedTagPreset(true);
    });
    fields.addLoop.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      state = core.addLoop(state, fields.loopRole.value);
      setStatus('Loop added.');
      syncFieldsFromState();
      draw();
    });
    fields.duplicateLoop.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.duplicateSelectedLoop(state);
      setStatus('Loop duplicated.');
      syncFieldsFromState();
      draw();
    });
    fields.deleteLoop.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.deleteSelectedLoop(state);
      setStatus('Loop deleted.');
      syncFieldsFromState();
      draw();
    });
    fields.loopUp.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.moveSelectedLoop(state, -1);
      syncFieldsFromState();
      draw();
    });
    fields.loopDown.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.moveSelectedLoop(state, 1);
      syncFieldsFromState();
      draw();
    });
    fields.openLoop.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.openLoop(state);
      setStatus('Loop opened.');
      syncFieldsFromState();
      draw();
    });
    fields.closeLoop.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.closeLoop(state);
      setStatus('Loop closed.');
      syncFieldsFromState();
      draw();
    });
    fields.clearPoints.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.clearPoints(state);
      setStatus('Cleared points.');
      syncFieldsFromState();
      draw();
    });
    fields.groupPaths.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      const before = core.getSelectedPathRefs(state).length;
      state = core.groupSelectedPaths(state);
      const after = core.getSelectedPathRefs(state).length;
      setStatus(before >= 2 ? `Grouped ${after} paths.` : 'Select at least two paths first.');
      syncFieldsFromState();
      draw();
    });
    fields.separatePaths.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      const before = core.getSelectedPathRefs(state).length;
      state = core.separateSelectedPaths(state);
      const after = core.getSelectedPathRefs(state).length;
      setStatus(before ? `Separated ${after} paths into standalone shapes.` : 'Select a path first.');
      syncFieldsFromState();
      draw();
    });
    fields.mergeIntoActive.addEventListener('click', () => {
      syncStateFromFields();
      discardOptimizationPreview();
      const before = core.getSelectedPathRefs(state).length;
      const activeShape = core.getSelectedShape(state);
      state = core.mergeSelectedPathsIntoActiveShape(state);
      setStatus(
        before
          ? `Merged ${before} paths into ${activeShape?.label || activeShape?.id || 'active shape'}.`
          : 'Select paths to merge first.',
      );
      syncFieldsFromState();
      draw();
    });
    fields.clearPathSelection.addEventListener('click', () => {
      discardOptimizationPreview();
      state = core.clearPathSelection(state);
      setStatus('Path selection cleared.');
      syncFieldsFromState();
      draw();
    });
    fields.scaleUniform.addEventListener('change', () => {
      syncScaleControls();
    });
    fields.scaleX.addEventListener('input', () => {
      syncScaleControls('x');
    });
    fields.scaleY.addEventListener('input', () => {
      syncScaleControls('y');
    });
    fields.scaleApply.addEventListener('click', () => {
      applyScaleSelection();
    });
    fields.scaleReset.addEventListener('click', () => {
      resetScaleControls();
      setStatus('Scale reset to 100%.');
    });
    fields.removeNearDuplicates.addEventListener('click', () => {
      applyLoopCleanup('Remove near-duplicates', core.removeNearDuplicateSelectedLoops);
    });
    fields.simplifyStraight.addEventListener('click', () => {
      applyLoopCleanup('Simplify straight', core.simplifyStraightSelectedLoops);
    });
    fields.closeGap.addEventListener('click', () => {
      applyLoopCleanup('Close gap', core.closeSelectedLoopGaps);
    });
    fields.reverseLoop.addEventListener('click', () => {
      applyLoopCleanup('Reverse', core.reverseSelectedLoops);
    });
    fields.optimizeTolerance.addEventListener('input', scheduleOptimizationPreview);
    fields.optimizeKeepCorners.addEventListener('change', scheduleOptimizationPreview);
    fields.optimizePreview.addEventListener('click', () => {
      buildOptimizationPreview(true);
    });
    fields.optimizeApply.addEventListener('click', () => {
      applyOptimizationPreview();
    });
    fields.optimizeCancel.addEventListener('click', () => {
      clearOptimizationPreview(true);
    });
    for (const input of [
      fields.brushRadius,
      fields.brushStrength,
      fields.brushFalloff,
      fields.brushPinch,
      fields.brushBubble,
      fields.brushAffectHandles,
      fields.brushSelectedOnly,
    ]) {
      input.addEventListener('input', () => {
        updateBrushControlLabels();
        if (activeToolMode === TOOL_MODES.brush) {
          draw();
        }
      });
      input.addEventListener('change', () => {
        updateBrushControlLabels();
        if (activeToolMode === TOOL_MODES.brush) {
          draw();
        }
      });
    }
    for (const input of fields.lassoModeInputs) {
      input.addEventListener('change', () => {
        if (activeToolMode === TOOL_MODES.lasso) {
          setStatus(`${readLassoMode() === 'freehand' ? 'Freehand' : 'Box'} lasso ready.`);
          draw();
        }
      });
    }
    fields.deletePoint.addEventListener('click', () => {
      discardOptimizationPreview();
      const selectedPointCount = core.getSelectedPointRefs(state).length;
      state = core.deleteSelectedPoints(state);
      setStatus(selectedPointCount > 1 ? `Deleted ${selectedPointCount} selected points.` : 'Deleted selected point.');
      syncFieldsFromState();
      draw();
    });
    fields.clearHandles.addEventListener('click', () => {
      discardOptimizationPreview();
      const selectedPointCount = core.getSelectedPointRefs(state).length;
      state = core.clearSelectedPointHandles(state);
      setStatus(
        selectedPointCount > 1
          ? `Cleared handles on ${selectedPointCount} selected points.`
          : 'Cleared selected point handles.',
      );
      syncFieldsFromState();
      draw();
    });
    fields.exportJson.addEventListener('click', exportJson);
    fields.saveJson.addEventListener('click', () => {
      saveJson();
    });
    for (const input of [
      fields.shapeId,
      fields.shapeLabel,
      fields.shapeTags,
      fields.shapeZ,
      fields.shapeFill,
      fields.shapeStroke,
      fields.shapeStrokeWidth,
    ]) {
      input.addEventListener('input', () => {
        syncStateFromFields();
        syncShapeList();
        updateStats();
        draw();
      });
    }
  }

  populateTagPresetOptions();
  updateImageOpacityLabel();
  updateOptimizeToleranceLabel();
  updateBrushControlLabels();
  syncScaleControls();
  syncInspectorForViewport();
  syncToolUi();
  syncFieldsFromState();
  wireEvents();
  resizeCanvas();
  fitCanvasToView();
  draw();
})();
