using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

public static class SeedData
{
    public static async Task Initialize(AppDbContext db)
    {
        if (await db.Clinics.AnyAsync())
            return;

        var now = DateTime.UtcNow;

        var clinic = new Clinic
        {
            Id = Guid.NewGuid(),
            Name = "Psicologia e Existir",
            Description = "Clinica focada em avaliacao psicologica e neuropsicologica.",
            Phone = "(65) 3023-4000",
            Email = "contato@psicologiaeexistir.com.br",
            Address = "Av. Historiador Rubens de Mendonca, 2000 - Sala 502",
            City = "Cuiaba",
            State = "MT",
            PostalCode = "78050-000",
            Website = "https://psicologiaeexistir.com.br",
            Whatsapp = "5565999999999",
            Mission = "Oferecer acolhimento, escuta qualificada e avaliacao baseada em evidencia.",
            Vision = "Ser referencia em psicologia clinica e avaliacao neuropsicologica na regiao.",
            Values = "Etica, acolhimento, clareza tecnica e respeito a singularidade de cada paciente.",
            IsActive = true,
            CreatedAt = now
        };

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Administrador",
            Email = "admin@psicologiaeexistir.com.br",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Phone = "(65) 99999-0001",
            IsActive = true,
            CreatedAt = now
        };

        var receptionistUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Recepcao",
            Email = "recepcao@psicologiaeexistir.com.br",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Recepcao123!"),
            Phone = "(65) 99999-0002",
            IsActive = true,
            CreatedAt = now
        };

        var professionalUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Dra. Psicologia e Existir",
            Email = "profissional@psicologiaeexistir.com.br",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Profissional123!"),
            Phone = "(65) 99999-0003",
            IsActive = true,
            CreatedAt = now
        };

        var patientUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Fulano",
            Email = "fulano@psicologiaeexistir.com.br",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Paciente123!"),
            Phone = "(65) 99999-0004",
            IsActive = true,
            CreatedAt = now
        };

        var adminSystemUser = new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = adminUser.Id,
            ClinicId = clinic.Id,
            Role = "ADMIN",
            CreatedAt = now
        };

        var receptionistSystemUser = new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = receptionistUser.Id,
            ClinicId = clinic.Id,
            Role = "RECEPTIONIST",
            CreatedAt = now
        };

        var professional = new Professional
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            UserId = professionalUser.Id,
            LicenseNumber = "CRP-MT 00001",
            Specialty = "Psicologia Clinica",
            Bio = "Profissional focada em avaliacao bariatrica, TEA e neuropsicologia.",
            CommissionPct = 50m,
            IsAvailable = true,
            CreatedAt = now
        };

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            UserId = patientUser.Id,
            CPF = "123.456.789-00",
            Phone = patientUser.Phone,
            BirthDate = new DateTime(1990, 1, 1),
            Address = "Rua Exemplo, 123",
            City = "Cuiaba",
            State = "MT",
            PostalCode = "78000-000",
            IsActive = true,
            CreatedAt = now
        };

        var unimed = new InsurancePlan
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Unimed",
            Description = "Convenio Unimed",
            IsActive = true,
            CreatedAt = now
        };

        var pax = new InsurancePlan
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Pax",
            Description = "Convenio Pax",
            IsActive = true,
            CreatedAt = now
        };

        var privado = new InsurancePlan
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Privado",
            Description = "Atendimento particular",
            IsActive = true,
            CreatedAt = now
        };

        var bariatricAssessment = new Service
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Consulta de avaliacao bariatrica",
            Description = "Consulta de avaliacao psicologica para processo bariatrico.",
            ShortDescription = "Avaliacao bariatrica",
            DurationMinutes = 60,
            Price = 350.00m,
            Category = "Avaliacoes",
            Color = "#4E6E81",
            OnlineBooking = true,
            IsActive = true,
            CreatedAt = now
        };

        var teaAssessment = new Service
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Consulta de avaliacao TEA",
            Description = "Consulta para avaliacao inicial relacionada ao transtorno do espectro autista.",
            ShortDescription = "Avaliacao TEA",
            DurationMinutes = 60,
            Price = 380.00m,
            Category = "Avaliacoes",
            Color = "#7A8450",
            OnlineBooking = true,
            IsActive = true,
            CreatedAt = now
        };

        var neuropsychologicalConsultation = new Service
        {
            Id = Guid.NewGuid(),
            ClinicId = clinic.Id,
            Name = "Consulta neuropsicologica",
            Description = "Consulta neuropsicologica para investigacao e acompanhamento clinico.",
            ShortDescription = "Consulta neuropsicologica",
            DurationMinutes = 60,
            Price = 420.00m,
            Category = "Avaliacoes",
            Color = "#A26769",
            OnlineBooking = true,
            IsActive = true,
            CreatedAt = now
        };

        professional.Services.Add(bariatricAssessment);
        professional.Services.Add(teaAssessment);
        professional.Services.Add(neuropsychologicalConsultation);

        var serviceInsurancePlans = new[]
        {
            CreateServiceInsurancePlan(bariatricAssessment.Id, unimed.Id, 350.00m),
            CreateServiceInsurancePlan(bariatricAssessment.Id, pax.Id, 350.00m),
            CreateServiceInsurancePlan(bariatricAssessment.Id, privado.Id, 350.00m),
            CreateServiceInsurancePlan(teaAssessment.Id, unimed.Id, 380.00m),
            CreateServiceInsurancePlan(teaAssessment.Id, pax.Id, 380.00m),
            CreateServiceInsurancePlan(teaAssessment.Id, privado.Id, 380.00m),
            CreateServiceInsurancePlan(neuropsychologicalConsultation.Id, unimed.Id, 420.00m),
            CreateServiceInsurancePlan(neuropsychologicalConsultation.Id, pax.Id, 420.00m),
            CreateServiceInsurancePlan(neuropsychologicalConsultation.Id, privado.Id, 420.00m),
        };

        var schedules = new[]
        {
            new Schedule
            {
                Id = Guid.NewGuid(),
                ProfessionalId = professional.Id,
                DayOfWeek = 1,
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                IsActive = true,
                CreatedAt = now
            },
            new Schedule
            {
                Id = Guid.NewGuid(),
                ProfessionalId = professional.Id,
                DayOfWeek = 3,
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                IsActive = true,
                CreatedAt = now
            },
            new Schedule
            {
                Id = Guid.NewGuid(),
                ProfessionalId = professional.Id,
                DayOfWeek = 5,
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                IsActive = true,
                CreatedAt = now
            }
        };

        db.Clinics.Add(clinic);
        db.Users.AddRange(adminUser, receptionistUser, professionalUser, patientUser);
        db.SystemUsers.AddRange(adminSystemUser, receptionistSystemUser);
        db.Professionals.Add(professional);
        db.Patients.Add(patient);
        db.InsurancePlans.AddRange(unimed, pax, privado);
        db.Services.AddRange(bariatricAssessment, teaAssessment, neuropsychologicalConsultation);
        db.ServiceInsurancePlans.AddRange(serviceInsurancePlans);
        db.Schedules.AddRange(schedules);

        await db.SaveChangesAsync();

        Console.WriteLine("=== SEED CONCLUIDO ===");
        Console.WriteLine($"Clinica: {clinic.Name}");
        Console.WriteLine($"Admin: {adminUser.Email} / Admin123!");
        Console.WriteLine($"Recepcao: {receptionistUser.Email} / Recepcao123!");
        Console.WriteLine($"Profissional: {professionalUser.Email} / Profissional123!");
        Console.WriteLine($"Paciente: {patientUser.Email} / Paciente123!");
        Console.WriteLine("Servicos: 3 | Convenios: 3 | Profissionais: 1 | Pacientes: 1");
    }

    private static ServiceInsurancePlan CreateServiceInsurancePlan(Guid serviceId, Guid insurancePlanId, decimal price)
    {
        return new ServiceInsurancePlan
        {
            ServiceId = serviceId,
            InsurancePlanId = insurancePlanId,
            Price = price,
            ShowPrice = true
        };
    }
}
