-- Adiciona campos do agendamento:
--   appointmentType        -> "ONLINE" | "IN_PERSON" (padrão IN_PERSON)
--   patientConfirmation    -> "PENDING" | "CONFIRMED" | "NOT_CONFIRMED" (padrão PENDING)
--   recurrenceGroupId      -> agrupa agendamentos da mesma série recorrente
--   cancellationSource     -> "PATIENT" | "RECEPTION" | "PROFESSIONAL"
--   cancelledAt            -> timestamp do cancelamento

ALTER TABLE "Appointment"
  ADD COLUMN "appointmentType" TEXT NOT NULL DEFAULT 'IN_PERSON',
  ADD COLUMN "patientConfirmation" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "recurrenceGroupId" TEXT,
  ADD COLUMN "cancellationSource" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "Appointment_recurrenceGroupId_idx" ON "Appointment" ("recurrenceGroupId");
CREATE INDEX "Appointment_professionalId_startTime_idx" ON "Appointment" ("professionalId", "startTime");
