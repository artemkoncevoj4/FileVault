using Microsoft.EntityFrameworkCore;

namespace FileVault.Api.Database;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public class BCryptHasher : IPasswordHasher
{
    // Cost 11 — золотая середина для 1 ядра CPU
    public string Hash(string password) => 
        BCrypt.Net.BCrypt.HashPassword(password, 11);

    public bool Verify(string password, string passwordHash) => 
        BCrypt.Net.BCrypt.Verify(password, passwordHash);
}