using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/public/professional")]
[Authorize(Roles = "PROFESSIONAL")]
public class PublicProfessionalController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicProfessionalController(AppDbContext db) => _db = db;

    private Guid GetProfessionalId()
    {
        var claim = User.FindFirst("professionalId");
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty;
    }

    // ─── GET /api/public/professional/me ──────────────────────────────────────
    [HttpGet("me")]
    public async Task<ActionResult> GetMe()
    {
        var proId = GetProfessionalId();
        var pro = await _db.Professionals
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == proId);

        if (pro == null) return Unauthorized(new { message = "Profissional não encontrado." });

        return Ok(new
        {
            id = pro.Id,
            name = pro.User.Name,
            email = pro.User.Email,
            avatarUrl = pro.User.AvatarUrl,
            specialty = pro.Specialty,
            commissionPct = pro.CommissionPct,
        });
    }

    // ─── GET /api/public/professional/agenda ──────────────────────────────────
    // Returns appointments for a given week (defaults to current week)
    [HttpGet("agenda")]
    public async Task<ActionResult> GetAgenda([FromQuery] string? weekStart)
    {
        var proId = GetProfessionalId();
        DateTime start;
        if (!string.IsNullOrEmpty(weekStart) && DateTime.TryParse(weekStart, out var parsed))
            start = parsed.Date;
        else
        {
            var today = DateTime.UtcNow.Date;
            var diff = (int)today.DayOfWeek;
            start = today.AddDays(-diff); // Sunday
        }
        var end = start.AddDays(7);

        var appointments = await _db.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Service)
            .Include(a => a.Room)
            .Include(a => a.Payment)
            .Where(a => a.ProfessionalId == proId && a.StartTime >= start && a.StartTime < end)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        return Ok(appointments.Select(a => new
        {
            id = a.Id,
            startTime = a.StartTime,
            endTime = a.EndTime,
            status = a.Status,
            patientName = a.Patient?.User?.Name ?? "Paciente",
            patientAvatarUrl = a.Patient?.User?.AvatarUrl,
            serviceName = a.Service?.Name ?? "",
            roomName = a.Room?.Name,
            price = a.Payment?.Amount ?? a.Service?.Price ?? 0,
            paymentStatus = a.Payment?.Status ?? "PENDING",
        }));
    }

    // ─── GET /api/public/professional/reviews ─────────────────────────────────
    [HttpGet("reviews")]
    public async Task<ActionResult> GetReviews()
    {
        var proId = GetProfessionalId();

        var reviews = await _db.ProfessionalReviews
            .Include(r => r.Patient).ThenInclude(p => p.User)
            .Include(r => r.Appointment).ThenInclude(a => a!.Service)
            .Where(r => r.ProfessionalId == proId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .ToListAsync();

        var avgRating = reviews.Count > 0 ? reviews.Average(r => r.Rating) : 0;

        return Ok(new
        {
            averageRating = Math.Round(avgRating, 1),
            totalReviews = reviews.Count,
            reviews = reviews.Select(r => new
            {
                id = r.Id,
                rating = r.Rating,
                comment = r.Comment,
                createdAt = r.CreatedAt,
                patientName = r.Patient?.User?.Name ?? "Paciente",
                serviceName = r.Appointment?.Service?.Name,
            })
        });
    }

    // ─── GET /api/public/professional/stats ───────────────────────────────────
    // Financial stats + insurance breakdown
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats([FromQuery] string? period)
    {
        var proId = GetProfessionalId();
        var pro = await _db.Professionals.FindAsync(proId);
        if (pro == null) return Unauthorized();

        // Determine date range
        DateTime start;
        var now = DateTime.UtcNow;
        switch (period?.ToLower())
        {
            case "week":
                start = now.AddDays(-7);
                break;
            case "year":
                start = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                break;
            default: // month
                start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                break;
        }

        var appointments = await _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Payment)
            .Where(a => a.ProfessionalId == proId && a.StartTime >= start)
            .ToListAsync();

        var completed = appointments.Where(a => a.Status == "COMPLETED").ToList();
        var totalRevenue = completed
            .Sum(a => a.Payment?.Amount ?? a.Service?.Price ?? 0);

        var commissionPct = pro.CommissionPct;
        var netPayout = totalRevenue * (commissionPct / 100m);

        // Service breakdown (used as proxy for insurance since appointment has no direct insurance link)
        var serviceBreakdown = completed
            .GroupBy(a => a.Service?.Name ?? "Outro")
            .Select(g => new
            {
                name = g.Key,
                count = g.Count(),
                revenue = g.Sum(a => a.Payment?.Amount ?? a.Service?.Price ?? 0),
            })
            .OrderByDescending(x => x.count)
            .ToList();

        // Insurance plans linked to services performed
        var serviceIds = completed.Select(a => a.ServiceId).Distinct().ToList();
        var insuranceBreakdown = await _db.ServiceInsurancePlans
            .Include(sip => sip.InsurancePlan)
            .Where(sip => serviceIds.Contains(sip.ServiceId))
            .GroupBy(sip => sip.InsurancePlan!.Name)
            .Select(g => new { name = g.Key, serviceCount = g.Count() })
            .ToListAsync();

        var privateCount = 0;

        return Ok(new
        {
            totalAppointments = appointments.Count,
            completedCount = completed.Count,
            cancelledCount = appointments.Count(a => a.Status == "CANCELLED"),
            scheduledCount = appointments.Count(a => a.Status == "SCHEDULED" || a.Status == "CONFIRMED"),
            totalRevenue,
            commissionPct,
            netPayout,
            serviceBreakdown,
            insuranceBreakdown,
            periodLabel = period ?? "month",
        });
    }
}
