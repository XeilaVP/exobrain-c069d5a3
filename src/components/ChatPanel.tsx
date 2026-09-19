import { useState, useRef, useEffect, useMemo } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { Send, X, Sparkles, Loader2, Image, Mic, MicOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

const CHAT_STORAGE_KEY = "exobrain-chat-history";

const loadInitialMessages = (): UIMessage[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
};

const AI_ERROR_PREFIX = "__AI_ERROR__:";

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forceLovable, setForceLovable] = useState(false);
  const lastUserTextRef = useRef("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { notes, categories } = useNotes();
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

  const notesContext = useMemo(
    () =>
      notes.map((note) => {
        const cat = categories.find((c) => c.id === note.categoryId);
        return {
          id: note.id,
          title: note.title,
          category: cat?.name || "Sin categoría",
          noteType: note.noteType,
          content: note.content.slice(0, 800),
          checklist: note.checklist.map((item) => ({ text: item.text, completed: item.completed })),
        };
      }),
    [notes, categories],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: {
          notesContext,
          image: attachedImage || undefined,
          audio: attachedAudio || undefined,
          forceLovable,
        },
      }),
    [session?.access_token, notesContext, attachedImage, attachedAudio, forceLovable],
  );

  const initialMessages = useMemo(loadInitialMessages, []);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
  } = useChat({
    transport,
    messages: initialMessages,
    onError: (err) => {
      console.error("Chat error:", err);
      const raw = err?.message || "";
      const match = raw.match(/"error"\s*:\s*"([^"]+)"/);
      toast.error(match ? match[1] : "Error del asistente. Inténtalo de nuevo.");
    },
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (error) {
      toast.error("Error al comunicarse con el asistente");
    }
  }, [error]);

  const handleImageAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedAudio(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Grabando audio...");
    } catch {
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !attachedImage && !attachedAudio) return;
    const text = input.trim() || (attachedImage ? "Describe la imagen adjunta" : "Escucha el audio adjunto");
    lastUserTextRef.current = text;
    setForceLovable(false);
    await sendMessage({ text });
    setInput("");
    setAttachedImage(null);
    setAttachedAudio(null);
  };

  const retryWithLovable = async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    setForceLovable(true);
    await sendMessage({ text });
    setForceLovable(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };


  const panelClasses = isMobile
    ? "fixed bottom-4 left-3 right-3 h-[70vh] surface-panel rounded-2xl flex flex-col overflow-hidden z-50"
    : "fixed bottom-6 right-6 w-96 h-[500px] surface-panel rounded-2xl flex flex-col overflow-hidden z-50";

  const toggleClasses = isMobile
    ? "fixed bottom-28 right-4 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity z-50"
    : "fixed bottom-8 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity z-50";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{
              top: -window.innerHeight + 120,
              left: -window.innerWidth + 80,
              right: 20,
              bottom: 20,
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.dataset.dragged === "1") {
                target.dataset.dragged = "";
                return;
              }
              setIsOpen(true);
            }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 4 || Math.abs(info.offset.y) > 4) {
                (document.activeElement as HTMLElement)?.blur?.();
              }
            }}
            className={`${toggleClasses} touch-none cursor-grab active:cursor-grabbing`}
          >
            <Sparkles size={isMobile ? 20 : 22} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{
              top: -window.innerHeight + 200,
              left: -window.innerWidth + 100,
              right: window.innerWidth - 100,
              bottom: window.innerHeight - 200,
            }}
            className={panelClasses}
          >
            {/* Header (drag handle) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between p-4 border-b border-border/60 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <Sparkles size={18} className="text-primary" />
                <h3 className="font-display font-semibold text-card-foreground text-sm">
                  Asistente AI
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (messages.length === 0) return;
                    if (confirm("¿Iniciar una nueva conversación?")) {
                      setMessages([]);
                      try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
                    }
                  }}
                  disabled={messages.length === 0}
                  className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles size={32} className="mx-auto mb-3 text-primary/40" />
                  <p className="text-sm font-body">Tu compañero de ideas.</p>
                  <p className="text-xs mt-1">
                    Pregúntame lo que sea: puedo buscar en internet, resumir temas y debatir contigo. No modifico tus notas.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm font-body ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-chat-ai text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.parts?.map((part, idx) => {
                      if (part.type === "text") {
                        return (
                          <div key={idx} className="prose prose-sm max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </motion.div>
              ))}

              {(status === "submitted" || status === "streaming") && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-chat-ai rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attached media preview */}
            {(attachedImage || attachedAudio) && (
              <div className="px-3 pb-1 flex items-center gap-2">
                {attachedImage && (
                  <img src={attachedImage} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                )}
                {attachedAudio && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mic size={12} /> Audio adjunto
                  </span>
                )}
                <button
                  onClick={() => { setAttachedImage(null); setAttachedAudio(null); }}
                  className="text-xs text-destructive hover:underline"
                >
                  Quitar
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/60 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex gap-1 shrink-0 self-end">
                  <button
                    onClick={handleImageAttach}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Adjuntar imagen"
                  >
                    <Image size={16} />
                  </button>
                  <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={isRecording ? "Detener grabación" : "Grabar audio"}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregunta, debate o pide ideas…"
                  rows={1}
                  className="flex-1 bg-background rounded-xl px-3.5 py-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground font-body focus:ring-1 focus:ring-ring resize-none max-h-[120px] overflow-y-auto"
                  disabled={status === "submitted" || status === "streaming"}
                />
                <button
                  onClick={onSubmit}
                  disabled={status === "submitted" || status === "streaming" || (!input.trim() && !attachedImage && !attachedAudio)}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
