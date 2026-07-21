/* ==========================================================================
   MINICLONE HD - INTERACTIVE CONTROLS (APP.JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
    initProductDemo();
});

/**
 * Keep the compact navigation out of the way after a mobile anchor is chosen.
 */
function initMobileNavigation() {
    const menu = document.querySelector('.mobile-nav');
    if (!menu) return;

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => menu.removeAttribute('open'));
    });
}

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
    const clampDelta = (value) => Math.max(-800, Math.min(800, value));
    let pendingDeltaX = 0;
    let pendingDeltaY = 0;
    let scheduledFrame = null;

    const applyPendingScroll = () => {
        scheduledFrame = null;
        const scrollingElement = document.scrollingElement || document.documentElement;
        const deltaX = pendingDeltaX;
        const deltaY = pendingDeltaY;
        pendingDeltaX = 0;
        pendingDeltaY = 0;

        if (!scrollingElement) return;

        // The page enables smooth anchor scrolling. Temporarily overriding that CSS
        // is necessary even for direct scrollTop/scrollLeft assignment; otherwise each
        // wheel packet restarts the smooth animation and most of a burst is discarded.
        const previousScrollBehavior = scrollingElement.style.scrollBehavior;
        scrollingElement.style.scrollBehavior = 'auto';
        try {
            scrollingElement.scrollLeft += deltaX;
            scrollingElement.scrollTop += deltaY;
        } finally {
            scrollingElement.style.scrollBehavior = previousScrollBehavior;
        }
    };

    window.addEventListener('message', (event) => {
        if (event.source !== frame.contentWindow) return;
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== messageType) return;

        const deltaX = Number(event.data.deltaX);
        const deltaY = Number(event.data.deltaY);
        if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

        pendingDeltaX += clampDelta(deltaX);
        pendingDeltaY += clampDelta(deltaY);
        if (scheduledFrame === null) {
            scheduledFrame = window.requestAnimationFrame(applyPendingScroll);
        }
    });
}
