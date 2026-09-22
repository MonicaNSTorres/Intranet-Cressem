# Monitoramento Diário de E-mails de Férias

## Objetivo
Este guia mostra como acompanhar, no dia a dia, os envios de e-mail de férias usando a tabela:

- `DBACRESSEM.EMAIL_ENVIO_CONTROLE`

Status usados pela rotina:

- `RESERVADO`
- `ENVIADO`
- `FALHA`

---

## Rotina diária (checklist rápido)
1. Verificar se houve envios hoje.
2. Verificar se há registros em `FALHA`.
3. Verificar se existe registro preso em `RESERVADO` há muito tempo.
4. Validar volume esperado por rotina (`FERIAS_NOTIFICACAO`).

---

## SQL para operação diária

### 1) Últimos envios (visão geral)
```sql
SELECT
  ID_EMAIL_ENVIO_CONTROLE,
  ID_EMPOTENCY_KEY,
  NM_ROTINA,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  NM_ASSUNTO,
  NM_STATUS,
  DT_CLAIMED_AT,
  DT_SENT_AT,
  NM_ERRO,
  NM_ORIGEM_HOST,
  NM_ORIGEM_PID
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
ORDER BY ID_EMAIL_ENVIO_CONTROLE DESC
FETCH FIRST 100 ROWS ONLY
```

### 2) Apenas férias
```sql
SELECT
  ID_EMAIL_ENVIO_CONTROLE,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  NM_STATUS,
  DT_CLAIMED_AT,
  DT_SENT_AT,
  NM_ERRO
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_ROTINA = 'FERIAS_NOTIFICACAO'
ORDER BY ID_EMAIL_ENVIO_CONTROLE DESC
```

### 3) Resumo de hoje por status
```sql
SELECT
  NM_STATUS,
  COUNT(*) AS QTD
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE TRUNC(DT_CLAIMED_AT) = TRUNC(SYSDATE)
GROUP BY NM_STATUS
ORDER BY NM_STATUS
```

### 4) Falhas (para ação imediata)
```sql
SELECT
  ID_EMAIL_ENVIO_CONTROLE,
  NM_ROTINA,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  DT_CLAIMED_AT,
  NM_ERRO
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_STATUS = 'FALHA'
ORDER BY ID_EMAIL_ENVIO_CONTROLE DESC
```

### 5) Reservas antigas (possível envio travado)
```sql
SELECT
  ID_EMAIL_ENVIO_CONTROLE,
  NM_ROTINA,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  DT_CLAIMED_AT,
  NM_ORIGEM_HOST,
  NM_ORIGEM_PID
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_STATUS = 'RESERVADO'
  AND DT_CLAIMED_AT < (SYSDATE - (30/1440)) -- mais de 30 minutos
ORDER BY DT_CLAIMED_AT
```

---

## Interpretação dos status
- `RESERVADO`: processo “pegou” a execução para evitar duplicidade.
- `ENVIADO`: envio concluído com sucesso.
- `FALHA`: envio falhou; analisar `NM_ERRO`.

---

## Plug no Grafana (Oracle)

## Pré-requisitos
1. Datasource Oracle configurado no Grafana (usuário com acesso `SELECT` na tabela).
2. Fuso horário da instância/painel alinhado com operação (`America/Sao_Paulo`).

## Dashboard sugerido: `Monitoramento Email Ferias`

### Painel 1: `Envios hoje por status` (Bar chart / Pie)
```sql
SELECT
  NM_STATUS,
  COUNT(*) AS QTD
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE TRUNC(DT_CLAIMED_AT) = TRUNC(SYSDATE)
  AND NM_ROTINA = 'FERIAS_NOTIFICACAO'
GROUP BY NM_STATUS
```

### Painel 2: `Timeline de envios` (Time series)
```sql
SELECT
  CAST(DT_CLAIMED_AT AS DATE) AS "time",
  NM_STATUS,
  COUNT(*) AS QTD
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE DT_CLAIMED_AT >= SYSDATE - 7
  AND NM_ROTINA = 'FERIAS_NOTIFICACAO'
GROUP BY CAST(DT_CLAIMED_AT AS DATE), NM_STATUS
ORDER BY "time"
```

### Painel 3: `Falhas recentes` (Table)
```sql
SELECT
  DT_CLAIMED_AT,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  NM_ASSUNTO,
  NM_ERRO,
  NM_ORIGEM_HOST
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_STATUS = 'FALHA'
  AND NM_ROTINA = 'FERIAS_NOTIFICACAO'
ORDER BY DT_CLAIMED_AT DESC
FETCH FIRST 200 ROWS ONLY
```

### Painel 4: `Reservado há +30 min` (Table / Stat crítico)
```sql
SELECT
  COUNT(*) AS QTD_TRAVADOS
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_STATUS = 'RESERVADO'
  AND NM_ROTINA = 'FERIAS_NOTIFICACAO'
  AND DT_CLAIMED_AT < (SYSDATE - (30/1440))
```

### Painel 5: `Últimos envios` (Table)
```sql
SELECT
  ID_EMAIL_ENVIO_CONTROLE,
  NM_COMPETENCIA,
  NM_DESTINATARIO,
  NM_STATUS,
  DT_CLAIMED_AT,
  DT_SENT_AT,
  NM_ORIGEM_HOST
FROM DBACRESSEM.EMAIL_ENVIO_CONTROLE
WHERE NM_ROTINA = 'FERIAS_NOTIFICACAO'
ORDER BY ID_EMAIL_ENVIO_CONTROLE DESC
FETCH FIRST 100 ROWS ONLY
```

---

## Alertas recomendados no Grafana
1. `Falha > 0` nos últimos 15 minutos.
2. `Reservado travado > 0` (mais de 30 minutos).
3. `Nenhum ENVIADO` na janela esperada do dia (ex.: rotina mensal entre dia 1 e 3).

---

## Boas práticas operacionais
1. Em homologação, manter `EMAIL_MODO_TESTE=true`.
2. Em produção, `EMAIL_MODO_TESTE=false`.
3. Se houver `FALHA`, capturar `NM_ERRO` + `NM_ORIGEM_HOST` para diagnóstico.
4. Evitar rodar múltiplas instâncias sem necessidade, mesmo com controle de idempotência.

