export interface SetScheduleDto {
  slots: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
}
