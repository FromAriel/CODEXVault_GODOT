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

function embeddedDemoIsFullscreen() {
  if (window.parent === window) return false;
  try {
    return window.parent.document.fullscreenElement === window.frameElement;
  } catch {
    return false;
  }
}

function scrollableAncestorCanConsume(target, deltaY) {
  for (let element = target instanceof Element ? target : null;
    element && element !== document.body && element !== document.documentElement;
    element = element.parentElement) {
    const overflowY = getComputedStyle(element).overflowY;
    if (!/(auto|scroll|overlay)/u.test(overflowY) || element.scrollHeight <= element.clientHeight + 1) {
      continue;
    }
    if (deltaY < 0 && element.scrollTop > 0) return true;
    if (deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
  }
  return false;
}

function wheelDeltaInPixels(event) {
  const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
  return { deltaX: event.deltaX * scale, deltaY: event.deltaY * scale };
}

window.addEventListener("wheel", (event) => {
  if (event.ctrlKey || window.parent === window || embeddedDemoIsFullscreen()) return;

  const delta = wheelDeltaInPixels(event);
  if (delta.deltaX === 0 && delta.deltaY === 0) return;
  if (scrollableAncestorCanConsume(event.target, delta.deltaY)) return;

  event.preventDefault();
  window.parent.postMessage({ type: wheelMessageType, ...delta }, window.location.origin);
}, { passive: false });

await import("./main.js");
