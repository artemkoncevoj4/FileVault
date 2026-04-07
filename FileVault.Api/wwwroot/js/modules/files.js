import { apiRequest } from '../core/api.js';
import { showToast } from '../core/ui.js';
import { t } from '../core/i18n.js';

let currentFileToRename = { id: null, name: "" };

// --- Загрузка списка файлов ---
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
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">${t('noFilesFound')}</td></tr>`;
            return;
        }

        tbody.innerHTML = files.map(f => {
            const isOwner = f.ownerId === currentUserId;
            const canDownload = userLvl >= 2;
            const canEdit = (isOwner && userLvl >= 3) || userLvl >= 5;
            const canLock = userLvl >= 4;

            return `
                <tr>
                    <td><b>${escapeHtml(f.virtualName)}</b></td>
                    <td>${(f.size / 1024).toFixed(1)} KB</td>
                    <td><span class="badge">${isOwner ? t('youLabel') : t('ownerLabel')}</span></td>
                    <td>${f.isLocked ? '🔒' : '🔓'}</td>
                    <td>
                        <div class="btn-group" style="display:flex; gap:5px;">
                            ${canDownload ? `<button class="btn-sm btn-primary" onclick="safeAction('download', ${f.id})">📥</button>` : ''}
                            ${canEdit ? `
                                <button class="btn-sm btn-secondary" onclick="safeAction('rename', ${f.id}, '${escapeHtml(f.virtualName)}')">✏️</button>
                                <button class="btn-sm btn-danger" onclick="safeAction('delete', ${f.id})">🗑️</button>
                            ` : ''}
                            ${canLock ? `
                                <button class="btn-sm ${f.isLocked ? 'btn-success' : 'btn-warning'}" onclick="safeAction('${f.isLocked ? 'unlock' : 'lock'}', ${f.id})">
                                    ${f.isLocked ? '🔓' : '🔒'}
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
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
            bar.style.background = stats.percentUsed > 80 
                ? "linear-gradient(90deg, #ff416c, #ff4b2b)" 
                : "linear-gradient(90deg, #007bff, #3395ff)";
        }
        if (text) {
            text.innerText = `${stats.used} GB / ${stats.total} GB (${stats.percentUsed}%)`;
        }
    } catch (err) {
        // Не показываем тост, просто скрываем панель или оставляем как есть
        const infoPanel = document.getElementById('storage-info');
        if (infoPanel) infoPanel.classList.add('hidden');
    }
}

// --- Операции с файлами ---
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
            if(display) display.innerText = t('noFileSelected');
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
    
    if (!confirm(t('confirmDelete') || "Delete this file?")) return;

    try {
        await apiRequest(`/api/files/delete/${fileId}`, 'DELETE');
        showToast(t('toastFileDeleted'));
        loadFiles();
    } catch (err) {
        showToast(t('toastFileDeleteError'), 'error');
    }
}

// --- Переименование ---
export function renamePrompt(fileId, oldName) {
    currentFileToRename = { id: fileId, name: oldName };
    document.getElementById('renameOldNameDisplay').innerText = oldName;
    document.getElementById('renameInput').value = "";
    document.getElementById('rename-modal').classList.remove('hidden');
}

export function closeRenameModal() {
    document.getElementById('rename-modal').classList.add('hidden');
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

// Вспомогательная функция для экранирования HTML (чтобы XSS не было)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// Глобальная функция safeAction (используется в onclick)
window.safeAction = function(action, id, name) {
    if (action === 'download') downloadFile(id);
    else if (action === 'rename') renamePrompt(id, name);
    else if (action === 'delete') deleteFileOnServer(id);
    else if (action === 'lock') lockFile(id);
    else if (action === 'unlock') unlockFile(id);
};