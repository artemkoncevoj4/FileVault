namespace FileVault.Api.Utils;

public static class PathSanitizer
{
    /// <summary>
    /// Проверяет имя файла и возвращает безопасный абсолютный путь.
    /// </summary>
    public static string GetSafePath(string storagePath, string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("Имя файла не может быть пустым.");

        // Нормализуем слэши: заменяем Windows (\) на системные (в Linux это /)
        // Это гарантирует, что Path.GetFileName отработает корректно везде
        string normalizedName = fileName.Replace('\\', Path.DirectorySeparatorChar)
                                        .Replace('/', Path.DirectorySeparatorChar);

        // 1. Проверка на "чистое" имя файла
        if (Path.GetFileName(normalizedName) != normalizedName)
            throw new UnauthorizedAccessException("Попытка обхода пути (Path Traversal) заблокирована!");

        var fullStoragePath = Path.GetFullPath(storagePath);
        var finalPath = Path.GetFullPath(Path.Combine(fullStoragePath, normalizedName));

        // 2. Проверка границ хранилища
        if (!finalPath.StartsWith(fullStoragePath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Запрещен доступ за пределы хранилища!");

        return finalPath;
    }
}