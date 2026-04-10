using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;
using Consultorio.Infra.Context;

public static class SeedData
{
    public static async Task Initialize(AppDbContext db)
    {
        // Se já tem clínica, não faz seed novamente
        if (await db.Clinics.AnyAsync())
            return;

        // ─── CLÍNICA ───
        var clinic = new Clinic
        {
            Id = Guid.NewGuid(),
            Name = "Clínica Saúde & Bem-Estar",
            Description = "Clínica multidisciplinar focada em saúde integral e qualidade de vida.",
            Phone = "(11) 3456-7890",
            Email = "contato@clinicasaude.com.br",
            Address = "Av. Paulista, 1000 - Sala 301",
            City = "São Paulo",
            State = "SP",
            PostalCode = "01310-100",
            Website = "https://clinicasaude.com.br",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Clinics.Add(clinic);

        // ─── ADMIN ───
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Ana Souza",
            Email = "admin@clinica.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(adminUser);

        db.SystemUsers.Add(new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = adminUser.Id,
            ClinicId = clinic.Id,
            Role = "ADMIN",
            CreatedAt = DateTime.UtcNow
        });

        // ─── RECEPCIONISTA ───
        var recepUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Mariana Lima",
            Email = "recepcao@clinica.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Recep123!"),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(recepUser);

        db.SystemUsers.Add(new SystemUser
        {
            Id = Guid.NewGuid(),
            UserId = recepUser.Id,
            ClinicId = clinic.Id,
            Role = "RECEPTIONIST",
            CreatedAt = DateTime.UtcNow
        });

        // ─── SALAS ───
        var sala1 = new Room { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Consultório 1", Description = "Sala de consultas gerais", Location = "Andar 3", Capacity = 1, IsActive = true, CreatedAt = DateTime.UtcNow };
        var sala2 = new Room { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Consultório 2", Description = "Sala de fisioterapia", Location = "Andar 3", Capacity = 2, IsActive = true, CreatedAt = DateTime.UtcNow };
        var sala3 = new Room { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Sala de Procedimentos", Description = "Equipada para procedimentos menores", Location = "Andar 2", Capacity = 1, IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Rooms.AddRange(sala1, sala2, sala3);

        // ─── SERVIÇOS ───
        var svc1 = new Service { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Consulta Geral", Description = "Consulta médica de rotina com avaliação completa", DurationMinutes = 30, Price = 150.00m, Category = "Consultas", Color = "#4CAF50", IsActive = true, CreatedAt = DateTime.UtcNow };
        var svc2 = new Service { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Fisioterapia", Description = "Sessão de fisioterapia com exercícios dirigidos", DurationMinutes = 50, Price = 200.00m, Category = "Terapias", Color = "#FF9800", DefaultRoomId = sala2.Id, RequiresRoom = true, IsActive = true, CreatedAt = DateTime.UtcNow };
        var svc3 = new Service { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Psicologia", Description = "Sessão de psicoterapia individual", DurationMinutes = 50, Price = 250.00m, Category = "Terapias", Color = "#9C27B0", IsActive = true, CreatedAt = DateTime.UtcNow };
        var svc4 = new Service { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Nutrição", Description = "Consulta nutricional com plano alimentar", DurationMinutes = 40, Price = 180.00m, Category = "Consultas", Color = "#00BCD4", IsActive = true, CreatedAt = DateTime.UtcNow };
        var svc5 = new Service { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Avaliação Postural", Description = "Avaliação completa de postura e alinhamento corporal", DurationMinutes = 60, Price = 220.00m, Category = "Avaliações", Color = "#3F51B5", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Services.AddRange(svc1, svc2, svc3, svc4, svc5);

        // ─── PROFISSIONAIS (User + Professional) ───
        var drCarlos = new User { Id = Guid.NewGuid(), Name = "Dr. Carlos Mendes", Email = "carlos@clinica.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pro123!"), Phone = "(11) 99888-1111", IsActive = true, CreatedAt = DateTime.UtcNow };
        var draJulia = new User { Id = Guid.NewGuid(), Name = "Dra. Júlia Santos", Email = "julia@clinica.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pro123!"), Phone = "(11) 99888-2222", IsActive = true, CreatedAt = DateTime.UtcNow };
        var drRafael = new User { Id = Guid.NewGuid(), Name = "Dr. Rafael Costa", Email = "rafael@clinica.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pro123!"), Phone = "(11) 99888-3333", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Users.AddRange(drCarlos, draJulia, drRafael);

        var pro1 = new Professional { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = drCarlos.Id, LicenseNumber = "CRM-SP 123456", Specialty = "Clínico Geral", Bio = "Médico clínico geral com 15 anos de experiência em atendimento ambulatorial.", IsAvailable = true, CreatedAt = DateTime.UtcNow };
        var pro2 = new Professional { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = draJulia.Id, LicenseNumber = "CRP-SP 654321", Specialty = "Psicóloga Clínica", Bio = "Psicóloga especialista em terapia cognitivo-comportamental.", IsAvailable = true, CreatedAt = DateTime.UtcNow };
        var pro3 = new Professional { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = drRafael.Id, LicenseNumber = "CREFITO-SP 789012", Specialty = "Fisioterapeuta", Bio = "Fisioterapeuta especializado em reabilitação musculoesquelética.", IsAvailable = true, CreatedAt = DateTime.UtcNow };
        db.Professionals.AddRange(pro1, pro2, pro3);

        // ─── PACIENTES ───
        var pacUser1 = new User { Id = Guid.NewGuid(), Name = "Maria Oliveira", Email = "maria@email.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pac123!"), Phone = "(11) 98765-0001", IsActive = true, CreatedAt = DateTime.UtcNow };
        var pacUser2 = new User { Id = Guid.NewGuid(), Name = "João Silva", Email = "joao@email.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pac123!"), Phone = "(11) 98765-0002", IsActive = true, CreatedAt = DateTime.UtcNow };
        var pacUser3 = new User { Id = Guid.NewGuid(), Name = "Fernanda Costa", Email = "fernanda@email.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pac123!"), Phone = "(11) 98765-0003", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Users.AddRange(pacUser1, pacUser2, pacUser3);

        var pac1 = new Patient { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = pacUser1.Id, CPF = "123.456.789-00", Phone = "(11) 98765-0001", BirthDate = new DateTime(1990, 5, 15), Address = "Rua das Flores, 100", City = "São Paulo", State = "SP", IsActive = true, CreatedAt = DateTime.UtcNow };
        var pac2 = new Patient { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = pacUser2.Id, CPF = "987.654.321-00", Phone = "(11) 98765-0002", BirthDate = new DateTime(1985, 8, 22), Address = "Av. Brasil, 500", City = "São Paulo", State = "SP", IsActive = true, CreatedAt = DateTime.UtcNow };
        var pac3 = new Patient { Id = Guid.NewGuid(), ClinicId = clinic.Id, UserId = pacUser3.Id, CPF = "456.789.123-00", Phone = "(11) 98765-0003", BirthDate = new DateTime(1995, 12, 3), Address = "Rua Augusta, 250", City = "São Paulo", State = "SP", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Patients.AddRange(pac1, pac2, pac3);

        // ─── HORÁRIOS DE TRABALHO (Schedule) ───
        // Dr. Carlos: Seg-Sex 08:00-18:00
        for (int day = 1; day <= 5; day++)
        {
            db.Schedules.Add(new Schedule { Id = Guid.NewGuid(), ProfessionalId = pro1.Id, DayOfWeek = day, StartTime = new TimeSpan(8, 0, 0), EndTime = new TimeSpan(18, 0, 0), IsActive = true, CreatedAt = DateTime.UtcNow });
        }

        // Dra. Júlia: Seg-Qua-Sex 09:00-17:00
        foreach (var day in new[] { 1, 3, 5 })
        {
            db.Schedules.Add(new Schedule { Id = Guid.NewGuid(), ProfessionalId = pro2.Id, DayOfWeek = day, StartTime = new TimeSpan(9, 0, 0), EndTime = new TimeSpan(17, 0, 0), IsActive = true, CreatedAt = DateTime.UtcNow });
        }

        // Dr. Rafael: Ter-Qui 08:00-17:00, Sab 08:00-12:00
        foreach (var day in new[] { 2, 4 })
        {
            db.Schedules.Add(new Schedule { Id = Guid.NewGuid(), ProfessionalId = pro3.Id, DayOfWeek = day, StartTime = new TimeSpan(8, 0, 0), EndTime = new TimeSpan(17, 0, 0), IsActive = true, CreatedAt = DateTime.UtcNow });
        }
        db.Schedules.Add(new Schedule { Id = Guid.NewGuid(), ProfessionalId = pro3.Id, DayOfWeek = 6, StartTime = new TimeSpan(8, 0, 0), EndTime = new TimeSpan(12, 0, 0), IsActive = true, CreatedAt = DateTime.UtcNow });

        // ─── CONSULTAS DE EXEMPLO ───
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        db.Appointments.Add(new Appointment { Id = Guid.NewGuid(), ClinicId = clinic.Id, ServiceId = svc1.Id, PatientId = pac1.Id, ProfessionalId = pro1.Id, RoomId = sala1.Id, StartTime = tomorrow.AddHours(9), EndTime = tomorrow.AddHours(9).AddMinutes(30), Status = "SCHEDULED", Notes = "Retorno - check-up anual", CreatedAt = DateTime.UtcNow });
        db.Appointments.Add(new Appointment { Id = Guid.NewGuid(), ClinicId = clinic.Id, ServiceId = svc3.Id, PatientId = pac2.Id, ProfessionalId = pro2.Id, RoomId = sala1.Id, StartTime = tomorrow.AddHours(10), EndTime = tomorrow.AddHours(10).AddMinutes(50), Status = "CONFIRMED", CreatedAt = DateTime.UtcNow });
        db.Appointments.Add(new Appointment { Id = Guid.NewGuid(), ClinicId = clinic.Id, ServiceId = svc2.Id, PatientId = pac3.Id, ProfessionalId = pro3.Id, RoomId = sala2.Id, StartTime = tomorrow.AddHours(14), EndTime = tomorrow.AddHours(14).AddMinutes(50), Status = "SCHEDULED", Notes = "Primeira sessão de fisioterapia", CreatedAt = DateTime.UtcNow });

        // ─── EQUIPAMENTOS ───
        db.Equipments.Add(new Equipment { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Ultrassom Terapêutico", Description = "Equipamento de ultrassom para fisioterapia", SerialNumber = "UST-2024-001", Status = "OPERATIONAL", IsActive = true, CreatedAt = DateTime.UtcNow });
        db.Equipments.Add(new Equipment { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Eletroestimulador", Description = "TENS/FES para eletroterapia", SerialNumber = "ELE-2024-002", Status = "OPERATIONAL", IsActive = true, CreatedAt = DateTime.UtcNow });
        db.Equipments.Add(new Equipment { Id = Guid.NewGuid(), ClinicId = clinic.Id, Name = "Balança Digital", Description = "Balança de precisão com bioimpedância", SerialNumber = "BAL-2024-003", Status = "OPERATIONAL", IsActive = true, CreatedAt = DateTime.UtcNow });

        // ─── PLANOS DE SAÚDE ───
        db.InsurancePlans.Add(new InsurancePlan { Id = Guid.NewGuid(), Name = "Unimed", Description = "Plano Unimed Nacional", IsActive = true, CreatedAt = DateTime.UtcNow });
        db.InsurancePlans.Add(new InsurancePlan { Id = Guid.NewGuid(), Name = "Amil", Description = "Plano Amil 400", IsActive = true, CreatedAt = DateTime.UtcNow });
        db.InsurancePlans.Add(new InsurancePlan { Id = Guid.NewGuid(), Name = "SulAmérica", Description = "Plano SulAmérica Saúde", IsActive = true, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();

        Console.WriteLine("=== SEED CONCLUÍDO ===");
        Console.WriteLine($"Clínica: {clinic.Name}");
        Console.WriteLine($"Admin: admin@clinica.com / Admin123!");
        Console.WriteLine($"Recepção: recepcao@clinica.com / Recep123!");
        Console.WriteLine($"Profissionais: carlos/julia/rafael@clinica.com / Pro123!");
        Console.WriteLine($"Pacientes: maria/joao/fernanda@email.com / Pac123!");
        Console.WriteLine($"Serviços: {5} | Salas: {3} | Consultas: {3}");
    }
}
