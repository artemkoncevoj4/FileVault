import { apiRequest } from '../core/api.js';
import { t } from '../core/i18n.js';
import { showToast, showConfirm } from '../core/ui.js';

let currentFileToRename = { id: null, name: "" };

export async function loadFiles() {
    const tbody = document.getElementById('filesTable');
    if (!tbody) return;

    try {
        const res = await apiRequest('/api/files/list');
        const files = await res.json();
        const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
        const currentUserId = userData.id;
        const userLvl = userData.accessLevel;
        
        if (files.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${t('noFilesFound')}</td></tr>`;
            return;
        }

        tbody.innerHTML = files.map(f => {
            const isOwner = f.ownerId === currentUserId;
            const canDownload = userLvl >= 2;
            const canEdit = (isOwner && userLvl >= 3) || userLvl >= 5;
            const canLock = userLvl >= 4;

            let buttons = '';
            if (canDownload) {
                buttons += `<button class="btn-sm btn-primary" data-action="download" data-id="${f.id}">📥</button>`;
            }
            if (canEdit) {
                buttons += `<button class="btn-sm btn-secondary" data-action="rename" data-id="${f.id}" data-name="${escapeHtml(f.virtualName)}">✏️</button>`;
                buttons += `<button class="btn-sm btn-danger" data-action="delete" data-id="${f.id}">🗑️</button>`;
            }
            if (canLock) {
                const lockAction = f.isLocked ? 'unlock' : 'lock';
                const lockClass = f.isLocked ? 'btn-danger' : 'btn-success';   // locked -> красный, unlocked -> зелёный
                const lockIcon = f.isLocked ? '🔒' : '🔓';
                buttons += `<button class="btn-sm ${lockClass}" data-action="${lockAction}" data-id="${f.id}">${lockIcon}</button>`;
            }

            return `
                <tr data-file-id="${f.id}">
                    <td data-label="${t('thFileName')}"><b>${escapeHtml(f.virtualName)}</b></td>
                    <td data-label="${t('thSize')}">${(f.size / 1024).toFixed(1)} KB</td>
                    <td data-label="${t('thUser')}"><span class="badge">${isOwner ? t('youLabel') : t('ownerLabel')}</span></td>
                    <td data-label="${t('thAction')}">${f.isLocked ? '🔒' : '🔓'}</td>
                    <td data-label="${t('thAction')}" class="actions-cell">${buttons}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        showToast(t('toastLoadError') || 'Failed to load files', 'error');
    }
    loadStorageStats();
}

export async function loadStorageStats() {
    try {
        const res = await apiRequest('/api/files/storage-stats');
        const stats = await res.json();
        const bar = document.getElementById('storage-bar');
        const text = document.getElementById('storage-text');
        const infoPanel = document.getElementById('storage-info');

        if (infoPanel) infoPanel.classList.remove('hidden');
        if (bar) {
            bar.style.width = stats.percentUsed + '%';
            // Используем класс вместо прямого style.background
            if (stats.percentUsed > 80) {
                bar.classList.add('warning');
            } else {
                bar.classList.remove('warning');
            }
        }
        if (text) {
            text.innerText = `${stats.used} GB / ${stats.total} GB (${stats.percentUsed}%)`;
        }
    } catch (err) {
        const infoPanel = document.getElementById('storage-info');
        if (infoPanel) infoPanel.classList.add('hidden');
    }
}

export async function uploadFile() {
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 3) return showToast(t('toastAccessDenied_3'), "error");

    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files[0]) return showToast(t('noFileSelected'), "error");

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');

    container.classList.remove('hidden');
    text.classList.remove('hidden');

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            bar.style.width = percent + '%';
            text.innerText = `${t('uploading')}: ${percent}%`;
        }
    };

    xhr.onload = async () => {
        container.classList.add('hidden');
        text.classList.add('hidden');
        if (xhr.status >= 200 && xhr.status < 300) {
            showToast(t('toastFileUploaded') || "Success!");
            fileInput.value = '';
            const display = document.getElementById('fileNameDisplay');
            if(display) {
                display.innerText = t('noFileSelected');
                display.classList.remove('selected');
            }
            await loadFiles();
        } else {
            showToast(t('toastFileUploadedError'), "error");
        }
    };

    xhr.onerror = () => {
        container.classList.add('hidden');
        text.classList.add('hidden');
        showToast(t('toastNetError'), "error");
    };

    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
}

export function downloadFile(fileId) {
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 2) return showToast(t('toastAccessDenied_2'), "error");
    window.location.href = `/api/files/download/${fileId}`;
}

export async function lockFile(fileId) {
    try {
        await apiRequest(`/api/files/lock/${fileId}`, 'PUT');
        showToast(t('toastFileLocked'));
        loadFiles();
    } catch (err) {
        showToast(t('toastFileLockedError'), "error");
    }
}

export async function unlockFile(fileId) {
    try {
        await apiRequest(`/api/files/unlock/${fileId}`, 'PUT');
        showToast(t('toastFileUnlocked'));
        loadFiles();
    } catch (err) {
        showToast(t('toastFileUnlockedError'), "error");
    }
}

export async function deleteFileOnServer(fileId) {
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 3) return showToast(t('toastAccessDenied'), "error");
    
    // Заменяем confirm на кастомное окно
    const confirmed = await showConfirm(t('confirmDelete') || "Delete this file?");
    if (!confirmed) return;

    try {
        await apiRequest(`/api/files/delete/${fileId}`, 'DELETE');
        showToast(t('toastFileDeleted'));
        loadFiles();
    } catch (err) {
        showToast(err.message || t('toastFileDeleteError'), 'error');
    }
}

export function renamePrompt(fileId, oldName) {
    currentFileToRename = { id: fileId, name: oldName };
    const oldSpan = document.getElementById('renameOldNameDisplay');
    if (oldSpan) oldSpan.innerText = oldName;
    const input = document.getElementById('renameInput');
    if (input) input.value = "";
    const modal = document.getElementById('rename-modal');
    if (modal) modal.classList.remove('hidden');
    // Блокировка прокрутки фона
    document.body.classList.add('modal-open');
}

export function closeRenameModal() {
    const modal = document.getElementById('rename-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

export async function confirmRename() {
    const newNameRaw = document.getElementById('renameInput').value.trim();
    if (!newNameRaw) return showToast(t('toastNameEmpty'), 'error');

    const { id: fileId, name: oldName } = currentFileToRename;
    const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
    let newName = newNameRaw.endsWith(ext) ? newNameRaw : newNameRaw + ext;

    try {
        await apiRequest('/api/files/rename', 'PUT', { id: fileId, NewName: newName });
        showToast(t('toastFileRenamed'));
        closeRenameModal();
        loadFiles();
    } catch (err) {
        showToast(t('toastFileRenameError'), 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}