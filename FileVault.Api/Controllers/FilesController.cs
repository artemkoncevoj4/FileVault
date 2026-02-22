using Microsoft.AspNetCore.Mvc;

namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    [HttpGet("hello")]
    public IActionResult SayHello()
    {
        var result = GetHelloMessage();

        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    // Имитация метода "сервиса"
    private Result<string> GetHelloMessage()
    {
        bool isServiceAvailable = true; 

        if (!isServiceAvailable)
        {
            return Result<string>.Failure("Сервис временно недоступен");
        }

        return Result<string>.Success("Контроллер файлов готов к работе и использует Result Pattern!");
    }
}