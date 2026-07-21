/* ==========================================================================
   MINICLONE HD - INTERACTIVE CONTROLS (APP.JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initProductDemo();
});

/**
 * Same-origin product demo controls.
 */
function initProductDemo() {
    const frame = document.getElementById('miniclone-demo-frame');
    const fullscreenButton = document.getElementById('fullscreen-demo-btn');

    if (!frame || !fullscreenButton) return;

    initDemoWheelBridge(frame);

    if (!document.fullscreenEnabled || typeof frame.requestFullscreen !== 'function') {
        fullscreenButton.disabled = true;
        fullscreenButton.textContent = 'Fullscreen Unavailable';
        fullscreenButton.title = 'Open Full Demo is still available in this browser.';
        return;
    }

    const syncFullscreenButton = () => {
        const active = document.fullscreenElement === frame;
        fullscreenButton.textContent = active ? 'Exit Fullscreen' : 'View Fullscreen';
        fullscreenButton.setAttribute('aria-pressed', String(active));
    };

    fullscreenButton.setAttribute('aria-pressed', 'false');
    fullscreenButton.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement === frame) {
                await document.exitFullscreen();
            } else {
                await frame.requestFullscreen();
            }
        } catch (error) {
            console.warn('MiniClone demo fullscreen request was refused.', error);
            fullscreenButton.disabled = true;
            fullscreenButton.textContent = 'Fullscreen Unavailable';
        }
    });
    document.addEventListener('fullscreenchange', syncFullscreenButton);
}

/**
 * Continue the marketing-page scroll when the pointer is over the embedded demo.
 */
function initDemoWheelBridge(frame) {
    const messageType = 'miniclone-demo-wheel';
    const clampDelta = (value) => Math.max(-1600, Math.min(1600, value));

    window.addEventListener('message', (event) => {
        if (event.source !== frame.contentWindow) return;
        if (event.data?.type !== messageType) return;

        const deltaX = Number(event.data.deltaX);
        const deltaY = Number(event.data.deltaY);
        if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

        window.scrollBy({
            left: clampDelta(deltaX),
            top: clampDelta(deltaY),
            behavior: 'auto',
        });
    });
}
