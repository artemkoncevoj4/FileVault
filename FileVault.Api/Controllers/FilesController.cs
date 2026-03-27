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
public async Task<IActionResult> LockFile(int id)
{
    try 
        {
            var userLevel = GetUserLevel();
            if (userLevel < 4) return Forbid("Insufficient access level");

            //Ищем файл в базе по уникальному ID
            var fileRecord = await _db.Files.FindAsync(id);

            //Если нет
            if(fileRecord == null) return NotFound("File not found");

            //Проверка прав
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdString, out int currentUserId);

            if(userLevel < 5 && fileRecord.UserId != currentUserId)
            {
                return StatusCode(403, "You can only unlock your own files");
            }
            
            fileRecord.IsLocked = true;

            await _db.SaveChangesAsync();

            return Ok(new {message = "File successfully unlocked", id = fileRecord.Id});
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
        if (userLevel < 4) return Forbid("Insufficient access level");

        //Ищем файл в базе по уникальному ID
        var fileRecord = await _db.Files.FindAsync(id);

        //Если нет
        if(fileRecord == null) return NotFound("File not found");

        //Проверка прав
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdString, out int currentUserId);

        if(userLevel < 5 && fileRecord.UserId != currentUserId)
        {
            return StatusCode(403, "You can only unlock your own files");
        }
        
        fileRecord.IsLocked = false;

        await _db.SaveChangesAsync();

        return Ok(new {message = "File successfully unlocked", id = fileRecord.Id});
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
        if (userLevel < 3) return Forbid("Upload is available from level 3");
        if (file == null || file.Length == 0) return BadRequest("No file selected");

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
        return Ok(new {message = "File uploaded successfully", id = fileRecord.Id});
    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var userLevel = GetUserLevel();
        if (userLevel < 2) return Forbid("Level 2 required to download");

        var fileRecord = await _db.Files.FindAsync(id);
        if (fileRecord == null) return NotFound("File not found in database");

        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        // Проверка блокировки
        if (fileRecord.IsLocked && userLevel < 4 && fileRecord.UserId != userId) return Forbid("File is locked");

        var physicalPath = Path.Combine(_storagePath, fileRecord.Hash);
        if (!System.IO.File.Exists(physicalPath)) return NotFound("Physical file is missing");

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
        
        if(userLevel < 5 && fileRecord.UserId != userId) return Forbid("No permission to delete");

        _db.Files.Remove(fileRecord);
        await _db.SaveChangesAsync();

        bool stillNeeded = await _db.Files.AnyAsync(f => f.Hash == fileRecord.Hash);
        if (!stillNeeded)
        {
            var physicalPath = Path.Combine(_storagePath, fileRecord.Hash);
            if (System.IO.File.Exists(physicalPath)) System.IO.File.Delete(physicalPath);
        }
        return Ok("File deleted");
    }

    [HttpPut("rename")]
    public async Task<IActionResult> RenameFile([FromBody] RenameRequest req)
    {
        var fileRecord = await _db.Files.FindAsync(req.Id);
        if(fileRecord == null) return NotFound();

        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        if(GetUserLevel() < 5 && fileRecord.UserId != userId) return Forbid();

        if(string.IsNullOrWhiteSpace(req.NewName)) return BadRequest("Name is empty");

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

    [HttpGet("storage-stats")]
    public IActionResult GetStorageStats()
    {
        var userLevel = GetUserLevel();
        if (userLevel < 3) return Forbid();

        try
        {
            var drive = new DriveInfo(Directory.GetCurrentDirectory()); 
            
            double totalBytes = drive.TotalSize;
            double freeBytes = drive.AvailableFreeSpace;
            double usedBytes = totalBytes - freeBytes;

            // Переводим в ГБ
            double totalGb = totalBytes / 1073741824.0;
            double usedGb = usedBytes / 1073741824.0;

            return Ok(new
            {
                total = Math.Round(totalGb, 2),
                used = Math.Round(usedGb, 2),
                percentUsed = Math.Round((usedGb / totalGb) * 100, 2)
            });
        }
        catch (Exception ex)
        {
            return BadRequest("Ошибка чтения диска: " + ex.Message);
        }
    }

    public class RenameRequest 
    {
        public int Id { get; set; }
        public string NewName { get; set; } = "";
    }
}