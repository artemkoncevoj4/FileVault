using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;

namespace FileVault.Tests;

public static class TestDatabaseFactory
{
    public static ApplicationContext CreateContext()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ApplicationContext>()
            .UseSqlite(connection)
            .Options;
        var context = new ApplicationContext(options);
        context.Database.EnsureCreated();
        return context;
    }
}