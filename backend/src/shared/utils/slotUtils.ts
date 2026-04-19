/**
 * Generates time slots between start and end with a given duration.
 * Used for scheduling/availability calculation.
 */
export function generateSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number
): string[] {
  const slots: string[] = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)

  let currentMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM

  while (currentMinutes + durationMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
    const m = (currentMinutes % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    currentMinutes += durationMinutes
  }

  return slots
}
