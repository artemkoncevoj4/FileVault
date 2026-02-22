using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions 
{ 
    WebRootPath = "wwwroot/base/" 
});

var connection = builder.Configuration.GetConnectionString("DefaultConnection");



builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<ApplicationContext>(options => options.UseSqlite(connection));
builder.Services.AddScoped<IPasswordHasher, BCryptHasher>();

var app = builder.Build();

app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();
    db.Database.Migrate(); 
}

app.MapGet("/users", async (ApplicationContext db) => await db.Users.ToListAsync());
app.MapDelete("/users/{id}", async (int id, ApplicationContext db) => 
{
    var user = await db.Users.FindAsync(id);
    if (user == null)
    {
        return Results.NotFound();
    }
    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
});
app.MapPost("/users", async (User user, ApplicationContext db) => 
{
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/users/{user.Id}", user);
});
app.MapPut("/users/{id}", async (int id, User updatedUser, ApplicationContext db) => 
{
    var user = await db.Users.FindAsync(id);
    if (user == null)
    {
        return Results.NotFound();
    }
    user.Login = updatedUser.Login;
    user.PasswordHash = updatedUser.PasswordHash;
    user.AccessLevel = updatedUser.AccessLevel;
    await db.SaveChangesAsync();
    return Results.NoContent();
});


app.Run(async (context) => 
{
    var path = context.Request.Path.Value ?? "/";
    
    
    var fullPath = Path.Combine(app.Environment.ContentRootPath, path.TrimStart('/'));

    context.Response.ContentType = "text/html; charset=utf-8";

    if (File.Exists(fullPath))
    {
        await context.Response.SendFileAsync(fullPath);
    }
    else
    {
        context.Response.StatusCode = 404;
        await context.Response.WriteAsync($"<h2>404</h2><p>Искал тут: {fullPath}</p>");
    }
});


app.Run();