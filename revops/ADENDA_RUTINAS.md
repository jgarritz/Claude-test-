# Adenda para el texto de las rutinas (pegar al final de las instrucciones de ambas rutinas)

Las rutinas de claude.ai las creó el CAIO desde la interfaz, por lo que solo él puede editarlas. Pegar este bloque al final del texto actual de "revision matutiva revops" y "revision vepertina revops".

```
PRINCIPIOS (obligatorios en cada revisión): primero los datos, después las conclusiones. Nunca inventes métricas. Separa siempre DATO OBSERVADO, ESTIMACIÓN e HIPÓTESIS. Indica el periodo analizado. Cuenta usuarios únicos, no solo transacciones. Separa adquisición, atribución y monetización. Evalúa rentabilidad después de costos. Etapas del embudo que NO se pueden medir hoy y debes declarar como "no medible": SMS entregado (solo existe aceptado por el proveedor), CPA aprobado, facturado y cobrado. Para CTR usa clics únicos / SMS aceptados y etiquétalo como aproximación. No presentes promociones de terceros como oficiales. Respeta consentimiento, privacidad, autoexclusión y juego responsable; no propongas tácticas para presionar a apostar más.

CAMBIOS EN PRODUCCIÓN VIGENTES (desde el 25-oct-2026 noche; detalle en revops/BITACORA_CAMBIOS.md): (1) limpieza de fríos activa en ambas marcas; (2) Vivento: primer contacto detenido (1,694 leads en espera); (3) carril caliente ENCENDIDO solo en Vivento: las etapas aprobado, solicitud_enviada y deposito_parcial se reservan antes que las frías (máx. 1/5 del lote); (4) existe la etapa deposito_parcial (acumulado <= $180) y 15 personas fueron reclasificadas; (5) textos de Jubilee: se retiraron los que prometían "$500 / desafío" (sin respaldo oficial) y se usan solo funciones oficiales (Pago Anticipado, Bono Acumulador, Bet Builder, Aumento de Cuotas); (6) textos de Vivento: se retiraron los que ligaban el bono con ruleta, bingo o casino en vivo (el bono aplica solo en "Juega con tu bono"); (7) los textos de depósito parcial de Vivento están desactivados. En cada revisión reporta: envíos por etapa y carril en la última hora, que no salgan SMS a clientes ya pagables (acumulado > $180), tasa de ambiguos, y si el volumen de Vivento sigue anormalmente bajo (hipótesis: poca cola de seguimientos).

FORMATO DE SALIDA: Resumen ejecutivo (máx. 5 conclusiones) · Indicadores (tabla) · Diagnóstico (qué funciona, qué no, qué datos faltan) · Economía (ingresos, costos, contribución, punto de equilibrio) · Hallazgos · Recomendaciones (por impacto, esfuerzo y nivel de evidencia) · Próximas decisiones. Cierra con un resumen de máximo 3 líneas para notificación push.

REGLA DE CAMBIOS: solo lectura. No modifiques nada; propón y espera autorización del CAIO.
```

---
## Actualización 2026-10-29 (pegar también al final de ambas rutinas)
```
CAMBIO EN PRODUCCIÓN (8) desde el 29-oct-2026: PAUSA DEL ENVÍO FRÍO por decisión del CAIO. Los leads fríos de Jubilee y Vivento (etapas intento_contacto, elegible y contactado; ≈145,000) están pausados con campana_leads.pendiente_activacion=true. Solo deben salir SMS de etapas calientes: interesado, calificado, solicitud_enviada, aprobado y deposito_parcial (≈6,000 SMS al día). No recomiendes reanudar el frío ni liberar la tanda 2 sin evidencia de depositantes nuevos; reporta cuántos SMS fríos salen por hora (más de 300 por hora = alerta). La evaluación formal de la tanda 1 del 28-oct dio 0 adquisiciones pagables de la carga nueva (1 depósito de $100 en Vivento); las adquisiciones pagables del mes (Jubilee 5, Vivento 4) son de la base anterior.
```
