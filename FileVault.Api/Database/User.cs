using System.ComponentModel.DataAnnotations;
namespace FileVault.Api.Database;

public class User
{
    [Key]
    public int Id { get; set; }
    [Required, StringLength(100)]
    public string Login { get; set; } = default!;
    [Required]
    public string PasswordHash { get; set; } = default!;
    [Required, Range(1, 5)]
    public int AccessLevel { get; set; }
}

// Добавляем DTO, чтобы безопасно возвращать данные
public record UserDto(int Id, string Login, int AccessLevel);