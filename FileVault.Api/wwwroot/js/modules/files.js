import { apiRequest } from '../core/api.js';
import { showToast } from '../core/ui.js';

let currentFileToRename = { id: null, name: "" };

export function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) return showToast("Please select a file", "error");

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

    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            bar.style.width = percent + '%';
            text.innerText = `Uploading: ${percent}%`;
        }
    };

    xhr.onload = async function() {
        container.classList.add('hidden');
        text.classList.add('hidden');
        bar.style.width = '0%';

        if (xhr.status >= 200 && xhr.status < 300) {
            showToast("File uploaded successfully");
            fileInput.value = '';
            await loadFiles();
        } else {
            showToast("Upload error: " + xhr.responseText, "error");
        }
    };

    xhr.onerror = () => {
        showToast("Critical network error", "error");
        container.classList.add('hidden');
    };

    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
}

export async function loadFiles() {
    const userJson = localStorage.getItem('vault_user');
    if (!userJson) return;
    const user = JSON.parse(userJson);
    const lvl = user.accessLevel;
    const currentUserId = user.id;

    const res = await apiRequest('/api/files/list');
    if (res.ok) {
        const files = await res.json();
        const list = document.getElementById('file-list');

        list.innerHTML = files.map(file => {
            const isOwner = file.ownerId === currentUserId;
            const isAdmin = lvl === 5;

            return `
                <div class="file-item" style="${file.isLocked ? 'background: #fff3cd;' : ''}">
                    <div>
                        <span>${file.isLocked ? '🔒' : '📄'} <b>${file.virtualName}</b></span>
                        <br><small style="color: gray;">Owner: #${file.ownerId} ${isOwner ? '(You)' : ''}</small>
                    </div>
                    <div>
                        ${lvl >= 2 ? `<button onclick="safeAction('download', ${file.id})" class="btn-success">Download</button>` : ''}
                        ${lvl >= 4 ? (file.isLocked ? 
                            `<button onclick="safeAction('unlock', ${file.id})" style="background: #007bff; margin-left: 5px;">Unlock</button>` : 
                            `<button onclick="safeAction('lock', ${file.id})" style="background: #6c757d; margin-left: 5px;">Lock</button>`) : ''}
                        ${(lvl >= 3 && isOwner) || isAdmin ? 
                            `<button onclick="safeAction('rename', ${file.id}, '${file.virtualName}')" style="background: #17a2b8; margin-left: 5px;">✏️</button>` : ''}
                        ${(lvl >= 3 && isOwner) || isAdmin ? 
                            `<button onclick="safeAction('delete', ${file.id})" class="btn-danger" style="margin-left: 5px;">Delete</button>` : ''}
                    </div>
                </div>`;
        }).join('');
    } 
    else
    {
        showToast("Error loading file list", 'error');
    }
}

export async function downloadFile(fileId) {
    const response = await fetch(`/api/files/download/${fileId}`, { credentials: 'same-origin' });
    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'file';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'";]+)['"]?/);
            if (match) fileName = decodeURIComponent(match[1]);
        }
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } else {
        showToast("Download error", 'error');
    }
}

export async function lockFile(fileId) {
    const res = await apiRequest(`/api/files/lock/${fileId}`, 'PUT');
    if (res.ok) {
        showToast("File locked");
        loadFiles();
    } else {
        showToast("Error locking file", 'error');
    }
}

export async function unlockFile(fileId) {
    const res = await apiRequest(`/api/files/unlock/${fileId}`, 'PUT');
    if (res.ok) {
        showToast("File unlocked");
        loadFiles();
    } else {
        showToast("Error unlocking file", 'error');
    }
}

export async function deleteFileOnServer(fileId) {
    if (!confirm("Permanently delete this file?")) return;
    const res = await apiRequest(`/api/files/delete/${fileId}`, 'DELETE');
    if (res.ok) {
        showToast("File deleted");
        loadFiles();
    } else {
        const err = await res.text();
        showToast("Error: " + err, 'error');
    }
}

export function renamePrompt(fileId, oldName) {
    currentFileToRename = { id: fileId, name: oldName };
    document.getElementById('renameOldNameDisplay').innerText = oldName;
    document.getElementById('renameInput').value = "";
    document.getElementById('rename-modal').classList.remove('hidden');
}

export function closeRenameModal() {
    document.getElementById('rename-modal').classList.add('hidden');
    currentFileToRename = { id: null, name: "" };
}

export async function confirmRename() {
    const newNameRaw = document.getElementById('renameInput').value.trim();
    const { id: fileId, name: oldName } = currentFileToRename;

    if (!newNameRaw) return showToast("Name is empty!", 'error');

    const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
    let newName = newNameRaw.endsWith(ext) ? newNameRaw : newNameRaw + ext;

    closeRenameModal();
    const res = await apiRequest('/api/files/rename', 'PUT', { id: fileId, NewName: newName });

    if (res.ok) {
        showToast("File renamed!");
        loadFiles();
    } else {
        showToast("Server error: " + await res.text(), 'error');
    }
}