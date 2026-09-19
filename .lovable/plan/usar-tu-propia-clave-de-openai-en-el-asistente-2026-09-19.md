# Usar tu propia clave de OpenAI en el asistente

Cada usuario podrá guardar su clave de API de OpenAI y elegir modelo. Si hay clave, el chat consume tu cuenta de OpenAI; si no la hay, sigue funcionando con la IA incluida, igual que ahora.

## Ajustes del asistente

Dentro del panel de chat, un icono de ajustes abre un panel con:

- Campo para la clave de OpenAI (oculta al escribir; una vez guardada solo se muestra `sk-…4f2a`).
- Botón "Comprobar y guardar": valida la clave contra OpenAI antes de guardarla y avisa si es inválida.
- Selector de modelo, rellenado con los modelos de chat disponibles en tu propia cuenta.
- Botón "Quitar clave": borra la clave y vuelve a la IA incluida.
- Indicador en el chat: "Tu OpenAI · <modelo>" o "IA incluida".

Aviso visible: una suscripción de ChatGPT Plus no sirve; hace falta una clave de platform.openai.com con saldo propio.

## Comportamiento del chat

- Con clave guardada: la conversación (texto e imágenes) va a OpenAI con tu modelo elegido.
- Audio: se mantiene cuando el modelo elegido lo admite; si no, mensaje específico indicando que ese modelo no acepta audio.
- Errores de clave inválida, saldo agotado, límite alcanzado o modelo incompatible: cada caso con su mensaje propio y un botón para reenviar ese mismo mensaje con la IA incluida.
- El resto del chat no cambia: mismo contexto de notas, mismo tono y mismo comportamiento de solo lectura.

## Detalles técnicos

- Nueva tabla `user_ai_settings` (`user_id` PK → `auth.users`, `openai_api_key_encrypted`, `openai_key_last4`, `model`, `provider` = `openai | lovable`, timestamps), con GRANTs y RLS: cada usuario solo su fila. La clave cifrada nunca se selecciona desde el cliente; el cliente lee solo `provider`, `model` y `openai_key_last4`.
- Cifrado AES-GCM en Edge Function con un secreto de proyecto generado (`USER_KEY_ENCRYPTION_SECRET`); la clave nunca se guarda ni se devuelve en claro.
- Nuevas Edge Functions: `ai-key-save` (valida contra OpenAI, cifra y guarda), `ai-key-delete`, `ai-models` (modelos de chat de esa cuenta). Todas verifican el JWT y solo acceden a la fila del usuario autenticado.
- Se modifica `supabase/functions/ai-agent/index.ts`, la función que usa hoy `ChatPanel.tsx`; conserva exactamente el mismo contexto de notas, system prompt, streaming y comportamiento de solo lectura.
  - `provider = openai`: descifra la clave en servidor y llama a OpenAI con el modelo elegido.
  - `provider = lovable`: ruta actual por Lovable AI Gateway con `google/gemini-3.5-flash`.
  - El formato de streaming devuelto se mantiene compatible con el `useChat()` actual, sin duplicar la implementación del chat.
- Errores diferenciados (401 clave, 402/429 saldo o límite, 400 modelo incompatible, audio no soportado) devueltos con un código propio que el cliente traduce a mensaje y ofrece continuar con la IA incluida.
- Nuevo `src/components/AiSettingsDialog.tsx` y hook `src/hooks/useAiSettings.ts`; `ChatPanel.tsx` añade solo el botón de ajustes, el indicador de proveedor/modelo y la gestión del fallback.
- Sin cambios en árbol, vistas ni datos de notas. Móvil: solo el acceso a ajustes dentro del chat existente, sin tocar su layout.
