const purchasedDownload = document.getElementById('purchased-download');
const automaticStatus = document.getElementById('automatic-download-status');
const purchaseReturned = new URLSearchParams(window.location.search).get('purchase') === 'complete';

if (purchaseReturned && purchasedDownload && automaticStatus) {
    let secondsRemaining = 3;
    automaticStatus.hidden = false;

    const updateStatus = () => {
        automaticStatus.textContent = secondsRemaining > 0
            ? `PayPal returned you to MiniCloneHD. Your download starts in ${secondsRemaining}…`
            : 'Your download is starting. Use the Purchased Build button if the browser blocks it.';
    };

    updateStatus();
    const countdown = window.setInterval(() => {
        secondsRemaining -= 1;
        updateStatus();
        if (secondsRemaining <= 0) {
            window.clearInterval(countdown);
            purchasedDownload.click();
        }
    }, 1000);
}
