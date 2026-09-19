# Arreglar el error del asistente cuando tu cuenta de OpenAI no tiene saldo

## Qué está pasando

El asistente está usando tu propia clave de OpenAI (modelo `gpt-5.4`) y OpenAI responde:

> "You have no credits remaining. Add credits to continue using the API."

Es decir: la clave es válida, pero la cuenta de OpenAI no tiene saldo. Una suscripción de ChatGPT Plus no da saldo de API; hay que añadir crédito en la sección de facturación de platform.openai.com.

Además, hoy ese fallo se ve como un error genérico porque:

- OpenAI devuelve ese aviso con el código 429 (el mismo que se usa para "demasiadas peticiones"), así que se reintenta 3 veces antes de fallar y tarda mucho.
- El mensaje llega dentro del flujo de texto y el chat no muestra el aviso claro ni el botón para reenviar con la IA incluida.

## Qué se va a cambiar

1. **Cambio automático a la IA incluida**: si tu clave de OpenAI falla por falta de saldo, límite o clave rechazada, el mensaje se responde igualmente con la IA gratuita incluida, sin que tengas que hacer nada.
2. Ese cambio se hace antes de empezar a escribir la respuesta, así no ves un error a medias: solo la respuesta, con una nota pequeña "Respondido con la IA incluida (tu cuenta de OpenAI no tiene saldo)".
3. Sin esperas: se detecta el caso al instante en lugar de reintentar tres veces contra OpenAI.
4. En los ajustes del asistente se muestra el último motivo del cambio, para que sepas si debes recargar saldo o revisar la clave.
5. Si el modelo elegido ya no está disponible en tu cuenta, también se avisa allí.

## Detalles técnicos

- `supabase/functions/ai-agent/index.ts`: en la rama de clave propia, `streamText` con `maxRetries: 0`.
- No se devuelve al cliente el stream de OpenAI hasta confirmar que la petición ha arrancado correctamente. Si antes del primer contenido falla por falta de saldo, rate limit, clave rechazada o modelo no disponible, se descarta esa respuesta y se ejecuta de inmediato la misma petición por Lovable AI Gateway (`google/gemini-3.5-flash`).
- Clasificación del fallo por `error.data.error.type/code` (`insufficient_quota`, `credit_balance_exhausted`, `invalid_api_key`, `model_not_found`) además del `statusCode`.
- Cuando hay fallback, el motivo (`NO_CREDIT`, `RATE_LIMIT`, `INVALID_KEY`, `MODEL_UNSUPPORTED`) viaja como metadata dentro del propio stream de respuesta, no en una cabecera HTTP.
- `src/components/ChatPanel.tsx`: lee esa metadata y muestra bajo esa respuesta una nota discreta, p. ej. "Respondido con la IA incluida · tu cuenta de OpenAI no tiene saldo".
- El proveedor configurado no cambia por un fallo puntual: el fallback afecta solo a ese envío; el indicador general sigue mostrando la configuración elegida.
- `src/components/AiSettingsDialog.tsx`: mostrar el último motivo de fallback y marcar el modelo guardado si deja de aparecer en la lista de `ai-models`.
- Sin cambios en notas, árbol, vistas ni en el layout móvil.
