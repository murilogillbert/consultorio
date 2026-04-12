namespace Consultorio.API.DTOs;

public class SetScheduleDto
{
    public Guid ProfessionalId { get; set; }
    public List<ScheduleSlotDto> Slots { get; set; } = new();
}

public class ScheduleSlotDto
{
    public int DayOfWeek { get; set; }      // 0=Dom, 1=Seg, ..., 6=Sab
    public string StartTime { get; set; } = null!; // "08:00"
    public string EndTime { get; set; } = null!;   // "18:00"
}

public class ScheduleResponseDto
{
    public Guid Id { get; set; }
    public Guid ProfessionalId { get; set; }
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = null!;
    public string EndTime { get; set; } = null!;
    public bool IsActive { get; set; }
}

public class AvailableSlotDto
{
    public string StartTime { get; set; } = null!; // "HH:mm"
    public string EndTime { get; set; } = null!;   // "HH:mm"
}
