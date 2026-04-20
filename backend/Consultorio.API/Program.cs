using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Consultorio.API.Services;
using Consultorio.Infra.Context;

var builder = WebApplication.CreateBuilder(args);

// Allow non-ASCII (e.g. UTF-8) bytes in HTTP request headers.
// Required for Mercado Pago and other external webhook senders
// that may include non-ASCII characters in headers like X-Signature.
builder.WebHost.ConfigureKestrel(options =>
{
    options.RequestHeaderEncodingSelector = _ => Encoding.UTF8;
});

// ───── SERVICES ─────

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
);

// CORS — origens fixas + extras vindas do appsettings/env
var extraOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? [];

var allOrigins = new[]
{
    "http://localhost:5173",
    "http://localhost:3000",
}.Concat(extraOrigins).ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(allOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });

    // Webhooks are called by external servers (Mercado Pago, etc.)
    // They must not be restricted by origin.
    options.AddPolicy("AllowWebhooks", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .WithMethods("GET", "POST");
    });
});

// JWT
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<LegacyIntegrationBridge>();
builder.Services.AddHttpClient<GoogleOAuthService>();
builder.Services.AddHttpClient<GmailInboxSyncService>();
builder.Services.AddHttpClient<GmailPubSubService>();
builder.Services.AddHttpClient<MercadoPagoService>();
builder.Services.AddHostedService<GmailWatchRenewalService>();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

var app = builder.Build();

// ───── SEED ─────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await SeedData.Initialize(db);
}

// ───── MIDDLEWARE ─────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();

// Serve user-uploaded files from wwwroot/uploads explicitly so we don't
// depend on the static web assets manifest (which is snapshot at build
// time and won't include files uploaded at runtime).
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
});

// UseRouting deve vir antes de UseCors para o ASP.NET associar
// a policy CORS corretamente às rotas e injetar os headers
app.UseRouting();

app.UseCors("AllowFrontend");

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/health", () => new { status = "OK", timestamp = DateTime.UtcNow })
   .WithName("HealthCheck");

app.Run();
