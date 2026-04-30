import { loadJson, loadJsonSet } from "../data/json_loader.js";
import { EventBus } from "../engine/event_bus.js";
import { GameLoop } from "../engine/game_loop.js";
import { InputManager } from "../input/input_manager.js";
import { Canvas2DRenderer } from "../render/canvas2d_renderer.js";
import { DebugOverlay } from "../debug/debug_overlay.js";
import { MotionDebugPanel } from "../debug/motion_debug_panel.js";
import { StageScene } from "../stages/stage_scene.js";
import { MotionLibrary } from "../motion/motion_library.js";
import { MotionSolver } from "../motion/motion_solver.js";
import { PlayerActor } from "../actors/player_actor.js";

const CONFIG_PATH = "data/app/app_config.json";

async function boot() {
  const canvas = document.querySelector("#gameCanvas");
  const debugElement = document.querySelector("#debugOverlay");
  const motionPanelElement = document.querySelector("#motionPanel");
  const statusElement = document.querySelector("#bootStatus");
  statusElement.textContent = "Loading data...";

  const appConfig = await loadJson(CONFIG_PATH);
  const loaded = await loadJsonSet(appConfig.dataFiles);
  const loadedDataNames = [CONFIG_PATH, ...Object.values(loaded).map(entry => entry.path)];

  const bus = new EventBus();
  const input = new InputManager(loaded.inputBindings.data);
  input.attach(window);

  const renderer = new Canvas2DRenderer(canvas, {
    palette: loaded.palette.data,
    layers: loaded.layers.data,
    worldWidth: appConfig.renderer.worldWidth,
    worldHeight: appConfig.renderer.worldHeight
  });

  statusElement.textContent = "Loading motion library...";
  const motionLibrary = await MotionLibrary.load(loaded.motionSources.data, loaded.playerActor.data);
  const player = new PlayerActor(loaded.playerActor.data, loaded.rootMotionPolicies.data);
  player.seed(motionLibrary);
  const motionSolver = new MotionSolver({
    library: motionLibrary,
    actor: player,
    intentMap: loaded.intentMap.data,
    transitionDefaults: loaded.transitionDefaults.data,
    rootMotionPolicies: loaded.rootMotionPolicies.data,
    clipPolicyOverrides: loaded.clipPolicyOverrides.data
  });

  const scene = new StageScene(loaded.stage.data, loaded.layers.data);
  await scene.load({ bus });

  const debug = new DebugOverlay(debugElement, loaded.debug.data);
  debug.render();
  const motionPanel = new MotionDebugPanel(motionPanelElement, {
    library: motionLibrary,
    actor: player,
    solver: motionSolver,
    onHold: () => player.hold(),
    onResetSeed: () => motionSolver.resetSeed()
  });
  let seenHoldVersion = player.holdVersion;

  let lastStats = {
    fps: 0,
    frameMs: 0,
    updatesThisFrame: 0,
    totalUpdates: 0
  };

  const loop = new GameLoop({
    fixedStepSeconds: appConfig.fixedStep.seconds,
    maxAccumulatedSeconds: appConfig.fixedStep.maxAccumulatedSeconds,
    update: dt => {
      input.update();
      if (input.wasPressed("debugToggle")) debug.toggle();
      player.update(dt);
      if (player.holdVersion !== seenHoldVersion) {
        seenHoldVersion = player.holdVersion;
        motionSolver.refresh();
      }
      scene.update(dt);
      motionPanel.update();
      const motion = player.snapshot();
      const solver = motionSolver.snapshot();
      debug.update(dt, {
        ...lastStats,
        scene: loaded.stage.data.id,
        inputMode: input.mode,
        move: input.move,
        loadedData: loadedDataNames,
        motion: {
          clipCount: motionLibrary.entries.length,
          matchedOverrides: motionLibrary.matchedOverrides,
          clipId: motion.clipId,
          frame: motion.frame,
          frameCount: motion.frameCount,
          mode: motion.mode,
          classification: motion.classification,
          transition: motion.transition,
          intent: solver.intent?.label || "",
          candidateCount: solver.candidateCount,
          selectedCost: solver.selected?.cost ?? null,
          selectedScore: solver.selected?.score ?? null,
          weaponScope: solver.weaponScope,
          includeDiagnostics: solver.includeDiagnostics,
          root: motion.root
        }
      });
    },
    render: (alpha, stats) => {
      lastStats = stats;
      scene.render(renderer, alpha, [player]);
    }
  });

  statusElement.textContent = "Ready.";
  bus.emit("app.ready", { scene: loaded.stage.data.id });
  loop.start();
}

boot().catch(error => {
  console.error(error);
  const statusElement = document.querySelector("#bootStatus");
  statusElement.textContent = `Boot failed: ${error.message}`;
});
