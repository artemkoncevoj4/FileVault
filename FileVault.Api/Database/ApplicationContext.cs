using Microsoft.EntityFrameworkCore;
namespace FileVault.Api.Database;
public class ApplicationContext : DbContext
{
    public DbSet<User> Users {get;set;} = null!;
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
        Database.Migrate();
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        
    }
}