using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
namespace FileVault.Api.Database;

public class User
{
    [Key]
    public int Id { get; set; }
    [Required, StringLength(100)]
    public string Login { get; set; } = default!;
    [Required]
    public string PasswordHash { get; set; } = default!;
    [Required, Range(UserLevels.Default, UserLevels.Admin)]
    public int AccessLevel { get; set; }
    public ICollection<Files> Files { get; set; } = new List<Files>();


}

public record UserDto(int Id, string Login, int AccessLevel);