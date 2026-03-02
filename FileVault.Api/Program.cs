using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;

Env.Load();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions 
{ 
    // Указываем, где лежат наши статические файлы (HTML, CSS, JS)
    WebRootPath = "wwwroot/base/" 
});
builder.Configuration.AddEnvironmentVariables();

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");                

if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT_KEY is not set in environment variables!");
}

var adminLogin = Environment.GetEnvironmentVariable("ADMIN_USERNAME") ?? "admin";
var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "admin";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "FileVaultApi";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "FileVaultFront";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ApplicationContext>(options => 
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IPasswordHasher, BCryptHasher>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<ApplicationContext>();
    var hasher = services.GetRequiredService<IPasswordHasher>();

    db.Database.EnsureCreated(); 

    if (!db.Users.Any(u => u.Login == adminLogin))
    {
        var admin = new User 
        { 
            Login = adminLogin, 
            PasswordHash = hasher.Hash(adminPassword),
            AccessLevel = 5 
        };
        db.Users.Add(admin);
        db.SaveChanges();
        Console.WriteLine($"[SEED] Администратор {adminLogin} успешно создан.");
        Console.WriteLine($"[SEED] Пароль: {adminPassword}, Хеш: {admin.PasswordHash}");
    }
}



if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseDefaultFiles(); 
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();