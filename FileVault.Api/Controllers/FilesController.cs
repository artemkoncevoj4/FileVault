using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FileVault.Api.Utils;
using FileVault.Api.Database;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;

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
        var userLevel = GetUserLevel();
        if (userLevel < UserLevels.Moderator) return Forbid("Insufficient access level");

        var fileRecord = await _db.Files.FindAsync(id);

        if(fileRecord == null) return NotFound("File not found");

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized(new { error = "Invalid user identifier" });

        if (userLevel < UserLevels.Admin && fileRecord.UserId != currentUserId.Value)
        {
            return Forbid("You can only lock your own files");
        }
                
        fileRecord.IsLocked = true;

        await _db.SaveChangesAsync();

        return Ok(new {message = "File successfully locked", id = fileRecord.Id});
    }

    [HttpPut("unlock/{id}")]
    public async Task<IActionResult> UnlockFile(int id)
    {
        var userLevel = GetUserLevel();
        if (userLevel < UserLevels.Moderator) return Forbid("Insufficient access level");

        var fileRecord = await _db.Files.FindAsync(id);

        if(fileRecord == null) return NotFound("File not found");

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized(new { error = "Invalid user identifier" });


        if (userLevel < UserLevels.Admin && fileRecord.UserId != currentUserId.Value)
        {
            return Forbid("You can only unlock your own files");
        }
        
        fileRecord.IsLocked = false;

        await _db.SaveChangesAsync();

        return Ok(new {message = "File successfully unlocked", id = fileRecord.Id});
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, CancellationToken cancellationToken)
    {
        var userLevel = GetUserLevel();
        if (userLevel < UserLevels.Uploader) 
            return Forbid("Upload is available from level 3");
            
        if (file == null || file.Length == 0) 
            return BadRequest("No file selected");

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) 
            return Unauthorized("Invalid user identifier");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;

        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(ms);
        var fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        var physicalPath = Path.Combine(_storagePath, fileHash);
        bool fileExistsPhysically = System.IO.File.Exists(physicalPath);

        var fileRecord = new Files
        {
          UserId = currentUserId.Value,
          Hash = fileHash,
          VirtualName = Path.GetFileName(file.FileName),
          Size = file.Length,
          IsLocked = false  
        };
        _db.Files.Add(fileRecord);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            if(!fileExistsPhysically)
            {
                ms.Position = 0;
                using var fileStream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, useAsync: true);
                await ms.CopyToAsync(fileStream, cancellationToken);
            }
            return Ok(new {message = "File upload successfully", id = fileRecord.Id});
        }
        catch (Exception ex) when (ex is OperationCanceledException)
        {
            _db.Files.Remove(fileRecord);
            await _db.SaveChangesAsync(cancellationToken);
            return BadRequest("Upload cancelled");
        }
        catch (Exception ex)
        {
            _db.Files.Remove(fileRecord);
            await _db.SaveChangesAsync(cancellationToken);
            Console.WriteLine($"Error: {ex}");
            return StatusCode(500, "Failed to save physical file");
        }

    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var userLevel = GetUserLevel();
        if (userLevel < UserLevels.BasicDownload) return Forbid("Level 2 required to download");

        var fileRecord = await _db.Files.FindAsync(id);
        if (fileRecord == null) return NotFound("File not found in database");

        var userId = GetCurrentUserId();
        if (userId == null) 
            return Unauthorized("Invalid user identifier");

        if (fileRecord.IsLocked && userLevel < UserLevels.Moderator && fileRecord.UserId != userId.Value) 
            return Forbid("File is locked");

        var physicalPath = Path.Combine(_storagePath, fileRecord.Hash);
        if (!System.IO.File.Exists(physicalPath)) return NotFound("Physical file is missing");

        return PhysicalFile(physicalPath, "application/octet-stream", fileRecord.VirtualName);
    }

    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeleteFile(int id)
    {
        var fileRecord = await _db.Files.FindAsync(id);
        if(fileRecord == null) return NotFound();

        var userLevel = GetUserLevel();
        var userId = GetCurrentUserId();
        if (userId == null) 
            return Unauthorized("Invalid user identifier");

        if (userLevel < UserLevels.Admin && fileRecord.UserId != userId.Value) 
            return Forbid("No permission to delete");

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

        var userId = GetCurrentUserId();
        if (userId == null) 
            return Unauthorized("Invalid user identifier");

        if (GetUserLevel() < UserLevels.Admin && fileRecord.UserId != userId.Value) 
            return Forbid("You can only rename your own files");

        if(string.IsNullOrWhiteSpace(req.NewName)) return BadRequest("Name is empty");

        fileRecord.VirtualName = req.NewName;
        await _db.SaveChangesAsync();
        return Ok();
    }

    private int GetUserLevel() => 
        int.TryParse(User.FindFirst("AccessLevel")?.Value, out var lvl) ? lvl : UserLevels.Default;

    [HttpGet("list")]
    public async Task<IActionResult> GetFilesList()
    {
        var userLevel = GetUserLevel();
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized("Invalid user identifier");

        var query = _db.Files.AsQueryable();

        if (userLevel < UserLevels.Moderator)
        {
            query = query.Where(f => !f.IsLocked);
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
        if (userLevel < UserLevels.Uploader) return Forbid();

        try
        {
            var drive = new DriveInfo(Directory.GetCurrentDirectory()); 
            
            double totalBytes = drive.TotalSize;
            double freeBytes = drive.AvailableFreeSpace;
            double usedBytes = totalBytes - freeBytes;

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
            return BadRequest("Disk read error: " + ex.Message);
        }
    }

    public class RenameRequest 
    {
        public int Id { get; set; }
        public string NewName { get; set; } = "";
    }
    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }
}