import { login, logout, register } from './modules/user.js';
import { 
    loadFiles, 
    loadStorageStats,
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
import { initConfirmModal } from './core/ui.js';
initConfirmModal();

// Глобальные функции, которые вызываются из HTML (например, changeLanguage, login, register)
// Но лучше избегать onclick в HTML, поэтому перенаправим через делегирование. Однако для простоты оставим пока.
window.changeLanguage = changeLanguage;


// Обработчик кликов с делегированием для динамических элементов
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');
    const name = target.getAttribute('data-name');

    switch (action) {
        case 'download':
            downloadFile(parseInt(id));
            break;
        case 'lock':
            lockFile(parseInt(id));
            break;
        case 'unlock':
            unlockFile(parseInt(id));
            break;
        case 'delete':
            deleteFileOnServer(parseInt(id));
            break;
        case 'rename':
            renamePrompt(parseInt(id), name);
            break;
        case 'change-level':
            changeLevel(parseInt(id));
            break;
        case 'delete-user':
            deleteUser(parseInt(id));
            break;
        case 'login':
            login();
            break;
        case 'register':
            register();
            break;
        case 'logout':
            logout();
            break;
        case 'upload':
            uploadFile();
            break;
        case 'close-rename':
            closeRenameModal();
            break;
        case 'confirm-rename':
            confirmRename();
            break;
        case 'show-terms':
            showTerms();
            break;
        case 'show-privacy':
            showPrivacy();
            break;
        case 'close-legal':
            document.getElementById('legal-modal')?.classList.add('hidden');
            break;

    }
});

// Обработчик для закрытия модалки по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay:not(.hidden), #rename-modal:not(.hidden)');
        if (modal && modal.id === 'rename-modal') {
            closeRenameModal();
        }
        // можно добавить другие модалки
    }
});

// Блокировка прокрутки фона (CSS класс)
// Добавим в base.css:
// body.modal-open { overflow: hidden; }

window.checkAuth = function() {
    const userDataRaw = localStorage.getItem('vault_user');
    let user = null;
    try {
        user = userDataRaw ? JSON.parse(userDataRaw) : null;
    } catch (e) {
        console.error('Invalid localStorage data', e);
        localStorage.removeItem('vault_user');
        user = null;
    }

    if (user) {
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
        
        if (user.accessLevel >= 3) {
            document.getElementById('upload-section').classList.remove('hidden');
            loadStorageStats(); 
        }
        loadFiles();
    } else {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('profile-panel').classList.add('hidden');
        document.getElementById('files-panel').classList.add('hidden');
        document.getElementById('admin-panel')?.classList.add('hidden');
        document.getElementById('upload-section')?.classList.add('hidden');
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
                display.classList.add('selected');
            } else {
                display.innerText = t('noFileSelected');
                display.classList.remove('selected');
            }
        });
    }
});
document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
    });
});