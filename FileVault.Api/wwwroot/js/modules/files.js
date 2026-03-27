import { apiRequest } from '../core/api.js';
import { showToast } from '../core/ui.js';
import { t } from '../core/i18n.js';

let currentFileToRename = { id: null, name: "" };

// --- Загрузка списка файлов ---
export async function loadFiles() {
    const tbody = document.getElementById('filesTable');
    if (!tbody) return;


    const res = await apiRequest('/api/files/list');
    if (res.ok) {
        const files = await res.json();
        const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
        const currentUserId = userData.id;

        if (files.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">${t('noFilesFound')}</td></tr>`;
            return;
        }

        tbody.innerHTML = files.map(f => {
            const isOwner = f.ownerId === currentUserId;
            const userLvl = userData.accessLevel;
            
            // --- ПРОВЕРКА ПРАВ ---
            const canDownload = userLvl >= 2;
            const canDelete = (isOwner && userLvl >= 3) || userLvl >= 5;
            const canRename = (isOwner && userLvl >= 3) || userLvl >= 5;
            // Блокировать может владелец (3+) или модератор (4+) файлы тех, кто ниже уровнем
            const canToggleLock = userLvl >= 4 || (isOwner && userLvl >= 3);

            return `
                <tr>
                    <td class="file-name-cell"><b>${f.virtualName}</b></td>
                    <td>${(f.size / 1024).toFixed(1)} KB</td>
                    <td><span class="badge">${isOwner ? t('youLabel') : t('ownerLabel')}</span></td>
                    <td class="status-cell">${f.isLocked ? '🔒' : '🔓'}</td>
                    <td class="actions-cell">
                        <div class="btn-group">
                            ${canDownload ? `
                                <button class="btn-sm btn-primary" onclick="safeAction('download', ${f.id})">${t('downloadBtn')}</button>
                            ` : ''}
                            
                            ${canRename ? `<button class="btn-sm btn-secondary" onclick="safeAction('rename', ${f.id}, '${f.virtualName}')">✏️</button>` : ''}
                            
                            ${canToggleLock ? `
                                <button class="btn-sm ${f.isLocked ? 'btn-success' : 'btn-warning'}" onclick="safeAction('${f.isLocked ? 'unlock' : 'lock'}', ${f.id})">
                                    ${f.isLocked ? '🔓' : '🔒'}
                                </button>
                            ` : ''}

                            ${canDelete ? `<button class="btn-sm btn-danger" onclick="safeAction('delete', ${f.id})">🗑️</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// --- Операции с файлами ---

export async function uploadFile() {
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 3) return showToast("Access Denied (Level 3 required)", "error");

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
            // Сбрасываем текст выбора файла в UI
            const display = document.getElementById('fileNameDisplay');
            if(display) display.innerText = t('noFileSelected');
            await loadFiles();
        } else {
            showToast("Upload failed", "error");
        }
    };

    xhr.open('POST', '/api/files/upload'); // Убедись, что путь совпадает с контроллером
    xhr.send(formData);
}

export function downloadFile(fileId) {
    // Прямой переход по ссылке для скачивания (браузер сам обработает файл)
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 2) return showToast("Access Denied (Level 2 required)", "error");

    window.location.href = `/api/files/download/${fileId}`;
}

export async function lockFile(fileId) {
    const res = await apiRequest(`/api/files/lock/${fileId}`, 'PUT');
    if (res.ok) {
        showToast(t('toastFileLocked'));
        loadFiles();
    }
}

export async function unlockFile(fileId) {
    const res = await apiRequest(`/api/files/unlock/${fileId}`, 'PUT');
    if (res.ok) {
        showToast(t('toastFileUnlocked'));
        loadFiles();
    }
}

export async function deleteFileOnServer(fileId) {
    const userData = JSON.parse(localStorage.getItem('vault_user') || '{}');
    if (userData.accessLevel < 3) return showToast("Access Denied", "error");
    
    if (!confirm(t('confirmDelete') || "Delete this file?")) return;

    const res = await apiRequest(`/api/files/delete/${fileId}`, 'DELETE');
    if (res.ok) {
        showToast(t('toastFileDeleted'));
        loadFiles();
    } else {
        showToast("Error deleting file", 'error');
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

    const res = await apiRequest('/api/files/rename', 'PUT', { id: fileId, NewName: newName });
    if (res.ok) {
        showToast(t('toastFileRenamed'));
        closeRenameModal();
        loadFiles();
    }
}