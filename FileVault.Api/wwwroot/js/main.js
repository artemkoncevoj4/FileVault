import { login, logout, register } from './modules/user.js';
import { loadFiles, uploadFile, downloadFile, lockFile, unlockFile, deleteFileOnServer, renamePrompt, closeRenameModal, confirmRename } from './modules/files.js';
import { loadAdminData, changeLevel, deleteUser } from './modules/admin.js';
import { showTerms, showPrivacy } from './core/special_ui.js';

// Expose functions to the window object so HTML onclick events can access them
window.login = login;
window.logout = logout;
window.register = register;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;
window.uploadFile = uploadFile;
window.closeRenameModal = closeRenameModal;
window.confirmRename = confirmRename;
window.changeLevel = changeLevel;
window.deleteUser = deleteUser;

// Global handler for file actions
window.safeAction = (action, id, name) => {
    if (action === 'download') downloadFile(id);
    if (action === 'lock') lockFile(id);
    if (action === 'unlock') unlockFile(id);
    if (action === 'delete') deleteFileOnServer(id);
    if (action === 'rename') renamePrompt(id, name);
};

// Authorization check and UI state management
window.checkAuth = function() {
    const userData = localStorage.getItem('vault_user');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('profile-panel').classList.remove('hidden');
        document.getElementById('files-panel').classList.remove('hidden');
        document.getElementById('welcomeText').innerText = `Hello, ${user.login}!`;
        document.getElementById('userLevel').innerText = user.accessLevel;

        if (user.accessLevel >= 5) {
            document.getElementById('admin-panel').classList.remove('hidden');
            loadAdminData();
        }
        if (user.accessLevel >= 3) {
            document.getElementById('upload-section').classList.remove('hidden');
        }
        loadFiles();
    } else {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('profile-panel').classList.add('hidden');
        document.getElementById('files-panel').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.checkAuth();
    
    // Listener to display the selected file name in a clean way
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const display = document.getElementById('fileNameDisplay');
            if (fileInput.files[0]) {
                display.innerText = "Selected file: " + fileInput.files[0].name;
                display.style.color = "#28a745";
            } else {
                display.innerText = "No file selected";
                display.style.color = "#666";
            }
        });
    }
});