var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();

// Добавляем поддержку Swagger для генерации документации API    
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Включаем Swagger в режиме разработки
app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();
app.Run();
