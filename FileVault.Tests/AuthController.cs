using Xunit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using FileVault.Api.Controllers;
using FileVault.Api.Database;
using System.Text.Json;

namespace FileVault.Tests.Controllers;

// DTO для ответа Login
public record LoginResponse(string message, UserDto user);

public class AuthControllerTests : IDisposable
{
    private readonly ApplicationContext _context;
    private readonly AuthController _controller;
    private readonly IPasswordHasher _hasher;

    public AuthControllerTests()
    {
        _context = TestDatabaseFactory.CreateContext();
        _hasher = new BCryptHasher();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["JWT_KEY"]).Returns("test-key-that-is-long-enough-for-hmacsha256");
        mockConfig.Setup(c => c["JWT_ISSUER"]).Returns("TestIssuer");
        mockConfig.Setup(c => c["JWT_AUDIENCE"]).Returns("TestAudience");

        _controller = new AuthController(_context, _hasher, mockConfig.Object);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    public void Dispose() => _context.Dispose();

    [Fact]
    public async Task Register_WithUniqueLogin_ReturnsOkAndSavesUser()
    {
        var request = new AuthController.AuthRequest("alice", "secret123");
        var result = await _controller.Register(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Registration successful", okResult.Value);

        var savedUser = await _context.Users.FirstOrDefaultAsync(u => u.Login == "alice");
        Assert.NotNull(savedUser);
        Assert.True(_hasher.Verify("secret123", savedUser.PasswordHash));
        Assert.Equal(1, savedUser.AccessLevel);
    }

    [Fact]
    public async Task Register_WithExistingLogin_ReturnsBadRequest()
    {
        _context.Users.Add(new User { Login = "bob", PasswordHash = "hash", AccessLevel = 1 });
        await _context.SaveChangesAsync();

        var request = new AuthController.AuthRequest("bob", "anypass");
        var result = await _controller.Register(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Login is already taken", badRequest.Value);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOkAndUserData()
    {
        var user = new User { Login = "john", PasswordHash = _hasher.Hash("doe"), AccessLevel = 2 };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var request = new AuthController.AuthRequest("john", "doe");
        var result = await _controller.Login(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(okResult.Value);
        var response = JsonSerializer.Deserialize<LoginResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.NotNull(response);
        Assert.Equal("Login successful", response.message);
        Assert.Equal("john", response.user.Login);
        Assert.Equal(2, response.user.AccessLevel);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var user = new User { Login = "john", PasswordHash = _hasher.Hash("correct"), AccessLevel = 1 };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var request = new AuthController.AuthRequest("john", "wrong");
        var result = await _controller.Login(request);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithValidCredentials_SetsCookie()
    {
        var user = new User { Login = "cookieuser", PasswordHash = _hasher.Hash("pass"), AccessLevel = 1 };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["JWT_KEY"]).Returns("test-key-that-is-long-enough-for-hmacsha256");
        mockConfig.Setup(c => c["JWT_ISSUER"]).Returns("TestIssuer");
        mockConfig.Setup(c => c["JWT_AUDIENCE"]).Returns("TestAudience");

        var controller = new AuthController(_context, _hasher, mockConfig.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var request = new AuthController.AuthRequest("cookieuser", "pass");
        var result = await controller.Login(request);

        Assert.IsType<OkObjectResult>(result);
        var cookies = controller.Response.Headers["Set-Cookie"].ToString();
        Assert.Contains("jwtToken=", cookies);
    }
}