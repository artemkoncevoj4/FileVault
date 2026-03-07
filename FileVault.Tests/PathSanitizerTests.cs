using Xunit;
using FileVault.Api.Utils;

namespace FileVault.Tests;

public class PathSanitizerTests
{
    [Fact]
    public void GetSafePath_ThrowsOnTraversal()
    {
        var storage = "/tmp/storage";
        var badFile = "../etc/passwd";
        
        Assert.Throws<UnauthorizedAccessException>(() => 
            PathSanitizer.GetSafePath(storage, badFile));
    }
    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("/etc/passwd")]
    [InlineData("C:\\Windows\\System32")]
    [InlineData("..\\..\\data")]
    [InlineData("file.txt/../../")]
    public void GetSafePath_ShouldBlockAllTraversalAttempts(string dangerousName)
    {
        var storage = "/var/www/storage";
        
        Assert.Throws<UnauthorizedAccessException>(() => 
            PathSanitizer.GetSafePath(storage, dangerousName));
    }
    [Fact]
    public void GetSafePath_ShouldHandleSpacesAndDotsInName()
    {
        // Arrange
        var storage = Path.Combine(Directory.GetCurrentDirectory(), "Storage");
        var fileName = "my report v2.0.pdf";

        // Act
        var result = PathSanitizer.GetSafePath(storage, fileName);

        // Assert
        Assert.EndsWith(fileName, result);
        Assert.True(Path.IsPathRooted(result));
    }
}