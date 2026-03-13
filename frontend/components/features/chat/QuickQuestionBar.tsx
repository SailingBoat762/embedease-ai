"use client";

import { cn } from "@/lib/utils";

interface QuickQuestionItem {
  id: string;
  question: string;
}

interface QuickQuestionBarProps {
  questions: QuickQuestionItem[];
  onSelect: (question: string, id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickQuestionBar({
  questions,
  onSelect,
  disabled,
  className,
}: QuickQuestionBarProps) {
  if (!questions.length) return null;

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600",
        className
      )}
    >
      {questions.map((q) => (
        <button
          key={q.id}
          onClick={() => onSelect(q.question, q.id)}
          disabled={disabled}
          className={cn(
            "shrink-0 px-3 py-1.5 text-xs rounded-full",
            "bg-zinc-100 dark:bg-zinc-800",
            "text-zinc-600 dark:text-zinc-300",
            "hover:bg-zinc-200 dark:hover:bg-zinc-700",
            "transition-colors whitespace-nowrap",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {q.question}
        </button>
      ))}
    </div>
  );
}
