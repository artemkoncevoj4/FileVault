# Сборка приложения
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем файлы проекта и восстанавливаем зависимости
COPY ["FileVault.Api/FileVault.Api.csproj", "FileVault.Api/"]
RUN dotnet restore "FileVault.Api/FileVault.Api.csproj"

# Копируем всё остальное и собираем
COPY . .
WORKDIR "/src/FileVault.Api"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Финальный образ для запуска
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
EXPOSE 8080

# Создаем папку для хранения файлов (чтобы Docker не ругался)
RUN mkdir -p /app/Storage

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FileVault.Api.dll"]