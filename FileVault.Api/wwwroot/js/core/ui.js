export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    // Use classes for styling
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
let confirmResolve = null;

export function showConfirm(message) {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    if (!modal || !messageEl) return Promise.resolve(false);

    messageEl.innerText = message;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    return new Promise((resolve) => {
        confirmResolve = resolve;
    });
}

export function closeConfirm(confirmed) {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (confirmResolve) {
        confirmResolve(confirmed);
        confirmResolve = null;
    }
}

// Обработчики (навесить один раз при загрузке)
export function initConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');
    if (cancelBtn) cancelBtn.onclick = () => closeConfirm(false);
    if (okBtn) okBtn.onclick = () => closeConfirm(true);
    // Закрытие по клику на оверлей
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeConfirm(false);
    });
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeConfirm(false);
        }
    });
}