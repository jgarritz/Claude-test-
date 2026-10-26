# Bitácora de cambios en producción (RevOps Console / campañas SMS)

Todos los cambios se hicieron con autorización del CAIO en la conversación. Cada uno incluye cómo revertirlo.
Workspace: `22222222-2222-4222-8222-222222222222`. Campañas: `jubilee-v2` (Jubilee), `vivento` (Vivento).

## 2026-10-25 / 26 (hora CDMX noche)

| # | Cambio | Autorización | Cómo revertir |
|---|---|---|---|
| 1 | Limpieza de fríos activada en ambas campañas (6+ SMS sin clic humano → máximo 1 cada 72 h) | CAIO: "1 sí" | `update campanas set limpieza_frios=false where id in ('jubilee-v2','vivento');` |
| 2 | Vivento: primer contacto detenido. 1,694 leads sin primer SMS puestos en `pendiente_activacion=true` (ninguno estaba en espera antes) | CAIO: "2 sí" | `update campana_leads set pendiente_activacion=false where campana_id='vivento' and primer_contacto_en is null and pendiente_activacion=true;` |
| 3 | Plan técnico "carril caliente + etapa deposito_parcial" aprobado y construido apagado en Lovable. Migraciones 0147 y 0148 aplicadas en producción (interruptor `campanas.carril_caliente` default false; funciones `acumulado_deposito_wintown`, `rendimiento_sms_etapa_carril`; funciones de reserva de seguimientos modificadas; índice parcial) | CAIO: "1 sí / 2 sí / sí" | Apagar el interruptor devuelve el flujo anterior: `update campanas set carril_caliente=false where id='vivento';` |
| 4 | Código publicado (commit 17e326c). Salió también la mejora de conteo rápido de leads (`supabase/sql/0144_conteo_leads_rapido.sql`) | CAIO: "¿por qué no lo hacemos de una vez?" (instrucción de salir en vivo) | Volver a versión anterior desde Lovable (commit 5e4c427) |
| 5 | 15 personas reclasificadas de `convertido` a `deposito_parcial` (Jubilee 6, Vivento 9; acumulado <= $180). Auditado en `audit_log` (accion `reclasificar_deposito_parcial`) | Parte del orden de salida aprobado | `update campana_leads set etapa='convertido' where (campana_id, persona_id) in (select split_part(entidad_id,':',1), split_part(entidad_id,':',2) from audit_log where accion='reclasificar_deposito_parcial');` y lo mismo en `personas.etapa` |
| 6 | `carril_caliente=true` solo en Vivento | CAIO | Ver #3 |
| 7 | Textos nuevos R5 (22): aprobado, solicitud_enviada, deposito_parcial para ambas marcas (cargados inactivos y luego activados) | CAIO aprobó los textos | `update campana_plantillas_sms set activa=false where codigo like '%\_R5\_%';` |
| 8 | Vivento: 6 textos `DPAR_R5_1..6` desactivados (decían que el bono se activa "al acumular $200"; la página oficial habla de depósito mínimo de $200, sin acumulación). Se reactivan si Wintown lo confirma por escrito | Criterio del analista; el CAIO dijo después "lo que hicimos está ok" | `update campana_plantillas_sms set activa=true where campana_id='vivento' and codigo like 'DPAR\_R5\_%';` |
| 9 | Jubilee: 5 textos desactivados por lenguaje de "regalo" o descripción inexacta: `FRIO_J3, SENV_R3_2, CAL_R3_3, SINI_R3_5, FRIO_J5`; se agregó `FRIO_J9` (luego desactivado en #11) | CAIO: "si" | `update campana_plantillas_sms set activa=true where campana_id='jubilee-v2' and codigo in ('FRIO_J3','SENV_R3_2','CAL_R3_3','SINI_R3_5','FRIO_J5');` |
| 10 | Jubilee: textos R5 corregidos para quitar "deposita desde $50" (monto no verificado) en `APR_R5_1/2/4`; y 5 textos R5 ajustados para cumplir el validador | Criterio del analista | Textos originales: APR_R5_1 "Jubilee: tu cuenta esta lista. Deposita desde $50 y arma un parlay de 3 o mas: bono de hasta 40% en parlays ganadores. TyC +18"; APR_R5_2 "En Jubilee, en apuestas elegibles de futbol cobras antes si tu equipo va 2 goles arriba. Deposita desde $50. TyC +18"; APR_R5_4 "Ya puedes apostar en Jubilee: deposita desde $50 y elige tu partido de hoy. Pago anticipado en apuestas elegibles. TyC +18" |
| 11 | Jubilee: 35 textos con "$500 / desafío" desactivados (sin respaldo oficial) y 34 textos nuevos `*_R6_*` con funciones oficialmente verificadas (Pago Anticipado, Bono Acumulador, Bet Builder, Aumento de Cuotas) | CAIO: "si los cambios son los que consideras correctos hazlos" | `update campana_plantillas_sms set activa=true where campana_id='jubilee-v2' and codigo in ('APR_R3_2','APR_R3_8','CAL_R3_1','CAL_R3_2','CAL_R3_4','CAL_R3_5','CAL_R3_6','CAL_R3_7','CAL_R3_8','FRIO_J1','FRIO_J2','FRIO_J4','FRIO_J6','FRIO_J7','FRIO_J8','FRIO_J9','INT_R3_1','INT_R3_2','INT_R3_3','INT_R3_4','INT_R3_5','INT_R3_7','INT_R3_8','SENV_R3_1','SENV_R3_3','SENV_R3_4','SENV_R3_5','SENV_R3_6','SENV_R3_8','SINI_R3_1','SINI_R3_2','SINI_R3_3','SINI_R3_4','SINI_R3_6','SINI_R3_7'); update campana_plantillas_sms set activa=false where campana_id='jubilee-v2' and codigo like '%\_R6\_%';` |
| 12 | Vivento: 11 textos desactivados por ligar el bono con juegos fuera de "Juega con tu bono" (ruleta, video bingo, casino en vivo) o afirmar que "tu bono ya está activo/listo": `FRIO_V4, FRIO_V8, APR_R3_6, CAL_R3_7, CONV_R4_1, CONV_R4_2, CONV_R4_4, CONV_R4_5, CONV_R4_7, INT_R3_3, INT_R3_6` | CAIO: "si los cambios son los que consideras correctos hazlos" | `update campana_plantillas_sms set activa=true where campana_id='vivento' and codigo in ('FRIO_V4','FRIO_V8','APR_R3_6','CAL_R3_7','CONV_R4_1','CONV_R4_2','CONV_R4_4','CONV_R4_5','CONV_R4_7','INT_R3_3','INT_R3_6');` |

## Rutinas programadas (claude.ai, creadas por el CAIO)
- "revision matutiva revops": diaria 10:30 CDMX. "revision vepertina revops": diaria 17:40 CDMX. Solo lectura, con conector de Lovable, aviso push.
- El texto de las rutinas es la versión del 2026-10-26 (sin los cambios de esta bitácora). Ver ADENDA_RUTINAS.md para actualizarlo.

## Verificaciones oficiales (2026-10-26)
- Vivento: promoción verificada en vivento.mx (ver FICHA_ECONOMICA.md).
- Jubilee: 4 funciones verificadas en jubilee.mx/promociones; sin bono de bienvenida ni desafío de $500.
- Términos generales de ambas marcas: depósito mínimo $300; datos muestran depósitos menores.

## Pendientes
1. Mensaje a Wintown (cupo de 200; acumulado vs depósito único; mínimo real del cajero; existencia del "desafío de $500"; causas de rechazo con INE; tasa de conversión de landing).
2. Miércoles 28-oct: evaluación formal de la tanda 1 (adquisiciones pagables, costo por adquisición). Regla acordada para la tanda 2: 4 o más adquisiciones → liberar en bloques de 10,000–15,000; 2 o 3 → esperar y arreglar el embudo; menos de 2 → no liberar.
3. Hueco de datos de SMS del 14 al 22-oct; teléfonos en estado "ambigua" (~3,100, creciendo); lentitud de la base de datos (7–10 s en healthcheck).
4. Errores de pantalla en el Embudo: tope de 1,000 clics y etiqueta "130 depósitos" (compara eventos con clientes).
5. Alertas falsas o viejas por limpiar ("N días sin actividad").
6. Línea en el correo diario y gráfica semanal del carril (no construidas).
7. Bug del validador `validar_plantilla_sms`: el mensaje de error se rompe ("malformed array literal") cuando rechaza un texto.

## 2026-10-26 — Marco de autonomía y decisiones del CAIO

Decisiones tomadas por el CAIO en la conversación:
1. **Marco de autonomía: aprobado.**
   - El analista puede, sin preguntar y avisando después (con cómo revertir): desactivar un texto que contradiga la fuente oficial; apagar el carril si hay envíos claramente erróneos; limpiar alertas falsas; resumir cada revisión.
   - El analista debe preguntar antes de: publicar código o migraciones; cambiar ritmo, horario o volumen; pausar o reanudar campañas; cargar listas o textos nuevos; contactar a Wintown o al proveedor.
2. **Volumen: opción A.** Seguir igual hasta el miércoles 28-oct-2026 (costo estimado de seguir: ~$1,150/día de pérdida neta; ~$2,800 hasta el miércoles). Las alternativas B (pausar seguimientos de la base anterior, ahorro estimado ~$440/día) y C (pausar todo salvo calientes) quedaron descartadas por ahora y se reevalúan el miércoles.
3. **Despertadores programados:** dos rutinas ligadas a la sesión del analista, a las 10:45 y 17:55 CDMX (ids `trig_01KHGfRNsRhwdBtBYuQ5wNLV` y `trig_011jszw8ketvsExaTJj96dty`). Leen el reporte de las rutinas de lectura (10:30 y 17:40), verifican con consultas ligeras, actúan dentro del marco y envían una notificación push al CAIO. Limitación: dependen de que la sesión siga viva; si el sistema la cierra por inactividad, dejan de funcionar.
   - Para cancelarlos: eliminar las rutinas desde claude.ai o pedirlo en la conversación.

Medición acordada para el miércoles 28-oct: tanda 1. Con 4 o más adquisiciones pagables de la carga nueva → liberar la tanda 2 en bloques de 10,000–15,000; con 2 o 3 → esperar y arreglar el embudo; con menos de 2 → no liberar.

Hallazgos del 26-oct (matutina, 10:30 CDMX): economía en rojo (8 adquisiciones pagables en el mes, ~$6,400; utilidad estimada −$9,600 o peor); 12–14% de SMS en estado "ambigua" (4,415 acumulados); informe diario del 25-oct trabado desde las 07:30. Las plantillas `DEP_*` son los textos deportivos diarios generados por el sistema; no tienen relación con "depósito parcial".

## 2026-10-26 10:45 CDMX — Despertador de la mañana (dentro del marco de autonomía)
- Alertas falsas o viejas cerradas (5): `alr:jubilee-v2:sin-actividad`, `alr:vivento:sin-actividad` (las campañas sí tienen actividad) y 3 de `sistema:velocidad-sms` (12, 13 y 23-oct; la cola que las causó ya no existe).
  Revertir: `update alertas set estado='abierta', resuelto_en=null where id in ('alr:jubilee-v2:sin-actividad','alr:vivento:sin-actividad','velocidad-sms-22222222-2222-4222-8222-222222222222-2026-10-12','velocidad-sms-22222222-2222-4222-8222-222222222222-2026-10-13','velocidad-sms-22222222-2222-4222-8222-222222222222-2026-10-23');`
- No se tocaron las ~3,100 alertas "Escalar conversación" / "Listo para cierre" (septiembre; conversaciones reales de campañas anteriores, la mayoría de campañas fuera de alcance). En alcance quedan 27 de Jubilee y 30 de Vivento: requieren revisión humana, no son falsas.
- Observaciones (sin cambios): SMS "ambigua" 14–16% en la hora pico; CTR inicial de los textos nuevos de Jubilee (*_R6_*) 0.68% (29 clics/4,253 enlaces en 3 h) frente a ~1.09% de los demás textos de la misma ventana y ~1.35% histórico (muestra pequeña, clics aún llegando); latencia de base de datos 19 s en el healthcheck (7–10 s antes); informe diario del 25-oct sigue "en_curso" con correo pendiente; 0 SMS a clientes pagables.

## 2026-10-26 13:10–14:00 CDMX — Diagnóstico de base e informe diario (autorizado por el CAIO: "1 sí, 2 sí")
- **Informe diario trabado: arreglado y publicado** (commit `29dceaa`, deployment `670ba1c2`). Causa: con la base cargada, el cálculo de cifras por campaña tardaba 28–37 s por tramo y el cron cortaba la invocación (~55 s) antes de guardar el primer tramo. Cambios, solo en `src/repositories/cloud/agentes/analista-diario.server.ts` y su prueba (sin migración): lecturas independientes en paralelo; corrida `en_curso` sin actividad por más de 10 min se retoma sola; correo `enviando` por más de 15 min se reintenta con la misma clave de idempotencia (no duplica); 5 pruebas nuevas (131 pruebas del informe pasan; compila). Se verificó que la publicación solo incluía estos dos archivos.
  Revertir: restaurar `analista-diario.server.ts` y `analista-diario.server.test.ts` desde el commit `17e326c` (sin cambios de base de datos).
- **Correo del 25-oct enviado una sola vez** a los 4 destinatarios configurados (`analista_diario_corridas` 2026-10-25: completada / enviado a las 19:08 UTC).
- **Diagnóstico de base (solo lectura, sin cambios):** instancia Large; memoria 47%, 35/160 conexiones, disco 62%; CPU llegó a 97.8%. Causa probable: carga de consultas del motor SMS (no el tamaño de tablas). Consultas más costosas: confirmaciones de entrega en `mensajes_canal` (40 mil llamadas, ~8,900 s acumulados), dos lecturas de decisiones pendientes en `decisiones` (7,400 s y 6,750 s), revisión de clics en `enlaces_rastreo` (422 mil llamadas, 2,840 s), lecturas de `campana_leads` (hasta 2.3 s). Las funciones de reserva, `acumulado_deposito_wintown`, el carril caliente y la migración 0148 NO aparecen como contribuyentes (el índice nuevo pesa 40 kB). `audit_log` (7.6 GB) y `cron_ejecuciones` (2.2 GB) ocupan casi dos tercios de la base.
- **Acciones propuestas, pendientes de decisión del CAIO (de mayor a menor impacto):** (1) índices dirigidos a las dos consultas de `decisiones` y a la de confirmaciones en `mensajes_canal` (riesgo bajo); (2) menor frecuencia o lotes más grandes en la consulta de confirmaciones; (3) conservar solo 30 días de `audit_log` y `cron_ejecuciones` (libera ~9 GB); (4) subir de instancia solo si la CPU sigue saturada (costo ~el doble: 0.62 → 1.24 créditos/hora).
- Riesgo declarado: si la base sigue saturada, el informe del 26-oct aún podría cortarse; las acciones de la base son la solución de fondo.
- Latencia del healthcheck tras la publicación: 6.8–16 s (variable); sin mejora todavía.

## 2026-10-26 15:30 CDMX — Índices (paso 1 de "1 y luego 2"): NADA APLICADO, bloqueo de vía
- Respuesta de Lovable (solo lectura; no cambió código, base ni infraestructura; no publicó). El acceso a la base que tiene su agente no permite crear índices (rol solo SELECT/INSERT) y la única vía soportada es una migración transaccional. Por la regla del CAIO (CREATE INDEX CONCURRENTLY fuera de transacción; si solo hay migración transaccional, avisar y NO usarla) no se aplicó nada.
- Medición de referencia (21:13–21:16 UTC): healthcheck 13.7 / 8.8 / 10.3 s (mediana 10.3 s; HTTP 503 por WhatsApp degradado, `db: ok`, SMS operativo). Memoria 49%, conexiones 37/160, disco 64%. Última alerta de CPU: 98.6% a las 18:59 UTC.
- Hallazgos: las dos lecturas de `decisiones` pendientes recorren el índice `decisiones_programada` (24 MB, todo el historial) y filtran campaña/estado/canal después (≈395 y 279 ms por llamada). Confirmaciones de entrega (`mensajes_canal`) ya usan un índice parcial (`mensajes_canal_dlr_pendiente_idx`); el filtro de fecha se aplica después. Clics (`enlaces_rastreo`) ya tienen el índice parcial correcto (696 kB): no se propone otro, la prioridad es reducir llamadas. Los acumulados de 40 mil / 422 mil llamadas son históricos; en la ventana medida no crecieron.
- Índices propuestos (pendientes de aprobación; B y C primero, A condicionado a medición):
  - B `decisiones_pendientes_canal_fecha_idx` ON decisiones (canal, programada_para, campana_id) WHERE estado IN ('recomendada','aprobada') — ~0.3–1 MB.
  - C `decisiones_pendientes_prioridad_idx` ON decisiones (canal, programada_para, campana_id) WHERE estado IN ('recomendada','aprobada') AND (intencion_accion='cierre' OR senales->>'flujo' IS NOT NULL) — ~0.3–1 MB.
  - A `mensajes_sms_dlr_cubierto_idx` ON mensajes_canal (actualizado_en, creado_en) INCLUDE (id, workspace_id, provider_message_id, dlr_intentos) WHERE canal='sms' AND direccion='saliente' AND proveedor='directo' AND estado='enviado' — ~80–140 MB; beneficio no garantizado.
  Revertir (cada uno): `DROP INDEX CONCURRENTLY IF EXISTS public.<nombre>;`
- Paso 2 (solo plan, sin implementar): el código ya contempla sondeo de confirmaciones cada 15 min solo en el trabajador 0, con webhook como vía principal; falta confirmar qué frecuencia ejecuta producción. Pasar de cada minuto a 15 reduciría ~93% las consultas de selección (no 93% de la CPU). Una confirmación ausente nunca autoriza reenviar; alertar si crece el atraso.
- Pendiente de decisión del CAIO: ver mensaje en la conversación.

## 2026-10-26 16:05–16:15 CDMX — Índices B y C APLICADOS (autorizado por el CAIO: "Opción 1, aplica B y C")
- Autorización expresa de usar migración transaccional (excepción a la regla de CONCURRENTLY, única vía disponible), solo para B y C. Lovable: commit `a4a5362`, migraciones `0149_indice_decisiones_pendientes_canal_fecha` y `0150_indice_decisiones_pendientes_prioridad`, cada una con `SET LOCAL lock_timeout = '3s'`; sin choques de bloqueo. No se aplicó el índice A; no se tocó código, plantillas, carril caliente ni envío; sin publicación de código.
- Verificado por mí (consulta directa): ambos índices existen, `indisvalid` e `indisready` = true. `decisiones_pendientes_canal_fecha_idx` 96 kB, `decisiones_pendientes_prioridad_idx` 32 kB.
- EXPLAIN (reportado por Lovable): consulta de pendientes, costo 2,443 → 88.8; consulta prioritaria, 2,553 → 87.4 (usa el índice nuevo). Es costo estimado, no tiempo medido.
- Healthcheck (reportado por Lovable): antes 11.6/12.1/20.7 s; tras B 15.8/18.5/6.1 s; tras C 4.0/14.6/18.9 s; siempre 503 por WhatsApp degradado (ya ocurría). Sin mejora ni empeoramiento concluyente: la CPU solo se podrá evaluar con las consultas lentas acumuladas en unas horas.
- SMS: envíos por 10 min (UTC): 21:00–21:59 entre 1,398 y 2,121; 22:00 → 453; 22:10 (parcial) → 121. Fallidas sin picos (≤1 por minuto). La caída empezó hacia las 21:59–22:00 UTC, ANTES de la primera migración (~22:05); causa NO investigada (hipótesis sin probar: cola de elegibles agotándose o ráfagas del motor). Vigilar en la revisión de 17:55.
- Revertir (sin efecto sobre datos): `DROP INDEX IF EXISTS public.decisiones_pendientes_prioridad_idx; DROP INDEX IF EXISTS public.decisiones_pendientes_canal_fecha_idx;`
- Paso 2 (solo plan, sin implementar; pendiente de aprobación del CAIO): lotes más grandes y menos frecuentes de confirmaciones de entrega, repartidos por antigüedad; separar confirmación de cierre; alerta si crece el atraso; falta de confirmación nunca autoriza reenvío. Antes de implementar, confirmar la frecuencia real que ejecuta producción.
- Nota: la migración 0149/0150 llegó con un archivo de tipos regenerado por la plataforma (según Lovable).
