using Microsoft.AspNetCore.Mvc;

namespace FileVault.Api.Controllers;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public string Error { get; }

    protected Result(T value, bool success, string error)
    {
        Value = value;
        IsSuccess = success;
        Error = error;
    }

    public static Result<T> Success(T value) => new(value, true, null!);
    public static Result<T> Failure(string error) => new(default!, false, error);
}