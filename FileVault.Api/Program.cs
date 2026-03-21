using Microsoft.EntityFrameworkCore;
using FileVault.Api.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.Http.Features;

Env.Load();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions 
{ 
    WebRootPath = "wwwroot/" 
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
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = long.MaxValue;
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = int.MaxValue;
});

// 2. Снимаем лимит самого сервера Kestrel
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = null; // null = безлимитно
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Регистрация ApplicationContext и IPasswordHasher
builder.Services.AddDbContext<ApplicationContext>(options => 
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSingleton<IPasswordHasher, BCryptHasher>();

// Регистрация глобального обработчика исключений
builder.Services.AddExceptionHandler<FileVault.Api.Utils.GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

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
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.ContainsKey("jwtToken"))
                {
                    context.Token = context.Request.Cookies["jwtToken"];
                }
                return Task.CompletedTask;
            }
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
    }
}



if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/error"); 
    app.UseHsts(); 
}

app.UseDefaultFiles(); 
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();