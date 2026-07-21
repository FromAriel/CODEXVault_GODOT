const browserRuntime = Object.freeze({
  mode: "demo",
  simulated: true,
});

const invoke = async (command) => {
  if (command === "runtime_mode") return browserRuntime;

  const error = new Error(`Native MiniClone command is unavailable in the website demo: ${command}`);
  error.kind = "website_demo_native_command_refused";
  throw error;
};

Object.defineProperty(window, "__TAURI__", {
  value: Object.freeze({
    core: Object.freeze({ invoke }),
  }),
  configurable: false,
  enumerable: false,
  writable: false,
});

const wheelMessageType = "miniclone-demo-wheel";
// Route wheel input to the host page by default so the embedded frame stays visually
// static while the outer site owns vertical scroll.

function parentPostOrigin() {
  return "*";
}

function embeddedDemoIsFullscreen() {
  if (window.parent === window) return false;
  try {
    return window.parent.document.fullscreenElement === window.frameElement;
  } catch {
    return false;
  }
}

function wheelDeltaInPixels(event) {
  const deltaX = Number.isFinite(event.deltaX) ? event.deltaX : 0;
  const deltaY = Number.isFinite(event.deltaY) ? event.deltaY : 0;
  const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
  return { deltaX: deltaX * scale, deltaY: deltaY * scale };
}

function forwardWheelToHost(deltaX, deltaY) {
  if (window.parent === window) return;
  window.parent.postMessage(
    {
      type: wheelMessageType,
      deltaX,
      deltaY,
    },
    parentPostOrigin(),
  );
}

function handleWheel(event) {
  if (event.ctrlKey || window.parent === window || embeddedDemoIsFullscreen()) return;

  const delta = wheelDeltaInPixels(event);
  if (delta.deltaX === 0 && delta.deltaY === 0) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();

  forwardWheelToHost(delta.deltaX, delta.deltaY);
}

window.addEventListener("wheel", handleWheel, { passive: false, capture: true });

await import("./main.js");
