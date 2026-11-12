# Ficha económica por operador

Última actualización: 2026-10-26. Regla: no inventar valores. "Sin confirmar" = pendiente de contrato o de Wintown.

Nota: Vivento y Jubilee los opera la misma empresa legal (New Ads S.A. de C.V., con Atracciones y Emociones Vallarta S.A. de C.V.; mismo permiso SEGOB según sus sitios). Aun así, no asumir mismas reglas de CPA hasta confirmarlo por operador.

## Datos comunes (afiliación vía Wintown, partner 545116)
| Variable | Valor | Estado |
|---|---|---|
| Tarifa por SMS | $0.03 MXN | Dato del sistema (informe diario) |
| Costo de IA | ~$29 MXN del 1 al 21-oct | Dato del informe de octubre |
| Otros costos (proveedor, plataforma, tracking) | — | Falta |
| CPA en plataforma | $800 MXN, una vez por Customer ID y marca | Regla del sistema |
| CPA por contrato | "$30 USD escalado" (según correo del CAIO) | Sin confirmar; falta tipo de cambio |
| Umbral de depósito calificado | > $180 MXN acumulados desde el 1-oct-2026 | Igual en ambas marcas en el sistema; contrato por operador sin confirmar |
| Rev share | 40% del NGR mensual por marca; si es negativo paga $0, sin arrastre | Regla del sistema |
| Ventana de atribución | — | Falta |
| Reglas de aprobación / deduplicación | — | Falta |
| Periodo de conciliación | Wintown se sincroniza cada hora (NGR mensual) | Parcial; falta periodo de pago |
| Plazo de pago, penalizaciones | — | Falta |

## Vivento (advertiser 96144)
- Promoción oficial verificada el 2026-10-26: bono 100%, depósito mínimo $200, máximo $5,000, solo categoría "Juega con tu bono", rollover 25×, conversión máxima = bono, vigencia 9-jul a 31-dic-2026.
- No verificable en la página: cupo de 200, plazo de 10 días, una por usuario.
- Discrepancia: términos generales piden mínimo $300; la promoción $200; en los datos hay depósitos de $50–$150.
- Pregunta abierta: ¿el bono se activa con depósito único ≥ $200 o con depósito acumulado? La página oficial habla de un depósito mínimo de $200; el CAIO indicó acumulación; sin confirmación escrita.

## Jubilee (advertiser 96145)
- Funciones oficiales verificadas el 2026-10-26 en jubilee.mx/promociones ("Funcionalidades"): Bet Builder, Pago Anticipado (fútbol 2 goles, NFL 17, NBA 20, MLB 5, NHL 3, ligas elegibles), Bono Acumulador (3+ selecciones, momio mínimo 1.33, 5%–40%, tope $150,000 por boleto), Aumento de Cuotas.
- No se encontró bono de bienvenida ni "desafío de $500" en el sitio oficial. Sin verificación por Wintown.
- Depósito mínimo: términos oficiales dicen $300; Legalbet dice $50; los datos muestran depósitos de $50.

## Etapas del funnel: qué se puede medir hoy
| Etapa | ¿Medible? | Fuente |
|---|---|---|
| SMS enviado / aceptado por proveedor | Sí | sms_despachos (estado "enviada" = aceptado) |
| SMS entregado | No | Sin confirmaciones de entrega para SMS |
| Clic (humano vs automático) | Sí | enlaces_rastreo / clics_enlace |
| Registro, verificación, primer depósito | Sí | eventos_comerciales (Wintown) |
| Depósito calificado (> $180 acumulado) | Sí | Consulta validada (consultas_validadas.sql) |
| CPA aprobado / facturado / cobrado | No | Sin datos |

## Referencias medidas (periodo: 1 al 25-oct-2026, ambas marcas)
- Wintown: 10,150 clics → 184 registros → 103 verificados → 23 primeros depósitos. Sistema propio: ~10,825 clics humanos, 185 registros, 104 verificados.
- Adquisiciones pagables (> $180): Jubilee 4 (2 al 15-oct), Vivento 4 (3 hasta el 8-oct y 1 el 25-oct). Ingreso por CPA ≈ $6,400.
- Gasto en SMS del mes: al menos ~$15,000 (aproximado; sin datos de SMS del 14 al 22-oct en el sistema).
- NGR según Wintown: −$15,063 acumulado al 24-oct (ambas marcas), por lo que rev share de octubre = $0.
- Del 1 al 21-oct, los depósitos de Jubilee fueron de 10 clientes distintos y los de Vivento de 11.

## Estado de confirmaciones (actualizado 2026-10-29)
- Wintown: no respondió de forma clara a las preguntas (acumulación del bono de Vivento, mínimo de depósito $200 vs $300, "desafío de $500" de Jubilee, rechazos por INE); solo remitió a sus páginas. Decisión del CAIO: operar con la información oficial ya verificada (sitios de Vivento y Jubilee). Todo lo anterior sigue "sin confirmar por escrito"; no usar esas condiciones como hechos en textos ni cálculos.
- Proveedor de SMS: sin confirmación de entrega (sin aviso de entrega ni respuesta sobre los SMS "ambiguos"). "SMS entregado" sigue NO medible; los ambiguos (≈23,000 acumulados) se tratan como desconocidos y no se reenvían.

## 1xBet (nueva campaña, 2026-11-04) — datos dados por el CAIO
| Variable | Valor | Estado |
|---|---|---|
| Sitio y enlace de la promoción | 1-x.mx, `/mx/promotions/1st` | Verificado en la página oficial |
| CPA | 15 USD por **registro** (sin primer depósito) ≈ $278 MXN (tipo de cambio implícito ≈ 18.5) | Dado por el CAIO; tipo de cambio y aprobación de registros por confirmar |
| Rev share | 25%; un mes negativo NO resta (piso cero) | Dado por el CAIO |
| Punto de equilibrio | ≈ 9,250 SMS por registro | Estimación |
| Medición | Portal de afiliados sin API, exportación, postback ni sub-id | Medición manual |
| Permiso de operación en México | Confirmado por el CAIO | Sin copia del permiso archivada |
| Código promocional | DIRBON | Qué otorga: por confirmar |
| Ventana de atribución, validación de registros, plazo de pago | — | Falta |

### 1xBet — actualización 2026-11-12 (ficha de estructuras del portal, vigente desde 01/11/2026)
- Estructura "CPA 15$ + RS 25%" (USD). **CPA 15 USD (≈ $278 MXN, estimación a 18.5) solo si hay registro + depósitos ≥ 5 USD + apuestas ≥ 15 USD (mínimos por mes), con retención de 7 días.** Ya no es "por registro".
- Rev share 25% con "Negative commission carryover: Yes": el negativo se arrastra. Contradice lo dicho el 2026-11-04 ("no resta"); por confirmar con el programa. Mientras tanto no se cuenta.
- Código promocional (DIRBON): solo atribución, sin beneficio adicional al jugador. Ventana de atribución: 30 días (por confirmar desde cuándo cuenta).
- Equilibrio: 1 jugador que califica por ≈ 9,250 SMS. Referencia de octubre (otras marcas): 1 primer depósito por ≈ 32,700 SMS (≈ 3.5 veces peor).
- Permiso: oficios DGJS/0939/2024 y DGJS/0002/2020 (Entretenimientos Naturales), revisados y dados por OK por el CAIO el 2026-11-12; no verificados en fuentes públicas.
- Pendiente: tope de pérdida total del piloto, tipo de cambio de pago y fecha de pago.
