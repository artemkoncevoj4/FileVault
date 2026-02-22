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
                new User { Id = 1, Login = "artemkoncevoj4", PasswordHash = new BCryptHasher().Hash("Artemon@."), AccessLevel = 5 }
            );
    }
}