"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { htmlToMarkdown } from "@/components/rich-editor/helpers/markdown-converter";

interface EmbedRichInputProps {
  value: string;
  onChange: (markdown: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function EmbedRichInput({
  value,
  onChange,
  onSubmit,
  placeholder = "输入消息...",
  disabled = false,
  isLoading = false,
}: EmbedRichInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const updateContent = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const md = htmlToMarkdown(html);
    setIsEmpty(!md.trim());
    onChange(md);
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isEmpty && !isLoading) {
          onSubmit();
        }
      }
    },
    [isEmpty, isLoading, onSubmit]
  );

  useEffect(() => {
    if (!value && editorRef.current && editorRef.current.innerHTML !== "") {
      editorRef.current.innerHTML = "";
    }
  }, [value]);

  const canSubmit = !isEmpty || isLoading;

  return (
    <div className="embed-input-row">
      <div
        ref={editorRef}
        className="embed-input-editor"
        contentEditable={!disabled}
        onInput={updateContent}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <button
        className={`embed-send-btn ${isLoading ? "embed-send-btn-stop" : ""}`}
        onClick={onSubmit}
        disabled={!canSubmit || disabled}
      >
        {isLoading ? <Square size={14} /> : <ArrowUp size={14} />}
      </button>
    </div>
  );
}
