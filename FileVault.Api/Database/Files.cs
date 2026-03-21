using System.ComponentModel.DataAnnotations;
namespace FileVault.Api.Database;

public class Files
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Hash { get; set; } = default!; // Имя файла на диске
    [Required]
    public string VirtualName { get; set; } = default!; // Имя, которое видит юзер
    [Required]
    public long Size { get; set; }
    [Required]
    public int UserId { get; set; } // ID владельца
    [Required]
    public bool IsLocked { get; set; } = false; // Флаг блокировки

    public User? User { get; set; } // Навигационное свойство
}
