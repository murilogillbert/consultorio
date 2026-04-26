using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Consultorio.Infra.Context;

namespace Consultorio.API.Controllers;

/// <summary>
/// Endpoints exclusivos para o portal do profissional autenticado.
/// Todos os dados são filtrados pelo professionalId vindo do JWT.
/// </summary>
[ApiController]
[Route("api/professional-portal")]
[Authorize(Roles = "PROFESSIONAL")]
public class ProfessionalPortalController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfessionalPortalController(AppDbContext db) => _db = db;

    private Guid GetProfessionalId()
    {
        var claim = User.FindFirst("professionalId");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    // ─── GET /api/professional-portal/agenda ──────────────────────────────
    // Retorna as consultas de uma semana (padrão = semana atual).
    // Parâmetro: startDate (yyyy-MM-dd) — início da semana
    [HttpGet("agenda")]
    public async Task<ActionResult> GetAgenda([FromQuery] string? startDate)
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        // Determina a semana a ser exibida
        DateTime weekStart;
        if (!DateTime.TryParse(startDate, out weekStart))
            weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1); // Segunda-feira desta semana

        var weekEnd = weekStart.AddDays(7).AddSeconds(-1);

        var appointments = await _db.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Service)
            .Include(a => a.Payment)
            .Where(a => a.ProfessionalId == proId
                     && a.StartTime >= weekStart
                     && a.StartTime <= weekEnd)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        var result = appointments.Select(a => new
        {
            id = a.Id,
            startTime = a.StartTime,
            endTime = a.EndTime,
            status = a.Status,
            notes = a.Notes,
            patient = new
            {
                id = a.Patient.Id,
                name = a.Patient.User.Name,
                avatarUrl = a.Patient.User.AvatarUrl
            },
            service = new
            {
                id = a.Service.Id,
                name = a.Service.Name,
                durationMinutes = a.Service.DurationMinutes,
                price = a.Service.Price,
                color = a.Service.Color
            },
            payment = a.Payment == null ? null : new
            {
                status = a.Payment.Status,
                amount = a.Payment.Amount,
                method = a.Payment.PaymentMethod
            }
        }).ToList();

        return Ok(new
        {
            weekStart,
            weekEnd,
            appointments = result
        });
    }

    // ─── GET /api/professional-portal/reviews ─────────────────────────────
    // Retorna avaliação geral (média, distribuição) e lista de avaliações por consulta.
    [HttpGet("reviews")]
    public async Task<ActionResult> GetReviews()
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        var reviews = await _db.ProfessionalReviews
            .Include(r => r.Patient).ThenInclude(p => p.User)
            .Where(r => r.ProfessionalId == proId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        // Distribui ratings de 1 a 5
        var distribution = Enumerable.Range(1, 5)
            .Select(star => new { star, count = reviews.Count(r => r.Rating == star) })
            .ToList();

        var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0.0;

        // Busca o appointmentId vinculado a cada review (se existir)
        var result = reviews.Select(r => new
        {
            id = r.Id,
            rating = r.Rating,
            comment = r.Comment,
            createdAt = r.CreatedAt,
            appointmentId = r.AppointmentId,
            patient = new
            {
                name = r.Patient.User.Name,
                avatarUrl = r.Patient.User.AvatarUrl
            }
        }).ToList();

        return Ok(new
        {
            totalReviews = reviews.Count,
            averageRating = avgRating,
            distribution,
            reviews = result
        });
    }

    // ─── GET /api/professional-portal/insurance-stats ─────────────────────
    // Retorna os convênios mais atendidos para este profissional, baseado no
    // InsurancePlan selecionado ao criar a consulta (Appointment.InsurancePlanId).
    // Filtros opcionais: patientId, serviceId
    [HttpGet("insurance-stats")]
    public async Task<ActionResult> GetInsuranceStats(
        [FromQuery] Guid? patientId,
        [FromQuery] Guid? serviceId)
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        var clinicId = await _db.Professionals
            .Where(p => p.Id == proId)
            .Select(p => (Guid?)p.ClinicId)
            .FirstOrDefaultAsync();

        // Busca todas as consultas não canceladas do profissional.
        // Importante: o convênio é o que foi efetivamente selecionado na consulta
        // (Appointment.InsurancePlanId), não a lista de convênios suportados pelo serviço.
        // Isso garante isolamento por profissional e evita "duplicação" do mesmo convênio
        // quando outro profissional atende o mesmo serviço.
        var apptQuery = _db.Appointments
            .Include(a => a.InsurancePlan)
            .Where(a => a.ProfessionalId == proId && a.Status != "CANCELLED");

        if (patientId.HasValue && patientId.Value != Guid.Empty)
            apptQuery = apptQuery.Where(a => a.PatientId == patientId.Value);
        if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            apptQuery = apptQuery.Where(a => a.ServiceId == serviceId.Value);

        var appointments = await apptQuery.ToListAsync();

        var totalAppointments = appointments.Count;
        var grouped = appointments
            .Where(a => a.InsurancePlan != null
                     && (clinicId == null || a.InsurancePlan!.ClinicId == clinicId))
            .GroupBy(a => new { Id = a.InsurancePlanId!.Value, Name = a.InsurancePlan!.Name })
            .Select(g => new
            {
                id = g.Key.Id,
                name = g.Key.Name,
                count = g.Count(),
                percentage = totalAppointments > 0
                    ? (int)Math.Round((double)g.Count() / totalAppointments * 100)
                    : 0
            })
            .OrderByDescending(x => x.count)
            .ToList();

        var totalWithInsurance = grouped.Sum(g => g.count);
        var withoutInsurance = totalAppointments - totalWithInsurance;

        return Ok(new
        {
            totalAppointments,
            totalWithInsurance,
            withoutInsurance,
            insurancePlans = grouped
        });
    }

    // ─── GET /api/professional-portal/filters ─────────────────────────────
    // Retorna pacientes e serviços já atendidos por este profissional, para
    // popular os filtros das métricas.
    [HttpGet("filters")]
    public async Task<ActionResult> GetFilters()
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        var patients = await _db.Appointments
            .Where(a => a.ProfessionalId == proId)
            .Select(a => new { Id = a.PatientId, Name = a.Patient.User.Name })
            .Distinct()
            .OrderBy(p => p.Name)
            .ToListAsync();

        var services = await _db.Appointments
            .Where(a => a.ProfessionalId == proId)
            .Select(a => new { Id = a.ServiceId, Name = a.Service.Name })
            .Distinct()
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(new
        {
            patients = patients.Select(p => new { id = p.Id, name = p.Name }),
            services = services.Select(s => new { id = s.Id, name = s.Name })
        });
    }

    // ─── GET /api/professional-portal/alerts ─────────────────────────────
    // Retorna as mensagens de alerta enviadas pela recepção via "Avisar Funcionário".
    [HttpGet("alerts")]
    public async Task<ActionResult> GetAlerts()
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        var professional = await _db.Professionals
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == proId);

        if (professional == null)
            return NotFound(new { message = "Profissional não encontrado." });

        var memberChannelIds = await _db.ChatChannelMembers
            .Where(m => m.UserId == professional.UserId)
            .Select(m => m.ChatChannelId)
            .ToListAsync();

        var messages = await _db.ChatMessages
            .Include(m => m.User)
            .Where(m => memberChannelIds.Contains(m.ChatChannelId))
            .OrderByDescending(m => m.CreatedAt)
            .Take(50)
            .Select(m => new
            {
                id = m.Id,
                content = m.Content,
                createdAt = m.CreatedAt,
                channelId = m.ChatChannelId,
                sender = new { name = m.User.Name }
            })
            .ToListAsync();

        return Ok(messages);
    }

    // ─── GET /api/professional-portal/earnings ────────────────────────────
    // Retorna os ganhos do mês = Σ(valor do serviço × comissão do profissional).
    // Parâmetros: year (int), month (int, 1-12) — padrão = mês/ano atual.
    // Filtros opcionais: patientId, serviceId
    [HttpGet("earnings")]
    public async Task<ActionResult> GetEarnings(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? patientId,
        [FromQuery] Guid? serviceId)
    {
        var proId = GetProfessionalId();
        if (proId == Guid.Empty)
            return Unauthorized(new { message = "Profissional não identificado." });

        var now = DateTime.UtcNow;
        var targetYear = year ?? now.Year;
        var targetMonth = month ?? now.Month;

        var monthStart = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);

        // Busca o profissional para pegar a comissão
        var professional = await _db.Professionals
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == proId);

        if (professional == null)
            return NotFound(new { message = "Profissional não encontrado." });

        var commission = professional.CommissionPct; // % configurada no admin

        // Consultas COMPLETED do mês com pagamento PAID
        var apptQuery = _db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Include(a => a.Payment)
            .Where(a => a.ProfessionalId == proId
                     && a.StartTime >= monthStart
                     && a.StartTime <= monthEnd
                     && a.Status == "COMPLETED");

        if (patientId.HasValue && patientId.Value != Guid.Empty)
            apptQuery = apptQuery.Where(a => a.PatientId == patientId.Value);
        if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            apptQuery = apptQuery.Where(a => a.ServiceId == serviceId.Value);

        var appointments = await apptQuery.OrderBy(a => a.StartTime).ToListAsync();

        // Calcula ganho por consulta: valor pago × comissão%
        var earningItems = appointments.Select(a =>
        {
            var paidAmount = a.Payment != null && a.Payment.Status == "PAID"
                ? a.Payment.Amount
                : a.Service.Price; // fallback para o preço do serviço se sem pagamento

            var earning = paidAmount * commission / 100m;

            return new
            {
                id = a.Id,
                startTime = a.StartTime,
                patientName = a.Patient.User.Name,
                serviceName = a.Service.Name,
                servicePrice = a.Service.Price,
                paidAmount,
                commission,
                earning = Math.Round(earning, 2),
                paymentStatus = a.Payment?.Status ?? "SEM_PAGAMENTO"
            };
        }).ToList();

        var totalGross = earningItems.Sum(e => e.paidAmount);
        var totalEarnings = earningItems.Sum(e => e.earning);

        // Resumo dos últimos 6 meses para o gráfico
        var last6Months = Enumerable.Range(0, 6).Select(i =>
        {
            var d = monthStart.AddMonths(-i);
            return new { year = d.Year, month = d.Month };
        }).Reverse().ToList();

        var historicAppts = await _db.Appointments
            .Include(a => a.Payment)
            .Include(a => a.Service)
            .Where(a => a.ProfessionalId == proId
                     && a.Status == "COMPLETED"
                     && a.StartTime >= monthStart.AddMonths(-5)
                     && a.StartTime <= monthEnd)
            .ToListAsync();

        var monthlyHistory = last6Months.Select(m =>
        {
            var mStart = new DateTime(m.year, m.month, 1, 0, 0, 0, DateTimeKind.Utc);
            var mEnd = mStart.AddMonths(1).AddSeconds(-1);
            var mAppts = historicAppts.Where(a => a.StartTime >= mStart && a.StartTime <= mEnd).ToList();
            var mGross = mAppts.Sum(a => a.Payment != null && a.Payment.Status == "PAID"
                ? a.Payment.Amount : a.Service.Price);
            return new
            {
                year = m.year,
                month = m.month,
                label = mStart.ToString("MMM/yy"),
                gross = mGross,
                earning = Math.Round(mGross * commission / 100m, 2),
                count = mAppts.Count
            };
        }).ToList();

        return Ok(new
        {
            year = targetYear,
            month = targetMonth,
            commission,
            professionalName = professional.User.Name,
            totalCompleted = appointments.Count,
            totalGross,
            totalEarnings = Math.Round(totalEarnings, 2),
            appointments = earningItems,
            monthlyHistory
        });
    }
}
