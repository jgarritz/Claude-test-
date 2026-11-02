# Recorrido del flujo después del clic (solo lectura, 2026-11-02)

Alcance: páginas públicas de Vivento y Jubilee, en celular, sin registrarse, sin enviar formularios y sin seguir los enlaces de rastreo de Wintown (para no crear clics falsos). Autorizado por el CAIO el 2026-11-02.

## Lo que se vio (hechos)
| Paso | Vivento | Jubilee |
|---|---|---|
| Página de inicio | Catálogo de juegos (≈2,100) con botón REGÍSTRATE arriba | Igual |
| Ruta directa `/registro` | Existe: abre el formulario de inmediato | Existe: abre el formulario de inmediato |
| Formulario (paso 1 de 3) | 7 campos: teléfono, nombre, apellidos, fecha de nacimiento, correo, usuario, contraseña + captcha + opción "código de registro" | Igual |
| Alternativas | Registro con Google o Apple | Igual |
| Código de verificación | (no visible; el paso 2 requiere datos reales) | Por WhatsApp o SMS, con reenvío |
| Depósito mínimo | Tres cifras: $100 (preguntas frecuentes), $200 (promoción), $300 (términos generales) | Términos $300; terceros $50; efectivo en salas desde $20 |
| Métodos de depósito | Tarjeta (3D Secure), tiendas, SPEI (acreditación manual: se envía el comprobante por correo, hasta 24 h) | Tarjeta, SPEI (minutos), OXXO, CoDi, tiendas, efectivo en salas |
| Verificación de cuenta | Para retirar: verificación de cuenta y estado de cuenta bancario | Obligatoria para retirar: INE (frente y reverso), comprobante de domicilio (≤3 meses) y reconocimiento facial (Incode) |
| Retiro mínimo | $100 | $100 (SPEI) |

## Lo que NO se pudo verificar
- A qué página llevan hoy los enlaces de rastreo (`.../ts/96144|96145/tsc?typ=r&amc=atp.wintown...`): se necesita verlo en el portal de Wintown o con una prueba controlada.
- Pasos 2 y 3 del registro y si la verificación de identidad bloquea el primer depósito o solo el retiro.
- Cuántos clics son automáticos o dudosos en el lado de Wintown.

## Referencia del embudo (Wintown, 1 al 25-oct)
10,150 clics → 184 registros (1.8%) → 103 verificados (56%) → 23 primeros depósitos (22% de los verificados) → ≈8 adquisiciones pagables.
La mayor fuga es del clic al registro (98% no se registra).

## Hallazgos y recomendaciones (por impacto)
1. **Enlace directo al registro (impacto alto, esfuerzo bajo, evidencia media: hipótesis).** Ambos sitios tienen `/registro`, que abre el formulario al instante. Si el enlace de rastreo cae hoy en la página de inicio (no verificado), la persona debe encontrar el botón entre un catálogo de juegos. Revisar en el portal de Wintown el destino de cada enlace y, si se puede elegir, apuntarlo a `/registro`.
2. **Mínimo de depósito frente al umbral del CPA (impacto alto, esfuerzo bajo).** El CPA exige más de $180 acumulados, pero el sitio de Vivento permite depositar desde $100: un depósito mínimo nunca califica (ya hay 3 clientes con $100). Los textos solo deben informar con exactitud la condición oficial de la promoción ($200 de mínimo en Vivento) y nunca presionar a depositar más.
3. **Depósito por SPEI en Vivento (impacto medio, evidencia media).** La acreditación es manual (comprobante por correo, hasta 24 h): es fricción grave para depósitos pequeños. Tarjeta con 3D Secure también genera rechazos.
4. **Verificación de identidad (impacto medio).** Es obligatoria para retirar (INE, domicilio, reconocimiento facial en Jubilee); no está confirmado si bloquea el primer depósito.
5. **Prueba controlada pequeña (≈5,000 primeros contactos) con el enlace a `/registro`** cuando el punto 1 esté listo, midiendo clic→registro en Wintown frente al enlace actual. Requiere autorización del CAIO (reanuda envío frío en bloque pequeño).

## Reglas
- Sin tácticas de presión para apostar más; respetar consentimiento, autoexclusión y juego responsable.
- No contactar a Wintown ni al proveedor sin autorización del CAIO.
