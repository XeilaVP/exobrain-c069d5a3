import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, ListChecks } from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const ToolbarBtn = ({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={`p-2.5 md:p-1 min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center rounded hover:bg-muted transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
    aria-label={title}
  >
    {children}
  </button>
);

const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || "Escribe aquí..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-editor outline-none w-full text-foreground font-body text-sm leading-relaxed min-h-[120px]",
      },
    },
  });

  // Sync external content changes (e.g., switching notes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-0.5 flex-wrap sticky top-0 z-10 py-1 -mx-1 px-1 backdrop-blur"
        style={{ backgroundColor: "hsl(var(--glass-strong) / 0.96)" }}
      >
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título">
          <Heading1 size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Subtítulo">
          <Heading2 size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          <Bold size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          <Italic size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()} title="Lista de tareas">
          <ListChecks size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">
          <Quote size={18} className="md:size-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()} title="Código">
          <Code size={18} className="md:size-3.5" />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
