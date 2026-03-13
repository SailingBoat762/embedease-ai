"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EditorContent } from "@tiptap/react";
import { ArrowUp, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo } from "react";
import { useRichEditor } from "@/components/rich-editor/use-rich-editor";
import { markdownToHtml } from "@/components/rich-editor/helpers/markdown-converter";
import "@/components/rich-editor/editor-styles.css";
import { useChatThemeOptional } from "@/components/features/chat/themes";

interface ChatRichInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  imageButton?: React.ReactNode;
}

export function ChatRichInput({
  value,
  onValueChange,
  onSubmit,
  placeholder = "输入消息...",
  disabled = false,
  isLoading = false,
  className,
  imageButton,
}: ChatRichInputProps) {
  const theme = useChatThemeOptional();
  
  const { editor, markdown } = useRichEditor({
    initialContent: value,
    placeholder,
    editable: !disabled,
  });

  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value !== lastExternalValue.current && value !== markdown) {
      lastExternalValue.current = value;
      if (editor && !editor.isDestroyed) {
        if (!value) {
          editor.commands.clearContent();
        } else {
          const html = markdownToHtml(value);
          editor.commands.setContent(html);
        }
      }
    }
  }, [value, markdown, editor]);

  useEffect(() => {
    if (markdown !== lastExternalValue.current) {
      lastExternalValue.current = markdown;
      onValueChange(markdown);
    }
  }, [markdown, onValueChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (markdown.trim() && !isLoading) {
          onSubmit();
        }
      }
    },
    [markdown, isLoading, onSubmit]
  );

  const canSubmit = markdown.trim().length > 0;

  const inputWrapperClass = useMemo(
    () => theme?.getClass("inputWrapper") || "chat-default-input-wrapper",
    [theme]
  );

  const sendButtonClass = useMemo(() => {
    const base = theme?.getClass("sendButton") || "chat-default-send-btn";
    if (canSubmit) {
      const active = theme?.getClass("sendButtonActive") || "chat-default-send-btn-active";
      return `${base} ${active}`;
    }
    return base;
  }, [theme, canSubmit]);

  return (
    <div
      className={cn(
        "flex flex-col",
        inputWrapperClass,
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <EditorContent
        editor={editor}
        className={cn(
          "chat-rich-editor flex-1 min-h-[40px] max-h-[200px] overflow-y-auto px-4 py-3",
          "prose prose-sm dark:prose-invert max-w-none",
          "focus-within:outline-none",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[24px]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-zinc-400",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        )}
      />
      
      <div className="flex items-center justify-end px-2 pb-2">
        <div className="flex items-center gap-1.5">
          {imageButton}
          <Button
            type="button"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              sendButtonClass
            )}
            onClick={onSubmit}
            disabled={!canSubmit || disabled}
          >
            {isLoading ? (
              <Square className="h-4 w-4" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
