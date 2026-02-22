using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;

namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize] // Только для вошедших
public class AdminController : ControllerBase
{
    private readonly ApplicationContext _db;

    public AdminController(ApplicationContext db) => _db = db;

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        // Проверка уровня прямо в коде (или через Policy)
        if (!IsAdmin()) return Forbid();

        var users = await _db.Users
            .Select(u => new UserDto(u.Id, u.Login, u.AccessLevel)) // Скрываем хеши!
            .ToListAsync();
        return Ok(users);
    }

    [HttpPut("users/{id}/access")]
    public async Task<IActionResult> ChangeAccess(int id, [FromBody] int newLevel)
    {
        if (!IsAdmin()) return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.AccessLevel = Math.Clamp(newLevel, 1, 5);
        await _db.SaveChangesAsync();
        return Ok();
    }
    [HttpDelete("users/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(int id)
    {
        // Проверка уровня доступа (только для 5)
        if (User.FindFirst("AccessLevel")?.Value != "5") 
            return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound("Пользователь не найден");

        // Не даем админу удалить самого себя (опционально, но полезно)
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString())
            return BadRequest("Вы не можете удалить свою собственную учетную запись");

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return Ok();
    }
    private bool IsAdmin() => 
        User.FindFirst("AccessLevel")?.Value == "5";
}