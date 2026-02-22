using Microsoft.EntityFrameworkCore;
namespace FileVault.Api.Database;
public class ApplicationContext : DbContext
{
    public DbSet<User> Users {get;set;} = null!;
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
        Database.EnsureCreated();   // создаем базу данных при первом обращении
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Login = "Tom", PasswordHash = "hashed_password_1", AccessLevel = 1 },
                new User { Id = 2, Login = "Bob", PasswordHash = "hashed_password_2", AccessLevel = 1 },
                new User { Id = 3, Login = "Sam", PasswordHash = "hashed_password_3", AccessLevel = 1 }
        );
    }
}