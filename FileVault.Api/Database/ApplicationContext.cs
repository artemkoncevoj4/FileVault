using Microsoft.EntityFrameworkCore;
namespace FileVault.Api.Database;
public class ApplicationContext : DbContext
{
    public DbSet<User> Users {get;set;} = null!;
    public DbSet<Files> Files {get;set;} = null!;
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
        
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
    }
}