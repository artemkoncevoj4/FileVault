// Словарь с переводами
export const translations = {
    en: {
        // --- Auth Panel ---
        signInTitle: "Sign In",
        loginPlaceholder: "Username",
        passPlaceholder: "Password",
        loginBtn: "Login",
        createAccBtn: "Create Account",

        // --- Profile Panel ---
        welcomePrefix: "Hello",
        logoutBtn: "Logout",
        accessLevelLabel: "Access Level:",

        // --- Files Panel ---
        filesTitle: "📂 My Files",
        uploadAvailable: "✓ File upload available (Level 3+)",
        selectFilePrompt: "Click here to select files",
        noFileSelected: "No file selected",
        noFilesFound: "No files found",
        uploadBtn: "Upload to Server",
        loadingFiles: "Loading file list...",
        uploading: "Uploading",
        selectedFile: "Selected file",

        // --- File Item Buttons/Labels ---
        ownerLabel: "Owner",
        youLabel: "(You)",
        downloadBtn: "Download",
        lockBtn: "Lock",
        unlockBtn: "Unlock",
        deleteBtn: "Delete",

        // --- Table Headers ---
        thFileName: "Name",
        thSize: "Size",
        thUser: "Owner/User",
        thLevel: "Level",
        thAction: "Action",
        thId: "ID",

        // --- Buttons & Common ---
        saveBtn: "Save Changes",
        cancelBtn: "Cancel",
        confirmDelete: "Are you sure you want to delete this?",

        // --- Admin Panel ---
        adminTitle: "👑 Admin Center",
        thId: "ID",
        thUser: "Username",
        thLevel: "Level",
        thAction: "Action",
        adminOkBtn: "OK",

        // --- Modals & Footer ---
        tosLink: "Terms of Service",
        privacyLink: "Privacy Policy",
        modalUnderstand: "I Understand",
        renameTitle: "✏️ Rename",
        renameOldName: "Current name:",
        renameInputPlaceholder: "New name",
        cancelBtn: "Cancel",
        saveBtn: "Save Changes",
        confirmDelete: "Permanently delete this file?",

        // --- Toasts & Errors ---
        toastNetError: "Network error",
        toastRegError: "Something went wrong",
        toastNameEmpty: "Name cannot be empty!",
        toastLoginSuccess: "Login successful!",
        toastLoginFail: "Login failed: ",
        toastRegSuccess: "Registration successful!",
        toastFileDeleted: "File deleted",
        toastFileRenamed: "File renamed!",
        toastFileLocked: "The file is locked at a level lower than 4!",
        toastFileUnlocked: "The file is unlocked for all!",
        toastDownloadFail: "Download error!",
        toastUserDeleted: "User deleted",
        toastLvlUpdated: "Access level updated!"
    },
    ru: {
        // --- Auth Panel ---
        signInTitle: "Вход в систему",
        loginPlaceholder: "Ваш логин",
        passPlaceholder: "Пароль",
        loginBtn: "Войти",
        createAccBtn: "Создать аккаунт",

        // --- Profile Panel ---
        welcomePrefix: "Привет",
        logoutBtn: "Выйти",
        accessLevelLabel: "Ваш уровень доступа:",

        // --- Files Panel ---
        filesTitle: "📂 Мои файлы",
        uploadAvailable: "✓ Вам доступна загрузка (уровень 3+)",
        selectFilePrompt: "Нажмите здесь, чтобы выбрать файл",
        noFileSelected: "Файл не выбран",
        noFilesFound: "Файлы не найдены",
        uploadBtn: "Загрузить на сервер",
        loadingFiles: "Загрузка списка файлов...",
        uploading: "Загрузка",
        selectedFile: "Выбран файл",

        // --- File Item Buttons/Labels ---
        ownerLabel: "Владелец",
        youLabel: "(Вы)",
        downloadBtn: "Скачать",
        lockBtn: "Закрыть",
        unlockBtn: "Открыть",
        deleteBtn: "Удалить",

        // --- Table Headers ---
        thFileName: "Имя",
        thSize: "Размер",
        thUser: "Владелец",
        thLevel: "Уровень",
        thAction: "Действие",
        thId: "ID",

        // --- Buttons & Common ---
        saveBtn: "Сохранить",
        cancelBtn: "Отмена",
        confirmDelete: "Вы уверены, что хотите это удалить?",

        // --- Admin Panel ---
        adminTitle: "👑 Админ-центр",
        thId: "ID",
        thUser: "Логин",
        thLevel: "Уровень",
        thAction: "Действие",
        adminOkBtn: "ОК",

        // --- Modals & Footer ---
        tosLink: "Условия использования",
        privacyLink: "Конфиденциальность",
        modalUnderstand: "Понятно",
        renameTitle: "✏️ Переименовать",
        renameOldName: "Старое имя:",
        renameInputPlaceholder: "Новое имя",
        cancelBtn: "Отмена",
        saveBtn: "Сохранить",
        confirmDelete: "Удалить файл навсегда?",

        // --- Toasts & Errors ---
        toastNetError: "Ошибка сети",
        toastRegError: "Произошла ошибка",
        toastNameEmpty: "Имя не может быть пустым!",
        toastLoginSuccess: "Вход выполнен!",
        toastLoginFail: "Ошибка входа: ",
        toastRegSuccess: "Регистрация успешна!",
        toastFileDeleted: "Файл удален",
        toastFileRenamed: "Файл переименован!",
        toastFileLocked: "Файл заблокирован для уровня меньше 4!",
        toastFileUnlocked: "Файл разблокирован для всех!",
        toastDownloadFail: "Ошибка скачивания",
        toastUserDeleted: "Пользователь удален",
        toastLvlUpdated: "Уровень доступа изменен!"
    }
};

// Функция применения перевода к странице
export function applyTranslations() {
    // Берем язык из памяти браузера, по умолчанию 'en'
    const lang = localStorage.getItem('vault_lang') || 'en';
    const dict = translations[lang];

    // Устанавливаем правильное значение в переключателе
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) langSwitch.value = lang;

    // Переводим обычный текст (заголовки, кнопки)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerText = dict[key];
    });

    // Переводим плейсхолдеры в инпутах
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
}

export function t(key) {
    const lang = localStorage.getItem('vault_lang') || 'en';
    return translations[lang][key] || key;
}
export function changeLanguage(lang) {
    localStorage.setItem('vault_lang', lang);
    applyTranslations();
    if (window.updateFileStatus) window.updateFileStatus(); // Обновляем текст файла
    if (window.checkAuth) window.checkAuth(); 
}