# FileVault – личное облачное хранилище

## Оглавление
1. [Обзор проекта](#1-обзор-проекта)
2. [Начало работы](#2-начало-работы)
3. [Используемые технологии](#3-используемые-технологии)
4. [Структура каталогов](#4-структура-каталогов)
5. [Docker Compose](#5-docker-compose)
6. [Управление миграциями базы данных](#6-управление-миграциями-базы-данных)
7. [Развертывание на сервере](#7-развертывание-на-сервере)
8. [Тестирование](#8-тестирование)
9. [Заключение](#заключение)
---

### 1. Обзор проекта

**FileVault** — это безопасное облачное хранилище файлов с веб-интерфейсом.  
Проект реализован на ASP.NET Core 9.0 (бэкенд) и чистом JavaScript (фронтенд).  
**Основные возможности:**
- Регистрация и аутентификация (JWT в cookie, BCrypt для паролей).
- Загрузка, скачивание, удаление, переименование файлов.
- Дедупликация файлов по SHA-256.
- Уровни доступа (1–5): обычный пользователь, загрузчик, модератор, администратор.
- Админ-панель для управления пользователями.
- Полностью адаптивный интерфейс с поддержкой тёмной темы (опционально) и локализацией (en/ru).

---

### 2. Начало работы

#### Требования
- Docker и Docker Compose (рекомендуется)
- .NET SDK 9.0 (только для локальной разработки)

#### Быстрый старт с Docker

```bash
git clone https://github.com/artemkoncevoj4/FileVault.git
cd FileVault

# Скопируйте и настройте переменные окружения (если нужно)
cp .env.example .env

# Запустите контейнеры
docker compose up -d
```
После этого приложение будет доступно по адресу https://ваш-домен:8443 (настройки Caddy берутся из Caddyfile).

Для локальной разработки (без Docker) используйте:
```bash
cd FileVault.Api
dotnet restore
dotnet run
```
---

### 3. Используемые технологии
| Технология | Назначение |
| ---------- | ---------- |
| ASP.NET Core 9.0 |	Бэкенд API, middleware, контроллеры |
| Entity Framework Core 9.0	| ORM, миграции, работа с SQLite |
| SQLite	| База данных (файл dbdata/database.db) |
| JWT (Bearer + cookie) |	Аутентификация и авторизация |
| BCrypt.Net-Next	| Хеширование паролей |
| Docker + Caddy	| Контейнеризация, reverse proxy, HTTPS |
| Vanilla JS (ES6 modules)	| Фронтенд (модульная структура, i18n, тосты) |
| CSS3 (адаптивный дизайн)	| Стили, разбитые на логические файлы |

---

### 4. Структура каталогов
```bash
FileVault/
├── Caddyfile                  # конфигурация reverse proxy
├── docker-compose.yml         # основной запуск
├── docker-compose.migrate.yml # временный контейнер для миграций
├── Dockerfile                 # сборка production-образа
├── FileVault.Api/             # бэкенд
│   ├── Controllers/           # API-контроллеры
│   ├── Database/              # контекст EF Core, модели User, Files
│   ├── Migrations/            # миграции EF Core (важно!)
│   ├── Utils/                 # хелперы, глобальная обработка ошибок
│   ├── Program.cs             # точка входа, настройка сервисов
│   ├── appsettings.json       # конфигурация (строка подключения и пр.)
│   └── wwwroot/               # статические файлы фронтенда
│       ├── css/               # стили (разбиты на компоненты)
│       ├── js/                # модули (core, modules, main.js)
│       └── index.html
├── FileVault.Tests/           # xUnit тесты (AuthController, PasswordHasher)
├── Storage/                   # физическое хранилище файлов (хешированные имена)
├── dbdata/                    # папка с файлом базы данных database.db
├── .env.example               # пример переменных окружения
└── README.md
```
***Примечание: База данных теперь хранится в dbdata/database.db, а не в app.db.
Физические файлы — в Storage/, их имена — SHA256-хеши содержимого (дедупликация).***

---

### 5. Docker Compose
**Основной файл docker-compose.yml поднимает два сервиса:**
- filevault — само приложение (сборка из Dockerfile)
- caddy — reverse proxy с автоматическим HTTPS

**Переменные окружения (обязательные для production):**
- JWT_KEY — секретный ключ для подписи токенов
- ADMIN_USERNAME и ADMIN_PASSWORD — учётные данные первого администратора
- ConnectionStrings__DefaultConnection — строка подключения к БД (в контейнере переопределяется)

Пример запуска:
```bash
docker compose up -d --build
```

---

### 6. Управление миграциями базы данных
Важно: Все изменения схемы БД должны выполняться через миграции EF Core. Это гарантирует сохранность данных.
Локальная разработка (на машине с .NET SDK)
```bash
cd FileVault.Api
# Добавить новую миграцию (например, AddUserEmail)
dotnet ef migrations add AddUserEmail
# Применить локально (для тестовой БД)
dotnet ef database update
```
Применение миграции на сервере (без .NET SDK)

На сервере уже подготовлен файл docker-compose.migrate.yml.
Он запускает временный контейнер с SDK и выполняет dotnet ef database update к вашей production-базе.
```bash
docker compose down                # остановить приложение
docker compose -f docker-compose.migrate.yml up   # применить миграции
docker compose up -d               # запустить обновлённое приложение
```
Памятка:
- Никогда не удаляйте папку Migrations и не изменяйте уже применённые миграции.
- Перед миграцией на сервере можно сделать бэкап базы: cp dbdata/database.db dbdata/database.db.backup

---

### 7. Развертывание на сервере
1. Установите Docker и Docker Compose на сервер.
2. Склонируйте репозиторий и перейдите в папку проекта.
3. Создайте файл .env на основе .env.example и укажите реальные значения.
4. Запустите контейнеры:
```bash
docker compose up -d --build
```
5. Убедитесь, что Caddy настроен на ваш домен (файл Caddyfile).
6. Для последующих обновлений кода выполняйте:
```bash
git pull
docker compose down
docker compose up -d --build
```
7. При изменении модели БД дополнительно выполните шаги из раздела 6 (миграции).

---

### 8. Тестирование
Тесты написаны с использованием xUnit, Moq и in-memory SQLite.
Для запуска тестов локально:
```bash
cd FileVault.Tests
dotnet test
```
Или через Docker:
```bash
docker compose run --rm filevault dotnet test FileVault.Tests/FileVault.Tests.csproj
```

Покрытие: AuthControllerTests, PasswordHasherTests, TestDatabaseFactory.
Тесты для FilesController и AdminController планируются.

---

### Заключение

FileVault — это полнофункциональное облачное хранилище, готовое к использованию в личных целях и в качестве демонстрации навыков full-stack разработки.

> Лицензия: MIT
>
> Автор: [@artemkoncevoj4](https://github.com/artemkoncevoj4)