using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MetricsController(AppDbContext db) => _db = db;

    private Guid GetClinicId()
    {
        var claim = User.FindFirst("clinicId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    private (DateTime start, DateTime end) ParsePeriod(string? period)
    {
        var now = DateTime.UtcNow;
        var end = now;
        DateTime start;
        switch (period)
        {
            case "Hoje":
                start = now.Date;
                end = now.Date.AddDays(1).AddSeconds(-1);
                break;
            case "7 dias":
                start = now.AddDays(-7);
                break;
            case "3 meses":
                start = now.AddDays(-90);
                break;
            case "12 meses":
                start = now.AddDays(-365);
                break;
            default: // "30 dias"
                start = now.AddDays(-30);
                break;
        }
        return (start, end);
    }

    // =====================================================================
    // GET /api/metrics/professionals
    // =====================================================================
    [HttpGet("professionals")]
    public async Task<ActionResult> GetProfessionalMetrics([FromQuery] string? period)
    {
        var clinicId = GetClinicId();
        var (start, end) = ParsePeriod(period);

        // Previous period for trend
        var periodMs = (end - start).TotalMilliseconds;
        var prevStart = start.AddMilliseconds(-periodMs);
        var prevEnd = start.AddSeconds(-1);

        var professionals = await _db.Professionals
            .Include(p => p.User)
            .Include(p => p.Schedules)
            .Include(p => p.Reviews)
            .Where(p => p.ClinicId == clinicId && p.IsAvailable)
            .ToListAsync();

        var allAppointments = await _db.Appointments
            .Include(a => a.Payment)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= start && a.StartTime <= end)
            .ToListAsync();

        var prevAppointments = await _db.Appointments
            .Include(a => a.Payment)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= prevStart && a.StartTime <= prevEnd)
            .ToListAsync();

        // First appointment per patient-professional pair (for new patient detection)
        var firstAppts = await _db.Appointments
            .Where(a => a.ClinicId == clinicId)
            .GroupBy(a => new { a.PatientId, a.ProfessionalId })
            .Select(g => new { g.Key.PatientId, g.Key.ProfessionalId, First = g.Min(a => a.StartTime) })
            .ToListAsync();

        var firstMap = firstAppts.ToDictionary(
            x => $"{x.PatientId}__{x.ProfessionalId}",
            x => x.First
        );

        var prevByPro = prevAppointments
            .GroupBy(a => a.ProfessionalId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Count = g.Count(),
                    Revenue = g.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m)
                }
            );

        var result = professionals.Select(p =>
        {
            var appts = allAppointments.Where(a => a.ProfessionalId == p.Id).ToList();
            var total = appts.Count;
            var completed = appts.Count(a => a.Status == "COMPLETED");
            var cancelled = appts.Count(a => a.Status == "CANCELLED");
            var revenue = appts.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m);

            var cancellationRate = total > 0 ? (int)Math.Round((double)cancelled / total * 100) : 0;
            var attended = total - cancelled;
            var conversionRate = attended > 0 ? (int)Math.Round((double)completed / attended * 100) : 0;

            // Occupancy
            var daysInPeriod = Math.Max(1, (int)Math.Ceiling((end - start).TotalDays));
            var totalMinutesAvailable = 0.0;
            foreach (var sched in p.Schedules.Where(s => s.IsActive))
            {
                var daily = (sched.EndTime - sched.StartTime).TotalMinutes;
                var occurrences = (int)Math.Ceiling((double)daysInPeriod / 7);
                totalMinutesAvailable += daily * occurrences;
            }
            var totalMinutesBooked = appts.Sum(a => (a.EndTime - a.StartTime).TotalMinutes);
            var occupancy = totalMinutesAvailable > 0
                ? Math.Min(100, (int)Math.Round(totalMinutesBooked / totalMinutesAvailable * 100))
                : 0;

            var availableHours = totalMinutesAvailable / 60;
            var revenuePerHour = availableHours > 0 ? (int)Math.Round((double)revenue / availableHours) : 0;

            // Rating
            var periodReviews = p.Reviews.Where(r => r.CreatedAt >= start && r.CreatedAt <= end).ToList();
            var avgRating = periodReviews.Count > 0 ? periodReviews.Average(r => r.Rating) : 0;

            // New vs returning patients
            var seenPatients = new HashSet<Guid>();
            int newPatients = 0, returningPatients = 0;
            foreach (var a in appts)
            {
                if (!seenPatients.Add(a.PatientId)) continue;
                var key = $"{a.PatientId}__{p.Id}";
                if (firstMap.TryGetValue(key, out var firstDate) && firstDate >= start && firstDate <= end)
                    newPatients++;
                else
                    returningPatients++;
            }

            // Trend
            prevByPro.TryGetValue(p.Id, out var prev);
            var prevRev = prev != null ? (double)prev.Revenue : 0;
            var prevCnt = prev?.Count ?? 0;
            var revenueTrend = prevRev > 0 ? (int)Math.Round(((double)revenue - prevRev) / prevRev * 100) : (revenue > 0 ? 100 : 0);
            var appointmentsTrend = prevCnt > 0 ? (int)Math.Round(((double)total - prevCnt) / prevCnt * 100) : (total > 0 ? 100 : 0);

            // Dynamic status
            var status = "estavel";
            if (cancellationRate > 30 || revenueTrend < -15) status = "critico";
            else if (cancellationRate > 20 || occupancy < 40) status = "atencao";
            else if (occupancy > 70 && cancellationRate < 10 && revenueTrend >= 0) status = "destaque";

            return new
            {
                id = p.Id,
                name = p.User.Name,
                specialty = p.Specialty ?? "Especialista",
                appointments = total,
                completedCount = completed,
                cancelledCount = cancelled,
                noShowCount = 0,
                cancellationRate,
                conversionRate,
                revenue,
                netPayout = revenue * 0.5m,
                commissionPct = 50,
                rating = Math.Round(avgRating, 1),
                reviewCount = periodReviews.Count,
                occupancy,
                revenuePerHour,
                newPatients,
                returningPatients,
                revenueTrend,
                appointmentsTrend,
                status
            };
        })
        .OrderByDescending(x => x.revenue)
        .ToList();

        return Ok(result);
    }

    // =====================================================================
    // GET /api/metrics/services
    // =====================================================================
    [HttpGet("services")]
    public async Task<ActionResult> GetServiceMetrics([FromQuery] string? period)
    {
        var clinicId = GetClinicId();
        var (start, end) = ParsePeriod(period);

        var periodMs = (end - start).TotalMilliseconds;
        var prevStart = start.AddMilliseconds(-periodMs);
        var prevEnd = start.AddSeconds(-1);

        var services = await _db.Services
            .Include(s => s.Professionals)
            .Where(s => s.ClinicId == clinicId && s.IsActive)
            .ToListAsync();

        var allAppts = await _db.Appointments
            .Include(a => a.Payment)
            .Include(a => a.Professional).ThenInclude(p => p.User)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= start && a.StartTime <= end)
            .ToListAsync();

        var prevAppts = await _db.Appointments
            .Include(a => a.Payment)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= prevStart && a.StartTime <= prevEnd)
            .ToListAsync();

        var prevByService = prevAppts
            .GroupBy(a => a.ServiceId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Count = g.Count(),
                    Revenue = g.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m)
                }
            );

        var result = services.Select(s =>
        {
            var appts = allAppts.Where(a => a.ServiceId == s.Id).ToList();
            var total = appts.Count;
            var completed = appts.Count(a => a.Status == "COMPLETED");
            var cancelled = appts.Count(a => a.Status == "CANCELLED");
            var revenue = appts.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m);
            var avgPrice = completed > 0 ? revenue / completed : s.Price;

            var cancellationRate = total > 0 ? (int)Math.Round((double)cancelled / total * 100) : 0;

            // Unique patients and return rate
            var patientCounts = appts.GroupBy(a => a.PatientId).ToDictionary(g => g.Key, g => g.Count());
            var uniquePatients = patientCounts.Count;
            var returningPatients = patientCounts.Count(kv => kv.Value >= 2);
            var returnRate = uniquePatients > 0 ? (int)Math.Round((double)returningPatients / uniquePatients * 100) : 0;

            // Real duration vs planned
            var completedAppts = appts.Where(a => a.Status == "COMPLETED").ToList();
            var avgRealDuration = completedAppts.Count > 0
                ? (int)Math.Round(completedAppts.Average(a => (a.EndTime - a.StartTime).TotalMinutes))
                : 0;

            // Revenue per hour
            var durationHours = (double)(s.DurationMinutes * completed) / 60;
            var revenuePerHour = durationHours > 0 ? (int)Math.Round((double)revenue / durationHours) : 0;

            // Top professional
            var topPro = appts
                .GroupBy(a => a.Professional.User.Name)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefault() ?? "—";

            // Trend
            prevByService.TryGetValue(s.Id, out var prev);
            var prevRev = prev != null ? (double)prev.Revenue : 0;
            var prevCnt = prev?.Count ?? 0;
            var revenueTrend = prevRev > 0 ? (int)Math.Round(((double)revenue - prevRev) / prevRev * 100) : (revenue > 0 ? 100 : 0);
            var countTrend = prevCnt > 0 ? (int)Math.Round(((double)total - prevCnt) / prevCnt * 100) : (total > 0 ? 100 : 0);

            // Dynamic status
            var status = "estavel";
            if (cancellationRate > 30 || revenueTrend < -20) status = "declinio";
            else if (cancellationRate > 20 || revenueTrend < -10) status = "atencao";
            else if (revenueTrend > 0 && cancellationRate < 10) status = "em_alta";

            return new
            {
                id = s.Id,
                name = s.Name,
                category = s.Category ?? "Geral",
                duration = s.DurationMinutes,
                price = s.Price,
                totalAppointments = total,
                completedCount = completed,
                cancelledCount = cancelled,
                noShowCount = 0,
                cancellationRate,
                revenue,
                avgPrice,
                uniquePatients,
                returningPatients,
                returnRate,
                avgRealDuration,
                insurancePct = 0,
                revenuePerHour,
                proCount = s.Professionals.Count,
                topProfessional = topPro,
                revenueTrend,
                countTrend,
                status
            };
        })
        .OrderByDescending(x => x.revenue)
        .ToList();

        // Peak hours
        var completedAll = allAppts.Where(a => a.Status == "COMPLETED").ToList();
        var peakHours = Enumerable.Range(8, 13)
            .Select(h => new
            {
                hour = $"{h:D2}:00",
                count = completedAll.Count(a => a.StartTime.Hour == h)
            })
            .ToList();

        return Ok(new { services = result, peakHours });
    }

    // =====================================================================
    // GET /api/metrics/billing
    // =====================================================================
    [HttpGet("billing")]
    public async Task<ActionResult> GetBillingData([FromQuery] string? period)
    {
        var clinicId = GetClinicId();
        var (start, end) = ParsePeriod(period);

        var periodMs = (end - start).TotalMilliseconds;
        var prevStart = start.AddMilliseconds(-periodMs);
        var prevEnd = start.AddSeconds(-1);

        // Revenue current period
        var paidPayments = await _db.Payments
            .Include(p => p.Appointment).ThenInclude(a => a.Professional).ThenInclude(p => p.User)
            .Include(p => p.Appointment).ThenInclude(a => a.Service)
            .Where(p => p.Appointment.ClinicId == clinicId
                && p.Status == "PAID"
                && p.PaymentDate >= start && p.PaymentDate <= end)
            .ToListAsync();

        // Revenue previous period
        var prevPaidPayments = await _db.Payments
            .Where(p => p.Appointment.ClinicId == clinicId
                && p.Status == "PAID"
                && p.PaymentDate >= prevStart && p.PaymentDate <= prevEnd)
            .ToListAsync();

        var totalRevenue = paidPayments.Sum(p => p.Amount);
        var prevRevenue = prevPaidPayments.Sum(p => p.Amount);
        var revenueTrend = prevRevenue > 0
            ? (int)Math.Round((double)(totalRevenue - prevRevenue) / (double)prevRevenue * 100)
            : (totalRevenue > 0 ? 100 : 0);

        // Appointments this period
        var periodAppts = await _db.Appointments
            .Where(a => a.ClinicId == clinicId && a.StartTime >= start && a.StartTime <= end)
            .ToListAsync();

        var totalAppointments = periodAppts.Count;
        var completedAppts = periodAppts.Count(a => a.Status == "COMPLETED");
        var ticketMedio = completedAppts > 0 ? totalRevenue / completedAppts : 0m;

        // Revenue by payment method
        var revenueByChannel = paidPayments
            .GroupBy(p => p.PaymentMethod ?? "Outro")
            .Select(g => new { name = g.Key, value = g.Sum(p => p.Amount) })
            .OrderByDescending(x => x.value)
            .ToList();

        // Payouts by professional
        var payoutGroups = paidPayments
            .GroupBy(p => p.Appointment.ProfessionalId)
            .Select(g =>
            {
                var pro = g.First().Appointment.Professional;
                var gross = g.Sum(p => p.Amount);
                var pct = 50; // default commission
                return new
                {
                    id = pro.Id,
                    name = pro.User.Name,
                    specialty = pro.Specialty ?? "Especialista",
                    appointments = g.Count(),
                    gross,
                    pct = $"{pct}%",
                    net = gross * pct / 100m
                };
            })
            .OrderByDescending(x => x.gross)
            .ToList();

        var totalPayout = payoutGroups.Sum(p => p.net);

        // Delinquency - PENDING payments
        var pendingPayments = await _db.Payments
            .Include(p => p.Appointment).ThenInclude(a => a.Patient).ThenInclude(p => p.User)
            .Include(p => p.Appointment).ThenInclude(a => a.Service)
            .Where(p => p.Appointment.ClinicId == clinicId && p.Status == "PENDING")
            .OrderBy(p => p.CreatedAt)
            .Take(15)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var delinquency = pendingPayments.Select(p => new
        {
            patient = p.Appointment.Patient.User.Name,
            service = p.Appointment.Service.Name,
            value = p.Amount,
            date = p.CreatedAt,
            days = (int)(now - p.CreatedAt).TotalDays
        }).ToList();

        var totalDelinquency = pendingPayments.Sum(p => p.Amount);

        // Monthly revenue (last 12 months)
        var monthlyRevenue = new List<object>();
        for (int i = 11; i >= 0; i--)
        {
            var mStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var mEnd = mStart.AddMonths(1).AddSeconds(-1);
            var mRev = await _db.Payments
                .Where(p => p.Appointment.ClinicId == clinicId
                    && p.Status == "PAID"
                    && p.PaymentDate >= mStart && p.PaymentDate <= mEnd)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            monthlyRevenue.Add(new
            {
                month = mStart.ToString("MMM", new System.Globalization.CultureInfo("pt-BR")),
                revenue = mRev
            });
        }

        return Ok(new
        {
            totalRevenue,
            revenueTrend,
            totalPayout,
            receitaLiquida = totalRevenue - totalPayout,
            totalAppointments,
            completedAppts,
            ticketMedio,
            totalDelinquency,
            revenueByChannel,
            payouts = payoutGroups,
            delinquency,
            monthlyRevenue
        });
    }

    // =====================================================================
    // GET /api/metrics/marketing
    // =====================================================================
    [HttpGet("marketing")]
    public async Task<ActionResult> GetMarketingData([FromQuery] string? period)
    {
        var clinicId = GetClinicId();
        var (start, end) = ParsePeriod(period);

        var periodMs = (end - start).TotalMilliseconds;
        var prevStart = start.AddMilliseconds(-periodMs);
        var prevEnd = start.AddSeconds(-1);

        // All appointments this period
        var appts = await _db.Appointments
            .Include(a => a.Payment)
            .Include(a => a.Service)
            .Where(a => a.ClinicId == clinicId && a.StartTime >= start && a.StartTime <= end)
            .ToListAsync();

        var prevAppts = await _db.Appointments
            .Where(a => a.ClinicId == clinicId && a.StartTime >= prevStart && a.StartTime <= prevEnd)
            .ToListAsync();

        var totalAppts = appts.Count;
        var completedAppts = appts.Count(a => a.Status == "COMPLETED");
        var cancelledAppts = appts.Count(a => a.Status == "CANCELLED");
        var confirmedAppts = appts.Count(a => a.Status == "CONFIRMED" || a.Status == "IN_PROGRESS" || a.Status == "COMPLETED");
        var revenue = appts.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m);

        var prevTotal = prevAppts.Count;
        var appointmentsTrend = prevTotal > 0
            ? (int)Math.Round(((double)totalAppts - prevTotal) / prevTotal * 100)
            : (totalAppts > 0 ? 100 : 0);

        // Appointments by service (as "origins" breakdown)
        var byService = appts
            .GroupBy(a => a.Service.Name)
            .Select(g => new
            {
                name = g.Key,
                value = g.Count(),
                pct = totalAppts > 0 ? (int)Math.Round((double)g.Count() / totalAppts * 100) : 0,
                revenue = g.Sum(a => a.Payment != null && a.Payment.Status == "PAID" ? a.Payment.Amount : 0m)
            })
            .OrderByDescending(x => x.value)
            .ToList();

        // Appointments by day of week
        var byDayOfWeek = appts
            .GroupBy(a => a.StartTime.DayOfWeek)
            .Select(g => new
            {
                day = g.Key switch
                {
                    DayOfWeek.Monday => "Seg",
                    DayOfWeek.Tuesday => "Ter",
                    DayOfWeek.Wednesday => "Qua",
                    DayOfWeek.Thursday => "Qui",
                    DayOfWeek.Friday => "Sex",
                    DayOfWeek.Saturday => "Sab",
                    _ => "Dom"
                },
                count = g.Count()
            })
            .OrderBy(x => x.day)
            .ToList();

        // New patients this period
        var newPatientsCount = await _db.Patients
            .CountAsync(p => p.ClinicId == clinicId && p.CreatedAt >= start && p.CreatedAt <= end);

        // Conversion funnel
        var funnel = new
        {
            agendados = totalAppts,
            confirmados = confirmedAppts,
            concluidos = completedAppts,
            cancelados = cancelledAppts,
            confirmadosPct = totalAppts > 0 ? (int)Math.Round((double)confirmedAppts / totalAppts * 100) : 0,
            concluidosPct = totalAppts > 0 ? (int)Math.Round((double)completedAppts / totalAppts * 100) : 0,
            canceladosPct = totalAppts > 0 ? (int)Math.Round((double)cancelledAppts / totalAppts * 100) : 0
        };

        // Top services by revenue
        var topServicesByRevenue = byService.Take(5).ToList();

        return Ok(new
        {
            totalAppointments = totalAppts,
            completedAppointments = completedAppts,
            cancelledAppointments = cancelledAppts,
            revenue,
            appointmentsTrend,
            newPatients = newPatientsCount,
            funnel,
            byService,
            byDayOfWeek,
            topServicesByRevenue
        });
    }
}
