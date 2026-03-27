import { login, logout, register } from './modules/user.js';
import { 
    loadFiles, 
    loadStorageStats, // Импортируем из files.js
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
import { t, applyTranslations, changeLanguage } from './core/i18n.js';

// Прокидываем функции в глобальную область видимости
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
window.changeLanguage = changeLanguage;

window.safeAction = (action, id, name) => {
    if (action === 'download') downloadFile(id);
    if (action === 'lock') lockFile(id);
    if (action === 'unlock') unlockFile(id);
    if (action === 'delete') deleteFileOnServer(id);
    if (action === 'rename') renamePrompt(id, name);
};

window.checkAuth = function() {
    const userData = localStorage.getItem('vault_user');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('profile-panel').classList.remove('hidden');
        document.getElementById('files-panel').classList.remove('hidden');
        
        const welcomeEl = document.getElementById('welcomeText');
        const userLevelEl = document.getElementById('userLevel');
        if (welcomeEl) welcomeEl.innerText = `${t('welcomePrefix')}, ${user.login}!`;
        if (userLevelEl) userLevelEl.innerText = user.accessLevel;

        if (user.accessLevel >= 5) {
            document.getElementById('admin-panel').classList.remove('hidden');
            loadAdminData();
        }
        
        // Для уровня 3+ показываем загрузку и шкалу
        if (user.accessLevel >= 3) {
            document.getElementById('upload-section').classList.remove('hidden');
            // Вызываем импортированную функцию из files.js
            loadStorageStats(); 
        }
        loadFiles();
    } else {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('profile-panel').classList.add('hidden');
        document.getElementById('files-panel').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    window.checkAuth();
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const display = document.getElementById('fileNameDisplay');
            if (fileInput.files[0]) {
                display.innerText = `${t('selectedFile')}: ${fileInput.files[0].name}`;
                display.style.color = "#28a745";
            } else {
                display.innerText = t('noFileSelected');
                display.style.color = "#666";
            }
        });
    }
});