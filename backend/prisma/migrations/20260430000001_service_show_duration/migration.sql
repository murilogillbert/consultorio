-- Adiciona Service.showDuration: controla se a duração/horário do serviço
-- aparece para o cliente nas listagens públicas.
-- Padrão TRUE para preservar comportamento atual (serviços antigos exibem duração).

ALTER TABLE "Service"
  ADD COLUMN "showDuration" BOOLEAN NOT NULL DEFAULT true;
