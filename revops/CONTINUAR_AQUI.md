# Retomar el trabajo de RevOps en una sesión nueva (2026-11-13)

Motivo: la sesión anterior perdió las herramientas de Lovable (los conectores se leen al arrancar la sesión). Esta nota deja todo lo necesario para continuar sin perder nada. Lee también `BITACORA_CAMBIOS.md` (cambios con cómo revertirlos) y `PLAN_CAMPANA_1XBET.md`.

## Quién es el usuario y cómo responder
- Julen Garritz, CAIO de Directo Telecom. Español, directo, sin relleno.
- No mencionar agentes de IA por su nombre. No mencionar regulaciones bancarias salvo que el caso lo exija.
- Hechos, estimaciones e hipótesis siempre separados. No inventar datos. Marketing responsable (+18, sin urgencia falsa, sin promesas de ganar, sin presionar a apostar más).

## Marco de autonomía (aprobado 2026-10-26)
- PUEDES sin preguntar (avisando después): desactivar un texto que contradiga la fuente oficial, apagar el carril caliente de Vivento si hay envíos erróneos, limpiar alertas falsas, aplicar la regla de liberación, resumir.
- DEBES PREGUNTAR antes de: publicar código o migraciones, cambiar ritmo/horario/volumen, reanudar el frío, pausar o reanudar campañas, cargar listas o textos nuevos, contactar a Wintown o al proveedor.
- Cada cambio en producción se anota en `BITACORA_CAMBIOS.md` con cómo revertirlo, se hace commit y se empuja a la rama `claude/revops-sms-campaigns-ii6zwl`. No crear PR salvo que lo pida.
- Lovable: proyecto "RevOps Console" `790a6832-731e-47ad-8612-b704212580b6`, workspace de datos `22222222-2222-4222-8222-222222222222`. Consultas con `query_database` (parámetro `sql`).

## Estado al 2026-11-13
- Jubilee (`jubilee-v2`) y Vivento (`vivento`): `pausada` desde el 2026-11-09 por orden del CAIO ("deten las campañas de momento"). Reanudar solo con su autorización: `update campanas set estado='activa' where workspace_id='22222222-2222-4222-8222-222222222222' and id in ('jubilee-v2','vivento');`
- La pausa del frío (29-oct) sigue: leads fríos con `pendiente_activacion=true`. Regla de liberación en cada revisión:
  `update campana_leads set pendiente_activacion=false where workspace_id='22222222-2222-4222-8222-222222222222' and campana_id in ('jubilee-v2','vivento') and pendiente_activacion=true and primer_contacto_en is not null and etapa not in ('intento_contacto','elegible','contactado');`
- Adquisiciones pagables desde el 1-oct (consulta validada en `consultas_validadas.sql`): Jubilee 7, Vivento 5. Economía: SMS $0.03; CPA $800 por cliente y marca al superar $180 acumulados; equilibrio 26,667 SMS por adquisición; octubre ≈ 83,000.
- Con las dos campañas pausadas el informe diario sale `parcial` (0 campañas, correo omitido): es efecto de la pausa, no una falla.
- Ambiguas: se disparan en ráfagas de >1,000 SMS en minutos (hasta 39%); goteo sin ambiguas. Pendiente de decisión: contactar al proveedor o escalonar el envío.

## Campaña nueva 1xBet (id `1xbet`) — en `borrador`, 0 leads, 0 despachos
- Oferta oficial verificada el 2026-11-04 (bono 100% hasta $8,000 en el 1.º depósito, mín. $100, solo deportes, 4 depósitos con bono). Revisar de nuevo el día del envío.
- Programa de afiliados: CPA 15 USD (≈ $278 MXN) solo con registro + depósitos ≥ 5 USD + apuestas ≥ 15 USD (por mes), retención 7 días; rev share 25% con arrastre de negativos (por confirmar; no se cuenta). Ventana de atribución 30 días. Código DIRBON = solo atribución. Equilibrio ≈ 9,250 SMS por jugador que califica.
- Permiso: oficios DGJS/0939/2024 y DGJS/0002/2020 (Entretenimientos Naturales), revisados y dados por OK por el CAIO el 2026-11-12.
- Lista: 100,000 registros con consentimiento (confirmación del CAIO), origen campañas de marketing. El archivo AÚN NO está cargado; el CAIO lo enviará (no subirlo a GitHub). Plan: limpiar y partir en 4 bloques (1,000 / hasta 10,000 / hasta 30,000 / resto) y cargar cada bloque solo con aprobación de esa etapa. Sin tope total definido ("ya veremos"): el freno son las etapas.
- Ya configurado (autorizado 2026-11-12): destino `https://refpa-78460.com/L?tag=d_6224298m_1599c_&site=6224298&ad=1599&r=promotions/1st` (tipo utm, `parametroClickId=click_id`); textos FRIO_X8–X13 activos y FRIO_X14 (segundo contacto) inactivo; FRIO_X1–X7 inactivos. Revertir: ver `BITACORA_CAMBIOS.md` (entrada "destino y textos v2").
- El sistema agrega solo "Entra aquí: <enlace> Responde BAJA para no recibir mas." a cada SMS (no escribir la leyenda a mano).

## Pendientes, por prioridad
1. Postback de 1xBet: el portal pide una URL. Con Lovable: revisar (solo lectura) si ya existe un endpoint para recibir postbacks/conversiones externas (hay una tabla `conversiones_externas`, vacía), y si no existe, proponer el diseño (recibe identificador de clic + evento + monto, ignora repetidos, sin teléfonos, token largo guardado de forma segura, nunca en el chat ni en GitHub). Necesita del CAIO: pantalla del postback del portal (eventos, macros, método) y el nombre del parámetro donde guardan nuestro identificador de clic (hoy se manda `click_id`).
2. Baja: en toda la base hay 0 SMS entrantes y 0 bajas por SMS pese a ≈ 800,000 SMS con la leyenda. Probar con un teléfono propio (SMS → responder BAJA → comprobar `personas.opt_out`/`bloqueos_contacto`) y confirmar con el proveedor a dónde llegan las respuestas. Bloquea el envío a la lista.
3. Dominio de enlaces: el CAIO eligió `srte.io` para 1xBet. Plan de Lovable (en `.lovable/plan.md`): paso 1 código `dominioEnlace` por campaña con lista permitida (srte.io, credc.io), paso 3 publicar con autorización explícita, paso 4 pruebas sin clics falsos al afiliado, paso 5 dato solo en 1xbet; omitir el paso 2 (quitar dominio "Principal"). Falta la aprobación del CAIO del paso 1.
4. El CAIO debe abrir el enlace de afiliado en su celular y decir qué ve (formulario o promoción con botón REGISTRARSE). No abrirlo desde aquí (crea clics falsos).
5. Aprobación final, fecha de arranque, y en el arranque agregar 1xBet a las revisiones y a las rutinas de claude.ai (hoy solo vigilan Jubilee y Vivento).
6. Respuesta de Wintown (reglas del bono, mínimo de depósito, fricción del registro) y del proveedor (ambiguas, aviso de entrega).

## Revisiones programadas (10:45 y 17:55 CDMX)
Estaban atadas a la sesión anterior (persistent_session_id `session_018eMYJuzBmHxBfaVTvwgrGm`, disparadores `trig_01KHGfRNsRhwdBtBYuQ5wNLV` mañana y `trig_011jszw8ketvsExaTJj96dty` tarde). En la sesión nueva: recrearlas con `create_trigger` apuntando a la sesión nueva (mismo texto de revisión: consultas ligeras de envíos por marca y etapa, ambiguas/fallidas, 0 SMS a clientes pagables, nada después de las 20:00, healthcheck `https://credc.io/api/public/healthcheck`, regla de liberación, adquisiciones con la consulta validada, bitácora, commit, push, notificación) y deshabilitar las viejas con `update_trigger enabled=false`.
