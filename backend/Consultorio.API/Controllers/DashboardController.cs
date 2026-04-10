using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/dashboard/summary ───────────────────────────────────
    // Métricas gerais da clínica
    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary()
    {
        var clinicId = GetClinicId();
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var appointmentsToday = await _db.Appointments
            .CountAsync(a => a.ClinicId == clinicId
                && a.StartTime >= today && a.StartTime < tomorrow);

        var appointmentsThisMonth = await _db.Appointments
            .CountAsync(a => a.ClinicId == clinicId
                && a.StartTime >= monthStart);

        var totalPatients = await _db.Patients
            .CountAsync(p => p.ClinicId == clinicId && p.IsActive);

        var totalProfessionals = await _db.Professionals
            .CountAsync(p => p.ClinicId == clinicId && p.IsAvailable);

        var totalServices = await _db.Services
            .CountAsync(s => s.ClinicId == clinicId && s.IsActive);

        var revenueThisMonth = await _db.Payments
            .Include(p => p.Appointment)
            .Where(p => p.Appointment.ClinicId == clinicId
                && p.Status == "PAID"
                && p.PaymentDate >= monthStart)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var pendingPayments = await _db.Payments
            .Include(p => p.Appointment)
            .Where(p => p.Appointment.ClinicId == clinicId && p.Status == "PENDING")
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        return Ok(new
        {
            appointmentsToday,
            appointmentsThisMonth,
            totalPatients,
            totalProfessionals,
            totalServices,
            revenueThisMonth,
            pendingPayments
        });
    }

    // ─── GET /api/dashboard/appointments-by-status ────────────────────
    [HttpGet("appointments-by-status")]
    public async Task<ActionResult> GetAppointmentsByStatus()
    {
        var clinicId = GetClinicId();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var grouped = await _db.Appointments
            .Where(a => a.ClinicId == clinicId && a.StartTime >= monthStart)
            .GroupBy(a => a.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(grouped);
    }

    // ─── GET /api/dashboard/revenue-by-day?days=30 ────────────────────
    [HttpGet("revenue-by-day")]
    public async Task<ActionResult> GetRevenueByDay([FromQuery] int days = 30)
    {
        var clinicId = GetClinicId();
        var since = DateTime.UtcNow.Date.AddDays(-days + 1);

        var raw = await _db.Payments
            .Include(p => p.Appointment)
            .Where(p => p.Appointment.ClinicId == clinicId
                && p.Status == "PAID"
                && p.PaymentDate >= since)
            .Select(p => new { Date = p.PaymentDate!.Value.Date, p.Amount })
            .ToListAsync();

        var grouped = raw
            .GroupBy(x => x.Date)
            .Select(g => new { date = g.Key, total = g.Sum(x => x.Amount) })
            .OrderBy(x => x.date)
            .ToList();

        return Ok(grouped);
    }

    // ─── GET /api/dashboard/top-services ──────────────────────────────
    [HttpGet("top-services")]
    public async Task<ActionResult> GetTopServices([FromQuery] int limit = 5)
    {
        var clinicId = GetClinicId();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var top = await _db.Appointments
            .Include(a => a.Service)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= monthStart)
            .GroupBy(a => new { a.ServiceId, a.Service.Name })
            .Select(g => new
            {
                serviceId = g.Key.ServiceId,
                name = g.Key.Name,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .Take(limit)
            .ToListAsync();

        return Ok(top);
    }

    // ─── GET /api/dashboard/top-professionals ─────────────────────────
    [HttpGet("top-professionals")]
    public async Task<ActionResult> GetTopProfessionals([FromQuery] int limit = 5)
    {
        var clinicId = GetClinicId();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var top = await _db.Appointments
            .Include(a => a.Professional)
                .ThenInclude(p => p.User)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= monthStart)
            .GroupBy(a => new { a.ProfessionalId, a.Professional.User.Name })
            .Select(g => new
            {
                professionalId = g.Key.ProfessionalId,
                name = g.Key.Name,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .Take(limit)
            .ToListAsync();

        return Ok(top);
    }
}
