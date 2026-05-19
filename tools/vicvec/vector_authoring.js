(function bootVectorAuthoringTool() {
  'use strict';

  const core = globalThis.VectorAuthoringCore;
  const historyCore = globalThis.VectorAuthoringHistory;
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
    editorModeRest: document.getElementById('editor-mode-rest'),
    editorModeAnimate: document.getElementById('editor-mode-animate'),
    animationAutoKey: document.getElementById('animation-auto-key'),
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
    transformRotation: document.getElementById('transform-rotation'),
    transformOriginMode: document.getElementById('transform-origin-mode'),
    transformOriginFields: document.getElementById('transform-origin-fields'),
    transformOriginX: document.getElementById('transform-origin-x'),
    transformOriginY: document.getElementById('transform-origin-y'),
    transformPickOrigin: document.getElementById('transform-pick-origin'),
    transformPreview: document.getElementById('transform-preview'),
    transformApply: document.getElementById('transform-apply'),
    transformCancel: document.getElementById('transform-cancel'),
    transformReset: document.getElementById('transform-reset'),
    transformStatus: document.getElementById('transform-status'),
    poseTx: document.getElementById('pose-tx'),
    poseTy: document.getElementById('pose-ty'),
    poseRotation: document.getElementById('pose-rotation'),
    poseSx: document.getElementById('pose-sx'),
    poseSy: document.getElementById('pose-sy'),
    posePreview: document.getElementById('pose-preview'),
    poseSetKey: document.getElementById('pose-set-key'),
    poseLoadKey: document.getElementById('pose-load-key'),
    poseClear: document.getElementById('pose-clear'),
    poseStatus: document.getElementById('pose-status'),
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
    animationClipSelect: document.getElementById('animation-clip-select'),
    animationAddClip: document.getElementById('animation-add-clip'),
    animationDuplicateClip: document.getElementById('animation-duplicate-clip'),
    animationDeleteClip: document.getElementById('animation-delete-clip'),
    animationAddTrack: document.getElementById('animation-add-track'),
    animationRestSelection: document.getElementById('animation-rest-selection'),
    animationClipLabel: document.getElementById('animation-clip-label'),
    animationClipDuration: document.getElementById('animation-clip-duration'),
    animationClipLoop: document.getElementById('animation-clip-loop'),
    animationTrackSelect: document.getElementById('animation-track-select'),
    animationTrackTarget: document.getElementById('animation-track-target'),
    keyframeTx: document.getElementById('keyframe-tx'),
    keyframeTy: document.getElementById('keyframe-ty'),
    keyframeRotation: document.getElementById('keyframe-rotation'),
    keyframeSx: document.getElementById('keyframe-sx'),
    keyframeSy: document.getElementById('keyframe-sy'),
    keyframeEase: document.getElementById('keyframe-ease'),
    keyframeUpsert: document.getElementById('keyframe-upsert'),
    keyframeDelete: document.getElementById('keyframe-delete'),
    keyframeRest: document.getElementById('keyframe-rest'),
    keyframeCopy: document.getElementById('keyframe-copy'),
    keyframePrevious: document.getElementById('keyframe-previous'),
    animationBindingSelect: document.getElementById('animation-binding-select'),
    animationBindingReadout: document.getElementById('animation-binding-readout'),
    animationBindClip: document.getElementById('animation-bind-clip'),
    animationUnbindClip: document.getElementById('animation-unbind-clip'),
    timelineDock: document.getElementById('timeline-dock'),
    timelineCollapse: document.getElementById('timeline-collapse'),
    timelinePlay: document.getElementById('timeline-play'),
    timelineClipSelect: document.getElementById('timeline-clip-select'),
    timelineTime: document.getElementById('timeline-time'),
    timelineDurationReadout: document.getElementById('timeline-duration-readout'),
    timelineFps: document.getElementById('timeline-fps'),
    timelineSnap: document.getElementById('timeline-snap'),
    timelinePreviewEnabled: document.getElementById('timeline-preview-enabled'),
    timelineZoom: document.getElementById('timeline-zoom'),
    timelineZoomValue: document.getElementById('timeline-zoom-value'),
    timelineLaneScroll: document.getElementById('timeline-lane-scroll'),
    timelineTrack: document.getElementById('timeline-track'),
    timelineTicks: document.getElementById('timeline-ticks'),
    timelineKeyframes: document.getElementById('timeline-keyframes'),
    timelinePlayhead: document.getElementById('timeline-playhead'),
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
    undoCommand: document.getElementById('undo-command'),
    redoCommand: document.getElementById('redo-command'),
    deletePoint: document.getElementById('delete-point'),
    clearHandles: document.getElementById('clear-handles'),
    exportJson: document.getElementById('export-json'),
    exportGraphJson: document.getElementById('export-graph-json'),
    exportGraphJsonDrawer: document.getElementById('export-graph-json-drawer'),
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
    historyButtons: Array.from(document.querySelectorAll('[data-history-command]')),
    clickTargetButtons: Array.from(document.querySelectorAll('[data-click-target]')),
    openExportButtons: Array.from(document.querySelectorAll('[data-open-export]')),
    openManualButtons: Array.from(document.querySelectorAll('[data-open-manual]')),
    drawerCloseButtons: Array.from(document.querySelectorAll('[data-drawer-close]')),
    manualCloseButtons: Array.from(document.querySelectorAll('[data-manual-close]')),
    exportDrawer: document.getElementById('export-drawer'),
    manualDrawer: document.getElementById('manual-drawer'),
    drawerBackdrop: document.querySelector('.drawer-backdrop'),
    toolContextPanels: Array.from(document.querySelectorAll('[data-tool-context]')),
    selectionActionButtons: Array.from(document.querySelectorAll('[data-selection-action]')),
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
  let editorMode = 'rest';
  let animationAutoKey = true;
  let animationDrag = null;
  let animationBrushDeltas = new Map();
  let colorPickTarget = null;
  let spaceDown = false;
  let selectFillDown = false;
  let revealDown = false;
  let revealAnimationFrame = 0;
  let drawAnimationFrame = 0;
  let optimizationPreview = null;
  let optimizationPreviewTimer = 0;
  let transformPreview = null;
  let transformOriginPickActive = false;
  let animationPreview = null;
  let animationPosePreview = null;
  let timelineCollapsed = false;
  let timelinePlaying = false;
  let timelineAnimationFrame = 0;
  let timelineLastTimestamp = 0;
  let timelineDragMode = null;
  let hoverCanvasPoint = null;
  let brushStrokeStats = null;
  let inspectorUserToggled = false;
  let selectedClipId = '';
  let selectedTrackIndex = -1;
  let selectedKeyframeIndex = -1;
  let timelineTimeMs = 0;
  let timelineZoom = 1;
  let timelineFps = 24;
  let timelineSnap = true;
  let exportAnimationMode = 'compat';
  let lassoStartCanvasPoint = null;
  let lassoCurrentCanvasPoint = null;
  let lassoPoints = [];
  let lassoToggleSelection = false;
  let lassoSelectPaths = false;
  let historyInteraction = null;
  let fieldEditHistory = null;
  let restoringHistory = false;
  let currentImageSessionId = null;
  let nextImageSessionId = 1;
  const hitCanvas = document.createElement('canvas');
  const hitCtx = hitCanvas.getContext('2d');
  const sourceSampleCanvas = document.createElement('canvas');
  const sourceSampleCtx = sourceSampleCanvas.getContext('2d', { willReadFrequently: true });
  const sourceImageSessions = new Map();
  const editorHistory = historyCore.createHistory({ limit: 100 });
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
    lasso: 'Lasso: drag around points in selected paths. Hold S to lasso filled paths.',
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

  function populateAnimationStaticOptions() {
    fields.keyframeEase.innerHTML = '';
    for (const ease of core.KNOWN_EASES) {
      const option = document.createElement('option');
      option.value = ease;
      option.textContent = ease;
      fields.keyframeEase.appendChild(option);
    }
    fields.animationBindingSelect.innerHTML = '';
    for (const binding of core.ANIMATION_BINDING_PRESETS) {
      const option = document.createElement('option');
      option.value = binding;
      option.textContent = binding;
      fields.animationBindingSelect.appendChild(option);
    }
  }

  function captureEditorSnapshot() {
    const snapshotState = historyCore.cloneSnapshot(state);
    delete snapshotState.viewport;
    return {
      state: snapshotState,
      selectedClipId,
      selectedTrackIndex,
      selectedKeyframeIndex,
      sourceImageSessionId: currentImageSessionId,
    };
  }

  function restoreEditorSnapshot(snapshot, label = '') {
    if (!snapshot?.state) {
      return;
    }
    restoringHistory = true;
    const viewport = state.viewport;
    state = historyCore.cloneSnapshot(snapshot.state);
    state.viewport = viewport;
    selectedClipId = snapshot.selectedClipId || '';
    selectedTrackIndex = Number.isInteger(snapshot.selectedTrackIndex) ? snapshot.selectedTrackIndex : -1;
    selectedKeyframeIndex = Number.isInteger(snapshot.selectedKeyframeIndex) ? snapshot.selectedKeyframeIndex : -1;
    currentImageSessionId = snapshot.sourceImageSessionId || null;
    restoreSourceImageSession(currentImageSessionId);
    stopTimelinePlayback();
    discardOptimizationPreviewOnly();
    discardTransformPreview(false);
    discardAnimationPosePreview(false);
    discardAnimationPreview();
    historyInteraction = null;
    fieldEditHistory = null;
    syncFieldsFromState();
    syncHistoryControls();
    restoringHistory = false;
    if (label) {
      setStatus(label);
    }
    draw();
  }

  function restoreSourceImageSession(sessionId) {
    const session = sessionId ? sourceImageSessions.get(sessionId) : null;
    if (!session) {
      image = null;
      currentImageSessionId = null;
      resetSourceSampleCanvas();
      return;
    }
    image = session.image;
    currentImageSessionId = session.id;
    sourceSampleCanvas.width = image.width;
    sourceSampleCanvas.height = image.height;
    sourceSampleCtx.clearRect(0, 0, sourceSampleCanvas.width, sourceSampleCanvas.height);
    sourceSampleCtx.drawImage(image, 0, 0);
  }

  function rememberSourceImageSession(loadedImage, fileName) {
    const id = `source-${nextImageSessionId}`;
    nextImageSessionId += 1;
    sourceImageSessions.set(id, {
      id,
      image: loadedImage,
      fileName: fileName || '',
    });
    currentImageSessionId = id;
  }

  function commitHistory(label, beforeSnapshot) {
    if (!beforeSnapshot || restoringHistory) {
      return false;
    }
    const pushed = editorHistory.push(label, beforeSnapshot, captureEditorSnapshot());
    if (pushed) {
      syncHistoryControls();
    }
    return pushed;
  }

  function beginHistoryInteraction(label) {
    if (historyInteraction || restoringHistory) {
      return;
    }
    flushPendingFieldHistory();
    historyInteraction = {
      label: label || 'Edit',
      before: captureEditorSnapshot(),
      dirty: false,
    };
  }

  function markHistoryInteractionDirty() {
    if (historyInteraction) {
      historyInteraction.dirty = true;
    }
  }

  function commitHistoryInteraction(label = '') {
    if (!historyInteraction) {
      return false;
    }
    const interaction = historyInteraction;
    historyInteraction = null;
    return commitHistory(label || interaction.label, interaction.before);
  }

  function cancelHistoryInteraction() {
    historyInteraction = null;
  }

  function withHistory(label, updater) {
    if (restoringHistory) {
      return updater();
    }
    flushPendingFieldHistory();
    const before = captureEditorSnapshot();
    const result = updater();
    commitHistory(label, before);
    return result;
  }

  function startFieldHistory(label) {
    if (restoringHistory || fieldEditHistory) {
      return;
    }
    fieldEditHistory = {
      label: label || 'Edit fields',
      before: captureEditorSnapshot(),
    };
  }

  function flushPendingFieldHistory() {
    if (!fieldEditHistory || restoringHistory) {
      return false;
    }
    syncStateFromFields();
    const edit = fieldEditHistory;
    fieldEditHistory = null;
    return commitHistory(edit.label, edit.before);
  }

  function resetHistory() {
    editorHistory.reset();
    historyInteraction = null;
    fieldEditHistory = null;
    syncHistoryControls();
  }

  function undoHistory() {
    flushPendingFieldHistory();
    const entry = editorHistory.undo(captureEditorSnapshot());
    if (!entry) {
      setStatus('Nothing to undo.');
      syncHistoryControls();
      return;
    }
    restoreEditorSnapshot(entry.snapshot, `Undo: ${entry.label}.`);
  }

  function redoHistory() {
    const entry = editorHistory.redo(captureEditorSnapshot());
    if (!entry) {
      setStatus('Nothing to redo.');
      syncHistoryControls();
      return;
    }
    restoreEditorSnapshot(entry.snapshot, `Redo: ${entry.label}.`);
  }

  function syncHistoryControls() {
    if (fields.undoCommand) {
      fields.undoCommand.disabled = !editorHistory.canUndo();
    }
    if (fields.redoCommand) {
      fields.redoCommand.disabled = !editorHistory.canRedo();
    }
    for (const button of fields.historyButtons) {
      const command = button.dataset.historyCommand;
      button.disabled = command === 'undo' ? !editorHistory.canUndo() : !editorHistory.canRedo();
    }
  }

  function currentAnimation() {
    return state.animation || { schemaVersion: 1, clips: [], bindings: {} };
  }

  function isAnimateMode() {
    return editorMode === 'animate';
  }

  function animateRestOnlyMessage(actionLabel, message = '') {
    if (message) {
      return message;
    }
    return `Switch to Edit Rest to ${actionLabel}.`;
  }

  function blockAnimateRestOnlyAction(actionLabel, message = '') {
    if (!isAnimateMode()) {
      return false;
    }
    cancelHistoryInteraction();
    setStatus(animateRestOnlyMessage(actionLabel, message));
    draw();
    return true;
  }

  function withRestOnlyHistory(label, message, updater) {
    if (blockAnimateRestOnlyAction(label.toLowerCase(), message)) {
      return false;
    }
    withHistory(label, updater);
    return true;
  }

  const COMMAND_MODES = Object.freeze({
    both: 'both',
    restOnly: 'restOnly',
    animateKeyable: 'animateKeyable',
    viewOnly: 'viewOnly',
  });

  const COMMAND_HISTORY = Object.freeze({
    none: 'none',
    snapshot: 'snapshot',
    interaction: 'interaction',
  });

  function commandRegistry() {
    return {
      'shape.fields': {
        label: 'Edit shape fields',
        mode: COMMAND_MODES.restOnly,
        action: 'change object fields',
        ui: [fields.shapeId, fields.shapeLabel, fields.shapeTags, fields.shapeZ],
      },
      'loop.id.input': {
        label: 'Edit loop id',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'change loop ids',
        ui: fields.loopId,
        run() {
          state = core.setSelectedLoopId(state, fields.loopId.value);
          syncLoopList();
          syncActiveTargetReadout();
          updateStats();
          draw();
        },
      },
      'loop.role.set': {
        label: 'Set loop role',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'change loop roles',
        ui: fields.loopRole,
        run() {
          state = core.setSelectedLoopRole(state, fields.loopRole.value);
        },
        after: 'syncDraw',
      },
      'shape.add': {
        label: 'Add shape',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'add shapes',
        ui: fields.addShape,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          state = core.addShape(state);
          setStatus('Shape added.');
        },
        after: 'syncDraw',
      },
      'shape.duplicate': {
        label: 'Duplicate shape',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'duplicate shapes',
        ui: fields.duplicateShape,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          state = core.duplicateSelectedShape(state);
          setStatus('Shape duplicated.');
        },
        after: 'syncDraw',
      },
      'shape.delete': {
        label: 'Delete shape',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'delete shapes',
        ui: fields.deleteShape,
        clear: ['optimization'],
        run() {
          state = core.deleteSelectedShape(state);
          setStatus('Shape deleted.');
        },
        after: 'syncDraw',
      },
      'shape.zDown': {
        label: 'Z down',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'change shape z order',
        ui: fields.zDown,
        run() {
          state = core.nudgeSelectedShapeZ(state, -1);
        },
        after: 'syncDraw',
      },
      'shape.zUp': {
        label: 'Z up',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'change shape z order',
        ui: fields.zUp,
        run() {
          state = core.nudgeSelectedShapeZ(state, 1);
        },
        after: 'syncDraw',
      },
      'tag.add': {
        label: 'Add tag',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'change tags or loop roles',
        ui: fields.addTagPreset,
        run() {
          applySelectedTagPresetBody(false);
        },
      },
      'tag.addRole': {
        label: 'Add tag and role',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'change tags or loop roles',
        ui: fields.applyTagZone,
        run() {
          applySelectedTagPresetBody(true);
        },
      },
      'loop.add': {
        label: 'Add loop',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'add loops',
        ui: fields.addLoop,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          state = core.addLoop(state, fields.loopRole.value);
          setStatus('Loop added.');
        },
        after: 'syncDraw',
      },
      'loop.duplicate': {
        label: 'Duplicate loop',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'duplicate loops',
        ui: fields.duplicateLoop,
        clear: ['optimization'],
        run() {
          state = core.duplicateSelectedLoop(state);
          setStatus('Loop duplicated.');
        },
        after: 'syncDraw',
      },
      'loop.delete': {
        label: 'Delete loop',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'delete loops',
        ui: fields.deleteLoop,
        clear: ['optimization'],
        run() {
          state = core.deleteSelectedLoop(state);
          setStatus('Loop deleted.');
        },
        after: 'syncDraw',
      },
      'loop.up': {
        label: 'Move loop up',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'reorder loops',
        ui: fields.loopUp,
        clear: ['optimization'],
        run() {
          state = core.moveSelectedLoop(state, -1);
        },
        after: 'syncDraw',
      },
      'loop.down': {
        label: 'Move loop down',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'reorder loops',
        ui: fields.loopDown,
        clear: ['optimization'],
        run() {
          state = core.moveSelectedLoop(state, 1);
        },
        after: 'syncDraw',
      },
      'loop.open': {
        label: 'Open loop',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'open loops',
        ui: fields.openLoop,
        clear: ['optimization'],
        run() {
          state = core.openLoop(state);
          setStatus('Loop opened.');
        },
        after: 'syncDraw',
      },
      'loop.close': {
        label: 'Close loop',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'close loops',
        ui: fields.closeLoop,
        clear: ['optimization'],
        run() {
          state = core.closeLoop(state);
          setStatus('Loop closed.');
        },
        after: 'syncDraw',
      },
      'loop.clearPoints': {
        label: 'Clear points',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'clear rest points',
        ui: fields.clearPoints,
        clear: ['optimization'],
        run() {
          state = core.clearPoints(state);
          setStatus('Cleared points.');
        },
        after: 'syncDraw',
      },
      'paths.group': {
        label: 'Group selected paths',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'group paths',
        ui: fields.groupPaths,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          const before = core.getSelectedPathRefs(state).length;
          state = core.groupSelectedPaths(state);
          const after = core.getSelectedPathRefs(state).length;
          setStatus(before >= 2 ? `Grouped ${after} paths.` : 'Select at least two paths first.');
        },
        after: 'syncDraw',
      },
      'paths.separate': {
        label: 'Separate paths',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'separate paths',
        ui: fields.separatePaths,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          const before = core.getSelectedPathRefs(state).length;
          state = core.separateSelectedPaths(state);
          const after = core.getSelectedPathRefs(state).length;
          setStatus(before ? `Separated ${after} paths into standalone shapes.` : 'Select a path first.');
        },
        after: 'syncDraw',
      },
      'paths.mergeIntoActive': {
        label: 'Merge paths into active',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'merge paths',
        ui: fields.mergeIntoActive,
        clear: ['optimization'],
        run() {
          syncStateFromFields();
          const before = core.getSelectedPathRefs(state).length;
          const activeShape = core.getSelectedShape(state);
          state = core.mergeSelectedPathsIntoActiveShape(state);
          setStatus(
            before
              ? `Merged ${before} paths into ${activeShape?.label || activeShape?.id || 'active shape'}.`
              : 'Select paths to merge first.',
          );
        },
        after: 'syncDraw',
      },
      'selection.clearPaths': {
        label: 'Clear selection',
        mode: COMMAND_MODES.viewOnly,
        history: COMMAND_HISTORY.none,
        ui: fields.clearPathSelection,
        run() {
          discardOptimizationPreview();
          state = core.clearPathSelection(state);
          setStatus('Path selection cleared.');
          syncFieldsFromState();
          draw();
        },
      },
      'transform.pickOrigin': {
        label: 'Pick transform origin',
        mode: COMMAND_MODES.animateKeyable,
        history: COMMAND_HISTORY.none,
        ui: fields.transformPickOrigin,
        run: beginTransformOriginPick,
      },
      'transform.preview': {
        label: 'Preview transform',
        mode: COMMAND_MODES.animateKeyable,
        history: COMMAND_HISTORY.none,
        ui: fields.transformPreview,
        run() {
          buildTransformPreview(true);
        },
      },
      'transform.apply': {
        label: 'Apply transform',
        mode: COMMAND_MODES.animateKeyable,
        history: COMMAND_HISTORY.none,
        ui: fields.transformApply,
        run: applyTransformSelection,
      },
      'transform.cancel': {
        label: 'Cancel transform',
        mode: COMMAND_MODES.viewOnly,
        history: COMMAND_HISTORY.none,
        ui: fields.transformCancel,
        run() {
          clearTransformPreview(true);
        },
      },
      'transform.reset': {
        label: 'Reset transform controls',
        mode: COMMAND_MODES.viewOnly,
        history: COMMAND_HISTORY.none,
        ui: fields.transformReset,
        run() {
          resetTransformControls();
          setStatus('Transform controls reset.');
        },
      },
      'cleanup.nearDuplicates': {
        label: 'Remove near-duplicates',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'remove rest near-duplicate points',
        ui: fields.removeNearDuplicates,
        run() {
          applyLoopCleanup('Remove near-duplicates', core.removeNearDuplicateSelectedLoops);
        },
      },
      'cleanup.simplifyStraight': {
        label: 'Simplify straight',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'simplify rest points',
        ui: fields.simplifyStraight,
        run() {
          applyLoopCleanup('Simplify straight', core.simplifyStraightSelectedLoops);
        },
      },
      'cleanup.closeGap': {
        label: 'Close gap',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'close rest loop gaps',
        ui: fields.closeGap,
        run() {
          applyLoopCleanup('Close gap', core.closeSelectedLoopGaps);
        },
      },
      'cleanup.reverse': {
        label: 'Reverse',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'reverse rest loops',
        ui: fields.reverseLoop,
        run() {
          applyLoopCleanup('Reverse', core.reverseSelectedLoops);
        },
      },
      'optimize.apply': {
        label: 'Optimize path',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.none,
        action: 'apply rest path optimization',
        ui: fields.optimizeApply,
        run: applyOptimizationPreview,
      },
      'point.delete': {
        label: 'Delete point',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'delete rest points',
        ui: fields.deletePoint,
        clear: ['optimization'],
        run() {
          const selectedPointCount = core.getSelectedPointRefs(state).length;
          state = core.deleteSelectedPoints(state);
          setStatus(selectedPointCount > 1 ? `Deleted ${selectedPointCount} selected points.` : 'Deleted selected point.');
        },
        after: 'syncDraw',
      },
      'point.clearHandles': {
        label: 'Clear handles',
        mode: COMMAND_MODES.restOnly,
        history: COMMAND_HISTORY.snapshot,
        action: 'clear rest handles',
        ui: fields.clearHandles,
        clear: ['optimization'],
        run() {
          const selectedPointCount = core.getSelectedPointRefs(state).length;
          state = core.clearSelectedPointHandles(state);
          setStatus(
            selectedPointCount > 1
              ? `Cleared handles on ${selectedPointCount} selected points.`
              : 'Cleared selected point handles.',
          );
        },
        after: 'syncDraw',
      },
      'animation.clip.add': { label: 'Add animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationAddClip, run: createAnimationClip },
      'animation.clip.duplicate': { label: 'Duplicate animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationDuplicateClip, run: duplicateAnimationClip },
      'animation.clip.delete': { label: 'Delete animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationDeleteClip, run: deleteAnimationClip },
      'animation.track.add': { label: 'Add animation track', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationAddTrack, run: addTrackFromSelection },
      'animation.restSelection': { label: 'Rest key selected', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationRestSelection, run: setRestKeyForSelection },
      'animation.clip.edit': { label: 'Edit animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.snapshot, ui: fields.animationClipLoop, run: updateSelectedClipFromFields },
      'keyframe.upsert': { label: 'Set keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.keyframeUpsert, run: upsertKeyframeFromFields },
      'keyframe.delete': { label: 'Delete keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.keyframeDelete, run: deleteSelectedKeyframe },
      'keyframe.rest': { label: 'Set rest keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.keyframeRest, run: setRestKeyframeAtPlayhead },
      'keyframe.copy': { label: 'Copy keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.keyframeCopy, run: copySelectedKeyframeToPlayhead },
      'keyframe.previous': { label: 'Copy previous keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.keyframePrevious, run: copyPreviousKeyframeToPlayhead },
      'pose.preview': { label: 'Preview pose', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.posePreview, run() { buildAnimationPosePreview(true); } },
      'pose.setKey': { label: 'Set pose key', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.poseSetKey, run: setKeyFromPose },
      'pose.loadKey': { label: 'Load key into pose', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.poseLoadKey, run: loadSelectedKeyIntoPose },
      'pose.clear': { label: 'Clear pose preview', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.poseClear, run() { clearAnimationPosePreview(true); } },
      'binding.bind': { label: 'Bind animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationBindClip, run() { updateSelectedBinding(true); } },
      'binding.unbind': { label: 'Unbind animation clip', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: fields.animationUnbindClip, run() { updateSelectedBinding(false); } },
      'import.sourceImage': { label: 'Load source image', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.imageInput, clear: ['optimization', 'transform', 'pose', 'animation'], run({ file } = {}) { handleImageLoad(file); } },
      'import.json': { label: 'Import JSON', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.jsonInput, clear: ['optimization', 'transform', 'pose', 'animation'], run({ file } = {}) { handleJsonImport(file); } },
      'export.v1': { label: 'Export JSON', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.exportJson, run: exportJson },
      'export.graph': { label: 'Export Graph v2', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: [fields.exportGraphJson, fields.exportGraphJsonDrawer], run: exportGraphJson },
      'export.save': { label: 'Save JSON', mode: COMMAND_MODES.viewOnly, history: COMMAND_HISTORY.none, ui: fields.saveJson, run: saveJson },
      'animation.clip.editFields': { label: 'Edit animation clip fields', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.none, ui: [fields.animationClipLabel, fields.animationClipDuration], run: updateSelectedClipFromFields },
      'style.fill': { label: 'Key fill color', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.none, run() { applyStyleFieldEdit('fill'); } },
      'style.stroke': { label: 'Key stroke color', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.none, run() { applyStyleFieldEdit('stroke'); } },
      'style.strokeWidth': { label: 'Key stroke width', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.none, run() { applyStyleFieldEdit('strokeWidth'); } },
      'interaction.brush': { label: 'Brush stroke', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.interaction, clear: ['optimization'] },
      'interaction.movePoints': { label: 'Move points', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.interaction, clear: ['optimization'] },
      'interaction.movePaths': { label: 'Move paths', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.interaction, clear: ['optimization'] },
      'interaction.moveHandle': { label: 'Move handle', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.interaction, clear: ['optimization'] },
      'interaction.editHandle': { label: 'Edit handle', mode: COMMAND_MODES.animateKeyable, history: COMMAND_HISTORY.interaction, clear: ['optimization'] },
      'interaction.addPoint': { label: 'Add point', mode: COMMAND_MODES.restOnly, history: COMMAND_HISTORY.interaction, action: 'add rest points', clear: ['optimization'] },
      'interaction.moveKeyframe': { label: 'Move keyframe', mode: COMMAND_MODES.both, history: COMMAND_HISTORY.interaction },
    };
  }

  function getEditorCommand(commandId) {
    return commandRegistry()[commandId] || null;
  }

  function commandUiElements(command) {
    if (!command?.ui) {
      return [];
    }
    return (Array.isArray(command.ui) ? command.ui : [command.ui]).filter(Boolean);
  }

  function commandBlockedInCurrentMode(command) {
    return command?.mode === COMMAND_MODES.restOnly && isAnimateMode();
  }

  function commandBlockMessage(command) {
    return animateRestOnlyMessage(command.action || String(command.label || 'use this command').toLowerCase(), command.blockMessage || '');
  }

  function clearPreviewsForCommand(command) {
    const clears = new Set(Array.isArray(command.clear) ? command.clear : []);
    if (clears.has('optimization')) {
      discardOptimizationPreview();
    }
    if (clears.has('optimizationOnly')) {
      discardOptimizationPreviewOnly();
    }
    if (clears.has('transform')) {
      discardTransformPreview(false);
    }
    if (clears.has('pose')) {
      discardAnimationPosePreview(false);
    }
    if (clears.has('animation')) {
      discardAnimationPreview();
    }
  }

  function finishEditorCommand(command, result) {
    if (result === false) {
      return;
    }
    if (command.after === 'syncDraw') {
      syncFieldsFromState();
      draw();
    } else if (command.after === 'draw') {
      draw();
    }
  }

  function runEditorCommand(commandId, payload = {}) {
    const command = getEditorCommand(commandId);
    if (!command) {
      setStatus(`Unknown command: ${commandId}.`);
      return false;
    }
    if (commandBlockedInCurrentMode(command)) {
      cancelHistoryInteraction();
      setStatus(commandBlockMessage(command));
      syncCommandUiState();
      draw();
      return false;
    }
    const execute = () => {
      clearPreviewsForCommand(command);
      const result = command.run ? command.run(payload) : true;
      finishEditorCommand(command, result);
      return result;
    };
    if (command.history === COMMAND_HISTORY.snapshot) {
      return withHistory(command.label, execute);
    }
    return execute();
  }

  function beginEditorCommandInteraction(commandId, fallbackLabel = 'Edit') {
    const command = getEditorCommand(commandId);
    if (!command) {
      beginHistoryInteraction(fallbackLabel);
      return true;
    }
    if (commandBlockedInCurrentMode(command)) {
      cancelHistoryInteraction();
      setStatus(commandBlockMessage(command));
      syncCommandUiState();
      draw();
      return false;
    }
    clearPreviewsForCommand(command);
    beginHistoryInteraction(command.label || fallbackLabel);
    return true;
  }

  function commitEditorCommandInteraction(commandId, fallbackLabel = '') {
    const command = getEditorCommand(commandId);
    return commitHistoryInteraction(fallbackLabel || command?.label || 'Edit');
  }

  function getSelectedClip() {
    return currentAnimation().clips.find((clip) => clip.id === selectedClipId) || null;
  }

  function getSelectedTrack() {
    const row = getSelectedTimelineRow();
    return row?.kind === 'track' ? row.item : null;
  }

  function getSelectedTimelineRow() {
    const clip = getSelectedClip();
    return animationTimelineRows(clip)[selectedTrackIndex] || null;
  }

  function getSelectedKeyframe() {
    const row = getSelectedTimelineRow();
    return row?.keyframes?.[selectedKeyframeIndex] || null;
  }

  function animationTimelineRows(clip) {
    if (!clip) {
      return [];
    }
    const rows = [];
    (clip.tracks || []).forEach((track, trackIndex) => {
      rows.push({
        kind: 'track',
        item: track,
        trackIndex,
        label: describeTrackTarget(track.target),
        property: track.property || 'transform',
        keyframes: track.keyframes || [],
      });
    });
    const graph = clip.graph;
    if (graph?.outputs?.length) {
      const nodeMap = new Map((graph.nodes || []).map((node) => [node.id, node]));
      graph.outputs.forEach((output, outputIndex) => {
        const node = nodeMap.get(output.source);
        rows.push({
          kind: 'graph',
          item: output,
          output,
          outputIndex,
          node,
          label: `${describeTrackTarget(output.target)} / ${shortGraphProperty(output.property)}`,
          property: output.property,
          keyframes: node?.keys || [],
        });
      });
    }
    return rows;
  }

  function shortGraphProperty(property) {
    const labels = {
      'loop.transform': 'loop transform',
      'point.positionDelta': 'point delta',
      'point.inHandleDelta': 'in handle',
      'point.outHandleDelta': 'out handle',
      'shape.style.fill': 'fill',
      'shape.style.stroke': 'stroke',
      'shape.style.strokeWidth': 'stroke width',
      'shape.opacity': 'opacity',
    };
    return labels[String(property || '')] || String(property || '');
  }

  function syncAnimationUi() {
    const animation = currentAnimation();
    if (!animation.clips.some((clip) => clip.id === selectedClipId)) {
      selectedClipId = animation.clips[0]?.id || '';
      selectedTrackIndex = selectedClipId ? 0 : -1;
      selectedKeyframeIndex = 0;
      timelineTimeMs = 0;
      stopTimelinePlayback();
    }
    const clip = getSelectedClip();
    if (!clip) {
      selectedTrackIndex = -1;
      selectedKeyframeIndex = -1;
      timelineTimeMs = 0;
    } else {
      const rows = animationTimelineRows(clip);
      selectedTrackIndex = clampUiIndex(selectedTrackIndex, rows.length);
      const row = getSelectedTimelineRow();
      selectedKeyframeIndex = clampUiIndex(selectedKeyframeIndex, row?.keyframes?.length || 0);
      timelineTimeMs = clampTimelineTime(timelineTimeMs, clip.durationMs);
    }
    syncClipSelect(fields.animationClipSelect, animation.clips);
    syncClipSelect(fields.timelineClipSelect, animation.clips);
    syncClipFields(clip);
    syncTrackFields(clip);
    syncKeyframeFields();
    syncPoseFields();
    syncBindingFields(animation);
    syncTimelineUi();
    updateAnimationPreview();
  }

  function syncClipSelect(select, clips) {
    const current = selectedClipId;
    select.innerHTML = '';
    if (!clips.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No clips';
      select.appendChild(option);
    } else {
      for (const clip of clips) {
        const option = document.createElement('option');
        option.value = clip.id;
        option.textContent = `${clip.label || clip.id} (${clip.durationMs || 0}ms)`;
        select.appendChild(option);
      }
    }
    select.value = current;
  }

  function syncClipFields(clip) {
    const hasClip = Boolean(clip);
    fields.animationClipLabel.disabled = !hasClip;
    fields.animationClipDuration.disabled = !hasClip;
    fields.animationClipLoop.disabled = !hasClip;
    fields.animationDuplicateClip.disabled = !hasClip;
    fields.animationDeleteClip.disabled = !hasClip;
    fields.animationAddTrack.disabled = !hasClip;
    if (fields.animationRestSelection) {
      fields.animationRestSelection.disabled = (
        !hasClip &&
        !core.getSelectedPathRefs(state).length &&
        !core.getSelectedPointRefs(state).length
      );
    }
    fields.keyframeUpsert.disabled = !hasClip || !getSelectedTimelineRow();
    fields.keyframeDelete.disabled = !hasClip || !getSelectedKeyframe();
    fields.keyframeRest.disabled = !hasClip || !getSelectedTimelineRow();
    fields.keyframeCopy.disabled = !hasClip || !getSelectedKeyframe();
    fields.keyframePrevious.disabled = !hasClip || !getSelectedTimelineRow();
    fields.posePreview.disabled = !hasClip || !getSelectedTrack();
    fields.poseSetKey.disabled = !hasClip || !getSelectedTrack();
    fields.poseLoadKey.disabled = !hasClip || !getSelectedKeyframe();
    fields.poseClear.disabled = !animationPosePreview;
    fields.animationBindClip.disabled = !hasClip;
    if (!clip) {
      fields.animationClipLabel.value = '';
      fields.animationClipDuration.value = '1000';
      fields.animationClipLoop.checked = false;
      return;
    }
    fields.animationClipLabel.value = clip.label || '';
    fields.animationClipDuration.value = String(Math.max(1, Number(clip.durationMs) || 1));
    fields.animationClipLoop.checked = Boolean(clip.loop);
  }

  function syncTrackFields(clip) {
    fields.animationTrackSelect.innerHTML = '';
    const rows = animationTimelineRows(clip);
    if (!clip || !rows.length) {
      const option = document.createElement('option');
      option.value = '-1';
      option.textContent = 'No tracks';
      fields.animationTrackSelect.appendChild(option);
      fields.animationTrackSelect.value = '-1';
      fields.animationTrackTarget.textContent = 'No track selected.';
      return;
    }
    rows.forEach((row, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${index + 1}: ${row.label}`;
      fields.animationTrackSelect.appendChild(option);
    });
    fields.animationTrackSelect.value = String(selectedTrackIndex);
    fields.animationTrackTarget.textContent = getSelectedTimelineRow()?.label || 'No track selected.';
  }

  function syncKeyframeFields() {
    const keyframe = getSelectedKeyframe();
    const row = getSelectedTimelineRow();
    const value = keyframe?.value || {};
    if (row?.kind === 'graph' && String(row.property || '').startsWith('point.')) {
      fields.keyframeTx.value = formatCoordinate(value.x ?? 0);
      fields.keyframeTy.value = formatCoordinate(value.y ?? 0);
      fields.keyframeRotation.value = '0';
      fields.keyframeSx.value = '100';
      fields.keyframeSy.value = '100';
    } else {
      fields.keyframeTx.value = formatCoordinate(value.tx ?? 0);
      fields.keyframeTy.value = formatCoordinate(value.ty ?? 0);
      fields.keyframeRotation.value = formatCoordinate(radiansToDegrees(value.rotation ?? 0));
      fields.keyframeSx.value = String(Math.round(Number(value.sx ?? 1) * 100));
      fields.keyframeSy.value = String(Math.round(Number(value.sy ?? 1) * 100));
    }
    fields.keyframeEase.value = keyframe?.interp || keyframe?.ease || (row?.kind === 'graph' ? 'smooth' : 'linear');
  }

  function syncPoseFields() {
    fields.poseClear.disabled = !animationPosePreview;
  }

  function syncBindingFields(animation) {
    const binding = fields.animationBindingSelect.value || core.ANIMATION_BINDING_PRESETS[0];
    if (!fields.animationBindingSelect.value && core.ANIMATION_BINDING_PRESETS.length) {
      fields.animationBindingSelect.value = binding;
    }
    const targetClipId = animation.bindings?.[binding] || '';
    fields.animationBindingReadout.textContent = targetClipId
      ? `${binding} -> ${targetClipId}`
      : `${binding}: no binding`;
  }

  function syncTimelineUi() {
    const clip = getSelectedClip();
    const duration = Math.max(0, Number(clip?.durationMs) || 0);
    fields.timelineTime.value = String(Math.round(timelineTimeMs));
    fields.timelineDurationReadout.textContent = `/ ${duration}ms`;
    fields.timelinePlay.textContent = timelinePlaying ? 'Pause' : 'Play';
    fields.timelineFps.value = String(timelineFps);
    fields.timelineSnap.checked = timelineSnap;
    fields.timelineZoom.value = String(timelineZoom);
    fields.timelineZoomValue.textContent = `${timelineZoom}x`;
    fields.appShell?.classList.toggle('timeline-collapsed', timelineCollapsed);
    fields.timelineTrack.style.width = `${Math.max(1, timelineZoom) * 100}%`;
    renderTimelineTicks(duration);
    renderTimelineRows(duration);
    updateTimelinePlayhead(duration);
  }

  function renderTimelineTicks(duration) {
    fields.timelineTicks.innerHTML = '';
    const tickCount = duration > 0 ? 10 : 1;
    for (let index = 0; index <= tickCount; index += 1) {
      const tick = document.createElement('div');
      tick.className = `timeline-tick${index % 5 === 0 ? ' major' : ''}`;
      tick.style.setProperty('--tick-left', String(index / tickCount));
      fields.timelineTicks.appendChild(tick);
    }
  }

  function renderTimelineRows(duration) {
    fields.timelineKeyframes.innerHTML = '';
    const clip = getSelectedClip();
    const rows = animationTimelineRows(clip);
    if (!clip || !rows.length) {
      const row = document.createElement('div');
      row.className = 'timeline-empty-row';
      row.textContent = clip ? 'No tracks yet. Add Track from the Animation inspector.' : 'No animation clip selected.';
      fields.timelineKeyframes.appendChild(row);
      return;
    }
    rows.forEach((timelineRow, rowIndex) => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      row.dataset.trackIndex = String(rowIndex);
      row.classList.toggle('selected', rowIndex === selectedTrackIndex);

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'timeline-row-label';
      label.dataset.trackIndex = String(rowIndex);
      label.textContent = timelineRow.label;
      label.title = label.textContent;
      row.appendChild(label);

      const lane = document.createElement('div');
      lane.className = 'timeline-row-lane';
      lane.dataset.trackIndex = String(rowIndex);
      (timelineRow.keyframes || []).forEach((keyframe, keyframeIndex) => {
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'timeline-keyframe';
        node.dataset.trackIndex = String(rowIndex);
        node.dataset.keyframeIndex = String(keyframeIndex);
        node.style.left = `${clampUnit((Number(keyframe.timeMs) || 0) / duration) * 100}%`;
        node.title = `Track ${rowIndex + 1} @ ${keyframe.timeMs}ms`;
        node.classList.toggle('active', rowIndex === selectedTrackIndex && keyframeIndex === selectedKeyframeIndex);
        lane.appendChild(node);
      });
      row.appendChild(lane);
      fields.timelineKeyframes.appendChild(row);
    });
  }

  function updateTimelinePlayhead(duration) {
    const percent = duration > 0 ? clampUnit(timelineTimeMs / duration) : 0;
    fields.timelineTrack.style.setProperty('--playhead-percent', String(percent));
  }

  function clampUnit(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function describeTrackTarget(target) {
    if (!target) {
      return 'No target';
    }
    if (target.tags?.length) {
      return `tags: ${target.tags.join(', ')}`;
    }
    const loopText = target.loopId
      ? ` / ${target.loopId}`
      : target.loopIndex != null
        ? ` / loop ${Number(target.loopIndex) + 1}`
        : '';
    return `${target.shapeId || 'shape'}${loopText}`;
  }

  function clampUiIndex(index, length) {
    if (!length) {
      return -1;
    }
    return Math.min(length - 1, Math.max(0, Number.isInteger(index) ? index : 0));
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
    syncAnimationUi();
    syncRailSwatches();
    syncEditorModeUi();
    updateStats(validation);
  }

  function setEditorMode(mode) {
    if (!['rest', 'animate'].includes(mode)) {
      return;
    }
    flushPendingFieldHistory();
    editorMode = mode;
    discardOptimizationPreviewOnly();
    discardTransformPreview(false);
    discardAnimationPosePreview(false);
    updateAnimationPreview();
    syncEditorModeUi();
    setStatus(
      isAnimateMode()
        ? 'Animate mode: canvas edits write sparse keys at the playhead.'
        : 'Edit Rest mode: canvas edits change the base vector art.',
    );
    draw();
  }

  function enterAnimateAuthoringMode() {
    if (isAnimateMode()) {
      return;
    }
    flushPendingFieldHistory();
    editorMode = 'animate';
    discardOptimizationPreviewOnly();
    discardTransformPreview(false);
    discardAnimationPosePreview(false);
    syncEditorModeUi();
  }

  function syncEditorModeUi() {
    fields.editorModeRest?.classList.toggle('active', editorMode === 'rest');
    fields.editorModeAnimate?.classList.toggle('active', editorMode === 'animate');
    fields.editorModeRest?.setAttribute('aria-pressed', String(editorMode === 'rest'));
    fields.editorModeAnimate?.setAttribute('aria-pressed', String(editorMode === 'animate'));
    if (fields.animationAutoKey) {
      fields.animationAutoKey.checked = animationAutoKey;
      fields.animationAutoKey.disabled = !isAnimateMode();
    }
    fields.appShell?.setAttribute('data-editor-mode', editorMode);
    syncCommandUiState();
  }

  function commandControlledItems() {
    return Object.entries(commandRegistry()).flatMap(([commandId, command]) => (
      commandUiElements(command).map((element) => ({ commandId, command, element }))
    ));
  }

  function syncRestOnlyControlState() {
    syncCommandUiState();
  }

  function syncCommandUiState() {
    const blockedTargetIds = new Map();
    for (const item of commandControlledItems()) {
      const element = item.element;
      if (!element) {
        continue;
      }
      const blocked = commandBlockedInCurrentMode(item.command);
      if (element.id) {
        blockedTargetIds.set(element.id, blocked ? commandBlockMessage(item.command) : '');
      }
      if (element.dataset.restOnlyOriginalTitle == null) {
        element.dataset.restOnlyOriginalTitle = element.getAttribute('title') || '';
      }
      element.disabled = blocked;
      element.setAttribute('aria-disabled', String(blocked));
      element.classList?.toggle('is-animate-blocked', blocked);
      if (blocked) {
        element.setAttribute('title', commandBlockMessage(item.command));
      } else {
        const originalTitle = element.dataset.restOnlyOriginalTitle;
        if (originalTitle) {
          element.setAttribute('title', originalTitle);
        } else {
          element.removeAttribute('title');
        }
      }
    }
    for (const button of fields.clickTargetButtons) {
      const targetMessage = blockedTargetIds.get(button.dataset.clickTarget);
      if (targetMessage == null) {
        continue;
      }
      if (button.dataset.restOnlyOriginalTitle == null) {
        button.dataset.restOnlyOriginalTitle = button.getAttribute('title') || '';
      }
      const blocked = Boolean(targetMessage);
      button.disabled = blocked;
      button.setAttribute('aria-disabled', String(blocked));
      button.classList.toggle('is-animate-blocked', blocked);
      if (blocked) {
        button.setAttribute('title', targetMessage);
      } else {
        const originalTitle = button.dataset.restOnlyOriginalTitle;
        if (originalTitle) {
          button.setAttribute('title', originalTitle);
        } else {
          button.removeAttribute('title');
        }
      }
    }
    syncTransformControls();
  }

  function applySelectedTagPreset(applySemanticRole) {
    runEditorCommand(applySemanticRole ? 'tag.addRole' : 'tag.add');
  }

  function applySelectedTagPresetBody(applySemanticRole) {
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
    fields.pickFillColor?.setAttribute('data-color-active', String(colorPickTarget === 'fill'));
    fields.pickStrokeColor?.setAttribute('data-color-active', String(colorPickTarget === 'stroke'));
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
    syncContextActions();
  }

  function syncContextActions() {
    const hasSelectedPaths = core.getSelectedPathRefs(state).length > 0;
    for (const button of fields.selectionActionButtons) {
      button.hidden = !hasSelectedPaths;
    }
  }

  function syncRailSwatches() {
    const shape = core.getSelectedShape(state);
    const fill = (shape?.style.fill || fields.shapeFill?.value || core.DEFAULT_STYLE.fill).slice(0, 7);
    const stroke = (shape?.style.stroke || fields.shapeStroke?.value || core.DEFAULT_STYLE.stroke).slice(0, 7);
    fields.pickFillColor?.style.setProperty('--swatch-color', fill);
    fields.pickStrokeColor?.style.setProperty('--swatch-color', stroke);
  }

  function clearLassoPreview() {
    lassoStartCanvasPoint = null;
    lassoCurrentCanvasPoint = null;
    lassoPoints = [];
    lassoToggleSelection = false;
    lassoSelectPaths = false;
  }

  function openExportDrawer(refreshOutput = false) {
    closeManualDrawer();
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

  function openManualDrawer() {
    closeExportDrawer();
    fields.manualDrawer?.removeAttribute('hidden');
    fields.drawerBackdrop?.removeAttribute('hidden');
    requestAnimationFrame(() => {
      fields.manualDrawer?.classList.add('open');
      fields.manualDrawer?.setAttribute('aria-hidden', 'false');
    });
  }

  function closeManualDrawer() {
    fields.manualDrawer?.classList.remove('open');
    fields.manualDrawer?.setAttribute('aria-hidden', 'true');
    fields.drawerBackdrop?.setAttribute('hidden', '');
    fields.manualDrawer?.setAttribute('hidden', '');
  }

  function closeAllDrawers() {
    closeExportDrawer();
    closeManualDrawer();
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
    syncContextActions();
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

  function syncTransformControls(changedAxis = 'x') {
    syncScaleControls(changedAxis);
    const isCustom = fields.transformOriginMode.value === 'custom';
    fields.transformOriginX.disabled = !isCustom;
    fields.transformOriginY.disabled = !isCustom;
    fields.transformOriginFields.classList.toggle('is-disabled', !isCustom);
    updateTransformPreviewFromControls();
  }

  function readTransformOptions() {
    const scaleX = readScalePercent(fields.scaleX.value);
    const scaleY = fields.scaleUniform.checked
      ? scaleX
      : readScalePercent(fields.scaleY.value);
    return {
      scaleX,
      scaleY,
      rotation: degreesToRadians(fields.transformRotation.value),
      origin: readTransformOriginOption(),
    };
  }

  function readScalePercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return parsed / 100;
  }

  function readTransformOriginOption() {
    const mode = fields.transformOriginMode.value || 'selection';
    if (mode !== 'custom') {
      return { mode };
    }
    return {
      mode: 'custom',
      x: readNumberOrNull(fields.transformOriginX.value),
      y: readNumberOrNull(fields.transformOriginY.value),
    };
  }

  function readNumberOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function degreesToRadians(value) {
    const degrees = Number(value);
    return Number.isFinite(degrees) ? degrees * Math.PI / 180 : 0;
  }

  function radiansToDegrees(value) {
    const radians = Number(value);
    return Number.isFinite(radians) ? radians * 180 / Math.PI : 0;
  }

  function buildTransformPreview(announce = true) {
    syncStateFromFields();
    discardOptimizationPreviewOnly();
    discardAnimationPosePreview(false);
    discardAnimationPreview();
    const previewState = isAnimateMode()
      ? buildEditorDisplayScene().displayState
      : state;
    transformPreview = core.previewSelectionTransform(previewState, readTransformOptions());
    updateResolvedCustomOrigin(transformPreview.stats.origin);
    const message = formatTransformStats(transformPreview.stats, 'Preview');
    fields.transformStatus.textContent = transformPreview.stats.targetCount
      ? message
      : 'No transform target.';
    if (announce) {
      setStatus(
        transformPreview.stats.targetCount
          ? `${message}. Rest art ${isAnimateMode() ? 'unchanged' : 'not changed until Apply'}.`
          : 'Select points or paths before transforming.',
      );
    }
    draw();
  }

  function applyTransformSelection() {
    if (isAnimateMode()) {
      applyAnimatedTransformSelection();
      return;
    }
    withHistory('Transform selection', () => {
      syncStateFromFields();
      discardOptimizationPreviewOnly();
      const selectedPointCount = core.getSelectedPointRefs(state).length;
      const result = core.transformSelection(state, readTransformOptions());
      state = result.state;
      const stats = result.stats;
      const target = selectedPointCount ? 'points' : 'paths';
      const targetText = target === 'points'
        ? `${stats.targetCount} selected point${stats.targetCount === 1 ? '' : 's'}`
        : `${stats.targetCount} selected path${stats.targetCount === 1 ? '' : 's'}`;
      setStatus(
        stats.targetCount
          ? `Transformed ${targetText} (${formatScale(stats.scaleX)} x ${formatScale(stats.scaleY)}, ${formatDegrees(stats.rotation)}).`
          : 'Select points or paths before transforming.',
      );
      discardTransformPreview(false);
      syncFieldsFromState();
      draw();
    });
  }

  function applyAnimatedTransformSelection() {
    if (!animationAutoKey) {
      setStatus('Auto Key is off. Turn it on to write animation transform keys.');
      return;
    }
    withHistory('Animate transform selection', () => {
      const clipId = ensureActiveClipForAnimation();
      if (!clipId) {
        setStatus('Create or select a clip before keying transforms.');
        return;
      }
      syncStateFromFields();
      discardOptimizationPreviewOnly();
      discardAnimationPosePreview(false);
      discardAnimationPreview();
      const options = readTransformOptions();
      const displayScene = buildEditorDisplayScene();
      const displayState = displayScene.displayState || state;
      const preview = core.previewSelectionTransform(displayState, options);
      transformPreview = preview;
      updateResolvedCustomOrigin(preview.stats.origin);
      const timeOptions = graphKeyOptions();
      if (!preview.stats.targetCount || !preview.stats.origin) {
        fields.transformStatus.textContent = 'No transform target.';
        setStatus('Select points or paths before keying animation transforms.');
        draw();
        return;
      }
      if (preview.stats.target === 'points') {
        const result = core.graphPointDeltaItemsFromTransform(state, displayState, options);
        state = core.upsertPointDeltaGraphKeys(state, clipId, result.pointItems, timeOptions);
        for (const item of result.handleItems) {
          state = core.upsertPointHandleDeltaGraphKey(state, clipId, item.ref, item.handleName, {
            ...timeOptions,
            value: item.value,
          });
        }
        const message = formatTransformStats(result.stats, 'Keyed');
        fields.transformStatus.textContent = message;
        setStatus(`Keyed ${result.pointItems.length} point transform target${result.pointItems.length === 1 ? '' : 's'} at ${Math.round(timeOptions.timeMs)}ms. Rest art unchanged.`);
      } else {
        const refs = core.getLoopEditPathRefs(displayState);
        const animationOrigin = animationCanvasOriginFromResolved(preview.stats.origin);
        const transformValue = {
          sx: options.scaleX,
          sy: options.scaleY,
          rotation: options.rotation,
        };
        for (const ref of refs) {
          const base = loopTransformBaseValueAtTime(ref, clipId, timeOptions.timeMs, animationOrigin);
          state = core.upsertLoopTransformGraphKeys(state, clipId, [ref], {
            ...timeOptions,
            value: {
              ...base,
              ...transformValue,
            },
          }, {
            origin: animationOrigin,
          });
        }
        const message = formatTransformStats(preview.stats, 'Keyed');
        fields.transformStatus.textContent = message;
        setStatus(`Keyed ${refs.length} loop transform target${refs.length === 1 ? '' : 's'} at ${Math.round(timeOptions.timeMs)}ms. Rest art unchanged.`);
      }
      selectedClipId = clipId;
      selectLatestAnimationRowAtPlayhead();
      updateAnimationPreview();
      syncFieldsFromState();
      draw();
    });
  }

  function animationCanvasOriginFromResolved(origin) {
    if (!origin || !Number.isFinite(Number(origin.x)) || !Number.isFinite(Number(origin.y))) {
      return null;
    }
    return {
      mode: 'canvas',
      x: Math.round(Number(origin.x) * 1000) / 1000,
      y: Math.round(Number(origin.y) * 1000) / 1000,
    };
  }

  function animationCanvasOriginForState(originState = state) {
    return animationCanvasOriginFromResolved(core.resolveTransformOrigin(originState, readTransformOptions()));
  }

  function isRestTransformValue(value) {
    return !value ||
      Math.abs(Number(value.tx) || 0) < 0.0001 &&
      Math.abs(Number(value.ty) || 0) < 0.0001 &&
      Math.abs(Number(value.rotation) || 0) < 0.0001 &&
      Math.abs((Number(value.sx) || 1) - 1) < 0.0001 &&
      Math.abs((Number(value.sy) || 1) - 1) < 0.0001 &&
      Math.abs(Number(value.skewX) || 0) < 0.0001 &&
      Math.abs(Number(value.skewY) || 0) < 0.0001;
  }

  function loopTransformBaseValueAtTime(ref, clipId, timeMs, origin) {
    const target = core.pathRefToAnimationTarget(state, ref);
    const withOrigin = core.graphValueForTarget(state, clipId, 'loop.transform', target, timeMs, { origin });
    if (!isRestTransformValue(withOrigin)) {
      return withOrigin;
    }
    const withoutOrigin = core.graphValueForTarget(state, clipId, 'loop.transform', target, timeMs);
    return isRestTransformValue(withoutOrigin) ? withOrigin : withoutOrigin;
  }

  function updateTransformPreviewFromControls() {
    if (transformPreview) {
      buildTransformPreview(false);
    }
  }

  function clearTransformPreview(announce = true) {
    discardTransformPreview(false);
    if (announce) {
      setStatus('Transform preview cleared.');
    }
    draw();
  }

  function discardTransformPreview(updateStatus = true) {
    transformPreview = null;
    transformOriginPickActive = false;
    if (updateStatus && fields.transformStatus) {
      fields.transformStatus.textContent = 'No preview.';
    } else if (fields.transformStatus) {
      fields.transformStatus.textContent = 'No preview.';
    }
  }

  function beginTransformOriginPick() {
    syncStateFromFields();
    const originState = isAnimateMode()
      ? buildEditorDisplayScene().displayState
      : state;
    const resolved = core.resolveTransformOrigin(originState, readTransformOptions());
    if (resolved) {
      setCustomTransformOrigin(resolved);
    }
    fields.transformOriginMode.value = 'custom';
    syncTransformControls();
    transformOriginPickActive = true;
    setStatus('Pick transform origin on the canvas.');
    draw();
  }

  function setCustomTransformOrigin(point) {
    fields.transformOriginX.value = formatCoordinate(point.x);
    fields.transformOriginY.value = formatCoordinate(point.y);
  }

  function updateResolvedCustomOrigin(origin) {
    if (fields.transformOriginMode.value === 'custom' || !origin) {
      return;
    }
    setCustomTransformOrigin(origin);
  }

  function resetTransformControls() {
    fields.scaleX.value = '100';
    fields.scaleY.value = '100';
    fields.transformRotation.value = '0';
    fields.transformOriginMode.value = 'selection';
    fields.transformOriginX.value = '';
    fields.transformOriginY.value = '';
    syncTransformControls();
    discardTransformPreview();
  }

  function createAnimationClip() {
    withHistory('Add animation clip', () => {
      state = core.addAnimationClip(state, {
        id: `clip_${currentAnimation().clips.length + 1}`,
        durationMs: 1000,
        loop: true,
      });
      selectedClipId = currentAnimation().clips[currentAnimation().clips.length - 1]?.id || '';
      selectedTrackIndex = -1;
      selectedKeyframeIndex = -1;
      timelineTimeMs = 0;
      enterAnimateAuthoringMode();
      updateAnimationPreview();
      setStatus(`Added animation clip ${selectedClipId}. Animate mode is on.`);
      syncFieldsFromState();
      activateInspectorTab('anim');
      draw();
    });
  }

  function duplicateAnimationClip() {
    if (!selectedClipId) {
      setStatus('Create or select a clip first.');
      return;
    }
    withHistory('Duplicate animation clip', () => {
      const beforeIds = new Set(currentAnimation().clips.map((clip) => clip.id));
      state = core.duplicateAnimationClip(state, selectedClipId);
      const nextClip = currentAnimation().clips.find((clip) => !beforeIds.has(clip.id));
      selectedClipId = nextClip?.id || selectedClipId;
      selectedTrackIndex = 0;
      selectedKeyframeIndex = 0;
      timelineTimeMs = 0;
      setStatus(`Duplicated clip ${selectedClipId}.`);
      syncFieldsFromState();
      draw();
    });
  }

  function deleteAnimationClip() {
    if (!selectedClipId) {
      setStatus('No animation clip selected.');
      return;
    }
    withHistory('Delete animation clip', () => {
      const deleted = selectedClipId;
      state = core.deleteAnimationClip(state, selectedClipId);
      selectedClipId = '';
      selectedTrackIndex = -1;
      selectedKeyframeIndex = -1;
      timelineTimeMs = 0;
      stopTimelinePlayback();
      setStatus(`Deleted animation clip ${deleted}.`);
      syncFieldsFromState();
      draw();
    });
  }

  function updateSelectedClipFromFields() {
    const clip = getSelectedClip();
    if (!clip) {
      return;
    }
    state = core.updateAnimationClip(state, clip.id, {
      label: fields.animationClipLabel.value,
      durationMs: Number(fields.animationClipDuration.value),
      loop: fields.animationClipLoop.checked,
    });
    selectedClipId = getSelectedClip()?.id || clip.id;
    syncFieldsFromState();
    draw();
  }

  function addTrackFromSelection() {
    withHistory('Add animation track', () => {
      if (!selectedClipId) {
        state = core.addAnimationClip(state, {
          id: `clip_${currentAnimation().clips.length + 1}`,
          durationMs: 1000,
          loop: true,
        });
        selectedClipId = currentAnimation().clips[currentAnimation().clips.length - 1]?.id || '';
        selectedTrackIndex = -1;
        selectedKeyframeIndex = -1;
        timelineTimeMs = 0;
      }
      const clipId = selectedClipId || currentAnimation().clips[0]?.id || '';
      if (!clipId) {
        setStatus('Create a clip before adding tracks.');
        return;
      }
      enterAnimateAuthoringMode();
      const beforeCount = animationTimelineRows(getSelectedClip()).length;
      const pointRefs = core.getSelectedPointRefs(state);
      const pathRefs = core.getSelectedPathRefs(state);
      if (pointRefs.length) {
        state = core.upsertPointDeltaGraphKeys(
          state,
          clipId,
          pointRefs.map((ref) => ({ ref, value: { x: 0, y: 0 } })),
          {
            timeMs: snapTimelineTime(timelineTimeMs),
            interp: 'smooth',
          },
        );
      } else if (pathRefs.length) {
        const origin = animationCanvasOriginForState(buildEditorDisplayScene().displayState || state);
        state = core.upsertLoopTransformGraphKeys(state, clipId, pathRefs, {
          timeMs: snapTimelineTime(timelineTimeMs),
          interp: 'smooth',
          value: core.restTransformValue(),
        }, {
          origin,
        });
      } else {
        setStatus('Select one or more loops or points before adding graph rows.');
        return;
      }
      selectedClipId = clipId;
      selectedTrackIndex = Math.max(0, animationTimelineRows(getSelectedClip()).length - 1);
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      const afterCount = animationTimelineRows(getSelectedClip()).length;
      updateAnimationPreview();
      setStatus(afterCount > beforeCount ? `Added ${afterCount - beforeCount} graph row(s). Animate mode is on.` : 'Updated graph row rest key.');
      syncFieldsFromState();
      activateInspectorTab('anim');
      draw();
    });
  }

  function setRestKeyForSelection() {
    const pointRefs = core.getSelectedPointRefs(state);
    const pathRefs = core.getSelectedPathRefs(state);
    if (!pointRefs.length && !pathRefs.length) {
      setStatus('Select loops or points before setting a rest key.');
      return;
    }
    withHistory('Rest key selected', () => {
      enterAnimateAuthoringMode();
      const clipId = ensureActiveClipForAnimation();
      if (!clipId) {
        setStatus('Create or select a clip before setting rest keys.');
        return;
      }
      const timeOptions = graphKeyOptions();
      if (pointRefs.length) {
        state = core.upsertPointDeltaGraphKeys(
          state,
          clipId,
          pointRefs.map((ref) => ({ ref, value: { x: 0, y: 0 } })),
          timeOptions,
        );
        setStatus(`Rest-keyed ${pointRefs.length} point delta target(s) at ${Math.round(timeOptions.timeMs)}ms.`);
      } else {
        const origin = animationCanvasOriginForState(buildEditorDisplayScene().displayState || state);
        state = core.upsertLoopTransformGraphKeys(state, clipId, pathRefs, {
          ...timeOptions,
          value: core.restTransformValue(),
        }, {
          origin,
        });
        setStatus(`Rest-keyed ${pathRefs.length} loop transform target(s) at ${Math.round(timeOptions.timeMs)}ms.`);
      }
      selectedClipId = clipId;
      selectLatestAnimationRowAtPlayhead();
      updateAnimationPreview();
      syncFieldsFromState();
      activateInspectorTab('anim');
      draw();
    });
  }

  function selectAnimationClip(clipId) {
    discardAnimationPosePreview(false);
    selectedClipId = clipId || '';
    selectedTrackIndex = 0;
    selectedKeyframeIndex = 0;
    timelineTimeMs = 0;
    stopTimelinePlayback();
    syncFieldsFromState();
    draw();
  }

  function selectAnimationTrack(index) {
    discardAnimationPosePreview(false);
    selectedTrackIndex = parseIntegerSafe(index, -1);
    selectedKeyframeIndex = 0;
    syncFieldsFromState();
    draw();
  }

  function selectAnimationKeyframe(trackIndex, keyframeIndex) {
    selectedTrackIndex = parseIntegerSafe(trackIndex, selectedTrackIndex);
    selectedKeyframeIndex = parseIntegerSafe(keyframeIndex, selectedKeyframeIndex);
    const keyframe = getSelectedKeyframe();
    if (keyframe) {
      timelineTimeMs = Number(keyframe.timeMs) || 0;
    }
    syncFieldsFromState();
    draw();
  }

  function upsertKeyframeFromFields() {
    const clip = getSelectedClip();
    const row = getSelectedTimelineRow();
    if (!clip || !row) {
      setStatus('Add a clip and animation row before keyframing.');
      return;
    }
    withHistory('Set keyframe', () => {
      timelineTimeMs = snapTimelineTime(timelineTimeMs);
      if (row.kind === 'graph') {
        enterAnimateAuthoringMode();
        state = core.upsertGraphOutputKeyframe(state, clip.id, row.outputIndex, {
          timeMs: timelineTimeMs,
          interp: fields.keyframeEase.value,
          value: readKeyframeValueForRow(row),
        });
      } else {
        state = core.upsertTransformKeyframe(state, clip.id, row.trackIndex, {
          timeMs: timelineTimeMs,
          ease: fields.keyframeEase.value,
          value: readKeyframeValue(),
        });
      }
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      setStatus(`Keyframe set at ${Math.round(timelineTimeMs)}ms.`);
      syncFieldsFromState();
      draw();
    });
  }

  function setRestKeyframeAtPlayhead() {
    const clip = getSelectedClip();
    const row = getSelectedTimelineRow();
    if (!clip || !row) {
      setStatus('Add a clip and animation row before keyframing.');
      return;
    }
    withHistory('Set rest keyframe', () => {
      timelineTimeMs = snapTimelineTime(timelineTimeMs);
      if (row.kind === 'graph') {
        enterAnimateAuthoringMode();
        state = core.setRestGraphOutputKeyframe(state, clip.id, row.outputIndex, timelineTimeMs, {
          interp: fields.keyframeEase.value,
        });
      } else {
        state = core.setRestTransformKeyframe(state, clip.id, row.trackIndex, timelineTimeMs, {
          ease: fields.keyframeEase.value,
        });
      }
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      setStatus(`Rest key set at ${Math.round(timelineTimeMs)}ms.`);
      syncFieldsFromState();
      draw();
    });
  }

  function copySelectedKeyframeToPlayhead() {
    const clip = getSelectedClip();
    const row = getSelectedTimelineRow();
    if (!clip || !row || selectedKeyframeIndex < 0) {
      setStatus('Select a keyframe to copy first.');
      return;
    }
    withHistory('Copy keyframe', () => {
      timelineTimeMs = snapTimelineTime(timelineTimeMs);
      state = row.kind === 'graph'
        ? core.copyGraphOutputKeyframeToTime(state, clip.id, row.outputIndex, selectedKeyframeIndex, timelineTimeMs)
        : core.copyTransformKeyframeToTime(state, clip.id, row.trackIndex, selectedKeyframeIndex, timelineTimeMs);
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      setStatus(`Copied key to ${Math.round(timelineTimeMs)}ms.`);
      syncFieldsFromState();
      draw();
    });
  }

  function copyPreviousKeyframeToPlayhead() {
    const clip = getSelectedClip();
    const row = getSelectedTimelineRow();
    if (!clip || !row) {
      setStatus('Add a clip and animation row before copying keys.');
      return;
    }
    withHistory('Copy previous keyframe', () => {
      timelineTimeMs = snapTimelineTime(timelineTimeMs);
      const before = JSON.stringify(row.keyframes || []);
      state = row.kind === 'graph'
        ? core.copyPreviousGraphOutputKeyframeToTime(state, clip.id, row.outputIndex, timelineTimeMs)
        : core.copyPreviousTransformKeyframeToTime(state, clip.id, row.trackIndex, timelineTimeMs);
      const changed = before !== JSON.stringify(getSelectedTimelineRow()?.keyframes || []);
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      setStatus(changed ? `Copied previous key to ${Math.round(timelineTimeMs)}ms.` : 'No previous keyframe to copy.');
      syncFieldsFromState();
      draw();
    });
  }

  function deleteSelectedKeyframe() {
    const clip = getSelectedClip();
    const row = getSelectedTimelineRow();
    if (!clip || !row || selectedKeyframeIndex < 0) {
      setStatus('Select a keyframe first.');
      return;
    }
    withHistory('Delete keyframe', () => {
      state = row.kind === 'graph'
        ? core.deleteGraphOutputKeyframe(state, clip.id, row.outputIndex, selectedKeyframeIndex)
        : core.deleteTransformKeyframe(state, clip.id, row.trackIndex, selectedKeyframeIndex);
      selectedKeyframeIndex = Math.max(0, selectedKeyframeIndex - 1);
      setStatus('Deleted keyframe.');
      syncFieldsFromState();
      draw();
    });
  }

  function readKeyframeValue() {
    return {
      tx: Number(fields.keyframeTx.value) || 0,
      ty: Number(fields.keyframeTy.value) || 0,
      rotation: degreesToRadians(fields.keyframeRotation.value),
      sx: readScalePercent(fields.keyframeSx.value),
      sy: readScalePercent(fields.keyframeSy.value),
    };
  }

  function readKeyframeValueForRow(row) {
    const property = String(row?.property || '');
    if (property.startsWith('point.')) {
      return {
        x: Number(fields.keyframeTx.value) || 0,
        y: Number(fields.keyframeTy.value) || 0,
      };
    }
    if (property === 'shape.style.strokeWidth' || property === 'shape.opacity') {
      return Number(fields.keyframeTx.value) || 0;
    }
    if (property === 'shape.style.fill' || property === 'shape.style.stroke') {
      return fields.shapeFill.value || '#ffffff';
    }
    const existing = getSelectedKeyframe()?.value || {};
    return {
      ...readKeyframeValue(),
      skewX: Number(existing.skewX) || 0,
      skewY: Number(existing.skewY) || 0,
    };
  }

  function readPoseValue() {
    return {
      tx: Number(fields.poseTx.value) || 0,
      ty: Number(fields.poseTy.value) || 0,
      rotation: degreesToRadians(fields.poseRotation.value),
      sx: readScalePercent(fields.poseSx.value),
      sy: readScalePercent(fields.poseSy.value),
    };
  }

  function ensureActiveClipForAnimation() {
    if (!selectedClipId || !getSelectedClip()) {
      state = core.addAnimationClip(state, {
        id: `clip_${currentAnimation().clips.length + 1}`,
        durationMs: 1000,
        loop: true,
      });
      selectedClipId = currentAnimation().clips[currentAnimation().clips.length - 1]?.id || '';
      selectedTrackIndex = -1;
      selectedKeyframeIndex = -1;
      timelineTimeMs = 0;
    }
    return selectedClipId;
  }

  function graphKeyOptions() {
    return {
      timeMs: snapTimelineTime(timelineTimeMs),
      interp: fields.keyframeEase.value || 'smooth',
    };
  }

  function graphLoopTransformValue(ref, clipId, timeMs, origin) {
    return core.graphValueForTarget(
      state,
      clipId,
      'loop.transform',
      core.pathRefToAnimationTarget(state, ref),
      timeMs,
      { origin },
    );
  }

  function graphPointValue(ref, clipId, property, timeMs) {
    return core.graphValueForTarget(
      state,
      clipId,
      property,
      core.pointRefToAnimationTarget(state, ref),
      timeMs,
    );
  }

  function createLoopTransformBaseValues(refs, clipId, timeMs, origin) {
    return new Map(refs.map((ref) => [
      pointRefKey(ref),
      graphLoopTransformValue(ref, clipId, timeMs, origin),
    ]));
  }

  function createPointBaseValues(refs, clipId, property, timeMs) {
    return new Map(refs.map((ref) => [
      pointRefKey(ref),
      graphPointValue(ref, clipId, property, timeMs),
    ]));
  }

  function keyShapeStyleFromFields(property) {
    if (!isAnimateMode() || !animationAutoKey) {
      return false;
    }
    const shapeIndex = state.selectedShapeIndex;
    const clipId = ensureActiveClipForAnimation();
    const timeOptions = graphKeyOptions();
    if (property === 'fill') {
      state = core.upsertShapeStyleGraphKey(state, clipId, shapeIndex, 'fill', fields.shapeFill.value, timeOptions);
    } else if (property === 'stroke') {
      state = core.upsertShapeStyleGraphKey(state, clipId, shapeIndex, 'stroke', fields.shapeStroke.value, timeOptions);
    } else if (property === 'strokeWidth') {
      state = core.upsertShapeStyleGraphKey(state, clipId, shapeIndex, 'strokeWidth', Number(fields.shapeStrokeWidth.value), timeOptions);
    }
    selectedTrackIndex = Math.max(0, animationTimelineRows(getSelectedClip()).length - 1);
    selectedKeyframeIndex = keyframeIndexAtTime(timeOptions.timeMs);
    updateAnimationPreview();
    syncAnimationUi();
    updateStats();
    draw();
    setStatus(`Auto-keyed ${property} at ${Math.round(timeOptions.timeMs)}ms.`);
    return true;
  }

  function applyStyleFieldEdit(property) {
    if (isAnimateMode()) {
      const label = property === 'strokeWidth'
        ? 'Key stroke width'
        : property === 'stroke'
          ? 'Key stroke color'
          : 'Key fill color';
      withHistory(label, () => keyShapeStyleFromFields(property));
      return;
    }
    syncStateFromFields();
    syncShapeList();
    updateStats();
    syncRailSwatches();
    draw();
  }

  function selectLatestAnimationRowAtPlayhead() {
    const rows = animationTimelineRows(getSelectedClip());
    if (!rows.length) {
      selectedTrackIndex = -1;
      selectedKeyframeIndex = -1;
      return;
    }
    selectedTrackIndex = rows.length - 1;
    selectedKeyframeIndex = keyframeIndexAtTime(snapTimelineTime(timelineTimeMs));
  }

  function writePoseValue(value = {}) {
    fields.poseTx.value = formatCoordinate(value.tx ?? 0);
    fields.poseTy.value = formatCoordinate(value.ty ?? 0);
    fields.poseRotation.value = formatCoordinate(radiansToDegrees(value.rotation ?? 0));
    fields.poseSx.value = String(Math.round(Number(value.sx ?? 1) * 100));
    fields.poseSy.value = String(Math.round(Number(value.sy ?? 1) * 100));
  }

  function buildAnimationPosePreview(announce = true) {
    const clip = getSelectedClip();
    const track = getSelectedTrack();
    if (!clip || !track) {
      setStatus('Select an animation track before previewing a pose.');
      return;
    }
    discardOptimizationPreviewOnly();
    discardTransformPreview(false);
    discardAnimationPreview();
    animationPosePreview = core.previewAnimationTrackPose(state, clip.id, selectedTrackIndex, readPoseValue());
    const message = formatPoseStats(animationPosePreview.stats);
    fields.poseStatus.textContent = message;
    if (announce) {
      setStatus(message);
    }
    syncFieldsFromState();
    draw();
  }

  function setKeyFromPose() {
    const clip = getSelectedClip();
    const track = getSelectedTrack();
    if (!clip || !track) {
      setStatus('Select an animation track before setting a pose key.');
      return;
    }
    withHistory('Set pose keyframe', () => {
      timelineTimeMs = snapTimelineTime(timelineTimeMs);
      state = core.upsertTransformKeyframe(state, clip.id, selectedTrackIndex, {
        timeMs: timelineTimeMs,
        ease: fields.keyframeEase.value,
        value: readPoseValue(),
      });
      selectedKeyframeIndex = keyframeIndexAtTime(timelineTimeMs);
      setStatus(`Pose key set at ${Math.round(timelineTimeMs)}ms.`);
      syncFieldsFromState();
      draw();
    });
  }

  function loadSelectedKeyIntoPose() {
    const keyframe = getSelectedKeyframe();
    if (!keyframe) {
      setStatus('Select a keyframe before loading a pose.');
      return;
    }
    writePoseValue(keyframe.value || {});
    if (animationPosePreview) {
      buildAnimationPosePreview(false);
    }
    setStatus(`Loaded keyframe ${Math.round(Number(keyframe.timeMs) || 0)}ms into pose controls.`);
  }

  function clearAnimationPosePreview(announce = true) {
    discardAnimationPosePreview(false);
    fields.poseStatus.textContent = 'No pose preview.';
    if (announce) {
      setStatus('Animation pose preview cleared.');
    }
    updateAnimationPreview();
    syncFieldsFromState();
    draw();
  }

  function discardAnimationPosePreview(updateStatus = true) {
    animationPosePreview = null;
    if (fields.poseStatus && updateStatus) {
      fields.poseStatus.textContent = 'No pose preview.';
    }
  }

  function formatPoseStats(stats) {
    if (!stats?.targetCount) {
      return 'No animation pose target.';
    }
    const targetText = stats.targetCount === 1 ? '1 loop' : `${stats.targetCount} loops`;
    return `Pose preview: ${targetText} on track ${Number(stats.trackIndex) + 1}.`;
  }

  function keyframeIndexAtTime(timeMs) {
    const row = getSelectedTimelineRow();
    if (!row?.keyframes?.length) {
      return -1;
    }
    const roundedTime = Math.round(Number(timeMs) || 0);
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    row.keyframes.forEach((keyframe, index) => {
      const distance = Math.abs(Number(keyframe.timeMs) - roundedTime);
      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });
    return nearestDistance <= 1 ? nearestIndex : -1;
  }

  function updateSelectedBinding(bindClip) {
    withHistory(bindClip ? 'Bind animation clip' : 'Unbind animation clip', () => {
      const binding = fields.animationBindingSelect.value;
      state = core.updateAnimationBinding(state, binding, bindClip ? selectedClipId : '');
      setStatus(bindClip ? `Bound ${binding} to ${selectedClipId}.` : `Unbound ${binding}.`);
      syncFieldsFromState();
      draw();
    });
  }

  function setTimelineTime(timeMs, announce = false) {
    const clip = getSelectedClip();
    discardAnimationPosePreview(false);
    timelineTimeMs = snapTimelineTime(timeMs);
    updateAnimationPreview();
    syncTimelineUi();
    if (announce) {
      setStatus(`Timeline ${Math.round(timelineTimeMs)}ms.`);
    }
    draw();
  }

  function clampTimelineTime(timeMs, durationMs) {
    const duration = Math.max(0, Number(durationMs) || 0);
    return Math.min(duration, Math.max(0, Number(timeMs) || 0));
  }

  function snapTimelineTime(timeMs, forceSnap = timelineSnap) {
    const clip = getSelectedClip();
    return core.snapAnimationTimeToFrame(timeMs, {
      fps: timelineFps,
      snap: forceSnap,
      durationMs: clip?.durationMs || 0,
    });
  }

  function updateAnimationPreview() {
    if (animationPosePreview) {
      animationPreview = null;
      return;
    }
    if (!fields.timelinePreviewEnabled.checked || !selectedClipId) {
      animationPreview = null;
      return;
    }
    discardTransformPreview(false);
    const clip = getSelectedClip();
    animationPreview = clip?.graph?.outputs?.length
      ? core.evaluateGraphClip(state, selectedClipId, timelineTimeMs)
      : core.evaluateTransformClip(state, selectedClipId, timelineTimeMs);
  }

  function buildEditorDisplayScene() {
    return core.buildDisplayScene(state, {
      editorMode,
      clipId: selectedClipId,
      timeMs: timelineTimeMs,
      previewEnabled: Boolean(fields.timelinePreviewEnabled?.checked) && !animationPosePreview,
    });
  }

  function applySelectionFromDisplayState(displayState) {
    state = {
      ...state,
      selectedShapeIndex: displayState.selectedShapeIndex,
      selectedLoopIndex: displayState.selectedLoopIndex,
      selectedPointIndex: displayState.selectedPointIndex,
      selectedPaths: core.getSelectedPathRefs(displayState),
      selectedPoints: core.getSelectedPointRefs(displayState),
    };
  }

  function discardAnimationPreview() {
    animationPreview = null;
  }

  function toggleTimelinePlayback() {
    if (!getSelectedClip()) {
      setStatus('Create or select an animation clip first.');
      return;
    }
    timelinePlaying = !timelinePlaying;
    timelineLastTimestamp = 0;
    if (timelinePlaying) {
      scheduleTimelinePlayback();
      setStatus('Timeline playback started.');
    } else {
      setStatus('Timeline playback paused.');
    }
    syncTimelineUi();
  }

  function scheduleTimelinePlayback() {
    if (!timelinePlaying || timelineAnimationFrame) {
      return;
    }
    timelineAnimationFrame = requestAnimationFrame(stepTimelinePlayback);
  }

  function stepTimelinePlayback(timestamp) {
    timelineAnimationFrame = 0;
    if (!timelinePlaying) {
      return;
    }
    const clip = getSelectedClip();
    if (!clip) {
      stopTimelinePlayback();
      return;
    }
    const duration = Math.max(1, Number(clip.durationMs) || 1);
    const elapsed = timelineLastTimestamp ? timestamp - timelineLastTimestamp : 0;
    timelineLastTimestamp = timestamp;
    let nextTime = timelineTimeMs + elapsed;
    if (nextTime > duration) {
      if (clip.loop) {
        nextTime %= duration;
      } else {
        nextTime = duration;
        stopTimelinePlayback();
      }
    }
    timelineTimeMs = nextTime;
    updateAnimationPreview();
    syncTimelineUi();
    draw();
    scheduleTimelinePlayback();
  }

  function stopTimelinePlayback() {
    timelinePlaying = false;
    timelineLastTimestamp = 0;
    if (timelineAnimationFrame) {
      cancelAnimationFrame(timelineAnimationFrame);
      timelineAnimationFrame = 0;
    }
  }

  function parseIntegerSafe(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clearOptimizationPreview(announce = true) {
    discardOptimizationPreview();
    if (announce) {
      setStatus('Optimize preview cleared.');
    }
    draw();
  }

  function discardOptimizationPreview() {
    discardOptimizationPreviewOnly();
    discardTransformPreview();
  }

  function discardOptimizationPreviewOnly() {
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
    discardTransformPreview(false);
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
    if (blockAnimateRestOnlyAction('apply rest path optimization', 'Switch to Edit Rest to optimize rest paths.')) {
      return;
    }
    withHistory('Optimize path', () => {
      syncStateFromFields();
      discardTransformPreview(false);
      const result = core.applySelectedLoopOptimization(state, readOptimizationOptions());
      state = result.state;
      optimizationPreview = null;
      const summary = formatOptimizationStats(result.stats);
      fields.optimizeStatus.textContent = summary;
      setStatus(`Optimize applied: ${summary}.`);
      syncFieldsFromState();
      draw();
    });
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

  function formatDegrees(radians) {
    const degrees = Math.round(radiansToDegrees(radians) * 10) / 10;
    return `${Number.isInteger(degrees) ? degrees.toFixed(0) : degrees.toFixed(1)}deg`;
  }

  function formatCoordinate(value) {
    const rounded = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function formatTransformStats(stats, prefix = 'Transform') {
    if (!stats || !stats.targetCount) {
      return 'No transform target';
    }
    const target = stats.target === 'points'
      ? `${stats.targetCount} point${stats.targetCount === 1 ? '' : 's'}`
      : `${stats.targetCount} path${stats.targetCount === 1 ? '' : 's'}`;
    return `${prefix}: ${target} | scale ${formatScale(stats.scaleX)} x ${formatScale(stats.scaleY)} | rotate ${formatDegrees(stats.rotation)}`;
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
    if (isAnimateMode()) {
      return;
    }
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
    const displayScene = buildEditorDisplayScene();
    drawShapes(displayScene);
    drawSelectedBounds(displayScene);
    drawAnimationPreview(displayScene);
    drawAnimationPosePreview();
    drawTransformPreview();
    drawOptimizationPreview();
    drawTransformOriginMarker();
    drawSelectedHandles(displayScene);
    drawLassoPreview();
    drawBrushCursor();

    ctx.restore();
  }

  function drawCanvasBounds() {
    ctx.strokeStyle = 'rgba(72, 229, 255, 0.55)';
    ctx.lineWidth = 1 / state.viewport.scale;
    ctx.strokeRect(0, 0, state.canvas.width, state.canvas.height);
  }

  function drawShapes(displayScene = buildEditorDisplayScene()) {
    const displayState = displayScene.displayState || state;
    const drawAllPointMarkers = countPackPoints() <= FULL_POINT_MARKER_LIMIT;
    const sorted = displayState.shapes
      .map((shape, index) => ({ shape, index }))
      .sort((a, b) => {
        const zSort = Number(a.shape.z) - Number(b.shape.z);
        return zSort === 0 ? a.index - b.index : zSort;
      });
    for (const item of sorted) {
      drawShape(item.shape, item.index, drawAllPointMarkers, displayScene);
    }
  }

  function drawShape(shape, shapeIndex, drawAllPointMarkers, displayScene = null) {
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

    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, Number(displayScene?.shapeOpacity?.[shapeIndex] ?? 1)));
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
    ctx.restore();

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

  function drawSelectedBounds(displayScene = buildEditorDisplayScene()) {
    if (!(activeToolMode === TOOL_MODES.path || activeToolMode === TOOL_MODES.move || selectFillDown)) {
      return;
    }
    const bounds = core.selectedPathBounds(displayScene.displayState || state);
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

  function drawTransformPreview() {
    const previews = transformPreview?.previews || [];
    if (!previews.length) {
      return;
    }
    ctx.save();
    for (const preview of previews) {
      if (!preview?.originalLoop || !preview?.loop) {
        continue;
      }
      ctx.setLineDash([3 / state.viewport.scale, 5 / state.viewport.scale]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1 / state.viewport.scale;
      ctx.stroke(buildLoopPath(preview.originalLoop));

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(84, 216, 255, 0.78)';
      ctx.lineWidth = 1.5 / state.viewport.scale;
      ctx.stroke(buildLoopPath(preview.loop));
    }
    ctx.restore();
  }

  function drawAnimationPreview(displayScene = buildEditorDisplayScene()) {
    const previews = displayScene?.source?.mode === 'rest' ? [] : displayScene.previews || [];
    if (!previews.length) {
      return;
    }
    ctx.save();
    for (const preview of previews) {
      if (preview.originalLoop) {
        ctx.setLineDash([3 / state.viewport.scale, 5 / state.viewport.scale]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1 / state.viewport.scale;
        ctx.stroke(buildLoopPath(preview.originalLoop));
      }
    }
    ctx.restore();
  }

  function drawAnimationPosePreview() {
    const previews = animationPosePreview?.previews || [];
    if (!previews.length) {
      return;
    }
    ctx.save();
    for (const preview of previews) {
      if (!preview?.loop || !preview?.originalLoop) {
        continue;
      }
      ctx.setLineDash([3 / state.viewport.scale, 5 / state.viewport.scale]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.lineWidth = 1 / state.viewport.scale;
      ctx.stroke(buildLoopPath(preview.originalLoop));

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(84, 216, 255, 0.82)';
      ctx.lineWidth = 1.5 / state.viewport.scale;
      ctx.stroke(buildLoopPath(preview.loop));
    }
    ctx.restore();
  }

  function drawTransformOriginMarker() {
    const origin = transformOriginPickActive && hoverCanvasPoint
      ? hoverCanvasPoint
      : transformPreview?.stats?.origin || (transformOriginPickActive ? readTransformOriginMarkerPoint() : null);
    if (!origin) {
      return;
    }
    const radius = 5 / state.viewport.scale;
    const arm = 9 / state.viewport.scale;
    ctx.save();
    ctx.strokeStyle = transformOriginPickActive
      ? 'rgba(84, 216, 255, 0.82)'
      : 'rgba(215, 251, 255, 0.48)';
    ctx.lineWidth = 1 / state.viewport.scale;
    ctx.setLineDash([2 / state.viewport.scale, 3 / state.viewport.scale]);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
    ctx.moveTo(origin.x - arm, origin.y);
    ctx.lineTo(origin.x + arm, origin.y);
    ctx.moveTo(origin.x, origin.y - arm);
    ctx.lineTo(origin.x, origin.y + arm);
    ctx.stroke();
    ctx.restore();
  }

  function readTransformOriginMarkerPoint() {
    const x = Number(fields.transformOriginX.value);
    const y = Number(fields.transformOriginY.value);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  function drawSelectedHandles(displayScene = buildEditorDisplayScene()) {
    const loop = core.getSelectedLoop(displayScene.displayState || state);
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

  function findFilledPathHit(canvasPoint, displayScene = buildEditorDisplayScene(), options = {}) {
    syncHitCanvasSize();
    const candidates = [];
    const displayState = displayScene.displayState || state;
    const preferSelected = Boolean(options.preferSelected);
    displayState.shapes.forEach((shape, shapeIndex) => {
      shape.loops.forEach((loop, loopIndex) => {
        if (!isFillSelectTarget(loop)) {
          return;
        }
        candidates.push({
          shape: state.shapes[shapeIndex] || shape,
          displayShape: shape,
          shapeIndex,
          loop,
          loopIndex,
          selected: core.isPathSelected(state, shapeIndex, loopIndex),
        });
      });
    });
    candidates.sort((a, b) => {
      if (preferSelected && a.selected !== b.selected) {
        return a.selected ? -1 : 1;
      }
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

  function beginAnimateInteraction(label) {
    if (!isAnimateMode()) {
      return false;
    }
    if (!animationAutoKey) {
      cancelHistoryInteraction();
      setStatus('Auto Key is off. Turn it on to write animation keys from canvas edits.');
      return false;
    }
    const clipId = ensureActiveClipForAnimation();
    if (!clipId) {
      setStatus('Create or select a clip before animating.');
      return false;
    }
    beginHistoryInteraction(label);
    return true;
  }

  function keyAnimatedPathMove() {
    if (!animationDrag?.refs?.length) {
      return;
    }
    const timeOptions = graphKeyOptions();
    for (const ref of animationDrag.refs) {
      const base = animationDrag.baseValues?.get(pointRefKey(ref)) || core.restTransformValue();
      state = core.upsertLoopTransformGraphKeys(state, animationDrag.clipId, [ref], {
        timeMs: timeOptions.timeMs,
        interp: timeOptions.interp,
        value: {
          ...base,
          tx: (Number(base.tx) || 0) + animationDrag.totalDx,
          ty: (Number(base.ty) || 0) + animationDrag.totalDy,
        },
      }, {
        origin: animationDrag.origin || animationCanvasOriginForState(),
      });
    }
    markHistoryInteractionDirty();
    selectLatestAnimationRowAtPlayhead();
    updateAnimationPreview();
  }

  function keyAnimatedPointMove() {
    if (!animationDrag?.refs?.length) {
      return;
    }
    const timeOptions = graphKeyOptions();
    state = core.upsertPointDeltaGraphKeys(
      state,
      animationDrag.clipId,
      animationDrag.refs.map((ref) => ({
        ref,
        value: {
          x: (animationDrag.baseValues?.get(pointRefKey(ref))?.x || 0) + animationDrag.totalDx,
          y: (animationDrag.baseValues?.get(pointRefKey(ref))?.y || 0) + animationDrag.totalDy,
        },
      })),
      timeOptions,
    );
    markHistoryInteractionDirty();
    selectLatestAnimationRowAtPlayhead();
    updateAnimationPreview();
  }

  function keyAnimatedHandleMove(canvasPoint) {
    const ref = animationDrag?.ref;
    if (!ref) {
      return;
    }
    if (!animationDrag.startCanvasPoint) {
      return;
    }
    const base = animationDrag.baseValue || { x: 0, y: 0 };
    const delta = {
      x: canvasPoint.x - animationDrag.startCanvasPoint.x,
      y: canvasPoint.y - animationDrag.startCanvasPoint.y,
    };
    state = core.upsertPointHandleDeltaGraphKey(
      state,
      animationDrag.clipId,
      ref,
      animationDrag.handleName,
      {
        ...graphKeyOptions(),
        value: {
          x: (Number(base.x) || 0) + delta.x,
          y: (Number(base.y) || 0) + delta.y,
        },
      },
    );
    markHistoryInteractionDirty();
    selectLatestAnimationRowAtPlayhead();
    updateAnimationPreview();
  }

  function keyAnimatedBrushStroke(delta, center) {
    const timeOptions = graphKeyOptions();
    const displayScene = buildEditorDisplayScene();
    const increments = core.brushPointDeltas(displayScene.displayState || state, {
      center,
      delta,
      ...readBrushOptions(),
    });
    if (!increments.length) {
      return;
    }
    for (const item of increments) {
      const key = pointRefKey(item.ref);
      const previous = animationBrushDeltas.get(key) || {
        ref: item.ref,
        value: graphPointValue(item.ref, animationDrag.clipId, 'point.positionDelta', timeOptions.timeMs),
      };
      previous.value = {
        x: previous.value.x + item.value.x,
        y: previous.value.y + item.value.y,
      };
      animationBrushDeltas.set(key, previous);
    }
    state = core.upsertPointDeltaGraphKeys(
      state,
      animationDrag.clipId,
      Array.from(animationBrushDeltas.values()),
      timeOptions,
    );
    brushStrokeStats.affectedPointCount = Math.max(brushStrokeStats.affectedPointCount, animationBrushDeltas.size);
    brushStrokeStats.maxDisplacement = Math.max(
      brushStrokeStats.maxDisplacement,
      ...Array.from(animationBrushDeltas.values()).map((item) => Math.hypot(item.value.x, item.value.y)),
    );
    markHistoryInteractionDirty();
    selectLatestAnimationRowAtPlayhead();
    updateAnimationPreview();
  }

  function pointRefKey(ref) {
    return `${ref.shapeIndex}:${ref.loopIndex}:${ref.pointIndex}`;
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
    withHistory('Nudge selection', () => {
      const step = event.shiftKey ? 10 : 1;
      syncStateFromFields();
      discardOptimizationPreview();
      const moveDelta = {
        dx: delta.dx * step,
        dy: delta.dy * step,
      };
      if (isAnimateMode()) {
        if (!animationAutoKey) {
          setStatus('Auto Key is off. Turn it on to nudge animation keys.');
          return;
        }
        const clipId = ensureActiveClipForAnimation();
        if (selectedPointCount) {
          state = core.upsertPointDeltaGraphKeys(
            state,
            clipId,
            core.getSelectedPointRefs(state).map((ref) => ({ ref, value: { x: moveDelta.dx, y: moveDelta.dy } })),
            graphKeyOptions(),
          );
          setStatus(`Keyed ${selectedPointCount} point nudge(s) by ${step}px.`);
        } else {
          state = core.upsertLoopTransformGraphKeys(state, clipId, core.getSelectedPathRefs(state), {
            ...graphKeyOptions(),
            value: { tx: moveDelta.dx, ty: moveDelta.dy, rotation: 0, sx: 1, sy: 1 },
          }, { origin: animationCanvasOriginForState(buildEditorDisplayScene().displayState || state) });
          setStatus(`Keyed ${selectedCount} loop nudge(s) by ${step}px.`);
        }
        selectLatestAnimationRowAtPlayhead();
        updateAnimationPreview();
      } else if (selectedPointCount) {
        state = core.moveSelectedPoints(state, moveDelta);
        setStatus(`Nudged ${selectedPointCount} selected points by ${step}px.`);
      } else {
        state = core.moveSelectedPaths(state, moveDelta);
        setStatus(`Nudged ${selectedCount} selected paths by ${step}px.`);
      }
      syncFieldsFromState();
      draw();
    });
    return true;
  }

  function applyLoopCleanup(label, updater) {
    if (blockAnimateRestOnlyAction(label.toLowerCase(), `Switch to Edit Rest to ${label.toLowerCase()} on rest loops.`)) {
      return;
    }
    withHistory(label, () => {
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
    });
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
    lassoSelectPaths = Boolean(selectFillDown);
    pointerMoved = false;
    const target = lassoSelectPaths ? 'filled paths' : 'points in selected paths';
    setStatus(`${readLassoMode() === 'freehand' ? 'Freehand' : 'Box'} lasso: drag around ${target}.`);
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
    const displayScene = buildEditorDisplayScene();
    const selectionState = displayScene.displayState || state;
    const pathLasso = lassoSelectPaths;
    const before = pathLasso
      ? core.getSelectedPathRefs(state).length
      : core.getSelectedPointRefs(state).length;
    let nextDisplayState;
    if (readLassoMode() === 'freehand') {
      const polygon = lassoPoints.length >= 3 ? lassoPoints : [
        lassoStartCanvasPoint,
        lassoCurrentCanvasPoint,
        lassoStartCanvasPoint,
      ];
      nextDisplayState = pathLasso
        ? core.selectPathsInPolygon(selectionState, polygon, { toggle: lassoToggleSelection, filledOnly: true })
        : core.selectPointsInPolygon(selectionState, polygon, { toggle: lassoToggleSelection });
    } else {
      const rect = {
        x1: lassoStartCanvasPoint.x,
        y1: lassoStartCanvasPoint.y,
        x2: lassoCurrentCanvasPoint.x,
        y2: lassoCurrentCanvasPoint.y,
      };
      nextDisplayState = pathLasso
        ? core.selectPathsInRect(selectionState, rect, { toggle: lassoToggleSelection, filledOnly: true })
        : core.selectPointsInRect(selectionState, rect, { toggle: lassoToggleSelection });
    }
    applySelectionFromDisplayState(nextDisplayState);
    const after = pathLasso
      ? core.getSelectedPathRefs(state).length
      : core.getSelectedPointRefs(state).length;
    setStatus(
      lassoToggleSelection
        ? `${pathLasso ? 'Path' : 'Point'} lasso toggled selection: ${before} -> ${after} ${pathLasso ? 'paths' : 'points'}.`
        : `${pathLasso ? 'Path' : 'Point'} lasso selected ${after} ${pathLasso ? 'paths' : 'points'}.`,
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
    withHistory(target === 'stroke' ? 'Sample stroke color' : 'Sample fill color', () => {
      const applyToStroke = target === 'stroke';
      if (isAnimateMode()) {
        if (applyToStroke) {
          fields.shapeStroke.value = color;
          keyShapeStyleFromFields('stroke');
        } else {
          fields.shapeFill.value = color;
          keyShapeStyleFromFields('fill');
        }
      } else {
        state = core.updateSelectedShapeFields(state, {
          style: applyToStroke ? { stroke: color } : { fill: color },
        });
      }
      setStatus(`${applyToStroke ? 'Stroke' : 'Fill'} sampled ${color} from source image.`);
      if (!isAnimateMode()) {
        syncFieldsFromState();
      }
      draw();
    });
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
    if (transformOriginPickActive) {
      fields.transformOriginMode.value = 'custom';
      setCustomTransformOrigin(canvasPoint);
      transformOriginPickActive = false;
      updateTransformPreviewFromControls();
      setStatus(`Transform origin set to ${formatCoordinate(canvasPoint.x)}, ${formatCoordinate(canvasPoint.y)}.`);
      syncFieldsFromState();
      draw();
      return;
    }
    discardOptimizationPreview();
    if (colorPickTarget) {
      if (applySampledColor(sampleSourceImageColor(canvasPoint), colorPickTarget)) {
        clearColorPick();
      }
      return;
    }

    if (activeToolMode === TOOL_MODES.lasso) {
      startLassoSelection(canvasPoint, event.shiftKey);
      return;
    }

    if (isPathSelectActive()) {
      selectFilledPathAt(canvasPoint, event.shiftKey);
      return;
    }

    const displayScene = buildEditorDisplayScene();
    const hitState = displayScene.displayState || state;

    if (activeToolMode === TOOL_MODES.brush) {
      const brushOptions = readBrushOptions();
      const refs = brushOptions.selectedOnly
        ? core.getLoopEditPathRefs(state)
        : state.shapes.flatMap((shape) => shape.loops);
      if (isAnimateMode()) {
        if (!beginAnimateInteraction('Animate brush pose')) {
          return;
        }
        dragMode = 'animate-brush';
        dragCanvasPoint = canvasPoint;
        hoverCanvasPoint = canvasPoint;
        animationDrag = { clipId: selectedClipId };
        animationBrushDeltas = new Map();
        brushStrokeStats = createBrushStrokeStats(refs.length);
        pointerMoved = false;
        setStatus('Brush pose ready: drag to key sparse point deltas.');
        syncFieldsFromState();
        draw();
        return;
      }
      if (!beginEditorCommandInteraction('interaction.brush', 'Brush stroke')) {
        return;
      }
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
      const pointHit = core.nearestPointHit(hitState, canvasPoint, hitRadiusCanvas());
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
        if (!beginEditorCommandInteraction('interaction.movePoints', 'Move points')) {
          return;
        }
        if (!core.isPointSelected(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex)) {
          state = core.selectPointRef(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex);
        }
        if (isAnimateMode()) {
          if (!beginAnimateInteraction('Animate point pose')) {
            return;
          }
          const refs = core.getSelectedPointRefs(state);
          const timeOptions = graphKeyOptions();
          dragMode = 'animate-point-move';
          animationDrag = {
            clipId: selectedClipId,
            refs,
            baseValues: createPointBaseValues(refs, selectedClipId, 'point.positionDelta', timeOptions.timeMs),
            totalDx: 0,
            totalDy: 0,
          };
          dragCanvasPoint = canvasPoint;
          pointerMoved = false;
          setStatus('Drag to key selected point deltas.');
          syncFieldsFromState();
          draw();
          return;
        }
        dragMode = 'point-move';
        dragCanvasPoint = canvasPoint;
        pointerMoved = false;
        setStatus('Drag to move selected points.');
        syncFieldsFromState();
        draw();
        return;
      }
      const pathHit = findFilledPathHit(canvasPoint, displayScene, { preferSelected: true });
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
      if (!beginEditorCommandInteraction('interaction.movePaths', 'Move paths')) {
        return;
      }
      if (!core.isPathSelected(state, pathHit.shapeIndex, pathHit.loopIndex)) {
        state = core.selectPath(state, pathHit.shapeIndex, pathHit.loopIndex);
      }
      if (isAnimateMode()) {
        if (!beginAnimateInteraction('Animate loop pose')) {
          return;
        }
        const refs = core.getSelectedPathRefs(state);
        const timeOptions = graphKeyOptions();
        const origin = animationCanvasOriginForState(displayScene.displayState || state);
        dragMode = 'animate-path-move';
        animationDrag = {
          clipId: selectedClipId,
          refs,
          origin,
          baseValues: createLoopTransformBaseValues(refs, selectedClipId, timeOptions.timeMs, origin),
          totalDx: 0,
          totalDy: 0,
        };
        dragCanvasPoint = canvasPoint;
        pointerMoved = false;
        setStatus('Drag to key selected loop transforms.');
        syncFieldsFromState();
        draw();
        return;
      }
      dragMode = 'path-move';
      dragCanvasPoint = canvasPoint;
      pointerMoved = false;
      setStatus('Drag to move selected paths.');
      syncFieldsFromState();
      draw();
      return;
    }

    const pointHitForToggle = core.nearestPointHit(hitState, canvasPoint, hitRadiusCanvas());
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

    const handleHit = core.nearestHandleHit(hitState, canvasPoint, hitRadiusCanvas());
    if (handleHit) {
      if (!beginEditorCommandInteraction('interaction.moveHandle', 'Move handle')) {
        return;
      }
      state = core.selectPoint(state, handleHit.pointIndex);
      if (isAnimateMode()) {
        if (!beginAnimateInteraction('Animate handle pose')) {
          return;
        }
        dragMode = 'animate-handle';
        const ref = {
          shapeIndex: state.selectedShapeIndex,
          loopIndex: state.selectedLoopIndex,
          pointIndex: handleHit.pointIndex,
        };
        const property = handleHit.handleName === 'inHandle' ? 'point.inHandleDelta' : 'point.outHandleDelta';
        animationDrag = {
          clipId: selectedClipId,
          ref,
          handleName: handleHit.handleName,
          startCanvasPoint: canvasPoint,
          baseValue: graphPointValue(ref, selectedClipId, property, graphKeyOptions().timeMs),
        };
        dragPointIndex = handleHit.pointIndex;
        dragHandleName = handleHit.handleName;
        pointerMoved = false;
        syncFieldsFromState();
        draw();
        return;
      }
      dragMode = 'handle';
      dragPointIndex = handleHit.pointIndex;
      dragHandleName = handleHit.handleName;
      pointerMoved = false;
      syncFieldsFromState();
      draw();
      return;
    }

    const pointHit = core.nearestPointHit(hitState, canvasPoint, hitRadiusCanvas());
    if (pointHit) {
      if (!beginEditorCommandInteraction(event.altKey ? 'interaction.editHandle' : 'interaction.movePoints', event.altKey ? 'Edit handle' : 'Move point')) {
        return;
      }
      state = core.selectPointRef(state, pointHit.shapeIndex, pointHit.loopIndex, pointHit.pointIndex);
      if (event.altKey) {
        if (isAnimateMode()) {
          if (!beginAnimateInteraction('Animate out handle pose')) {
            return;
          }
          dragMode = 'animate-handle';
          const ref = {
            shapeIndex: pointHit.shapeIndex,
            loopIndex: pointHit.loopIndex,
            pointIndex: pointHit.pointIndex,
          };
          animationDrag = {
            clipId: selectedClipId,
            ref,
            handleName: 'outHandle',
            startCanvasPoint: canvasPoint,
            baseValue: graphPointValue(ref, selectedClipId, 'point.outHandleDelta', graphKeyOptions().timeMs),
          };
          dragPointIndex = pointHit.pointIndex;
          dragHandleName = 'outHandle';
          pointerMoved = false;
          setStatus('Alt-drag to key this out handle.');
          syncFieldsFromState();
          draw();
          return;
        }
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
      if (isAnimateMode()) {
        if (!beginAnimateInteraction('Animate point pose')) {
          return;
        }
        const refs = core.getSelectedPointRefs(state);
        const timeOptions = graphKeyOptions();
        dragMode = 'animate-point-move';
        animationDrag = {
          clipId: selectedClipId,
          refs,
          baseValues: createPointBaseValues(refs, selectedClipId, 'point.positionDelta', timeOptions.timeMs),
          totalDx: 0,
          totalDy: 0,
        };
        dragCanvasPoint = canvasPoint;
        pointerMoved = false;
        setStatus('Drag to key selected point deltas.');
        syncFieldsFromState();
        draw();
        return;
      }
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
    if (isAnimateMode()) {
      setStatus('Switch to Edit Rest to add new points. Animate mode keys existing loops, points, handles, and style.');
      cancelHistoryInteraction();
      return;
    }
    if (!loop || loop.closed) {
      setStatus('Selected loop is closed. Open it or create another loop.');
      return;
    }
    if (!beginEditorCommandInteraction('interaction.addPoint', 'Add point')) {
      return;
    }
    state = core.addPoint(state, canvasPoint);
    markHistoryInteractionDirty();
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
      if (activeToolMode === TOOL_MODES.brush || transformOriginPickActive) {
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
    } else if (dragMode === 'animate-path-move') {
      if (dragCanvasPoint) {
        const delta = {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        };
        animationDrag.totalDx += delta.dx;
        animationDrag.totalDy += delta.dy;
        keyAnimatedPathMove();
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'animate-point-move') {
      if (dragCanvasPoint) {
        const delta = {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        };
        animationDrag.totalDx += delta.dx;
        animationDrag.totalDy += delta.dy;
        keyAnimatedPointMove();
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'animate-handle') {
      keyAnimatedHandleMove(canvasPoint);
      activePointer = nextScreen;
    } else if (dragMode === 'path-move') {
      if (dragCanvasPoint) {
        state = core.moveSelectedPaths(state, {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        });
        markHistoryInteractionDirty();
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'point-move') {
      if (dragCanvasPoint) {
        state = core.moveSelectedPoints(state, {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        });
        markHistoryInteractionDirty();
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
          markHistoryInteractionDirty();
        }
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'animate-brush') {
      if (dragCanvasPoint) {
        const delta = {
          dx: canvasPoint.x - dragCanvasPoint.x,
          dy: canvasPoint.y - dragCanvasPoint.y,
        };
        if (Math.hypot(delta.dx, delta.dy) > 0.001) {
          keyAnimatedBrushStroke(delta, dragCanvasPoint);
          pointerMoved = true;
        }
        dragCanvasPoint = canvasPoint;
      }
      activePointer = nextScreen;
    } else if (dragMode === 'maybe-close') {
      if (pointerMoved) {
        dragMode = 'point';
        state = core.movePoint(state, dragPointIndex, canvasPoint);
        markHistoryInteractionDirty();
      }
    } else if (dragMode === 'point') {
      state = core.movePoint(state, dragPointIndex, canvasPoint);
      markHistoryInteractionDirty();
    } else if (dragMode === 'handle') {
      state = core.movePointHandle(state, dragPointIndex, dragHandleName, canvasPoint);
      markHistoryInteractionDirty();
    } else if (dragMode === 'alt-out-handle' && pointerMoved) {
      state = core.createPointOutHandle(state, dragPointIndex, canvasPoint);
      markHistoryInteractionDirty();
    } else if (dragMode === 'new-handle' && pointerMoved) {
      state = core.movePointHandle(state, dragPointIndex, 'outHandle', canvasPoint);
      dragHandleName = 'outHandle';
      markHistoryInteractionDirty();
    }
    updateStats();
    requestDraw();
  }

  function handlePointerUp(event) {
    if (event.pointerId != null) {
      canvas.releasePointerCapture(event.pointerId);
    }
    const interaction = historyInteraction;
    if (dragMode === 'maybe-close' && !pointerMoved) {
      state = core.closeLoop(state);
      markHistoryInteractionDirty();
      setStatus('Loop closed.');
    } else if (dragMode === 'path-move' && pointerMoved) {
      setStatus(`Moved ${core.getSelectedPathRefs(state).length} selected paths.`);
    } else if (dragMode === 'point-move' && pointerMoved) {
      setStatus(`Moved ${core.getSelectedPointRefs(state).length} selected points.`);
    } else if (dragMode === 'animate-path-move' && pointerMoved) {
      setStatus(`Keyed ${animationDrag?.refs?.length || 0} loop transform target(s).`);
    } else if (dragMode === 'animate-point-move' && pointerMoved) {
      setStatus(`Keyed ${animationDrag?.refs?.length || 0} point delta target(s).`);
    } else if (dragMode === 'animate-handle' && pointerMoved) {
      setStatus('Keyed handle delta.');
    } else if (dragMode === 'lasso') {
      finishLassoSelection();
    } else if (dragMode === 'brush') {
      setStatus(pointerMoved ? formatBrushStats(brushStrokeStats) : 'Brush stroke canceled.');
    } else if (dragMode === 'animate-brush') {
      setStatus(pointerMoved ? `Keyed brush deltas for ${animationBrushDeltas.size} points.` : 'Brush pose canceled.');
    }
    if (interaction?.dirty || historyInteraction?.dirty) {
      commitHistoryInteraction();
    } else {
      cancelHistoryInteraction();
    }
    activePointer = null;
    dragMode = null;
    dragCanvasPoint = null;
    dragPointIndex = -1;
    dragHandleName = null;
    animationDrag = null;
    animationBrushDeltas = new Map();
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

  function handleTimelinePointerDown(event) {
    if (!getSelectedClip()) {
      setStatus('Create or select an animation clip first.');
      return;
    }
    const keyframeNode = event.target.closest?.('.timeline-keyframe');
    if (keyframeNode) {
      if (!beginEditorCommandInteraction('interaction.moveKeyframe', 'Move keyframe')) {
        return;
      }
      selectedTrackIndex = parseIntegerSafe(keyframeNode.dataset.trackIndex, -1);
      selectedKeyframeIndex = parseIntegerSafe(keyframeNode.dataset.keyframeIndex, -1);
      const keyframe = getSelectedKeyframe();
      if (keyframe) {
        timelineTimeMs = Number(keyframe.timeMs) || 0;
      }
      timelineDragMode = 'keyframe';
      fields.timelineTrack.setPointerCapture(event.pointerId);
      syncFieldsFromState();
      draw();
      return;
    }
    const rowLabelNode = event.target.closest?.('.timeline-row-label');
    if (rowLabelNode) {
      selectAnimationTrack(rowLabelNode.dataset.trackIndex);
      return;
    }
    const rowNode = event.target.closest?.('.timeline-row');
    if (rowNode) {
      selectedTrackIndex = parseIntegerSafe(rowNode.dataset.trackIndex, selectedTrackIndex);
      selectedKeyframeIndex = clampUiIndex(selectedKeyframeIndex, getSelectedTimelineRow()?.keyframes?.length || 0);
    }
    timelineDragMode = 'scrub';
    fields.timelineTrack.setPointerCapture(event.pointerId);
    setTimelineTime(timeFromTimelineClientX(event.clientX), true);
  }

  function handleTimelinePointerMove(event) {
    if (!timelineDragMode) {
      return;
    }
    const clip = getSelectedClip();
    if (!clip) {
      return;
    }
    const nextTime = timeFromTimelineClientX(event.clientX);
    if (timelineDragMode === 'keyframe') {
      const row = getSelectedTimelineRow();
      state = row?.kind === 'graph'
        ? core.moveGraphOutputKeyframe(state, clip.id, row.outputIndex, selectedKeyframeIndex, nextTime)
        : core.moveTransformKeyframe(state, clip.id, row?.trackIndex ?? selectedTrackIndex, selectedKeyframeIndex, nextTime);
      selectedKeyframeIndex = nearestKeyframeIndex(selectedTrackIndex, nextTime);
      timelineTimeMs = clampTimelineTime(nextTime, clip.durationMs);
      markHistoryInteractionDirty();
      syncFieldsFromState();
      draw();
      return;
    }
    setTimelineTime(nextTime);
  }

  function handleTimelinePointerUp(event) {
    if (!timelineDragMode) {
      return;
    }
    if (event.pointerId != null) {
      fields.timelineTrack.releasePointerCapture(event.pointerId);
    }
    const mode = timelineDragMode;
    timelineDragMode = null;
    if (mode === 'keyframe' && historyInteraction?.dirty) {
      commitEditorCommandInteraction('interaction.moveKeyframe', 'Move keyframe');
    } else if (mode === 'keyframe') {
      cancelHistoryInteraction();
    }
    setStatus(mode === 'keyframe' ? `Keyframe moved to ${Math.round(timelineTimeMs)}ms.` : `Timeline ${Math.round(timelineTimeMs)}ms.`);
  }

  function timeFromTimelineClientX(clientX) {
    const clip = getSelectedClip();
    const duration = Math.max(0, Number(clip?.durationMs) || 0);
    const rect = timelineTimeAreaRect();
    if (!duration || rect.width <= 0) {
      return 0;
    }
    return snapTimelineTime(clampTimelineTime(((clientX - rect.left) / rect.width) * duration, duration));
  }

  function timelineTimeAreaRect() {
    const rect = fields.timelineTrack.getBoundingClientRect();
    const labelWidth = timelineLabelWidth();
    return {
      left: rect.left + labelWidth,
      right: rect.right,
      width: Math.max(1, rect.width - labelWidth),
    };
  }

  function timelineLabelWidth() {
    const style = getComputedStyle(fields.timelineTrack);
    const raw = Number.parseFloat(style.getPropertyValue('--timeline-label-width'));
    return Number.isFinite(raw) ? raw : 174;
  }

  function nearestKeyframeIndex(trackIndex, timeMs) {
    const clip = getSelectedClip();
    const row = animationTimelineRows(clip)[trackIndex];
    if (!row?.keyframes?.length) {
      return -1;
    }
    let bestIndex = 0;
    let bestDistance = Infinity;
    row.keyframes.forEach((keyframe, index) => {
      const distance = Math.abs((Number(keyframe.timeMs) || 0) - timeMs);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function handlePointerLeave() {
    if (dragMode) {
      return;
    }
    hoverCanvasPoint = null;
    if (activeToolMode === TOOL_MODES.brush || transformOriginPickActive) {
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
      const before = captureEditorSnapshot();
      image = nextImage;
      rememberSourceImageSession(image, file.name);
      sourceSampleCanvas.width = image.width;
      sourceSampleCanvas.height = image.height;
      sourceSampleCtx.clearRect(0, 0, sourceSampleCanvas.width, sourceSampleCanvas.height);
      sourceSampleCtx.drawImage(image, 0, 0);
      state = core.setCanvasFromImage(state, image.width, image.height, file.name);
      discardOptimizationPreview();
      fitCanvasToView();
      setStatus(`Loaded ${file.name}.`);
      syncFieldsFromState();
      commitHistory('Load source image', before);
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
        currentImageSessionId = null;
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
        resetHistory();
        draw();
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    });
  }

  function exportJson() {
    syncStateFromFields();
    exportAnimationMode = 'compat';
    const output = core.exportVectorPackJson(state);
    fields.jsonOutput.value = output;
    navigator.clipboard?.writeText(output).catch(() => {});
    setStatus('Exported JSON.');
    syncFieldsFromState();
  }

  function exportGraphJson() {
    syncStateFromFields();
    exportAnimationMode = 'graph';
    const output = core.exportVectorPackJson(state, { animationMode: 'graph' });
    fields.jsonOutput.value = output;
    navigator.clipboard?.writeText(output).catch(() => {});
    setStatus('Exported graph JSON. Schema-v2 graph animation is runtime-gated.');
    syncFieldsFromState();
  }

  async function saveJson() {
    syncStateFromFields();
    const output = core.exportVectorPackJson(state, currentExportOptions());
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
    const suffix = exportAnimationMode === 'graph' ? '.graph.vpack.json' : '.vpack.json';
    return `${core.normalizeId(sourceName)}${suffix}`;
  }

  function currentExportOptions() {
    return exportAnimationMode === 'graph' ? { animationMode: 'graph' } : {};
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
    const prefix = isAnimateMode() ? 'Animate' : 'Edit Rest';
    fields.status.textContent = `${prefix}: ${message}`;
  }

  function isTypingTarget(target) {
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
  }

  function wireFieldHistory(inputs, label) {
    for (const input of inputs) {
      input.addEventListener('focus', () => startFieldHistory(label));
      input.addEventListener('blur', () => flushPendingFieldHistory());
    }
  }

  function wireEvents() {
    wireFieldHistory([
      fields.shapeId,
      fields.shapeLabel,
      fields.shapeTags,
      fields.shapeZ,
      fields.shapeFill,
      fields.shapeStroke,
      fields.shapeStrokeWidth,
    ], 'Edit shape fields');
    wireFieldHistory([fields.loopId], 'Edit loop id');
    wireFieldHistory([fields.animationClipLabel, fields.animationClipDuration], 'Edit animation clip');

    window.addEventListener('resize', () => {
      syncInspectorForViewport();
      resizeCanvas();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (transformOriginPickActive || transformPreview) {
          clearTransformPreview(true);
        }
        closeMenus();
        closeAllDrawers();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            redoHistory();
          } else {
            undoHistory();
          }
          return;
        }
        if (key === 'y') {
          event.preventDefault();
          redoHistory();
          return;
        }
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
        runEditorCommand('point.delete');
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

    for (const button of fields.openManualButtons) {
      button.addEventListener('click', () => {
        openManualDrawer();
        closeMenus();
      });
    }

    fields.undoCommand?.addEventListener('click', () => {
      undoHistory();
      closeMenus();
    });
    fields.redoCommand?.addEventListener('click', () => {
      redoHistory();
      closeMenus();
    });
    for (const button of fields.historyButtons) {
      button.addEventListener('click', () => {
        if (button.dataset.historyCommand === 'undo') {
          undoHistory();
        } else {
          redoHistory();
        }
        closeMenus();
      });
    }

    for (const button of fields.drawerCloseButtons) {
      button.addEventListener('click', () => {
        closeExportDrawer();
      });
    }

    for (const button of fields.manualCloseButtons) {
      button.addEventListener('click', () => {
        closeManualDrawer();
      });
    }

    for (const button of fields.modeButtons) {
      button.addEventListener('click', () => {
        setToolMode(button.dataset.toolMode);
      });
    }
    fields.editorModeRest?.addEventListener('click', () => setEditorMode('rest'));
    fields.editorModeAnimate?.addEventListener('click', () => setEditorMode('animate'));
    fields.animationAutoKey?.addEventListener('change', () => {
      animationAutoKey = fields.animationAutoKey.checked;
      setStatus(animationAutoKey ? 'Auto Key on.' : 'Auto Key off. Canvas posing will not write keys.');
    });
    fields.animationClipSelect.addEventListener('change', () => {
      selectAnimationClip(fields.animationClipSelect.value);
    });
    fields.timelineClipSelect.addEventListener('change', () => {
      selectAnimationClip(fields.timelineClipSelect.value);
    });
    fields.animationAddClip.addEventListener('click', () => runEditorCommand('animation.clip.add'));
    fields.animationDuplicateClip.addEventListener('click', () => runEditorCommand('animation.clip.duplicate'));
    fields.animationDeleteClip.addEventListener('click', () => runEditorCommand('animation.clip.delete'));
    fields.animationAddTrack.addEventListener('click', () => runEditorCommand('animation.track.add'));
    fields.animationRestSelection?.addEventListener('click', () => runEditorCommand('animation.restSelection'));
    fields.animationClipLabel.addEventListener('input', () => runEditorCommand('animation.clip.editFields'));
    fields.animationClipDuration.addEventListener('input', () => runEditorCommand('animation.clip.editFields'));
    fields.animationClipLoop.addEventListener('change', () => runEditorCommand('animation.clip.edit'));
    fields.animationTrackSelect.addEventListener('change', () => {
      selectAnimationTrack(fields.animationTrackSelect.value);
    });
    fields.keyframeUpsert.addEventListener('click', () => runEditorCommand('keyframe.upsert'));
    fields.keyframeDelete.addEventListener('click', () => runEditorCommand('keyframe.delete'));
    fields.keyframeRest.addEventListener('click', () => runEditorCommand('keyframe.rest'));
    fields.keyframeCopy.addEventListener('click', () => runEditorCommand('keyframe.copy'));
    fields.keyframePrevious.addEventListener('click', () => runEditorCommand('keyframe.previous'));
    fields.posePreview.addEventListener('click', () => runEditorCommand('pose.preview'));
    fields.poseSetKey.addEventListener('click', () => runEditorCommand('pose.setKey'));
    fields.poseLoadKey.addEventListener('click', () => runEditorCommand('pose.loadKey'));
    fields.poseClear.addEventListener('click', () => runEditorCommand('pose.clear'));
    for (const input of [fields.poseTx, fields.poseTy, fields.poseRotation, fields.poseSx, fields.poseSy]) {
      input.addEventListener('input', () => {
        if (animationPosePreview) {
          buildAnimationPosePreview(false);
        }
      });
    }
    fields.animationBindingSelect.addEventListener('change', () => {
      syncBindingFields(currentAnimation());
    });
    fields.animationBindClip.addEventListener('click', () => runEditorCommand('binding.bind'));
    fields.animationUnbindClip.addEventListener('click', () => runEditorCommand('binding.unbind'));
    fields.timelineCollapse.addEventListener('click', () => {
      timelineCollapsed = !timelineCollapsed;
      syncTimelineUi();
      resizeCanvas();
    });
    fields.timelinePlay.addEventListener('click', toggleTimelinePlayback);
    fields.timelineTime.addEventListener('input', () => {
      setTimelineTime(Number(fields.timelineTime.value) || 0, true);
    });
    fields.timelineFps.addEventListener('change', () => {
      timelineFps = parseIntegerSafe(fields.timelineFps.value, 24);
      setTimelineTime(timelineTimeMs);
      setStatus(`Timeline FPS ${timelineFps}.`);
    });
    fields.timelineSnap.addEventListener('change', () => {
      timelineSnap = fields.timelineSnap.checked;
      setTimelineTime(timelineTimeMs);
      setStatus(timelineSnap ? 'Timeline snap on.' : 'Timeline snap off.');
    });
    fields.timelinePreviewEnabled.addEventListener('change', () => {
      updateAnimationPreview();
      draw();
    });
    fields.timelineZoom.addEventListener('input', () => {
      timelineZoom = Number(fields.timelineZoom.value) || 1;
      syncTimelineUi();
    });
    fields.timelineTrack.addEventListener('pointerdown', handleTimelinePointerDown);
    fields.timelineTrack.addEventListener('pointermove', handleTimelinePointerMove);
    fields.timelineTrack.addEventListener('pointerup', handleTimelinePointerUp);
    fields.timelineTrack.addEventListener('pointercancel', handleTimelinePointerUp);
    fields.imageInput.addEventListener('change', () => runEditorCommand('import.sourceImage', {
      file: fields.imageInput.files[0],
    }));
    fields.imageOpacity.addEventListener('input', () => {
      sourceImageOpacity = Math.max(0, Math.min(1, Number(fields.imageOpacity.value) / 100));
      updateImageOpacityLabel();
      draw();
    });
    fields.jsonInput.addEventListener('change', () => runEditorCommand('import.json', {
      file: fields.jsonInput.files[0],
    }));
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
    fields.loopRole.addEventListener('change', () => runEditorCommand('loop.role.set'));
    fields.loopId.addEventListener('input', () => runEditorCommand('loop.id.input'));
    fields.pickFillColor.addEventListener('click', () => {
      syncStateFromFields();
      beginColorPick('fill');
    });
    fields.pickStrokeColor.addEventListener('click', () => {
      syncStateFromFields();
      beginColorPick('stroke');
    });
    fields.addShape.addEventListener('click', () => runEditorCommand('shape.add'));
    fields.duplicateShape.addEventListener('click', () => runEditorCommand('shape.duplicate'));
    fields.deleteShape.addEventListener('click', () => runEditorCommand('shape.delete'));
    fields.zDown.addEventListener('click', () => runEditorCommand('shape.zDown'));
    fields.zUp.addEventListener('click', () => runEditorCommand('shape.zUp'));
    fields.addTagPreset.addEventListener('click', () => runEditorCommand('tag.add'));
    fields.applyTagZone.addEventListener('click', () => runEditorCommand('tag.addRole'));
    fields.addLoop.addEventListener('click', () => runEditorCommand('loop.add'));
    fields.duplicateLoop.addEventListener('click', () => runEditorCommand('loop.duplicate'));
    fields.deleteLoop.addEventListener('click', () => runEditorCommand('loop.delete'));
    fields.loopUp.addEventListener('click', () => runEditorCommand('loop.up'));
    fields.loopDown.addEventListener('click', () => runEditorCommand('loop.down'));
    fields.openLoop.addEventListener('click', () => runEditorCommand('loop.open'));
    fields.closeLoop.addEventListener('click', () => runEditorCommand('loop.close'));
    fields.clearPoints.addEventListener('click', () => runEditorCommand('loop.clearPoints'));
    fields.groupPaths.addEventListener('click', () => runEditorCommand('paths.group'));
    fields.separatePaths.addEventListener('click', () => runEditorCommand('paths.separate'));
    fields.mergeIntoActive.addEventListener('click', () => runEditorCommand('paths.mergeIntoActive'));
    fields.clearPathSelection.addEventListener('click', () => runEditorCommand('selection.clearPaths'));
    fields.scaleUniform.addEventListener('change', () => {
      syncTransformControls();
    });
    fields.scaleX.addEventListener('input', () => {
      syncTransformControls('x');
    });
    fields.scaleY.addEventListener('input', () => {
      syncTransformControls('y');
    });
    fields.transformRotation.addEventListener('input', () => {
      updateTransformPreviewFromControls();
    });
    fields.transformOriginMode.addEventListener('change', () => {
      syncTransformControls();
    });
    fields.transformOriginX.addEventListener('input', () => {
      updateTransformPreviewFromControls();
    });
    fields.transformOriginY.addEventListener('input', () => {
      updateTransformPreviewFromControls();
    });
    fields.transformPickOrigin.addEventListener('click', () => runEditorCommand('transform.pickOrigin'));
    fields.transformPreview.addEventListener('click', () => runEditorCommand('transform.preview'));
    fields.transformApply.addEventListener('click', () => runEditorCommand('transform.apply'));
    fields.transformCancel.addEventListener('click', () => runEditorCommand('transform.cancel'));
    fields.transformReset.addEventListener('click', () => runEditorCommand('transform.reset'));
    fields.removeNearDuplicates.addEventListener('click', () => runEditorCommand('cleanup.nearDuplicates'));
    fields.simplifyStraight.addEventListener('click', () => runEditorCommand('cleanup.simplifyStraight'));
    fields.closeGap.addEventListener('click', () => runEditorCommand('cleanup.closeGap'));
    fields.reverseLoop.addEventListener('click', () => runEditorCommand('cleanup.reverse'));
    fields.optimizeTolerance.addEventListener('input', scheduleOptimizationPreview);
    fields.optimizeKeepCorners.addEventListener('change', scheduleOptimizationPreview);
    fields.optimizePreview.addEventListener('click', () => {
      buildOptimizationPreview(true);
    });
    fields.optimizeApply.addEventListener('click', () => runEditorCommand('optimize.apply'));
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
    fields.deletePoint.addEventListener('click', () => runEditorCommand('point.delete'));
    fields.clearHandles.addEventListener('click', () => runEditorCommand('point.clearHandles'));
    fields.exportJson.addEventListener('click', () => runEditorCommand('export.v1'));
    fields.exportGraphJson?.addEventListener('click', () => runEditorCommand('export.graph'));
    fields.exportGraphJsonDrawer?.addEventListener('click', () => runEditorCommand('export.graph'));
    fields.saveJson.addEventListener('click', () => runEditorCommand('export.save'));
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
        if (isAnimateMode()) {
          if (input === fields.shapeFill) {
            runEditorCommand('style.fill');
          } else if (input === fields.shapeStroke) {
            runEditorCommand('style.stroke');
          } else if (input === fields.shapeStrokeWidth) {
            runEditorCommand('style.strokeWidth');
          } else {
            setStatus('Switch to Edit Rest to change object metadata.');
            syncFieldsFromState();
          }
          return;
        }
        if (input === fields.shapeFill) {
          runEditorCommand('style.fill');
        } else if (input === fields.shapeStroke) {
          runEditorCommand('style.stroke');
        } else if (input === fields.shapeStrokeWidth) {
          runEditorCommand('style.strokeWidth');
        } else {
          syncStateFromFields();
          syncShapeList();
          updateStats();
          draw();
        }
      });
    }
  }

  populateTagPresetOptions();
  populateAnimationStaticOptions();
  updateImageOpacityLabel();
  updateOptimizeToleranceLabel();
  updateBrushControlLabels();
  syncTransformControls();
  syncInspectorForViewport();
  syncToolUi();
  syncEditorModeUi();
  syncFieldsFromState();
  resetHistory();
  wireEvents();
  resizeCanvas();
  fitCanvasToView();
  draw();
})();
