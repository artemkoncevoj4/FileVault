# README.md for FileVault Project

## Table of Contents
1. **Project Overview**
2. **Getting Started**
3. **Technologies Used**
4. **Directory Structure**
5. **Docker Compose**
6. **Deployment Instructions**
7. **Testing**

---

### 1. Project Overview

**FileVault** is a personal cloud storage application built with ASP.NET Core Web API and hosted on Docker, providing a secure file management system.

### 2. Getting Started

#### Prerequisites
- .NET SDK 9.0 or later
- Docker
- Caddy web server

#### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/artemkoncevoj4/FileVault.git
   cd FileVault
   ```

2. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application via your browser at `http://localhost:5018`.

### 3. Technologies Used

| **Technology**              | **Description**                                                                 |
|-----------------------------|---------------------------------------------------------------------------------|
| **ASP.NET Core Web API**    | Building the backend service with robust routing, controllers, and models.      |
| **Entity Framework Core**   | ORM for database operations, providing LINQ queries and migrations.           |
| **JWT Authentication**      | Handling secure user authentication using JSON Web Tokens.                    |
| **Docker**                  | Containerizing the application to ensure consistent environments.               |
| **Caddy**                   | Reverse proxy and static file server, configured for efficient serving.        |

### 4. Directory Structure

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

The `docker-compose.yml` file sets up the environment with services for the backend and database.

### 6. Deployment Instructions

1. Build the Docker images:
   ```bash
   docker compose build
   ```

2. Run the containers:
   ```bash
   docker compose up
   ```
   Quick rebuild (without removing volumes and old images):
   ```
   docker compose up -d --build --force-recreate
   ```
   
3. Access your application at `https://file-storage.myftp.org:8443/`.

### 7. Testing

Run tests using the following command:

```bash
docker-compose run web dotnet test FileVault.Tests/FileVault.Tests.csproj
```

---

## Conclusion

FileVault is a comprehensive solution for personal cloud storage, demonstrating skills in modern web development and DevOps practices.

**Contributing**
Feel free to contribute to the project by submitting issues or pull requests!

**License**
This project is licensed under the MIT License - see the LICENSE file for details.