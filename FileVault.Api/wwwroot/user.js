export  async function login() {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('vault_user', JSON.stringify(data.user));
            
            showToast("Вход выполнен!");
            
            // 1. Переключаем экраны
            checkAuth(); 
            
            // 2. СРАЗУ грузим файлы (для всех)
            loadFiles(); 
            
            // 3. Если зашел админ (level 5+), принудительно грузим список юзеров
            if (data.user.accessLevel >= 5) {
                setTimeout(() => loadUsers(), 100); // Небольшая задержка, чтобы DOM успел обновиться
            }
        } else {
        const error = await res.text();
        showToast("Ошибка входа: " + error, 'error');
        }
    }
 export async function logout() {
        try {
            // 1. Пытаемся удалить куку на сервере
            await fetch('/api/auth/logout', { 
                method: 'POST',
                credentials: 'same-origin' 
            });
        } catch (e) {
            console.error("Ошибка при запросе на логаут:", e);
        }

        // 2. Очищаем данные пользователя из браузера
        localStorage.removeItem('vault_user');
        localStorage.removeItem('vault_token'); // На всякий случай, если остался старый

        // 3. Полностью перезагружаем страницу, чтобы сбросить состояние интерфейса
        window.location.reload();
    }

 export   async function register() {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        if (response.ok) {
            showToast("Регистрация успешна! Теперь войдите.");
        } else {
            const error = await response.text();
            showToast("Ошибка регистрации: " + error, 'error');
        }
    }