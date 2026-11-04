# Plan de campaña nueva: 1xBet (SMS) — BORRADOR PARA APROBACIÓN DEL CAIO

Fecha: 2026-11-04. Estado: **plan; nada configurado ni enviado.** Fuente de los datos: lo que dio el CAIO en el chat + lectura de las páginas públicas de 1xBet (sin seguir el enlace de afiliado, para no crear clics falsos).

## 0. Puertas que deben cumplirse antes de enviar un solo SMS
1. **Autorización para operar y promocionarse en México (puerta legal).** En las páginas públicas que pude leer de `1-x.mx` no aparece operador, razón social ni permiso de la Secretaría de Gobernación (Vivento y Jubilee sí muestran el suyo en el pie de página). No pude verificar que 1xBet tenga permiso para operar y anunciarse en México. Requisito: confirmación por escrito del programa de afiliados (o de 1xBet) de que cuenta con permiso/autorización vigente para México, y revisión del área legal de Directo. Sin eso, **no se envía**.
2. **Evento que paga el CPA de $15 USD.** Hay que saber exactamente qué lo dispara (registro, primer depósito, depósito mínimo, verificación). Cambia por completo la economía (ver §2).
3. **Consentimiento de la lista.** Origen, número de contactos y evidencia de que aceptaron recibir promociones de apuestas por SMS.
4. **Ruta de medición** (ver §4): sin ella no se puede saber qué funciona.

## 1. Oferta (verificada contra la página oficial)
Página oficial (sin etiqueta de afiliado): `https://1-x.mx/mx/promotions/1st`. Coincide con el texto que dio el CAIO. Condiciones clave:
- Depósito mínimo **100 MXN** (la página lo muestra como 5.4 USD).
- Bono por los **primeros 4 depósitos**: 100% hasta 8,000 MXN; 90% hasta 5,000; 80% hasta 5,000; 70% hasta 5,000. La cifra "340% de bonificación en el primer depósito" del encabezado es la suma de los cuatro porcentajes: **no** es el bono del primer depósito; **no se usa en los textos**.
- Bono **solo para apuestas deportivas**: se apuesta 5 veces el bono en combinadas de 3 o más selecciones, cada una con cuota de 1.4 o más. 15 días para el primer depósito tras el registro y 15 días para apostar el bono; se pierde si no se cumple.
- Requiere dar consentimiento para la bonificación y completar el perfil; verificación de identidad (KYC) cuando se solicite; una bonificación por cliente, familia, dirección, IP o cuenta de pago; la empresa puede modificar o cancelar ofertas sin aviso.
- Código promocional del afiliado: `DIRBON` (el CAIO debe confirmar qué otorga y si es solo atribución).
- Enlace de afiliado: `reffpa.com/L?tag=...&r=promotions/1st` (lleva a la página de la promoción, no a la página de inicio).
- "Solo en la app: 25% de cashback" aparece en la página; no es parte de esta oferta y no se menciona.

## 2. Economía (hipótesis marcadas)
- CPA: 15 USD. Tipo de cambio implícito en la página oficial ≈ 18.5 MXN por USD → **≈ $278 MXN por adquisición** (ESTIMACIÓN; confirmar el tipo de cambio de pago).
- Rev share 25% "sin piso": no está claro si un NGR negativo resta; **no se cuenta** en los cálculos hasta confirmarlo.
- Costo del SMS: $0.03 MXN → **punto de equilibrio ≈ 9,250 SMS por adquisición**.
- Referencia de octubre (Vivento + Jubilee, 817,239 SMS): 1 registro por cada ≈4,260 SMS y 1 primer depósito por cada ≈32,700 SMS (3.5 veces peor que el equilibrio de esta campaña).
- Escenario A, si el CPA se paga **por registro**: con el rendimiento de octubre habría margen (≈ $128 de SMS por registro frente a $278), pero con el rendimiento de la carga nueva (1 por ≈11,200 SMS) quedaría en pérdida.
- Escenario B, si se paga **por primer depósito**: se necesita una conversión unas 3.5 veces mejor que la de octubre para no perder; la promoción con depósito mínimo bajo ($100) y bono de 4 depósitos podría ayudar, pero es una hipótesis.
- Costos del piloto: 5,000 SMS ≈ $150; 20,000 SMS ≈ $600 (equilibrio ≈ 2.2 adquisiciones).

## 3. Lista
- Una lista nueva con consentimiento (el CAIO la proporcionará). Pendiente: nombre del archivo, cantidad, origen, fecha y forma del consentimiento, y si incluye opciones de baja.
- Reglas: normalizar teléfonos, quitar duplicados y los que ya estén en Vivento/Jubilee (no contactar a la misma persona por dos marcas el mismo día), respetar bajas ("BAJA"), horario 10:00–20:00 CDMX, solo mayores de edad.

## 4. Medición y seguimiento
- El portal de afiliados no tiene API (según el CAIO): los resultados se ven en un sitio web. Opciones: (A) exportación diaria (CSV o capturas) que el CAIO pasa y yo cargo/analizo; (B) postback/sub-id si el programa lo ofrece (**por confirmar**, no asumir); (C) lectura manual de cifras pegadas en el chat.
- Para comparar variantes sin sub-id: usar enlaces/anuncios distintos por variante (`ad`) o correr las variantes en horarios o días distintos y registrar el reparto.
- Métricas: SMS enviados, clics únicos, CTR, registros, costo por registro, primeros depósitos, adquisiciones pagables, costo por adquisición, rev share. Se separa siempre dato observado, estimación e hipótesis.

## 5. Diseño del piloto (propuesta)
- **Etapa 1 — 1,000 SMS:** revisar fallas (límite 5%), rutas, bajas y primeros clics.
- **Etapa 2 — hasta 5,000 SMS:** 3 variantes de texto repartidas por igual; una de ellas con el código DIRBON. Máximo 2 SMS por persona en 7 días (el segundo, con otro texto, solo a quien no hizo clic y 2 días después).
- **Etapa 3 — hasta 20,000 SMS, solo si la etapa 2 supera los umbrales:** necesaria para medir primeros depósitos con sentido estadístico (con 5,000 SMS se esperan menos de 2 depósitos).
- Sin urgencia artificial, sin promesas de ganar, sin "340%", sin superlativos no verificables, con +18, TyC y recordatorio de juego responsable.

## 6. Reglas de parada y de éxito (a acordar con el CAIO)
- Parar si fallidas > 5%, si hay quejas o bajas por encima de 1%, o si la puerta legal no se cumple.
- Seguir a la etapa 3 si CTR ≥ 1.5% y registros ≥ 1 por cada 2,000 SMS (indicadores iniciales; ajustar con el evento real del CPA).
- Revisar y pausar si el costo por registro supera la mitad del CPA (≈ $139) o si, tras 20,000 SMS, el costo por adquisición supera 2 veces el equilibrio.

## 7. Textos propuestos (validados fuera de línea; NO cargados)
1. 1xBet: bono 100% en tu primer deposito desde $100, hasta $8,000, para apuestas deportivas. Registrate y revisa TyC +18
2. Registrate en 1xBet, deposita desde $100 y recibe bono 100% para apuestas deportivas. Aplican TyC +18
3. Tu primer deposito en 1xBet puede tener bono 100% (hasta $8,000) en apuestas deportivas. Revisa condiciones. +18 TyC
4. Futbol y mas en 1xBet: crea tu cuenta, deposita desde $100 y activa tu bono de primer deposito. Aplican TyC +18
5. 1xBet tiene bono en tus primeros 4 depositos para apuestas deportivas. Registrate y lee los TyC. Juega responsable +18
6. Antes de depositar en 1xBet, revisa el bono de primer deposito y sus requisitos de apuesta. Registrate +18 TyC
7. (con código) Registrate en 1xBet con el codigo DIRBON, deposita desde $100 y recibe bono 100% para apuestas deportivas. +18 TyC

## 8. Configuración técnica propuesta (solo tras aprobación)
1. Crear la campaña en RevOps Console (marca 1xBet, canal SMS, oferta oficial, horario 10:00–20:00, tope de contactos del piloto, límite de SMS por persona).
2. Cargar la lista como importación nueva, revisar duplicados y teléfonos inválidos antes de activar.
3. Cargar las plantillas (el validador de la base las revisa) y el enlace de seguimiento.
4. Activar con el tope del piloto y revisar las primeras decenas de mensajes antes de liberar el resto.
Cada paso se muestra al CAIO antes de ejecutarse.

## 9. Pendientes que necesito del CAIO
- Evento que paga el CPA, tipo de cambio de pago y significado de "sin piso" en el rev share.
- Qué otorga el código DIRBON.
- Lista: archivo, tamaño, origen y consentimiento.
- Confirmación de permiso/autorización de 1xBet para México (puerta legal).
- Topes: piloto propuesto de 5,000 SMS (≈ $150); el CAIO pidió "ilimitado" por ahora: se recomienda mantener el tope del piloto y subirlo con aprobación explícita.
