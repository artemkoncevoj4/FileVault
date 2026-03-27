### README.md для проекта FileVault

## Оглавление
1. **Обзор Проекта**
2. **Начало работы**
3. **Используемые технологии**
4. **Структура каталогов**
5. **Docker Compose**
6. **Руководства по развертыванию**
7. **Тестирование**

---

### 1. Обзор Проекта

**FileVault** - это приложение для личного облачного хранилища, созданное с использованием ASP.NET Core Web API и размещаемое на Docker, предоставляющее безопасную систему управления файлами.

### 2. Начало работы

#### Требования
- .NET SDK версии 9.0 или новее
- Docker
- Caddy веб-сервер

#### Установка
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/artemkoncevoj4/FileVault.git
   cd FileVault
   ```

2. Сборка и запуск с использованием Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Доступ к приложению через браузер по адресу `http://localhost:5018`.

### 3. Используемые технологии

| **Технология**              | **Описание**                                                                 |
|-----------------------------|---------------------------------------------------------------------------------|
| **ASP.NET Core Web API**    | Построение бэкенд-сервиса с мощным маршрутизированием, контроллерами и моделями.      |
| **Entity Framework Core**   | ORM для операций с базой данных, предоставляющий LINQ-запросы и миграции.           |
| **JWT Authentication**      | Обработка безопасной аутентификации пользователей с использованием JWT (JSON Web Tokens).                    |
| **Docker**                  | Контейнеризация приложения для обеспечения консистентных сред.               |
| **Caddy**                   | Reverse proxy и статический файловый сервер, настроенный для эффективного обслуживания.        |

### 4. Структура каталогов

```
FileVault/
├── Caddyfile
├── docker-compose.yml
├── Dockerfile
├── FileVault.Api
│   ├── app.db
│   ├── appsettings.Development.json
│   ├── appsettings.json
│   ├── Controllers
│   │   ├── AdminController.cs
│   │   ├── AuthController.cs
│   │   └── FilesController.cs
│   ├── Database
│   │   ├── ApplicationContext.cs
│   │   ├── Files.cs
│   │   ├── Hasher.cs
│   │   └── User.cs
│   ├── .env
│   ├── .env.example
│   ├── FileVault.Api.csproj
│   ├── FileVault.Api.http
│   ├── FileVault.Api.sln
│   ├── Migrations
│   │   ├── _Initial.cs
│   ├── Program.cs
│   ├── Properties
│   │   └── launchSettings.json
│   ├── Storage
│   ├── Utils
│   │   ├── GlobalExeptionHandler.cs
│   │   └── PathSanitizer.cs
│   └── wwwroot
│       ├── css
│       │   └── *.css
│       ├── index.html
│       └── js
│           ├── core
│           │   ├── *.js
│           ├── main.js
│           └── modules
│               ├── *.js
├── FileVault.slnx
├── FileVault.Tests
│   ├── FileVault.Tests.csproj
│   └── PathSanitizerTests.cs
├── .gitignore
└── README.md
```


### 5. Docker Compose

Файл `docker-compose.yml` настраивает окружение с сервисами для бэкенда и базы данных.

### 6. Руководства по развертыванию

1. Сборка образов Docker:
   ```bash
   docker compose build
   ```

2. Запуск контейнеров:
   ```bash
   docker compose up
   ```
   Быстрая пересборка (без удаления томов и старых образов):
   ```
   docker compose up -d --build --force-recreate
   ```
   
3. Доступ к приложению по адресу `https://file-storage.myftp.org:8443/`.

### 7. Тестирование

Запустите тесты с помощью следующей команды:

```bash
docker-compose run web dotnet test FileVault.Tests/FileVault.Tests.csproj
```

---

## Заключение

FileVault представляет собой комплексное решение для личного облачного хранилища, демонстрирующее навыки в современном веб-разработке и практиках DevOps.

**Участие**
Не стесняйтесь вносить свой вклад в проект, отправляя проблемы или pull requests!

**Лицензия**
Этот проект лицензирован под лицензионным соглашением MIT - подробности см. в файле LICENSE.