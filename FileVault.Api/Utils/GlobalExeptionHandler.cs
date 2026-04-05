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
            IOException ioEx when ioEx.Message.Contains("No space left on device") || ioEx.HResult == unchecked((int)0x80070070) =>
                (StatusCodes.Status507InsufficientStorage, "No space left on device"),
            
            UnauthorizedAccessException => 
                (StatusCodes.Status403Forbidden, "Access denied: path security violation."),
                
            _ => (StatusCodes.Status500InternalServerError, "An internal server error occurred.")
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = "Error executing request",
            Detail = message
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}