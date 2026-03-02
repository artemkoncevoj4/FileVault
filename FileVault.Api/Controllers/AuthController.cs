using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IConfiguration _config;

    public AuthController(ApplicationContext db, IPasswordHasher hasher, IConfiguration config)
    {
        _db = db;
        _hasher = hasher;
        _config = config;
    }
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Login == req.Login))
            return BadRequest("Логин занят");

        var user = new User {
            Login = req.Login,
            PasswordHash = _hasher.Hash(req.Password),
            AccessLevel = 1 // По умолчанию уровень 1
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

        // Создаем токен
        var token = GenerateJwtToken(user);
        
        return Ok(new { 
            token = token,
            user = new UserDto(user.Id, user.Login, user.AccessLevel)
        });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _config["JWT_KEY"];
        var jwtIssuer = _config["JWT_ISSUER"] ?? "FileVaultApi";
        var jwtAudience = _config["JWT_AUDIENCE"] ?? "FileVaultFront";

        if (string.IsNullOrEmpty(jwtKey))
        {
            throw new InvalidOperationException("JWT_KEY is not configured!");
        }

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Login),
            new Claim("AccessLevel", user.AccessLevel.ToString())
        };

        var token = new JwtSecurityToken(
            jwtIssuer,                
            jwtAudience,              
            claims,
            expires: DateTime.Now.AddHours(3),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    public record AuthRequest(string Login, string Password);
}