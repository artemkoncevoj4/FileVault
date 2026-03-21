using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FileVault.Api.Utils;
using FileVault.Api.Database;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly string _storagePath;
    private readonly ApplicationContext _db;
    public FilesController(ApplicationContext db)
    {
        _db = db;
        _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "Storage");
        
        if (!Directory.Exists(_storagePath)) Directory.CreateDirectory(_storagePath);
    }

    [HttpPut("lock/{id}")]
public async Task<IActionResult> LockFile(string id)
{
    try 
        {
            var userLevel = GetUserLevel();
            if (userLevel < 4) return Forbid("Недостаточный уровень доступа");

            //Ищем файл в базе по уникальному ID
            var fileRecord = await _db.Files.FindAsync();

            //Если нет
            if(fileRecord == null) return NotFound("Файл не найден");

            //Проверка прав
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdString, out int currentUserId);

            if(userLevel < 5 && fileRecord.UserId != currentUserId)
            {
                return StatusCode(403, "Вы можете заблокировать только свои файлы");
            }
            
            fileRecord.IsLocked = true;

            await _db.SaveChangesAsync();

            return Ok(new {message = "Файл успешно заблокирован", id = fileRecord.Id});
        }
    catch (Exception ex) 
        { 
            return BadRequest(ex.Message); 
        }
}

[HttpPut("unlock/{id}")]
public async Task<IActionResult> UnlockFile(int id)
{
    try 
    {
        var userLevel = GetUserLevel();
        if (userLevel < 4) return Forbid("Недостаточный уровень доступа");

        //Ищем файл в базе по уникальному ID
        var fileRecord = await _db.Files.FindAsync();

        //Если нет
        if(fileRecord == null) return NotFound("Файл не найден");

        //Проверка прав
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdString, out int currentUserId);

        if(userLevel < 5 && fileRecord.UserId != currentUserId)
        {
            return StatusCode(403, "Вы можете разблокировать только свои файлы");
        }
        
        fileRecord.IsLocked = false;

        await _db.SaveChangesAsync();

        return Ok(new {message = "Файл успешно разблокирован", id = fileRecord.Id});
    }
    catch (Exception ex) 
    { 
        return BadRequest(ex.Message); 
    }
}

[HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 3) return StatusCode(403, "Загрузка доступна с уровня 3");
        if (file == null || file.Length == 0) return BadRequest("Файл не выбран");

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if(!int.TryParse(userIdString, out int userId)) return Unauthorized();

        using var sha256 = SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = await sha256.ComputeHashAsync(stream);
        var fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

        var physicalPath = Path.Combine(_storagePath, fileHash);
        if(!System.IO.File.Exists(physicalPath))
        {
            stream.Position = 0;
            using var fileStream = new FileStream(physicalPath, FileMode.Create);
            await stream.CopyToAsync(fileStream);
        }

        var fileRecord = new Files
        {
          UserId = userId,
          Hash = fileHash,
          VirtualName = Path.GetFileName(file.FileName),
          Size = file.Length,
          IsLocked = false 
        };

        _db.Files.Add(fileRecord);
        await _db.SaveChangesAsync();
        return Ok(new {message = "Файл успешно загружен", id = fileRecord.Id});
    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var fileRecord = await _db.Files.FindAsync(id);
        if (fileRecord == null) return NotFound("Файл не найден в базе");

        var userLevel = GetUserLevel();
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        // Проверка блокировки
        if (fileRecord.IsLocked && userLevel < 4 && fileRecord.UserId != userId)
            return Forbid("Файл заблокирован");

        var physicalPath = Path.Combine(_storagePath, fileRecord.Hash);
        if (!System.IO.File.Exists(physicalPath)) return NotFound("Физический файл отсутствует");

        // Отдаем файл с его "Виртуальным" именем
        return PhysicalFile(physicalPath, "application/octet-stream", fileRecord.VirtualName);
    }

    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeleteFile(int id)
    {
        var fileRecord = await _db.Files.FindAsync(id);
        if(fileRecord == null) return NotFound();

        var userLevel = GetUserLevel();
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        if(userLevel < 5 && fileRecord.UserId != userId)
        {
            return Forbid("Нет прав на удаление");
        }

        _db.Files.Remove(fileRecord);
        await _db.SaveChangesAsync();

        bool stillNeeded = await _db.Files.AnyAsync(f => f.Hash == fileRecord.Hash);
        if (!stillNeeded)
        {
            var physicalPath = Path.Combine(_storagePath, fileRecord.Hash);
            if (System.IO.File.Exists(physicalPath)) System.IO.File.Delete(physicalPath);
        }
        return Ok("Файл удален");
    }

    [HttpPut("rename")]
    public async Task<IActionResult> RenameFile([FromBody] RenameRequest req)
    {
        var fileRecord = await _db.Files.FindAsync(req.Id);
        if(fileRecord == null) return NotFound();

        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        if(GetUserLevel() < 5 && fileRecord.UserId != userId) return Forbid();

        if(string.IsNullOrWhiteSpace(req.NewName)) return BadRequest("Имя пустое");

        fileRecord.VirtualName = req.NewName;
        await _db.SaveChangesAsync();
        return Ok();
    }

    private int GetUserLevel() => 
        int.TryParse(User.FindFirst("AccessLevel")?.Value, out var lvl) ? lvl : 1;

    [HttpGet("list")]
    public async Task<IActionResult> GetFilesList()
    {
        var userLevel = GetUserLevel();
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdString, out int currentUserId);

        var query = _db.Files.AsQueryable();

        if(userLevel < 4)
        {
            query = query.Where(f => !f.IsLocked || f.UserId == currentUserId);
        }

        var files = await query.Select(f => new
        {
            id = f.Id,
            virtualName = f.VirtualName,
            isLocked = f.IsLocked,
            ownerId = f.UserId,
            size = f.Size
        }).ToListAsync();

        return Ok(files);
    }
    public class RenameRequest 
    {
        public int Id { get; set; }
        public string NewName { get; set; } = "";
    }
}