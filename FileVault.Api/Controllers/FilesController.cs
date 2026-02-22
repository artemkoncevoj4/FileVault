using Microsoft.AspNetCore.Mvc;

namespace FileVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    [HttpGet("download/{fileName}")]
    public IActionResult DownloadFile(string fileName)
    {
        // Извлекаем уровень доступа из токена
        var levelClaim = User.FindFirst("AccessLevel")?.Value;
        int userLevel = int.Parse(levelClaim ?? "0");

        if (fileName == "secret.zip" && userLevel < 4)
        {
            return Forbid("У вас недостаточно прав для этого файла!");
        }

        // Если всё ок — отдаем файл (тут будет твоя логика)
        return Ok($"Файл {fileName} отправлен");
    }
}