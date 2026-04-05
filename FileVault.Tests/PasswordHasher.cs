using Xunit;
using FileVault.Api.Database;

namespace FileVault.Tests;

public class PasswordHasherTests
{
    private readonly IPasswordHasher _hasher = new BCryptHasher();

    [Fact]
    public void HashPassword_ShouldReturnDifferentHashForSamePassword_WithSalt()
    {
        // Act
        var hash1 = _hasher.Hash("MySecret123");
        var hash2 = _hasher.Hash("MySecret123");

        // Assert
        Assert.NotEqual(hash1, hash2); // из-за соли хэши разные
    }
    [Fact]
    public void VerifyPassword_ValidPassword_ReturnsTrue()
    {
        // Arrange
        var password = "SecurePass";
        var hash = _hasher.Hash(password);

        // Act
        var isValid = _hasher.Verify(password, hash);

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var hash = _hasher.Hash("CorrectPass");
        var isValid = _hasher.Verify("WrongPass", hash);
        Assert.False(isValid);
    }
    [Fact]
    public void Hash_NullPassword_ThrowsArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => _hasher.Hash(null!));
    }
}