# Arreglar el error del asistente cuando tu cuenta de OpenAI no tiene saldo

## Qué está pasando

El asistente está usando tu propia clave de OpenAI (modelo `gpt-5.4`) y OpenAI responde:

> "You have no credits remaining. Add credits to continue using the API."

Es decir: la clave es válida, pero la cuenta de OpenAI no tiene saldo. Una suscripción de ChatGPT Plus no da saldo de API; hay que añadir crédito en la sección de facturación de platform.openai.com.

Además, hoy ese fallo se ve como un error genérico porque:

- OpenAI devuelve ese aviso con el código 429 (el mismo que se usa para "demasiadas peticiones"), así que se reintenta 3 veces antes de fallar y tarda mucho.
- El mensaje llega dentro del flujo de texto y el chat no muestra el aviso claro ni el botón para reenviar con la IA incluida.

## Qué se va a cambiar

1. Detectar el caso "sin saldo" por el contenido de la respuesta de OpenAI (`insufficient_quota` / `credit_balance_exhausted`), no solo por el número de error.
2. No reintentar en ese caso: fallar al instante en vez de esperar tres intentos.
3. Mostrar en el chat un aviso claro: "Tu cuenta de OpenAI no tiene saldo" con dos acciones: reenviar ese mensaje con la IA incluida, y abrir los ajustes del asistente para quitar la clave.
4. Mismo tratamiento claro para clave rechazada y modelo no válido.
5. En los ajustes del asistente, avisar si el modelo elegido ya no está disponible en tu cuenta.

Mientras no haya saldo, el chat seguirá funcionando con la IA incluida al pulsar ese botón.

## Detalles técnicos

- `supabase/functions/ai-agent/index.ts`: en la rama de clave propia, pasar `maxRetries: 0` a `streamText` y ampliar el `onError` para clasificar por `error.data.error.type/code` (`insufficient_quota`, `invalid_api_key`, `model_not_found`) además del `statusCode`, devolviendo los códigos existentes `NO_CREDIT`, `INVALID_KEY`, `MODEL_UNSUPPORTED`.
- `src/components/ChatPanel.tsx`: interpretar el marcador `__AI_ERROR__:<CODE>:<mensaje>` que llega en el stream y renderizar una tarjeta de error con los botones "Reenviar con la IA incluida" (reenvío con `forceLovable: true`, ya soportado en el backend) y "Ajustes del asistente".
- `src/components/AiSettingsDialog.tsx`: marcar el modelo guardado como no disponible si no aparece en la lista devuelta por `ai-models`.
- Sin cambios en notas, árbol, vistas ni en el layout móvil.
