import { login, logout, register } from './modules/user.js';
import { 
    loadFiles, 
    uploadFile, 
    downloadFile,
    lockFile, 
    unlockFile, 
    deleteFileOnServer, 
    renamePrompt, 
    closeRenameModal, 
    confirmRename 
} from './modules/files.js';
import { loadAdminData, changeLevel, deleteUser } from './modules/admin.js';
import { showTerms, showPrivacy } from './core/special_ui.js';
import { t, applyTranslations, changeLanguage } from './core/i18n.js'; // Добавили импорты здесь

// Прокидываем функции в глобальную область видимости (window)
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
window.changeLanguage = changeLanguage; // Теперь это будет работать

window.safeAction = (action, id, name) => {
    if (action === 'download') downloadFile(id);
    if (action === 'lock') lockFile(id);
    if (action === 'unlock') unlockFile(id);
    if (action === 'delete') deleteFileOnServer(id);
    if (action === 'rename') renamePrompt(id, name);
};

window.checkAuth = function() {
    const userData = localStorage.getItem('vault_user');
    const welcomeEl = document.getElementById('welcomeText');
    const userLevelEl = document.getElementById('userLevel');

    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('profile-panel').classList.remove('hidden');
        document.getElementById('files-panel').classList.remove('hidden');
        
        // Используем t() для приветствия, чтобы оно менялось при смене языка
        if (welcomeEl) welcomeEl.innerText = `${t('welcomePrefix')}, ${user.login}!`;
        if (userLevelEl) userLevelEl.innerText = user.accessLevel;

        if (user.accessLevel >= 5) {
            document.getElementById('admin-panel').classList.remove('hidden');
            loadAdminData();
        }
        if (user.accessLevel >= 3) {
            document.getElementById('upload-section').classList.remove('hidden');
        } else {
            document.getElementById('upload-section').classList.add('hidden');
        }
        loadFiles();
    } else {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('profile-panel').classList.add('hidden');
        document.getElementById('files-panel').classList.add('hidden');
    }
};
window.updateFileStatus = function() {
    const fileInput = document.getElementById('fileInput');
    const display = document.getElementById('fileNameDisplay');
    if (!fileInput || !display) return;

    if (fileInput.files[0]) {
        display.innerText = `${t('selectedFile')}: ${fileInput.files[0].name}`;
        display.style.color = "#28a745";
    } else {
        display.innerText = t('noFileSelected');
        display.style.color = "#666";
    }
};
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    window.checkAuth();
    
    const fileInput = document.getElementById('fileInput');
    const updateFileStatus = () => {
        const display = document.getElementById('fileNameDisplay');
        if (!fileInput || !display) return;

        if (fileInput.files[0]) {
            display.innerText = `${t('selectedFile')}: ${fileInput.files[0].name}`;
            display.classList.add('selected'); // Добавляем класс для зеленого цвета
        } else {
            display.innerText = t('noFileSelected');
            display.classList.remove('selected');
        }
    };

    if (fileInput) {
        fileInput.addEventListener('change', updateFileStatus);
    }
});