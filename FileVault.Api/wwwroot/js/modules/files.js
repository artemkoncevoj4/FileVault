import { apiRequest } from '../core/api.js';
import { t } from '../core/i18n.js';
import { showToast, showConfirm } from '../core/ui.js';

let currentFileToRename = { id: null, name: "" };
let dropzoneInitialized = false;

// ==================== STORAGE STATS ====================
export async function loadStorageStats() {
    try {
        const res = await apiRequest('/api/files/storage-stats');
        const stats = await res.json();
        
        // Бэкенд возвращает total (GB), used (GB), percentUsed (%)
        const totalGB = stats.total || 0;
        const usedGB = stats.used || 0;
        const percentUsed = stats.percentUsed || 0;
        const freeGB = totalGB - usedGB;
        
        // Прогресс-бар
        const bar = document.getElementById('storageBar');
        if (bar) {
            bar.style.width = `${Math.min(100, percentUsed)}%`;
            if (percentUsed > 80) {
                bar.classList.add('warning');
            } else {
                bar.classList.remove('warning');
            }
        }
        
        // Текст статистики
        const text = document.getElementById('storageText');
        if (text) {
            text.innerText = `${t('storageUsed')}: ${usedGB.toFixed(2)} GB / ${totalGB.toFixed(2)} GB (${t('storageFree')}: ${freeGB.toFixed(2)} GB)`;
        }
        
        const infoPanel = document.querySelector('.storage-info');
        if (infoPanel) infoPanel.classList.remove('hidden');
        
    } catch (err) {
        console.error('Storage stats error:', err);
        const infoPanel = document.querySelector('.storage-info');
        if (infoPanel) infoPanel.classList.add('hidden');
    }
}
// ==================== DROP ZONE ====================
export function initDropZone() {
    if (dropzoneInitialized) return;
    
    const dropzone = document.getElementById('dropzoneArea');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    
    if (!dropzone || !fileInput) return;
    
    // Click on dropzone triggers file selection
    dropzone.addEventListener('click', (e) => {
        if (e.target === fileInput) return;
        fileInput.click();
    });
    
    // File input change handler
    fileInput.addEventListener('change', (e) => {
        updateFileNameDisplay(fileInput.files[0], fileNameDisplay);
    });
    
    // Drag & drop handlers
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileNameDisplay(files[0], fileNameDisplay);
            showToast(t('toastFileSelected'), 'success');
        }
    });
    
    dropzoneInitialized = true;
}

function updateFileNameDisplay(file, displayElement) {
    if (file) {
        displayElement.innerText = `${t('selectedFile')}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        displayElement.classList.add('selected');
    } else {
        displayElement.innerText = t('noFileSelected');
        displayElement.classList.remove('selected');
    }
}

// ==================== FILE UPLOAD ====================
export function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast(t('noFileSelected'), 'error');
        return;
    }
    
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 3) {
        showToast(t('toastAccessDenied'), 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload', true);
    
    if (userData.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${userData.token}`);
    }
    
    const pgContainer = document.getElementById('uploadProgressContainer');
    const pgBar = document.getElementById('uploadProgressBar');
    if (pgContainer) pgContainer.classList.remove('hidden');
    
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && pgBar) {
            const percent = (e.loaded / e.total) * 100;
            pgBar.style.width = `${percent}%`;
        }
    };
    
    xhr.onload = () => {
        if (pgContainer) pgContainer.classList.add('hidden');
        
        if (xhr.status === 200 || xhr.status === 201) {
            showToast(t('toastUploadSuccess'), 'success');
            // Reset file input
            fileInput.value = '';
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (fileNameDisplay) {
                fileNameDisplay.innerText = t('noFileSelected');
                fileNameDisplay.classList.remove('selected');
            }
            loadFiles();
            loadStorageStats();
        } else {
            let errorMsg = t('toastUploadError');
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) {}
            showToast(errorMsg, 'error');
        }
    };
    
    xhr.onerror = () => {
        if (pgContainer) pgContainer.classList.add('hidden');
        showToast(t('toastUploadError'), 'error');
    };
    
    xhr.send(formData);
}

// ==================== FILE MANAGEMENT ====================
export async function loadFiles() {
    const tbody = document.getElementById('filesTable');
    if (!tbody) return;

    try {
        const res = await apiRequest('/api/files/list');
        const files = await res.json();
        
        const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
        const currentUserId = Number(userData.id);
        const userLvl = Number(userData.accessLevel) || 0;

        if (!files || files.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${t('noFilesFound')}</td></tr>`;
            return;
        }

        tbody.innerHTML = files.map(f => {
            const fId = f.id || f.Id;
            const fOwnerId = f.ownerId || f.UserId;
            const fName = f.virtualName || f.VirtualName || 'Unnamed';
            const fSize = f.size || f.Size || 0;
            const fLocked = f.isLocked || f.IsLocked || false;

            const isOwner = Number(fOwnerId) === currentUserId;
            const canDownload = userLvl >= 2;
            const canEdit = (isOwner && userLvl >= 3) || userLvl >= 5;
            const canLock = userLvl >= 4;

            let buttons = '';
            if (canDownload) {
                buttons += `<button class="btn-sm btn-primary" data-action="download" data-id="${fId}">📥</button>`;
            }
            if (canEdit) {
                const escapedName = escapeHtml(fName);
                buttons += `<button class="btn-sm btn-warning" data-action="rename" data-id="${fId}" data-name="${escapedName}">✏️</button>`;
                buttons += `<button class="btn-sm btn-danger" data-action="delete" data-id="${fId}">🗑️</button>`;
            }
            if (canLock) {
                const btnClass = fLocked ? 'btn-danger' : 'btn-secondary';
                const action = fLocked ? 'unlock' : 'lock';
                buttons += `<button class="btn-sm ${btnClass}" data-action="${action}" data-id="${fId}">${fLocked ? '🔓' : '🔒'}</button>`;
            }

            return `
                <tr>
                    <td style="text-align:center">${fLocked ? '🔒' : '🔓'}</td>
                    <td class="file-name-cell">${escapeHtml(fName)}</td>
                    <td>${(fSize / 1024).toFixed(1)} KB</td>
                    <td>${isOwner ? `<b>${t('youLabel') || 'You'}</b>` : 'User#' + fOwnerId}</td>
                    <td style="text-align: right;">${buttons}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
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
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
}