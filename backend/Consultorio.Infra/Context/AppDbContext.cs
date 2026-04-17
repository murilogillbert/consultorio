using Microsoft.EntityFrameworkCore;
using Consultorio.Domain.Models;

namespace Consultorio.Infra.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // DbSets for all entities
    public DbSet<Clinic> Clinics { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<SystemUser> SystemUsers { get; set; } = null!;
    public DbSet<Professional> Professionals { get; set; } = null!;
    public DbSet<Patient> Patients { get; set; } = null!;
    public DbSet<Service> Services { get; set; } = null!;
    public DbSet<Room> Rooms { get; set; } = null!;
    public DbSet<Equipment> Equipments { get; set; } = null!;
    public DbSet<Appointment> Appointments { get; set; } = null!;
    public DbSet<Schedule> Schedules { get; set; } = null!;
    public DbSet<Block> Blocks { get; set; } = null!;
    public DbSet<Payment> Payments { get; set; } = null!;
    public DbSet<EquipmentUsage> EquipmentUsages { get; set; } = null!;
    public DbSet<InsurancePlan> InsurancePlans { get; set; } = null!;
    public DbSet<ProfessionalReview> ProfessionalReviews { get; set; } = null!;
    public DbSet<JobOpening> JobOpenings { get; set; } = null!;
    public DbSet<Candidacy> Candidacies { get; set; } = null!;
    public DbSet<Banner> Banners { get; set; } = null!;
    public DbSet<ChatChannel> ChatChannels { get; set; } = null!;
    public DbSet<ChatChannelMember> ChatChannelMembers { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
    public DbSet<Announcement> Announcements { get; set; } = null!;
    public DbSet<PatientMessage> PatientMessages { get; set; } = null!;
    public DbSet<ServiceCategory> ServiceCategories { get; set; } = null!;
    public DbSet<ServiceInsurancePlan> ServiceInsurancePlans { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ───── ANNOUNCEMENT ─────
        modelBuilder.Entity<Announcement>()
            .HasKey(a => a.Id);
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.Clinic)
            .WithMany()
            .HasForeignKey(a => a.ClinicId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.PublishedBy)
            .WithMany()
            .HasForeignKey(a => a.PublishedById)
            .OnDelete(DeleteBehavior.Restrict);

        // ───── CLINIC (Root aggregate) ─────
        modelBuilder.Entity<Clinic>()
            .HasKey(c => c.Id);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Users)
            .WithOne(u => u.Clinic)
            .HasForeignKey(u => u.ClinicId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Professionals)
            .WithOne(p => p.Clinic)
            .HasForeignKey(p => p.ClinicId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Patients)
            .WithOne(p => p.Clinic)
            .HasForeignKey(p => p.ClinicId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Services)
            .WithOne(s => s.Clinic)
            .HasForeignKey(s => s.ClinicId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Rooms)
            .WithOne(r => r.Clinic)
            .HasForeignKey(r => r.ClinicId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Equipments)
            .WithOne(e => e.Clinic)
            .HasForeignKey(e => e.ClinicId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.Banners)
            .WithOne(b => b.Clinic)
            .HasForeignKey(b => b.ClinicId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Clinic>()
            .HasMany(c => c.ChatChannels)
            .WithOne(ch => ch.Clinic)
            .HasForeignKey(ch => ch.ClinicId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── USER (Base identity) ─────
        modelBuilder.Entity<User>()
            .HasKey(u => u.Id);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasOne(u => u.SystemUser)
            .WithOne(su => su.User)
            .HasForeignKey<SystemUser>(su => su.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<User>()
            .HasOne(u => u.Professional)
            .WithOne(p => p.User)
            .HasForeignKey<Professional>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<User>()
            .HasOne(u => u.Patient)
            .WithOne(p => p.User)
            .HasForeignKey<Patient>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<User>()
            .HasMany(u => u.ChatMessages)
            .WithOne(m => m.User)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<User>()
            .HasMany(u => u.ChatChannelMemberships)
            .WithOne(m => m.User)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── SYSTEMUSER ─────
        modelBuilder.Entity<SystemUser>()
            .HasKey(su => su.Id);

        // ───── PROFESSIONAL ─────
        modelBuilder.Entity<Professional>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Professional>()
            .Property(p => p.CommissionPct)
            .HasPrecision(5, 2);
        modelBuilder.Entity<Professional>()
            .HasMany(p => p.Appointments)
            .WithOne(a => a.Professional)
            .HasForeignKey(a => a.ProfessionalId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Professional>()
            .HasMany(p => p.Schedules)
            .WithOne(s => s.Professional)
            .HasForeignKey(s => s.ProfessionalId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Professional>()
            .HasMany(p => p.Blocks)
            .WithOne(b => b.Professional)
            .HasForeignKey(b => b.ProfessionalId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Professional>()
            .HasMany(p => p.Reviews)
            .WithOne(r => r.Professional)
            .HasForeignKey(r => r.ProfessionalId)
            .OnDelete(DeleteBehavior.Restrict);
        // Many-to-many: Professional <-> Service
        modelBuilder.Entity<Professional>()
            .HasMany(p => p.Services)
            .WithMany(s => s.Professionals)
            .UsingEntity<Dictionary<string, object>>(
                "ProfessionalService",
                r => r.HasOne<Service>().WithMany().HasForeignKey("ServiceId").OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Professional>().WithMany().HasForeignKey("ProfessionalId").OnDelete(DeleteBehavior.Cascade)
            );

        // ───── PATIENT ─────
        modelBuilder.Entity<Patient>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Patient>()
            .HasMany(p => p.Appointments)
            .WithOne(a => a.Patient)
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        // ───── SERVICE ─────
        modelBuilder.Entity<Service>()
            .HasKey(s => s.Id);
        modelBuilder.Entity<Service>()
            .Property(s => s.Price)
            .HasPrecision(10, 2);
        modelBuilder.Entity<Service>()
            .HasMany(s => s.Appointments)
            .WithOne(a => a.Service)
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);
        // Many-to-many: Service <-> Equipment
        modelBuilder.Entity<Service>()
            .HasMany(s => s.Equipments)
            .WithMany(e => e.Services)
            .UsingEntity<Dictionary<string, object>>(
                "ServiceEquipment",
                r => r.HasOne<Equipment>().WithMany().HasForeignKey("EquipmentId").OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Service>().WithMany().HasForeignKey("ServiceId").OnDelete(DeleteBehavior.Cascade)
            );
        // Many-to-many: Service <-> InsurancePlan (explicit join entity with Price + ShowPrice)
        modelBuilder.Entity<ServiceInsurancePlan>()
            .HasKey(sip => new { sip.ServiceId, sip.InsurancePlanId });
        modelBuilder.Entity<ServiceInsurancePlan>()
            .Property(sip => sip.Price)
            .HasPrecision(10, 2);
        modelBuilder.Entity<ServiceInsurancePlan>()
            .HasOne(sip => sip.Service)
            .WithMany(s => s.ServiceInsurancePlans)
            .HasForeignKey(sip => sip.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ServiceInsurancePlan>()
            .HasOne(sip => sip.InsurancePlan)
            .WithMany()
            .HasForeignKey(sip => sip.InsurancePlanId)
            .OnDelete(DeleteBehavior.Cascade);
        // Keep skip-navigation for convenience queries
        modelBuilder.Entity<Service>()
            .HasMany(s => s.InsurancePlans)
            .WithMany(ip => ip.Services)
            .UsingEntity<ServiceInsurancePlan>();
        // Many-to-many: Service <-> Room
        modelBuilder.Entity<Service>()
            .HasMany(s => s.Rooms)
            .WithMany()
            .UsingEntity<Dictionary<string, object>>(
                "ServiceRoom",
                r => r.HasOne<Room>().WithMany().HasForeignKey("RoomId").OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Service>().WithMany().HasForeignKey("ServiceId").OnDelete(DeleteBehavior.Cascade)
            );
        // Foreign key to DefaultRoom (optional, backward compat)
        modelBuilder.Entity<Service>()
            .HasOne(s => s.DefaultRoom)
            .WithMany(r => r.Services)
            .HasForeignKey(s => s.DefaultRoomId)
            .OnDelete(DeleteBehavior.NoAction);

        // ───── SERVICE CATEGORY ─────
        modelBuilder.Entity<ServiceCategory>()
            .HasKey(sc => sc.Id);
        modelBuilder.Entity<ServiceCategory>()
            .HasOne(sc => sc.Clinic)
            .WithMany(c => c.ServiceCategories)
            .HasForeignKey(sc => sc.ClinicId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── ROOM ─────
        modelBuilder.Entity<Room>()
            .HasKey(r => r.Id);
        modelBuilder.Entity<Room>()
            .HasMany(r => r.Appointments)
            .WithOne(a => a.Room)
            .HasForeignKey(a => a.RoomId)
            .OnDelete(DeleteBehavior.NoAction);

        // ───── EQUIPMENT ─────
        modelBuilder.Entity<Equipment>()
            .HasKey(e => e.Id);
        modelBuilder.Entity<Equipment>()
            .HasMany(e => e.UsageHistory)
            .WithOne(eu => eu.Equipment)
            .HasForeignKey(eu => eu.EquipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── APPOINTMENT ─────
        modelBuilder.Entity<Appointment>()
            .HasKey(a => a.Id);
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Payment)
            .WithOne(p => p.Appointment)
            .HasForeignKey<Payment>(p => p.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.InsurancePlan)
            .WithMany()
            .HasForeignKey(a => a.InsurancePlanId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Appointment>()
            .HasMany(a => a.EquipmentUsages)
            .WithOne(eu => eu.Appointment)
            .HasForeignKey(eu => eu.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── SCHEDULE ─────
        modelBuilder.Entity<Schedule>()
            .HasKey(s => s.Id);

        // ───── BLOCK ─────
        modelBuilder.Entity<Block>()
            .HasKey(b => b.Id);

        // ───── PAYMENT ─────
        modelBuilder.Entity<Payment>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasPrecision(10, 2);

        // ───── EQUIPMENTUSAGE ─────
        modelBuilder.Entity<EquipmentUsage>()
            .HasKey(eu => eu.Id);

        // ───── INSURANCEPLAN ─────
        modelBuilder.Entity<InsurancePlan>()
            .HasKey(ip => ip.Id);

        // ───── PROFESSIONALREVIEW ─────
        modelBuilder.Entity<ProfessionalReview>()
            .HasKey(pr => pr.Id);
        modelBuilder.Entity<ProfessionalReview>()
            .HasOne(pr => pr.Patient)
            .WithMany()
            .HasForeignKey(pr => pr.PatientId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProfessionalReview>()
            .HasOne(pr => pr.Appointment)
            .WithMany()
            .HasForeignKey(pr => pr.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        // ───── JOBOPENNING ─────
        modelBuilder.Entity<JobOpening>()
            .HasKey(jo => jo.Id);
        modelBuilder.Entity<JobOpening>()
            .HasMany(jo => jo.Candidacies)
            .WithOne(c => c.JobOpening)
            .HasForeignKey(c => c.JobOpeningId)
            .OnDelete(DeleteBehavior.Cascade);

        // ───── CANDIDACY ─────
        modelBuilder.Entity<Candidacy>()
            .HasKey(c => c.Id);

        // ───── BANNER ─────
        modelBuilder.Entity<Banner>()
            .HasKey(b => b.Id);

        // ───── CHAT MODELS ─────
        modelBuilder.Entity<ChatChannel>()
            .HasKey(ch => ch.Id);
        modelBuilder.Entity<ChatChannel>()
            .HasMany(ch => ch.Members)
            .WithOne(m => m.ChatChannel)
            .HasForeignKey(m => m.ChatChannelId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ChatChannel>()
            .HasMany(ch => ch.Messages)
            .WithOne(m => m.ChatChannel)
            .HasForeignKey(m => m.ChatChannelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatChannelMember>()
            .HasKey(m => m.Id);

        modelBuilder.Entity<ChatMessage>()
            .HasKey(m => m.Id);

        // ───── PATIENT MESSAGE ─────
        modelBuilder.Entity<PatientMessage>()
            .HasKey(pm => pm.Id);
        modelBuilder.Entity<PatientMessage>()
            .HasOne(pm => pm.Patient)
            .WithMany()
            .HasForeignKey(pm => pm.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PatientMessage>()
            .HasOne(pm => pm.Clinic)
            .WithMany()
            .HasForeignKey(pm => pm.ClinicId)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PatientMessage>()
            .HasOne(pm => pm.SentByUser)
            .WithMany()
            .HasForeignKey(pm => pm.SentByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
