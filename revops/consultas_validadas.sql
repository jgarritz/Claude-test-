-- Consultas validadas contra la base de RevOps Console (Lovable/Supabase, proyecto 790a6832-731e-47ad-8612-b704212580b6)
-- Workspace de datos: 22222222-2222-4222-8222-222222222222. Zona horaria: America/Mexico_City.
-- Solo lectura. Ejecutar con query_database (no llamar atribucion_wintown_personas: exige ser miembro del workspace).

-- 1) Adquisiciones pagables (> $180 acumulado por cliente y marca) y depósitos, por marca y día.
--    Validada: del 1 al 21-oct da Jubilee 4 adquisiciones y Vivento 3. NO usar las tablas conversiones ni conversiones_externas (vacías para estas campañas).
WITH dep AS (
  SELECT DISTINCT ON (e.campana_id, e.external_id) e.id, e.persona_id, e.campana_id, e.external_id, e.ocurrido_en, e.ingreso,
         substring(e.external_id FROM '_deposit_([0-9]+)_') customer_id
  FROM eventos_comerciales e
  WHERE e.workspace_id='22222222-2222-4222-8222-222222222222'
    AND e.campana_id IN ('jubilee-v2','vivento')
    AND e.proveedor='wintown' AND e.estado='convertida' AND e.ingreso>0 AND e.moneda='MXN'
    AND e.external_id NOT ILIKE '%multidepositer%'
    AND substring(e.external_id FROM '_deposit_([0-9]+)_') IS NOT NULL
    AND e.ocurrido_en >= '2026-10-01T06:00:00Z'
  ORDER BY e.campana_id, e.external_id, e.creado_en, e.id),
ord AS (
  SELECT d.*, row_number() OVER (PARTITION BY campana_id, customer_id ORDER BY ocurrido_en, external_id, id) pos,
         sum(ingreso) OVER (PARTITION BY campana_id, customer_id ORDER BY ocurrido_en, external_id, id) acum
  FROM dep d),
cruce AS (SELECT campana_id, customer_id, min(pos) FILTER (WHERE acum>180) c FROM ord GROUP BY 1,2)
SELECT o.campana_id, (o.ocurrido_en AT TIME ZONE 'America/Mexico_City')::date dia,
       count(*) FILTER (WHERE o.pos=c.c) adquisiciones, count(DISTINCT o.customer_id) clientes_distintos,
       count(*) depositos, round(sum(o.ingreso)) monto
FROM ord o JOIN cruce c USING (campana_id, customer_id) GROUP BY 1,2 ORDER BY 1,2;

-- 2) CTR por cohorte (carga del 23-oct vs base anterior). Medir TODOS los SMS desde el primer envío (sms_despachos solo existe desde el 23-oct 16:44 CDMX).
SELECT d.campana_id, (l.creado_en >= '2026-10-23 12:00-06') carga_nueva, count(*) sms,
       count(DISTINCT e.codigo) FILTER (WHERE e.clics_humanos>0) con_clic
FROM sms_despachos d
JOIN campana_leads l ON l.persona_id=d.persona_id AND l.campana_id=d.campana_id
LEFT JOIN enlaces_rastreo e ON e.decision_id=d.decision_id
WHERE d.estado='enviada' GROUP BY 1,2;

-- 3) Segmentos calientes (por persona): verificados sin depósito, depositaron <= $180, depositaron > $180.
--    Ver historial de la conversación; reutilizar el CTE de (1) agregando por persona_id.

-- 4) Envíos por etapa en la última hora (carril caliente). Consulta ligera: limitar siempre el rango de tiempo.
SELECT campana_id, coalesce(etapa,'(sin etapa)') etapa,
       count(*) FILTER (WHERE estado='enviada') enviadas, count(*) FILTER (WHERE estado='fallida') fallidas,
       count(*) FILTER (WHERE estado='ambigua') ambiguas
FROM sms_despachos WHERE terminado_en > now() - interval '60 minutes' GROUP BY 1,2 ORDER BY 1,3 DESC;
