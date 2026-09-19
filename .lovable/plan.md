# Usar tu propia clave de OpenAI en el asistente

Cada usuario podrá guardar su clave de API de OpenAI y elegir modelo. Si hay clave, el chat consume tu cuenta de OpenAI; si no la hay, sigue funcionando con la IA incluida de Lovable, igual que ahora.

## Ajustes del asistente

Dentro del panel de chat, un icono de ajustes abre un pequeño panel con:

- Campo para la clave de OpenAI (se escribe oculta; una vez guardada solo se muestra algo como `sk-…4f2a`, nunca completa).
- Botón "Comprobar y guardar": valida la clave contra OpenAI antes de guardarla y avisa si es inválida.
- Selector de modelo: se rellena con los modelos de chat que tu propia cuenta tiene disponibles; se guarda tu elección.
- Botón "Quitar clave": borra la clave y vuelve a la IA incluida.
- Indicador en el chat: "Tu OpenAI · <modelo>" o "IA incluida".

Aviso visible: una suscripción de ChatGPT Plus no sirve; hace falta una clave de platform.openai.com con saldo propio.

## Comportamiento del chat

- Con clave guardada: la conversación (texto e imágenes) va a OpenAI con tu modelo elegido.
- Sin clave, clave inválida, sin saldo o error de OpenAI: mensaje claro del motivo y opción de continuar con la IA incluida en ese envío.
- El resto del chat no cambia: mismo contexto de notas, mismo tono y mismas respuestas de solo lectura.

## Detalles técnicos

- Nueva tabla `user_ai_settings` (`user_id` PK → `auth.users`, `openai_api_key_encrypted`, `openai_key_last4`, `model`, `provider` = `openai | lovable`, timestamps), con GRANTs y RLS: cada usuario solo su fila; la clave cifrada nunca se selecciona desde el cliente (el cliente lee una vista/columnas seguras: `provider`, `model`, `openai_key_last4`).
- La clave se cifra con AES-GCM en la Edge Function usando un secreto de proyecto generado (`USER_KEY_ENCRYPTION_SECRET`); en claro nunca se guarda ni se devuelve.
- Nuevas Edge Functions: `ai-key-save` (valida contra `https://api.openai.com/v1/models`, cifra y guarda), `ai-key-delete`, `ai-models` (lista los modelos de chat de la cuenta). Todas verifican el JWT del usuario y usan service role solo para leer/escribir su fila.
- `supabase/functions/chat/index.ts`: antes de llamar, lee los ajustes del usuario; si `provider = openai`, descifra la clave y llama a `https://api.openai.com/v1/chat/completions` con el modelo guardado (misma forma multimodal que ahora, `image_url` / texto); si no, mantiene la ruta actual del gateway de Lovable con `google/gemini-2.5-flash`. Los errores 401/429/402 de OpenAI se devuelven con mensaje propio al cliente.
- Nuevo componente `src/components/AiSettingsDialog.tsx` y un hook `src/hooks/useAiSettings.ts`; `ChatPanel.tsx` añade el botón de ajustes y el indicador de proveedor. Sin cambios en el árbol, vistas ni datos de notas.
- Móvil: solo el botón de ajustes dentro del chat existente; sin cambios de layout.
