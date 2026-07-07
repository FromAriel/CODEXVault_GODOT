/* ==========================================================================
   MINICLONE HD - INTERACTIVE CONTROLS (APP.JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTerminalSandbox();
    initPaymentModal();
});

/**
 * Terminal Sandbox Simulation
 */
function initTerminalSandbox() {
    const runBtn = document.getElementById('run-sandbox-btn');
    const termOutput = document.getElementById('terminal-output');
    
    if (!runBtn || !termOutput) return;

    // Keep references to original lines so we can restore on reset
    const originalLinesHTML = Array.from(termOutput.children)
        .filter(child => !child.classList.contains('interactive-area'))
        .map(child => child.outerHTML)
        .join('\n');

    let isRunning = false;

    runBtn.addEventListener('click', async () => {
        if (isRunning) return;
        isRunning = true;
        
        // Update Button state
        runBtn.disabled = true;
        runBtn.textContent = 'Simulating...';

        // Clear previous runs and restore initial setup
        termOutput.innerHTML = originalLinesHTML;
        
        // Helper to append a line
        const appendLine = (text, className = '') => {
            const p = document.createElement('p');
            p.className = `term-line ${className}`;
            p.textContent = text;
            termOutput.appendChild(p);
            termOutput.scrollTop = termOutput.scrollHeight;
        };

        // Helper to sleep
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // Create the interactive area container inside terminal body
        const interactiveContainer = document.createElement('div');
        interactiveContainer.className = 'term-line';
        termOutput.appendChild(interactiveContainer);

        try {
            await delay(600);
            appendLine('[00:00:05] [STAGE] Initializing VSS Shadow Copy requester...', 'color-muted');
            await delay(800);
            appendLine('[00:00:06] [INFO] Shadow copy created successfully: \\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy1', 'color-info');
            
            await delay(700);
            appendLine('[00:00:07] [STAGE] Locking destination volumes on Disk 0...', 'color-muted');
            await delay(500);
            appendLine('[00:00:07] [INFO] Lock acquired for volumes: None (Empty Disk)', 'color-info');
            
            await delay(600);
            appendLine('[00:00:08] [STAGE] Applying MBR partition layout matching source disk...', 'color-muted');
            await delay(800);
            appendLine('[00:00:09] [INFO] Layout initialized: Partition 1 (Active, NTFS), Partition 2 (System Reserved)', 'color-info');
            
            await delay(600);
            appendLine('[00:00:10] [STAGE] Mounting temporary target mapping...', 'color-muted');
            await delay(500);
            appendLine('[00:00:10] [INFO] Temp target assigned to mount point: \\\\?\\Volume{miniclone-temp-target}', 'color-info');
            
            await delay(700);
            appendLine('[00:00:11] [STAGE] Beginning block-by-block volume range transfer...', 'color-muted');
            await delay(400);

            // Progress simulation
            const totalBytes = 251271778304; // ~234 GB
            let copiedBytes = 0;
            const progressWrapper = document.createElement('div');
            progressWrapper.className = 'interactive-area';
            progressWrapper.style.marginTop = '10px';
            progressWrapper.style.paddingTop = '10px';
            interactiveContainer.appendChild(progressWrapper);

            // Progress bar DOM elements
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';
            
            const progressBarFill = document.createElement('div');
            progressBarFill.className = 'progress-bar-fill';
            
            const progressBarText = document.createElement('span');
            progressBarText.className = 'progress-bar-text';
            progressBarText.textContent = '0%';

            progressBarContainer.appendChild(progressBarFill);
            progressBarContainer.appendChild(progressBarText);
            progressWrapper.appendChild(progressBarContainer);

            // Update loop
            const steps = 30;
            const stepIncrement = totalBytes / steps;
            const durationPerStep = 60; // ms

            for (let i = 1; i <= steps; i++) {
                copiedBytes += stepIncrement;
                if (copiedBytes > totalBytes) copiedBytes = totalBytes;
                
                const percent = Math.round((copiedBytes / totalBytes) * 100);
                progressBarFill.style.width = `${percent}%`;
                progressBarText.textContent = `${percent}% (${(copiedBytes / 1024 / 1024 / 1024).toFixed(1)} GB / 234.0 GB)`;
                
                await delay(durationPerStep);
            }

            await delay(500);
            appendLine('[00:00:13] [INFO] Block transfer complete. Hash verification matching (SHA-256): PASS', 'color-success');
            
            await delay(600);
            appendLine('[00:00:14] [STAGE] Initializing target boot-sector preflight...', 'color-muted');
            await delay(500);
            appendLine('[00:00:14] [INFO] Target firmware config environment: BIOS/MBR', 'color-info');
            
            await delay(700);
            appendLine('[00:00:15] [STAGE] Executing target boot configuration tools (BCDBoot)...', 'color-muted');
            await delay(900);
            appendLine('[00:00:16] [INFO] BCDBoot target output: Boot files successfully created.', 'color-success');
            
            await delay(600);
            appendLine('[00:00:17] [STAGE] Finalizing metadata, resetting Disk 0 MountedDevices registry entries...', 'color-muted');
            await delay(700);
            appendLine('[00:00:18] [INFO] DosDevices clear completed. 8 keys stabilized.', 'color-info');
            
            await delay(600);
            appendLine('[00:00:19] [STAGE] Dismounting VSS Shadow Copy and target handles...', 'color-muted');
            await delay(500);
            appendLine('[00:00:19] [INFO] Cleanup success. Devices detached.', 'color-success');

            await delay(800);
            appendLine('========================================================================', 'color-success');
            appendLine('[STATUS] MiniClone clone process completed successfully!', 'color-success');
            appendLine('  - Host status: STABLE', 'color-success');
            appendLine('  - Target: Disk 0 (Netac SSD) [PREPARED TO BOOT]', 'color-success');
            appendLine('========================================================================', 'color-success');

        } catch (err) {
            console.error(err);
            appendLine('[ERROR] Simulation interrupted.', 'color-error');
        } finally {
            // Restore run button
            await delay(1000);
            
            // Re-append the button container at the end of output
            const newBtnContainer = document.createElement('div');
            newBtnContainer.className = 'interactive-area';
            
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn btn-accent btn-sm';
            resetBtn.textContent = 'Simulate Again';
            resetBtn.addEventListener('click', () => {
                // Trigger simulate again
                runBtn.click();
            });
            
            newBtnContainer.appendChild(resetBtn);
            termOutput.appendChild(newBtnContainer);
            termOutput.scrollTop = termOutput.scrollHeight;

            isRunning = false;
            runBtn.disabled = false;
            runBtn.textContent = 'Simulate Copy Process';
        }
    });
}

/**
 * Stripe Payment Mock Checkout Flow
 */
function initPaymentModal() {
    const downloadBtns = document.querySelectorAll('a[href="#download"], a.btn-primary[href="#download"], .payment-box a');
    
    // Find the checkout link specifically: target the one with click handler or check text
    const checkoutLink = document.querySelector('.payment-box a');
    if (!checkoutLink) return;

    // Prevent default alert behavior
    checkoutLink.removeAttribute('onclick');

    checkoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        openCheckoutModal();
    });
}

function openCheckoutModal() {
    // Check if modal already exists
    let modal = document.getElementById('stripe-checkout-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    // Create Modal element
    modal = document.createElement('div');
    modal.id = 'stripe-checkout-modal';
    modal.className = 'payment-modal-overlay';
    
    modal.innerHTML = `
        <div class="payment-modal-card">
            <div class="payment-modal-header">
                <div class="modal-stripe-logo">stripe</div>
                <button class="modal-close-btn">&times;</button>
            </div>
            
            <div class="payment-modal-body">
                <div class="product-summary">
                    <span class="product-title">MiniClone HD License</span>
                    <span class="product-price">$5.00</span>
                </div>
                
                <form id="mock-checkout-form" class="checkout-form">
                    <div class="form-group">
                        <label for="checkout-email">Email Address</label>
                        <input type="email" id="checkout-email" required placeholder="developer@example.com" value="developer@example.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="checkout-card">Card Information</label>
                        <div class="card-input-container">
                            <input type="text" id="checkout-card" required placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242" maxlength="19">
                            <div class="card-expiry-cvc">
                                <input type="text" id="checkout-expiry" required placeholder="MM / YY" value="12 / 29" maxlength="7" style="width: 70px;">
                                <input type="text" id="checkout-cvc" required placeholder="CVC" value="123" maxlength="4" style="width: 50px;">
                            </div>
                        </div>
                    </div>

                    <div class="checkout-guarantee">
                        🛡️ Secured with SSL & Stripe. No subscription. Lifetime updates.
                    </div>
                    
                    <button type="submit" id="pay-button" class="btn btn-primary btn-block">
                        Pay $5.00
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Apply modal styles dynamically if not in style.css
    injectModalStyles();

    // Close button logic
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Card inputs auto-formatting helpers
    const cardInput = document.getElementById('checkout-card');
    cardInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let matches = value.match(/\d{4,16}/g);
        let match = (matches && matches[0]) || '';
        let parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length > 0) {
            e.target.value = parts.join(' ');
        } else {
            e.target.value = value;
        }
    });

    const expiryInput = document.getElementById('checkout-expiry');
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (value.length >= 2) {
            e.target.value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
        } else {
            e.target.value = value;
        }
    });

    // Form submit logic
    const form = document.getElementById('mock-checkout-form');
    const payBtn = document.getElementById('pay-button');
    const modalBody = modal.querySelector('.payment-modal-body');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="checkout-spinner"></span> Processing...';

        // Simulate 2s processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Transition to success screen
        modalBody.innerHTML = `
            <div class="checkout-success-container">
                <div class="success-icon">🎉</div>
                <h3>Payment Completed!</h3>
                <p>Thank you for purchasing MiniClone HD. Your lifetime access has been authorized.</p>
                
                <div class="license-box">
                    <span class="license-label">License Key</span>
                    <code class="license-key">MC-2026-STABLE-RESTORE-ALPHA</code>
                </div>

                <a href="#" id="download-trigger-btn" class="btn btn-accent btn-block btn-lg" style="margin-top: 20px;">
                    📥 Download miniclone-cli.exe
                </a>
                
                <p class="download-instructions">
                    Place the executable in your system directory, then run from an Administrator command prompt:
                    <br><code>miniclone-cli.exe --elevated</code>
                </p>
            </div>
        `;

        // Success download button click trigger
        const downloadTrigger = document.getElementById('download-trigger-btn');
        downloadTrigger.addEventListener('click', (ev) => {
            ev.preventDefault();
            downloadTrigger.textContent = 'Downloading...';
            downloadTrigger.classList.add('btn-outline');
            downloadTrigger.classList.remove('btn-accent');

            // Trigger file download
            triggerFakeDownload();

            setTimeout(() => {
                downloadTrigger.textContent = '📥 Download Again';
                downloadTrigger.classList.remove('btn-outline');
                downloadTrigger.classList.add('btn-accent');
            }, 3000);
        });
    });
}

function triggerFakeDownload() {
    // Generate a temporary text block simulating the executable or download configuration
    const element = document.createElement('a');
    const fileContent = "This is a mock binary download for MiniClone HD CLI. In production, this returns the signed miniclone-cli.exe executable.";
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'miniclone-cli.exe';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

/**
 * Inject payment modal styles directly to keep them modular
 */
function injectModalStyles() {
    if (document.getElementById('stripe-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'stripe-modal-styles';
    style.textContent = `
        .payment-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(11, 12, 16, 0.9);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.25s ease;
        }

        .payment-modal-card {
            background: #12161A;
            border: 1px solid rgba(102, 252, 241, 0.18);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(102, 252, 241, 0.05);
            width: 100%;
            max-width: 460px;
            border-radius: var(--border-radius-lg);
            overflow: hidden;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .payment-modal-header {
            background: #0B0D10;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-stripe-logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.4rem;
            font-weight: bold;
            color: #635bff;
            letter-spacing: -0.04em;
            text-shadow: 0 0 2px rgba(99, 91, 255, 0.1);
        }

        .modal-close-btn {
            background: transparent;
            border: none;
            color: var(--color-text-muted);
            font-size: 1.8rem;
            cursor: pointer;
            line-height: 1;
            transition: color var(--transition-fast);
        }

        .modal-close-btn:hover {
            color: var(--color-text-bright);
        }

        .payment-modal-body {
            padding: 32px 24px;
        }

        .product-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 16px;
            border-radius: var(--border-radius-md);
            margin-bottom: 24px;
        }

        .product-title {
            font-family: var(--font-headers);
            font-weight: 500;
            color: var(--color-text-bright);
        }

        .product-price {
            font-family: var(--font-headers);
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--color-neon-blue);
        }

        .checkout-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-group label {
            font-family: var(--font-headers);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-muted);
            font-weight: 600;
        }

        .form-group input {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--color-text-bright);
            padding: 12px 16px;
            font-size: 1rem;
            border-radius: var(--border-radius-sm);
            font-family: var(--font-body);
            transition: all var(--transition-fast);
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--color-neon-blue);
            box-shadow: 0 0 10px rgba(102, 252, 241, 0.15);
        }

        .card-input-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .card-expiry-cvc {
            display: flex;
            gap: 12px;
        }

        .card-expiry-cvc input {
            flex-grow: 1;
            text-align: center;
        }

        .checkout-guarantee {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            text-align: center;
            margin: 4px 0;
        }

        .btn-block {
            display: flex;
            width: 100%;
            padding: 14px;
            font-size: 0.95rem;
        }

        /* Success screen styles */
        .checkout-success-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            animation: fadeIn 0.4s ease;
        }

        .success-icon {
            font-size: 3.5rem;
            margin-bottom: 16px;
            filter: drop-shadow(0 0 10px rgba(102, 252, 241, 0.3));
        }

        .checkout-success-container h3 {
            font-size: 1.6rem;
            margin-bottom: 12px;
            color: var(--color-neon-blue);
            text-shadow: 0 0 10px rgba(102, 252, 241, 0.2);
        }

        .checkout-success-container p {
            font-size: 0.95rem;
            color: var(--color-text-muted);
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .license-box {
            background: rgba(46, 204, 113, 0.05);
            border: 1px dashed var(--color-green-success);
            padding: 12px 24px;
            border-radius: var(--border-radius-sm);
            width: 100%;
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .license-label {
            font-family: var(--font-headers);
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--color-text-muted);
            letter-spacing: 0.05em;
        }

        .license-key {
            font-family: var(--font-mono);
            font-size: 0.95rem;
            color: var(--color-green-success);
            font-weight: bold;
        }

        .download-instructions {
            font-size: 0.8rem;
            color: var(--color-text-muted);
            margin-top: 16px;
            line-height: 1.6;
        }

        .download-instructions code {
            font-family: var(--font-mono);
            color: var(--color-text-bright);
            background: #000;
            padding: 2px 6px;
            border-radius: var(--border-radius-sm);
        }

        /* Spinner Animation */
        .checkout-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(0,0,0,0.1);
            border-top: 2px solid var(--color-bg);
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            animation: spin-anim 0.8s linear infinite;
        }

        @keyframes spin-anim {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}
