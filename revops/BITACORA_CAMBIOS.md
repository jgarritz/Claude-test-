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

## 2026-10-26 17:25 CDMX — Paso 2 (confirmaciones de entrega): implementado en el repo, SIN PUBLICAR; hallazgos que cambian el diagnóstico
- Lovable verificó la realidad de producción antes de cambiar: el sondeo de confirmaciones (cada 15 min, lote 30, 7 días) NO se ejecuta con el despacho continuo vigente; desde el 23-oct 23:30 UTC no hubo ni una corrida (2,938 ejecuciones continuas en la última hora, 0 sondeos). Las 40,509 llamadas / 8,900 s de esa consulta son acumuladas de antes del 23-oct; hoy casi no cuestan CPU. => el Paso 2 tal como se planteó NO reduce la carga actual.
- Dato de negocio: sin entregas registradas en 10 días (ni por aviso del proveedor ni por sondeo). Últimas 3 h: 27,530 SMS "enviados", 178 fallidos, 0 "entregados". 205,931 SMS de los últimos 7 días sin confirmar. El cierre de envíos no depende de esto. "SMS entregado" sigue NO medible.
- Cambio preparado (commit `ad045ec`; Lovable lo cita como `833d5a1` en su texto), 4 archivos, sin migraciones: `src/domain/sms-confirmaciones.ts` (nuevo), `sms-reconciliacion.server.ts` (lote 100, 15 s, atraso + alerta idempotente `sistema:sms-confirmaciones-atraso:<workspace>`), `primer-contacto-sms.ts` (sondeo cada 15 min solo en trabajador 2, descontando tiempo al despacho), `sms-confirmaciones.test.ts` (5 pruebas). Nunca reenvía; solo escribe en mensajes_canal y alertas. Revisé el diff: coincide con lo reportado; no toca reserva, despacho, carril caliente ni plantillas. Estado: NO publicado; pendiente de decisión del CAIO.
- Reservas de mi lado: el sondeo revisaría primero lo más antiguo (backlog del 23-oct, probablemente expirado en el proveedor) a ~400 consultas/hora frente a ~9,000 SMS/hora, así que aportaría poca información útil; la alerta se abriría de inmediato.
- Nuevo hallazgo sobre la carga de la base (acumulado de pg_stat_statements, instantánea guardada en el scratchpad a las 22:25Z): los mayores consumidores acumulados son `bloqueo_telefono_sms` (71,665 llamadas, 582 ms c/u, 41,713 s), `rendimiento_plantillas_sms` (40,661; 612 ms; 24,872 s), `candidatos_respuesta` (9,434; 2.4 s; 22,449 s), `refrescar_metricas_diarias` (4,407; 4 s; 17,672 s), `reservar_seguimiento_sms`, `reservar_sms_despachos` (14.5 M llamadas, 1 ms). Son acumulados históricos: falta calcular el delta de una ventana reciente para saber cuál pesa HOY. Esto contradice el diagnóstico previo (que señalaba confirmaciones y decisiones como principales).
- Pendiente: delta de pg_stat_statements (segunda instantánea) y decisión del CAIO sobre publicar o no el Paso 2.

## 2026-10-26 17:40 CDMX — Delta de carga de la base (solo lectura, ventana 22:25:12Z–22:38:44Z, 13.5 min)
- Efecto de los índices B y C CONFIRMADO: lecturas de `decisiones` ≈ 250 ms → ≈ 1.4 ms por llamada (18 llamadas, +11 y +25 ms en la ventana).
- Consumidor actual dominante: `reservar_preparacion_seguimiento_sms`: +69 llamadas, +346,718 ms (≈ 5.0 s por llamada; media histórica 552 ms), ≈ 25.7 s de base por minuto, ~90% del tiempo de base medido entre las consultas seguidas. Otras: `reservar_sms_despachos` +39,243 llamadas / +14.5 s (1 ms c/u); `rendimiento_plantillas_sms` +49 / +14.8 s; `net.http_post` (cron) +1,074 / +9.7 s; `bloqueo_telefono_sms` +68 / +0.7 s; confirmaciones DLR, `candidatos_respuesta`, `refrescar_metricas_diarias`, `reservar_seguimiento_sms`, `reservar_primer_contacto_sms`, `backlog_agentes`: 0 llamadas. Límite: solo se siguieron 14 consultas; la instantánea no cubre consultas nuevas.
- Esto contradice la afirmación previa de que las funciones de reserva no contribuían. No se ha modificado nada; la función de reserva no se toca sin aprobación explícita del CAIO.
- Envíos por 10 min (UTC): 21:40 → 1,725; 21:50 → 1,460; 22:00 → 453; 22:10 → 725; 22:20 → 765; 22:30 (parcial) → 296. Fallidas ≤ 6 por ventana; ambiguas ~15–20%. Los envíos siguen por debajo del nivel previo a las 22:00 UTC; causa no determinada (hipótesis sin probar: la lentitud de la preparación).
- Se pidió a Lovable un análisis SOLO LECTURA de la causa y un plan (sin ejecutar) para `reservar_preparacion_seguimiento_sms` (mensaje umsg_01m5x9y16fe73ramk4w5jztrnq).
- Paso 2 (commit `ad045ec`): sigue SIN PUBLICAR; recomendado no publicar por ahora.

## 2026-10-26 17:55 CDMX — Despertador de la tarde (solo lectura; NO se cambió nada en producción)
- Rutina vespertina (corrió 17:40, 1.5 min): reporte final estado ROJO, sin escrituras ni denegaciones de permisos; reconoce como no verificado el cuadre con el correo, cron/informe diario, CTR de textos *_R6_ (consulta falló) y cruce con clientes pagables. Su cifra de ambiguas: 14,579 acumuladas (Jubilee 9,022, Vivento 5,557) vs 3,097 el 25-oct.
- Verificado por mí (26-oct, desde 00:00 CDMX): enviadas Jubilee 38,956 / Vivento 25,706; ambiguas 7,825 / 3,546 (≈14.9% del total); fallidas 119 / 97 (0.28%). Gasto del día ≈ $2,281 (enviadas+ambiguas × $0.03; aproximado). Adquisiciones pagables del día: Jubilee 1 (2 clientes distintos, 5 depósitos, $1,283), Vivento 0 (1 depósito de $100). Ingreso CPA del día $800 → contribución del día ≈ −$1,481 (solo CPA; NGR no consultado).
- Desde el 23-oct: 190,212 SMS enviados, 2 adquisiciones pagables nuevas (Vivento 25-oct, Jubilee 26-oct) ≈ 95,000 SMS por adquisición vs equilibrio 26,667 (3.6×). Es temprano: el depósito madura en días.
- CTR carga nueva: Jubilee 1.06% (80,170 SMS), Vivento 1.14% (56,412); base anterior 1.42% / 1.24%. (Referencia de la mañana: 1.44% / 1.30%.) Hipótesis sin probar: parte de la caída es retraso de clics en SMS recientes. CTR de *_R6_ no medido aparte.
- Última hora: Vivento 1,819 + Jubilee 1,092 SMS de primer contacto, resto marginal (≈3,100 enviadas/h vs 6,000–12,000/h entre 10:00 y 15:00). 0 SMS a clientes en etapa convertido. Sin envíos fuera de horario (aún no son las 20:00).
- Healthcheck: 503 con 19.2 / 2.2 / 9.9 s (sin mejora; WhatsApp degradado).
- Análisis de causa de Lovable (solo lectura) sobre `reservar_preparacion_seguimiento_sms` (≈5.6 s por llamada, 6 preparadores cada minuto): recorrido amplio de `campana_leads` (71,959 Jubilee + 82,555 Vivento filas); el índice de seguimiento solo acota por workspace y campaña, partición y fecha se filtran después. Plan, sin ejecutar: (1) agregar a las pasadas de seguimiento el predicado redundante `AND cl.ultimo_saliente_en <= now() - cp.espacio` (baja el costo estimado 60,979 → 21,534, −65%; no admite candidatos nuevos); (2) solo si persiste, índice parcial `campana_leads_seguimiento_sms_particion_orden_idx` (workspace, campaña, partición, ultimo_saliente_en, persona_id). Reversión: restaurar la definición previa de la función / `DROP INDEX CONCURRENTLY IF EXISTS public.campana_leads_seguimiento_sms_particion_orden_idx`. PENDIENTE de aprobación del CAIO (toca la función de reserva y requiere migración).
- Paso 2 (commit `ad045ec`): sigue SIN publicar.

## 2026-10-26 19:00–19:15 CDMX — Ajuste mínimo a `reservar_preparacion_seguimiento_sms`: APLICADO Y REVERTIDO (autorizado por el CAIO: "1 sí")
- Equivalencia previa (SELECT, sin reservar): candidatos idénticos, Jubilee 3,668 y Vivento 29,295, 0 IDs agregados/eliminados.
- Migración `0151` (commit `91bac4f`): añadió solo `AND cl.ultimo_saliente_en <= now() - cp.espacio` en `cand_frio`; `SET LOCAL lock_timeout='3s'`, sin reintentos. Ventana de medición 00:52–01:01 UTC (9 min 46 s), mismo queryid: 43 llamadas, 5,219 ms por llamada (línea base 5,570 ms, −6.3%), bloques en caché por llamada 667,437 vs ≈114,823 de la línea base (5.8×); SMS enviados 604 → 400 en ventanas contiguas; 16 timeouts de preparación (ya existían); fallidas 2 → 2.
- Por la condición de seguridad (empeora → revertir), Lovable revirtió sin esperar la segunda ventana: migración `0152` (commit `19f29b1`). Definición previa guardada en `docs/reversion_reservar_preparacion_seguimiento_sms.sql` (commit `c5f0ca6`).
- Verificado por mí: MD5 de la función = `f6e6571938c14c92f28396113193046e` (idéntico al original) y el predicado nuevo ya no aparece. Estado final = el de antes del cambio. Sin índice nuevo; Paso 2 de confirmaciones (`ad045ec`) sigue sin publicar.
- Lectura honesta: el cambio NO mejoró el tiempo de forma material (−6%). La comparación de bloques es poco concluyente porque la línea base eran solo 6 llamadas en 50 s frente a 43 llamadas; no se atribuye causalidad. La lentitud NO está resuelta. Dato nuevo: de 2,126 candidatos evaluados por la preparación, 370 se prepararon y 1,756 se liberaron (≈83% de trabajo descartado); hipótesis sin probar: seis preparadores compiten por las mismas particiones.
- Envíos por 10 min (UTC) tras revertir: 00:30 → 800; 00:40 → 1,183; 00:50 → 341; 01:00 → 489; 01:10 (parcial) → 172. Fallidas ≤ 2.
- Siguiente decisión del CAIO pendiente: ver conversación (opciones: dejar así hasta la evaluación del miércoles; o diagnóstico adicional de solo lectura; cualquier cambio de ritmo/preparadores requiere autorización).

## 2026-10-27 10:45 CDMX — Despertador de la mañana (solo lectura; NO se cambió nada)
- Rutina matutina (10:32, 1.8 min): estado ÁMBAR, siguió el formato, sin escrituras ni permisos denegados. Reporta ambiguas 16,105 acumuladas (Jubilee 9,434, Vivento 6,671); CTR carga nueva 1.09% / 1.07% (base anterior 1.51% / 1.26%); 0 depositantes nuevos de la carga nueva; sms-continuo 298 timeouts de 88,282 ejecuciones (0.3%); recomienda no liberar tanda 2 y pedir al proveedor revisar las ambiguas. No pudo comparar textos *_R6_.
- Verificado por mí (ventana última hora ≈ 9:46–10:46 CDMX): enviadas Jubilee ≈4,350 y Vivento ≈1,400; fallidas 13 en 3 h, todas "NO ROUTES" (0.3% hoy); ambiguas hoy 107 / 22; 0 SMS a clientes en etapa convertido; 0 despachos "enviando" atascados.
- CTR de textos Jubilee (26-oct 04:00Z hasta hace 3 h, clic humano único / SMS aceptado): *_R6_ 0.88% (30,120 SMS) vs resto 0.86% (12,718). Sin diferencia material; ambos por debajo del 1.0% (semáforo rojo por umbral).
- Adquisiciones pagables: sin cambio, Jubilee 1 (26-oct), Vivento 1 (25-oct); 27-oct: 0 (Jubilee 1 depósito de $200 de un cliente existente). Gasto del día hasta ahora ≈ $180 (aprox.).
- Healthcheck: 503, 13.2 / 20.3 / 12.2 s.
- Alertas abiertas (3, origen monitor, activas y actualizándose a las 10:40): "Informe diario sin ejecutarse", "Correo del resumen no enviado" (resumen del 26-oct pendiente; el del 25-oct sí salió el 26-oct 13:08 CDMX) y "Cola de SMS vacía con pendientes". No son falsas ni viejas: no se cerró ninguna.
- Nada que revertir. Pendiente de decisión del CAIO: ver conversación (proveedor: ambiguas y aviso de entrega; Wintown: respuesta; evaluación formal de la tanda 1 el miércoles 28-oct).

## 2026-10-27 17:55 CDMX — Despertador de la tarde (solo lectura; NO se cambió nada)
- Rutina vespertina (17:41, 2.3 min): estado ROJO, formato correcto, sin escrituras ni permisos denegados. Reporta CTR cohorte nueva 0.96% (Jubilee) / 0.98% (Vivento), utilidad del mes ≈ −$12,300 (aprox., con hueco de datos), 9 adquisiciones pagables en el mes (Jubilee 5, Vivento 4), ambiguas acumuladas 19,502.
- Verificado por mí (hasta 17:55 CDMX): enviadas hoy Jubilee 37,806 / Vivento 11,723; ambiguas 2,655 / 794 (≈6.5% del total); fallidas 116 / 27 (0.3%). Gasto del día ≈ $1,589 (aprox.); adquisiciones pagables del día: 0 (ingreso CPA $0). Ritmo estable de 5,300–7,300 SMS por hora de 10:00 a 17:59. 0 envíos antes de las 10:00; aún no son las 20:00. 0 SMS a clientes en etapa convertido en las últimas 2 h.
- CTR por texto en Jubilee (26-oct 04:00Z hasta hace 2 h, ≥800 SMS): FRIO_R6_5 0.71%, R6_7 0.69%, R6_3 0.71%, R6_4 0.64%, R6_2 0.65%, R6_8 0.57%, R6_6 0.42% (5,188 SMS), R6_1 0.27% (4,142 SMS); DEP_…_V2 0.89%, V3 0.94%, V1 0.64%. Propuesta (requiere autorización): desactivar R6_1 y R6_6.
- Carril caliente de Vivento: la alarma de la rutina no se confirma; hoy 13 aprobado y 15 solicitud_enviada enviados. Se interpreta como cadencia.
- Informe diario del 26-oct: "en_curso" (creado 13:30Z, actualizado 23:30Z), correo pendiente; el del 25-oct sí salió. Alerta real abierta del monitor. Revisión programada a las ~20:30 CDMX.
- Healthcheck: 503; 21.4 / 4.6 / 11.3 s. Nada que revertir.

## 2026-10-28 10:45 CDMX — Evaluación formal de la tanda 1 y revisión de la mañana (solo lectura; NO se cambió nada)
- Carga nueva = leads creados desde el 23-oct 12:00 CDMX (≈50,000 por marca). SMS a la cohorte: Jubilee 122,033 enviados + 10,870 ambiguos (49,977 personas); Vivento 75,434 + 5,298 (49,989 personas). Total ≈213,635 SMS, ≈2.1 por persona, costo ≈ $6,409 (enviados + ambiguos × $0.03).
- Resultado (dato observado, consulta validada + cruce por persona): clientes con depósito de la carga nueva: Jubilee 0; Vivento 1 ($100 el 23-oct 23:09, etapa deposito_parcial, 1 SMS). Adquisiciones pagables de la carga nueva: 0. Equilibrio de la cohorte ≈ 8 adquisiciones pagables.
- Corrección: la adquisición pagable de Vivento del 25-oct ($200, primer depósito 04:01 CDMX) y las 5 de Jubilee son de la base ANTERIOR (lead creado el 2-oct, 7 SMS, etc.). La rutina matutina las atribuyó a la tanda 1 por error.
- Embudo de la cohorte (etapas actuales): Jubilee intento_contacto 47,865; interesado 1,235; elegible 884; aprobado 11; solicitud_enviada 5. Vivento intento_contacto 46,345; elegible 2,835; interesado 813; aprobado 3; solicitud_enviada 3; deposito_parcial 1. Avanzados (aprobado, solicitud, parcial, convertido): Jubilee 16, Vivento 7 = 23.
- Regla acordada: menos de 2 adquisiciones pagables → NO liberar tanda 2. Recomendación al CAIO además: pausar el envío frío repetido y mantener solo etapas calientes (decisión de volumen, requiere su autorización).
- Verificado hoy hasta 10:46 CDMX: enviadas Jubilee 2,560 / Vivento 1,083; ambiguas 395 / 145; fallidas 11 / 3; 0 SMS a clientes convertidos; 0 envíos fuera de horario (solo 71 SMS entre 20:00:37 y 20:01:40 del 27-oct, desborde de reservas). Healthcheck 503: 12.8 / 12.8 / 16.4 s.
- Informes diarios del 26-oct y del 27-oct siguen "en_curso" con correo pendiente; el último correo enviado es el del 25-oct (26-oct 13:08 CDMX).
- Rutina matutina (10:32): ROJO, sin escrituras; CTR cohorte ≈1.00% en ambas marcas; ambiguas acumuladas 20,328.
- Nada que revertir. Commit local sin push (el push fue bloqueado por permisos; pendiente de que el CAIO lo habilite).

## 2026-10-29 08:00–08:31 CDMX — PAUSA DEL ENVÍO FRÍO EJECUTADA (autorizado por el CAIO: "sí, ejecuta la pausa del frío")
- Qué se hizo (datos, sin código): `campana_leads.pendiente_activacion=true` en lotes de 5,000–9,000 para los leads FRÍOS de Jubilee y Vivento: etapa intento_contacto, elegible o contactado, sin respuesta entrante, no archivados, sin motivo de salida. Total NUEVO pausado: 145,075 (Jubilee 67,873 = 66,867 intento_contacto + 1,005 elegible + otros; Vivento 77,202). Ya había 1,694 leads de Vivento en espera desde el 25-oct (siguen igual). No se pausaron 2 leads sin import_job_id (1 por marca): la restricción `campana_leads_pendiente_requiere_job_chk` exige `import_job_id` cuando pendiente_activacion=true.
- Siguen activos (calientes): interesado (Jubilee 4,271; Vivento 5,148), calificado (126 / 130), aprobado (61 / 26), solicitud_enviada (35 / 34), deposito_parcial (5 / 9). Carril caliente de Vivento sigue encendido; campañas siguen "activas". Costo esperado ≈ 6,000 SMS al día (≈ $180) frente a ≈ $2,000–2,600.
- Regla de liberación (la ejecuto en cada revisión de las 10:45 y 17:55): leads pausados que ya avanzaron de etapa (por ejemplo un clic los pasa a interesado) se reactivan: `update campana_leads set pendiente_activacion=false where workspace_id='22222222-2222-4222-8222-222222222222' and campana_id in ('jubilee-v2','vivento') and pendiente_activacion=true and primer_contacto_en is not null and etapa not in ('intento_contacto','elegible','contactado');`
- REVERTIR la pausa completa (no toca los 1,694 de Vivento que ya estaban en espera, porque no tienen primer contacto): `update campana_leads set pendiente_activacion=false where workspace_id='22222222-2222-4222-8222-222222222222' and campana_id in ('jubilee-v2','vivento') and pendiente_activacion=true and etapa in ('intento_contacto','elegible','contactado') and (primer_contacto_en is not null or campana_id='jubilee-v2');` Hacerlo en lotes de ≤9,000 (por ejemplo con `ctid in (select ctid ... limit 9000)`).
- Verificación posterior: pendientes por etapa confirmados con consulta (pausados con contacto previo 144,660; sin contacto previo 2,109 = 1,694 previos + 415 nuevos de Jubilee). Los envíos empiezan a las 10:00; primera comprobación a las 10:20.

## 2026-10-29 10:22 CDMX — Verificación de la pausa del frío (solo lectura)
- Últimos 25 min tras el arranque de las 10:00: solo etapas calientes. Jubilee: interesado 2,296, calificado 67, aprobado 16, solicitud_enviada 8; Vivento: interesado 1,118, calificado 19, aprobado 9, solicitud_enviada 8. Frío: 1 SMS en intento_contacto (el lead sin import_job_id de Jubilee, que no pudo pausarse) y 0 en Vivento.
- Primera hora (10:00–10:21): 3,542 SMS enviados, casi todos a "interesado" (el primer barrido del día; se espera que baje: ≈6,000 al día en total). Fallidas 1; ambiguas 0.
- Leads pausados por liberar (avanzaron de etapa): 0.
- Sin cambios; nada que revertir.

## 2026-10-29 10:45 CDMX — Despertador de la mañana (pausa del frío vigente)
- Pausa del frío verificada: última hora (≈9:45–10:45): Vivento 2,719 interesado, 64 calificado, 9 aprobado, 8 solicitud_enviada; Jubilee 2,448 interesado, 68 calificado, 16 aprobado, 8 solicitud_enviada, 1 intento_contacto (lead sin import_job_id). Total ≈5,340 en la hora 10:00 (primer barrido de interesados); fallidas 1, ambiguas 1. 0 SMS a clientes convertidos.
- Regla de liberación ejecutada: 1 lead (Jubilee, ahora en interesado) reactivado. Revertir: `update campana_leads set pendiente_activacion=true where id in (<ids>)` no es necesario; es el comportamiento previsto.
- Informes diarios: el del 27-oct se completó y el correo salió el 28-oct 21:01 CDMX (email_estado=enviado); el del 28-oct está pendiente (recién iniciado); el del 26-oct sigue "en_curso" sin correo (quedó saltado).
- Rutina matutina (10:37): ROJO; su reporte final llegó solo como resumen push (formato incompleto); no conoce la pausa del frío (su texto no la incluye). CTR cohorte nueva 0.92% / 0.99%; ambiguas 23,275 acumuladas; utilidad del mes ≈ −$15,100 (aprox.).
- Healthcheck 503: 14.8 / 10.0 / 2.6 s.

## 2026-10-29 — Decisiones del CAIO sobre confirmaciones (sin cambios en producción)
- Wintown no respondió con claridad (remitió a sus páginas): "dejémoslo con la información que tenemos". Se opera con lo verificado en los sitios oficiales; las condiciones no confirmadas siguen fuera de los textos. Ficha económica actualizada.
- Proveedor de SMS: sin confirmación de entrega. "Entregado" sigue no medible.
- Siguiente evaluación formal: lunes 2-nov-2026 (resultados de la pausa del frío y maduración de los leads calientes y de la tanda 1).

## 2026-10-29 17:55 CDMX — Despertador de la tarde (pausa del frío vigente)
- Envíos de hoy (10:00–17:56): Jubilee 2,960 enviadas / 25 ambiguas / 0 fallidas; Vivento 3,834 / 147 / 2. Primera hora 5,514 (barrido de interesados), después 100–560 por hora. Frío: 1 SMS (el lead sin import_job_id). 0 SMS a clientes convertidos. Gasto del día ≈ $209 (aprox.) frente a ≈ $1,900–2,000 de los días anteriores (≈ −89%).
- Regla de liberación ejecutada: 7 leads reactivados (Jubilee 4, Vivento 3; todos ahora en interesado).
- Adquisiciones pagables del día: 0 (Jubilee: 3 depósitos de $900 de 1 cliente existente el 29-oct; Vivento: 2 depósitos de $400 el 28-oct, cliente existente).
- Informes diarios: del 27-oct (correo 28-oct 21:01 CDMX) y del 28-oct (correo 29-oct 14:01 CDMX) enviados; el del 26-oct sigue "en_curso" sin correo (saltado).
- Rutina vespertina (17:41): formato completo, sin escrituras; no conoce la pausa del frío y repite recomendaciones ya ejecutadas (reducir fríos) o cerradas por el CAIO (proveedor). CTR carga nueva 0.93% / 1.01%; ambiguas acumuladas 23,447; utilidad del mes ≈ −$15,200 (aprox.).
- Healthcheck 503: 11.3 / 7.5 / 2.7 s. Nada que revertir.

## 2026-10-30 10:45 CDMX — Despertador de la mañana (pausa del frío vigente)
- Envíos de hoy (10:00–10:47): Jubilee 2,059 enviadas / 230 ambiguas (10%) / 0 fallidas; Vivento 96 / 3 / 0. Todos de etapas calientes (interesado, calificado, solicitud_enviada, aprobado); frío: 0. 0 SMS a clientes convertidos; 0 envíos fuera de horario. Volumen bajo por diseño: el barrido de interesados del día se hizo en la primera hora (cadencia ~20 h) y Vivento barrió su pool el 29-oct.
- Regla de liberación: 17 leads reactivados (Jubilee 9, Vivento 8; todos en interesado).
- Adquisiciones pagables nuevas: 0 (30-oct: Jubilee 1 depósito de $100, Vivento 1 de $200, ambos de clientes con depósitos previos). Informe diario del 29-oct "en_curso", el del 28-oct enviado; el del 26-oct sigue saltado.
- Rutina matutina (10:35): reportó ROJO por "envío detenido desde las 10:18"; es FALSA ALARMA: la rutina no conoce la pausa del frío (su texto no la incluye) y dice que la evaluación del 28-oct no se hizo (sí se hizo; ver entrada del 28-oct). Pendiente que el CAIO pegue el bloque de `ADENDA_RUTINAS.md`.
- Healthcheck 503: 16.0 / 12.0 / 13.4 s. Nada que revertir.

## 2026-10-30 17:55 CDMX — Despertador de la tarde (pausa del frío vigente)
- Envíos de hoy (10:00–17:56): Jubilee 2,063 enviadas / 238 ambiguas / 0 fallidas; Vivento 876 / 206 / 1. Por hora: 2,303 (10:00), 273, 49, 89, 225. Todo de etapas calientes (interesado 2,863; calificado 57; solicitud_enviada 11; aprobado 8); frío 0; 0 SMS a clientes convertidos. Gasto del día ≈ $101 (aprox.).
- Regla de liberación: 5 leads reactivados (Jubilee 2, Vivento 3; todos en interesado).
- Adquisiciones pagables del día: 0 (depósitos: Jubilee 2 por $390 de 2 clientes, Vivento 1 por $200; todos con depósitos previos que ya cruzaron o no cruzan el umbral).
- Informes diarios: el del 29-oct salió (30-oct 17:01 CDMX). El del 26-oct sigue saltado.
- Rutina vespertina (17:41): ROJO por "el envío se secó" (falsa alarma: es la pausa del frío; su texto no la incluye); propone pausar envíos (ya hecho) y diagnosticar el tramo posterior al clic. Dato útil: de ≈100,000 personas de la carga nueva, 27 están en solicitud/aprobado/depósito parcial y 0 convertidas (base anterior 164 avanzados, 9 convertidos).
- Healthcheck 503: 10.7 / 6.4 / 13.4 s. Nada que revertir. Próxima evaluación formal: lunes 2-nov 10:50.

## 2026-10-31 (sábado) 10:45 CDMX — Despertador de la mañana (pausa del frío vigente)
- Envíos de hoy (10:00–10:46): Jubilee 1,253 enviadas / 50 ambiguas / 0 fallidas (1,244 interesado, 5 solicitud_enviada, 3 calificado, 1 aprobado); Vivento 4 / 0 / 0. Frío 0; 0 SMS a clientes convertidos; 0 envíos fuera de horario.
- Regla de liberación: 10 leads reactivados (Jubilee 4 interesado; Vivento 5 interesado y 1 solicitud_enviada).
- Adquisiciones pagables: 0; sin depósitos nuevos hoy hasta ahora. Informe del 30-oct pendiente; el del 29-oct enviado.
- Healthcheck 503: 11.0 / 9.0 / 11.0 s. No revisé en detalle el reporte de la rutina matutina (hasta ahora sus alarmas han sido por no conocer la pausa). Sin cambios que revertir. Evaluación formal: lunes 2-nov 10:50 (el CAIO no pidió adelantarla).

## 2026-10-31 (sábado) 17:55 CDMX — Despertador de la tarde (pausa del frío vigente)
- Envíos de hoy: Jubilee 1,260 enviadas / 50 ambiguas / 0 fallidas; Vivento 451 / 173 (≈28% de sus intentos del día) / 0. Por hora: 1,264 (10:00), 84, 1, 146, 0, 71, 144. Frío 0; 0 SMS a clientes convertidos; aún no son las 20:00. Gasto del día ≈ $58 (aprox.).
- Regla de liberación: 3 leads reactivados (Jubilee, interesado).
- Adquisiciones pagables del día: 0 (Vivento: 1 depósito de $200 de un cliente con depósitos previos). Informes: el del 30-oct se envió el 31-oct 11:01 CDMX; el del 26-oct sigue saltado.
- Healthcheck 503: 8.2 / 4.7 / 5.1 s. No revisé en detalle el reporte de la rutina vespertina (alarmas previas fueron falsas por no conocer la pausa). Nada que revertir.

## 2026-11-01 (domingo) 10:45 CDMX — Despertador de la mañana (pausa del frío vigente)
- Envíos de hoy (10:00–10:46): Jubilee 1,049 enviadas / 0 ambiguas / 0 fallidas (1,044 interesado, 2 solicitud_enviada, 1 calificado, 1 aprobado, 1 intento_contacto = el lead sin import_job_id); Vivento 9 / 0 / 0. 0 SMS a clientes convertidos; 0 fuera de horario.
- Regla de liberación: 5 leads reactivados (Vivento, interesado).
- Adquisiciones pagables: 0; 31-oct: 1 depósito de $200 en Vivento (cliente previo). Informe del 30-oct enviado; el del 31-oct pendiente.
- Healthcheck 503: 13.6 / 6.3 / 4.9 s. No revisé en detalle el reporte de la rutina matutina. Nada que revertir. Evaluación formal: lunes 2-nov 10:50.

## 2026-11-01 (domingo) 17:55 CDMX — Despertador de la tarde (pausa del frío vigente)
- Envíos de hoy: Jubilee 1,079 enviadas / 1 ambigua / 0 fallidas; Vivento 45 / 1 / 1. Por hora: 1,062 (10:00), luego 1–27 por hora. Frío: 1 SMS (lead sin import_job_id); 0 SMS a clientes convertidos; aún no son las 20:00. Gasto del día ≈ $34 (aprox.).
- Regla de liberación: 2 leads reactivados (Jubilee, interesado).
- Adquisiciones pagables: 0. Depósitos de Jubilee y Vivento el 1-nov: ninguno (el último fue $200 en Vivento el 31-oct, cliente previo). Informe del 31-oct enviado el 1-nov 13:31 CDMX.
- Healthcheck 503: 9.4 / 9.2 / 3.0 s. No revisé en detalle el reporte de la rutina vespertina. Nada que revertir. Próxima evaluación formal: lunes 2-nov 10:50.

## 2026-11-02 (lunes) 11:25 CDMX — EVALUACIÓN FORMAL tras la pausa + despertador de la mañana (solo lectura; sin cambios salvo regla de liberación)
- Periodo: 29-oct 00:00 a 2-nov 11:25 CDMX. SMS enviados desde la pausa: Jubilee 8,359; Vivento 5,459 (13,818). Gasto ≈ $447 (enviadas+ambiguas × $0.03), promedio ≈ $90 al día, frente a ≈ $2,000 al día antes.
- Adquisiciones pagables nuevas desde la pausa: 0 en ambas marcas. Pagables del mes: 9 (Jubilee 5, Vivento 4), todas de la base anterior. Depositantes con primer depósito desde la pausa: Jubilee 2 (ambos $100, leads de la base anterior de sept/oct, etapa deposito_parcial); Vivento 0.
- Tanda 1 (carga del 23-oct): 1 cliente con depósito ($100, Vivento, parcial), 0 pagables. Embudo actual de la cohorte: Jubilee aprobado 15, solicitud_enviada 7, interesado 1,443, convertido 0; Vivento aprobado 3, solicitud_enviada 4, deposito_parcial 1, interesado 936, convertido 0. Avanzados 30 (el 28-oct eran 23).
- Regla acordada (menos de 2 adquisiciones pagables de la carga nueva → no liberar tanda 2): resultado NO LIBERAR.
- CTR desde la pausa (clics únicos / SMS aceptados, SMS de hace más de 3 h): interesado Jubilee 2.76% (7,234 SMS), Vivento 3.34% (5,175); calificado 5.31% / 9.79% (113 / 143 SMS). Frío (referencia anterior): ≈0.9–1.0%.
- Partial depositors (≤$180 acumulado): Jubilee 7 + 1 de la tanda... (base anterior 7), Vivento 8 + 1 de la cohorte. Cada uno que cruce $180 vale $800 de CPA; sin textos para ellos en Vivento (desactivados por regla del bono sin confirmar).
- Despertador de la mañana (hoy hasta 11:25): Jubilee 957 / Vivento 108 enviadas; todo de etapas calientes; 0 fríos; 0 a convertidos; 0 fuera de horario. Liberados por la regla: 8 (Jubilee 5, Vivento 3). Informe del 31-oct enviado; el del 1-nov pendiente. Healthcheck 503: 12.5 / 3.2 / 10.0 s. Rutina matutina no revisada en detalle. El despertador y la evaluación llegaron con ≈40 min de retraso (la evaluación se ejecutó aquí junto con el despertador).
- Decisiones propuestas al CAIO: cerrar tanda 2 (no liberar), mantener la pausa del frío, y autorizar un recorrido de solo lectura del flujo posterior al clic en los sitios públicos de Vivento y Jubilee. Nada que revertir.

## 2026-11-02 (lunes) tarde — Decisiones del CAIO y recorrido post-clic (solo lectura; sin cambios en producción)
- Decisiones del CAIO: (1) cerrar la tanda 2 (no liberar) — "sí"; (2) seguir con la pausa del frío — "ok"; (3) autorizar el recorrido de solo lectura del flujo después del clic — "sí".
- Recorrido ejecutado en los sitios públicos (sin registrarse, sin seguir enlaces de rastreo). Resultado completo en `revops/RECORRIDO_EMBUDO_POST_CLIC.md`. Hallazgo principal: ambos sitios tienen la ruta directa `/registro` que abre el formulario; los enlaces de rastreo (`.../ts/96144|96145/tsc?typ=r&amc=atp.wintown...`) probablemente caen en la página de inicio (no verificado). Otros: el mínimo de depósito de Vivento es $100 (preguntas frecuentes), $200 (promoción) y $300 (términos); el CPA exige > $180; SPEI en Vivento es manual (hasta 24 h); verificación (INE, domicilio, rostro) obligatoria para retirar.
- Propuesta pendiente: revisar en el portal de Wintown el destino de los enlaces y, si es posible, apuntarlos a `/registro`; luego una prueba de ≈5,000 primeros contactos (requiere autorización).

## 2026-11-02 (lunes) 17:55 CDMX — Despertador de la tarde (pausa del frío vigente)
- Envíos de hoy: Jubilee 1,244 enviadas / 138 ambiguas / 1 fallida; Vivento 229 / 16 / 0. Por hora: 1,030 (10:00), 94, 79, 30, 68, 164, 5, 3. Frío 0; 0 SMS a clientes convertidos; aún no son las 20:00. Gasto del día ≈ $49 (aprox.).
- Regla de liberación: 1 lead reactivado (Jubilee, interesado).
- Adquisiciones pagables del día: 0. Depósitos de hoy en Jubilee: 3 depósitos de 3 clientes por $460 (ninguno cruza aún $180 acumulados según la consulta validada). Informe del 1-nov enviado (2-nov 12:01 CDMX).
- Healthcheck 503: 6.9 / 4.3 / 8.7 s. Rutina vespertina no revisada en detalle. Nada que revertir. Pendiente del CAIO: revisar en el portal de Wintown el destino de los enlaces (¿/registro?).
