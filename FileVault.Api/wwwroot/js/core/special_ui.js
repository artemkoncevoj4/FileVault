import { t } from './i18n.js';

export function showTerms() {
    const modal = document.getElementById('legal-modal');
    if (!modal) return;

    document.getElementById('legal-title').innerText = t('tosTitle');
    document.getElementById('legal-content').innerText = t('tosContent');
    modal.classList.remove('hidden');
}

export function showPrivacy() {
    const modal = document.getElementById('legal-modal');
    if (!modal) return;

    document.getElementById('legal-title').innerText = t('privacyTitle');
    document.getElementById('legal-content').innerText = t('privacyContent');
    modal.classList.remove('hidden');
}