using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;
using System.Linq;
namespace FileVault.Api.Controllers;
[ApiController]
[Route("api/auth")]

public class AuthController : ControllerBase
{
    private readonly ApplicationContext _db;
    private readonly IPasswordHasher _hasher;

    public AuthController(ApplicationContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Login == req.Login))
            return BadRequest("Логин занят");

        var user = new User {
            Login = req.Login,
            PasswordHash = _hasher.Hash(req.Password),
            AccessLevel = 1
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok("Регистрация успешна");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Login == req.Login);
        if (user == null || !_hasher.Verify(req.Password, user.PasswordHash))
            return Unauthorized("Неверный логин или пароль");

        
        return Ok(new { 
            userId = user.Id, 
            login = user.Login,
            accessLevel = user.AccessLevel
        });
    }
}

public record AuthRequest(string Login, string Password);