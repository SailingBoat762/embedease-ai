"use client";

import { useState } from "react";
import { Loader2, Check, XCircle, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallItem, ItemStatus, ToolCallSubItem } from "@/hooks/use-timeline-reducer";
import type { Product } from "@/types/product";
import { TimelineProductsItem } from "./TimelineProductsItem";
import { TimelineTodosItem } from "./TimelineTodosItem";
import { TimelineContextSummarizedItem } from "./TimelineContextSummarizedItem";

interface TimelineToolCallItemProps {
  item: ToolCallItem;
}

const STATUS_CONFIG: Record<
  ItemStatus,
  { icon: React.ReactNode; className: string }
> = {
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: "text-zinc-500 dark:text-zinc-400",
  },
  success: {
    icon: <Check className="h-3.5 w-3.5" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: "text-red-500 dark:text-red-400",
  },
  empty: {
    icon: <Check className="h-3.5 w-3.5 opacity-60" />,
    className: "text-zinc-400 dark:text-zinc-500",
  },
};

function getStatusText(item: ToolCallItem): string {
  switch (item.status) {
    case "running":
      return `${item.label}中…`;
    case "success":
      return `${item.label}完成`;
    case "error":
      return `${item.label}失败`;
    case "empty":
      return `${item.label}无结果`;
    default:
      return item.label;
  }
}

function renderSubItem(subItem: ToolCallSubItem) {
  switch (subItem.type) {
    case "products":
      return (
        <TimelineProductsItem
          key={subItem.id}
          item={{
            type: "assistant.products",
            id: subItem.id,
            turnId: "",
            products: subItem.products as unknown as Product[],
            ts: subItem.ts,
          }}
        />
      );
    case "todos":
      return (
        <TimelineTodosItem
          key={subItem.id}
          item={{
            type: "assistant.todos",
            id: subItem.id,
            turnId: "",
            todos: subItem.todos,
            ts: subItem.ts,
          }}
        />
      );
    case "context_summarized":
      return (
        <TimelineContextSummarizedItem
          key={subItem.id}
          item={{
            type: "context.summarized",
            id: subItem.id,
            turnId: "",
            messagesBefore: subItem.messagesBefore,
            messagesAfter: subItem.messagesAfter,
            tokensBefore: subItem.tokensBefore,
            tokensAfter: subItem.tokensAfter,
            ts: subItem.ts,
          }}
        />
      );
    default:
      return null;
  }
}

export function TimelineToolCallItem({ item }: TimelineToolCallItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = STATUS_CONFIG[item.status];
  const showStats = item.status !== "running";
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-50/80 dark:bg-zinc-800/30">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-xl",
          hasChildren && "cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50",
          config.className
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <Wrench className="h-3.5 w-3.5 opacity-50" />
        {config.icon}
        <span className="text-xs font-medium">{getStatusText(item)}</span>
        {showStats && item.count !== undefined && (
          <span className="text-xs opacity-50">{item.count}项</span>
        )}
        {showStats && item.elapsedMs !== undefined && (
          <span className="text-xs opacity-40">{item.elapsedMs}ms</span>
        )}
        {item.error && (
          <span className="text-xs opacity-50 ml-auto">{item.error}</span>
        )}
        {hasChildren && (
          <span className="ml-auto">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-40" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            )}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="px-3 pb-3 space-y-3">
          {item.children.map((child) => renderSubItem(child))}
        </div>
      )}
    </div>
  );
}
