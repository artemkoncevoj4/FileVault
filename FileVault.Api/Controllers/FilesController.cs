using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FileVault.Api.Utils;
namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly string _storagePath;
    public FilesController()
    {
        _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "Storage");
        
        if (!Directory.Exists(_storagePath)) Directory.CreateDirectory(_storagePath);
    }

    [HttpPut("lock/{fileName}")]
public IActionResult LockFile(string fileName)
{
    try 
    {
        var userLevel = GetUserLevel();
        if (userLevel < 4) return Forbid("Недостаточный уровень доступа");

        if (fileName.StartsWith("locked_")) return BadRequest("Файл уже заблокирован");

        // Санитизируем входящий путь
        var oldPath = PathSanitizer.GetSafePath(_storagePath, fileName);
        if (!System.IO.File.Exists(oldPath)) return NotFound("Файл не найден");

        // Проверка владения (как в Delete): только владелец или админ (5+)
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userLevel < 5 && !fileName.Contains($"{userId}_"))
            return StatusCode(403, "Вы можете блокировать только свои файлы");

        var newFileName = "locked_" + fileName;
        var newPath = PathSanitizer.GetSafePath(_storagePath, newFileName);

        if (System.IO.File.Exists(newPath)) return BadRequest("Целевой файл уже существует");

        System.IO.File.Move(oldPath, newPath);
        return Ok(new { newName = newFileName });
    }
    catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
}

[HttpPut("unlock/{fileName}")]
public IActionResult UnlockFile(string fileName)
{
    try 
    {
        var userLevel = GetUserLevel();
        if (userLevel < 4) return Forbid("Недостаточный уровень доступа");

        if (!fileName.StartsWith("locked_")) return BadRequest("Файл не заблокирован");

        var oldPath = PathSanitizer.GetSafePath(_storagePath, fileName);
        if (!System.IO.File.Exists(oldPath)) return NotFound("Файл не найден");

        // Проверка владения
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userLevel < 5 && !fileName.Contains($"{userId}_"))
            return StatusCode(403, "Вы можете разблокировать только свои файлы");

        var newName = fileName.Replace("locked_", "");
        var newPath = PathSanitizer.GetSafePath(_storagePath, newName);

        if (System.IO.File.Exists(newPath)) return BadRequest("Файл с таким именем уже существует");

        System.IO.File.Move(oldPath, newPath);
        return Ok(new { newName });
    }
    catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
}

[HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 3) return StatusCode(403, "Загрузка доступна с уровня 3");
        if (file == null || file.Length == 0) return BadRequest("Файл не выбран");

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0";
        
        // Санитизируем имя оригинального файла перед сохранением
        var safeFileName = Path.GetFileName(file.FileName);
        var fileName = $"{userId}_{safeFileName}";
        var filePath = PathSanitizer.GetSafePath(_storagePath, fileName);

        // CopyToAsync уже работает как поток, тут оптимизация не требуется
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { message = "Файл загружен", name = fileName });
    }

    [HttpGet("download/{fileName}")]
    public IActionResult DownloadFile(string fileName)
    {
        try 
        {
            var filePath = PathSanitizer.GetSafePath(_storagePath, fileName);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var userLevel = GetUserLevel();
            if (fileName.StartsWith("locked_") && userLevel < 4)
                return Forbid("Доступ ограничен (нужен уровень 4+)");

            // ОПТИМИЗАЦИЯ: Вместо ReadAllBytes возвращаем PhysicalFile.
            // Это позволяет серверу не грузить весь файл в RAM, а отдавать его по кусочкам.
            return PhysicalFile(filePath, "application/octet-stream", fileName);
        }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpDelete("delete/{fileName}")]
    public IActionResult DeleteFile(string fileName)
    {
        try 
        {
            var filePath = PathSanitizer.GetSafePath(_storagePath, fileName);
            if (!System.IO.File.Exists(filePath)) return NotFound();

            var userLevel = GetUserLevel();
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (userLevel < 5 && !fileName.Contains($"{userId}_"))
                return StatusCode(403, "Вы можете удалять только свои файлы");

            System.IO.File.Delete(filePath);
            return Ok("Файл удален");
        }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpPut("rename")]
    public IActionResult RenameFile([FromBody] RenameRequest req)
    {
        try 
        {
            var oldPath = PathSanitizer.GetSafePath(_storagePath, req.OldName);
            if (!System.IO.File.Exists(oldPath)) return NotFound("Файл не найден");

            var userLevel = GetUserLevel();
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (userLevel < 5 && !req.OldName.Contains($"{userId}_"))
                return StatusCode(403, "Вы можете переименовать только свои файлы");

            var prefix = req.OldName.Substring(0, req.OldName.IndexOf('_') + 1);
            var newFileName = req.NewName.Contains("_") ? req.NewName : prefix + req.NewName;
            
            var newPath = PathSanitizer.GetSafePath(_storagePath, newFileName);
            if (System.IO.File.Exists(newPath)) return BadRequest("Файл с таким именем уже есть");

            System.IO.File.Move(oldPath, newPath);
            return Ok(new { newName = newFileName });
        }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    private int GetUserLevel()
    {
        var claim = User.FindFirst("AccessLevel")?.Value;
        return int.TryParse(claim, out var lvl) ? lvl : 1;
    }
    [HttpGet("list")]
    public IActionResult GetFilesList()
    {
        var userLevel = GetUserLevel();
        if (!Directory.Exists(_storagePath)) return Ok(new List<string>());

        var files = Directory.GetFiles(_storagePath).Select(Path.GetFileName);

        // Фильтруем: если файл закрыт (locked_), а уровень меньше 4 — убираем из списка
        var filteredFiles = files.Where(f => 
            !f!.StartsWith("locked_") || userLevel >= 4
        );

        return Ok(filteredFiles);
    }
    public class RenameRequest 
    {
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
    }
}