using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly string _storagePath;
    public FilesController()
    {
        // Путь к папке, где будут лежать файлы
        _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/FilesStorage");
        
        if (!Directory.Exists(_storagePath)) Directory.CreateDirectory(_storagePath);
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 3) return StatusCode(403, "Загрузка доступна с уровня 3");

        // Получаем ID пользователя из токена
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0";

        if (file == null || file.Length == 0) return BadRequest("Файл не выбран");

        // Формат: ID_FileName (например 1_report.pdf)
        var fileName = $"{userId}_{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(_storagePath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { message = "Файл загружен", name = fileName });
    }
    [HttpPut("lock/{fileName}")]
    public IActionResult LockFile(string fileName)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 4) return Forbid();

        if (fileName.StartsWith("locked_")) return BadRequest("Файл уже закрыт");

        var oldPath = Path.Combine(_storagePath, fileName);
        var newPath = Path.Combine(_storagePath, "locked_" + fileName);

        if (!System.IO.File.Exists(oldPath)) return NotFound();

        System.IO.File.Move(oldPath, newPath);
        return Ok(new { newName = "locked_" + fileName });
    }
    [HttpPut("unlock/{fileName}")]
    public IActionResult UnlockFile(string fileName)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 4) return Forbid();

        if (!fileName.StartsWith("locked_")) return BadRequest("Файл и так открыт");

        var oldPath = Path.Combine(_storagePath, fileName);
        var newName = fileName.Replace("locked_", "");
        var newPath = Path.Combine(_storagePath, newName);

        if (!System.IO.File.Exists(oldPath)) return NotFound();

        System.IO.File.Move(oldPath, newPath);
        return Ok(new { newName });
    }

        [HttpPut("rename")]
        [Authorize]
        public IActionResult RenameFile([FromBody] RenameRequest req)
        {
            var userLevel = GetUserLevel();
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(req.OldName) || string.IsNullOrEmpty(req.NewName))
                return BadRequest("Имена не могут быть пустыми");

            var oldPath = Path.Combine(_storagePath, req.OldName);
            if (!System.IO.File.Exists(oldPath)) return NotFound("Файл не найден");

            // ЛОГИКА ПРАВ:
            // Проверяем, начинается ли имя с "ID_" текущего юзера
            bool isOwner = req.OldName.Contains($"{userId}_");
            bool isAdmin = userLevel >= 5;

            if (!isOwner && !isAdmin) 
                return StatusCode(403, "Вы можете переименовывать только свои файлы");

            // При переименовании ВАЖНО сохранить ID владельца в начале нового имени
            // Вытаскиваем префикс (например "1_") из старого имени
            var prefix = req.OldName.Substring(0, req.OldName.IndexOf('_') + 1);
            
            // Новое имя должно быть: [locked_] + префикс + новое_имя
            // Но для простоты, если юзер вводит "doc2.pdf", мы превращаем это в "1_doc2.pdf"
            var newFileName = req.NewName.Contains("_") ? req.NewName : prefix + req.NewName;
            var newPath = Path.Combine(_storagePath, newFileName);

            if (System.IO.File.Exists(newPath)) return BadRequest("Файл с таким именем уже есть");

            System.IO.File.Move(oldPath, newPath);
            return Ok(new { newName = newFileName });
        }


    [HttpGet("download/{fileName}")]
    public IActionResult DownloadFile(string fileName)
    {
        var filePath = Path.Combine(_storagePath, fileName);
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var userLevel = GetUserLevel();
        // Проверка: закрытые файлы только для 4 и 5 уровня
        if (fileName.StartsWith("locked_") && userLevel < 4)
        {
            return Forbid("Доступ к этому файлу ограничен (нужен уровень 4+)");
        }

        var bytes = System.IO.File.ReadAllBytes(filePath);
        return File(bytes, "application/octet-stream", fileName);
    }

    [HttpDelete("delete/{fileName}")]
    public IActionResult DeleteFile(string fileName)
    {
        var userLevel = GetUserLevel();
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        var filePath = Path.Combine(_storagePath, fileName);
        if (!System.IO.File.Exists(filePath)) return NotFound();

        // Логика прав на удаление:
        // 1. Если админ (lvl 5) — можно всё.
        // 2. Иначе проверяем, начинается ли файл с ID текущего пользователя.
        bool isAdmin = userLevel >= 5;
        bool isOwner = fileName.Contains($"{currentUserId}_");

        if (isAdmin || isOwner)
        {
            System.IO.File.Delete(filePath);
            return Ok("Файл удален");
        }

        return StatusCode(403, "Вы можете удалять только свои файлы");
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