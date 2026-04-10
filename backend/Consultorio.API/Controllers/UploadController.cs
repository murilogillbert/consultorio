using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    // Tipos permitidos (mime simples + extensão)
    private static readonly string[] AllowedExtensions =
        { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf" };

    private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

    public UploadController(IWebHostEnvironment env) => _env = env;

    // ─── POST /api/upload ─────────────────────────────────────────────
    // Recebe um arquivo e devolve a URL pública para usá-lo
    [HttpPost]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult> Upload(IFormFile file, [FromQuery] string? folder)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Nenhum arquivo enviado." });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Arquivo excede 10 MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"Extensão {ext} não permitida." });

        // Pasta de destino: wwwroot/uploads/{folder?}
        var safeFolder = string.IsNullOrWhiteSpace(folder)
            ? "general"
            : string.Concat(folder.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'));

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadDir = Path.Combine(webRoot, "uploads", safeFolder);
        Directory.CreateDirectory(uploadDir);

        // Nome único: guid + extensão
        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadDir, fileName);

        // Grava o arquivo no disco
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        // URL relativa que o frontend pode usar
        var publicUrl = $"/uploads/{safeFolder}/{fileName}";

        return Ok(new
        {
            url = publicUrl,
            fileName,
            originalName = file.FileName,
            size = file.Length
        });
    }

    // ─── DELETE /api/upload ───────────────────────────────────────────
    // Remove um arquivo enviado anteriormente. Body: { "url": "/uploads/..." }
    [HttpDelete]
    public ActionResult Delete([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith("/uploads/"))
            return BadRequest(new { message = "URL inválida." });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        // Remove a barra inicial para combinar com Path.Combine
        var relative = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(webRoot, relative);

        // Garante que está dentro de wwwroot/uploads (defesa contra path traversal)
        var uploadsRoot = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
        var requested = Path.GetFullPath(fullPath);
        if (!requested.StartsWith(uploadsRoot))
            return BadRequest(new { message = "Caminho fora da pasta permitida." });

        if (!System.IO.File.Exists(requested))
            return NotFound(new { message = "Arquivo não encontrado." });

        System.IO.File.Delete(requested);
        return NoContent();
    }
}
