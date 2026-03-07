using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
namespace FileVault.Api.Utils;
public class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
    HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, message) = exception switch
        {
            // Проверка на нехватку места на диске (Код ошибки 0x80070070)
            IOException ioEx when ioEx.HResult == unchecked((int)0x80070070) => 
                (StatusCodes.Status507InsufficientStorage, "На сервере закончилось свободное место."),
            
            UnauthorizedAccessException => 
                (StatusCodes.Status403Forbidden, "Доступ запрещен: нарушение безопасности пути."),
                
            _ => (StatusCodes.Status500InternalServerError, "Произошла внутренняя ошибка сервера.")
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = "Ошибка выполнения запроса",
            Detail = message
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}