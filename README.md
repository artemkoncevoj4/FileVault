# FileVault – Personal Cloud Storage

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Technologies Used](#3-technologies-used)
4. [Directory Structure](#4-directory-structure)
5. [Docker Compose](#5-docker-compose)
6. [Database Migrations](#6-database-migrations)
7. [Deployment on a Server](#7-deployment-on-a-server)
8. [Testing](#8-testing)
9. [Conclusion](#conclusion)
---

### 1. Project Overview

**FileVault** is a secure personal cloud storage application with a web interface.  
It is built with ASP.NET Core 9.0 (backend) and vanilla JavaScript (frontend).  

**Key features:**
- User registration & authentication (JWT in cookies, BCrypt for passwords)
- Upload, download, delete, rename files
- SHA‑256 deduplication (same content stored once)
- Access levels 1–5 (basic user, uploader, moderator, admin)
- Admin panel for user management
- Fully responsive UI with i18n (English/Russian)


---

### 2. Getting Started

#### Prerequisites
- Docker и Docker Compose (recommended)
- .NET SDK 9.0 (only for local development)

#### Quick start with Docker

```bash
git clone https://github.com/artemkoncevoj4/FileVault.git
cd FileVault

# Copy environment variables and edit if needed
cp .env.example .env

# Start containers
docker compose up -d
```
The application will be available at https://your-domain:8443 (Caddy configuration is in Caddyfile).

For local development without Docker:
```bash
cd FileVault.Api
dotnet restore
dotnet run
```
---

### 3. Technologies Used
| Technology |	Purpose |
| ---------- | ------- |
| ASP.NET Core 9.0	| Backend API, middleware, controllers |
| Entity Framework Core 9.0 |	ORM, migrations, SQLite access |
| SQLite	| Database file (dbdata/database.db) |
| JWT (Bearer + cookie) |	Authentication & authorization |
| BCrypt.Net-Next	| Password hashing |
| Docker + Caddy	| Containerization, reverse proxy, HTTPS |
| Vanilla JS (ES6 modules) |	Frontend (modular, i18n, toasts, modals) |
| CSS3 (responsive design) | Styling split into logical files |

---

### 4. Directory Structure
```bash
FileVault/
├── Caddyfile
├── docker-compose.yml
├── docker-compose.migrate.yml   # temporary container for migrations
├── Dockerfile
├── FileVault.Api/
│   ├── Controllers/
│   ├── Database/
│   ├── Migrations/               # EF Core migrations (critical)
│   ├── Utils/
│   ├── Program.cs
│   ├── appsettings.json
│   └── wwwroot/
│       ├── css/                  # modular CSS
│       ├── js/                   # ES6 modules (core, modules, main.js)
│       └── index.html
├── FileVault.Tests/              # xUnit tests (AuthController, PasswordHasher)
├── Storage/                      # physical file storage (SHA‑256 named)
├── dbdata/                       # folder containing database.db
├── .env.example
└── README.md
```
***Note: The database now lives in dbdata/database.db, not app.db.
Physical files are stored in Storage/ with SHA‑256 names (deduplication).***

---

### 5. Docker Compose
**The main docker-compose.yml defines two services:**
- filevault — the application (built from Dockerfile)
- caddy — reverse proxy with automatic HTTPS

**Environment variables (required in production):**
- JWT_KEY — secret for JWT signing
- ADMIN_USERNAME and ADMIN_PASSWORD — initial admin credentials
- ConnectionStrings__DefaultConnection — overridden inside the container

Run:
```bash
docker compose up -d --build
```

---

### 6. Database Migrations
Important: All schema changes must be applied via EF Core migrations to preserve data.
Local development (with .NET SDK)
```bash
cd FileVault.Api
dotnet ef migrations add AddUserEmail
dotnet ef database update
```
Apply migrations on the server (no SDK required)

A helper file docker-compose.migrate.yml is provided. It starts a temporary SDK container and runs dotnet ef database update.
```bash
docker compose down           
docker compose -f docker-compose.migrate.yml up   
docker compose up -d            
```
Reminder:
- Never delete the Migrations folder or alter already applied migrations.
- Backup the database before migrating: cp dbdata/database.db dbdata/database.db.backup

---

### 7. Deployment on a Server
1. Install Docker & Docker Compose on the server.
2. Clone the repository and enter the project folder.
3. Create a .env file from .env.example and set real values.
4. Start the containers:
```bash
docker compose up -d --build
```
5. Ensure Caddy is configured for your domain (edit Caddyfile).
6. For regular code updates:
```bash
git pull
docker compose down
docker compose up -d --build
```
7. If the database schema changes, also follow the migration steps (section 6).

---

### 8. Testing
Tests are written with xUnit, Moq, and in‑memory SQLite.
Run tests locally:
```bash
cd FileVault.Tests
dotnet test
```
Or via Docker:
```bash
docker compose run --rm filevault dotnet test FileVault.Tests/FileVault.Tests.csproj
```

Current test coverage: AuthControllerTests, PasswordHasherTests, TestDatabaseFactory.
Tests for FilesController and AdminController are planned.

---

### Conclusion

FileVault is a full‑featured cloud storage solution, ready for personal use and as a portfolio project.

> License: MIT
>
> Author: [@artemkoncevoj4](https://github.com/artemkoncevoj4)