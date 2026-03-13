"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LLMCallClusterItem,
  LLMCallSubItem,
} from "@/hooks/use-timeline-reducer";
import type { Product } from "@/types/product";
import { TimelineReasoningItem } from "./TimelineReasoningItem";
import { TimelineContentItem } from "./TimelineContentItem";
import { TimelineProductsItem } from "./TimelineProductsItem";
import { TimelineTodosItem } from "./TimelineTodosItem";
import { TimelineContextSummarizedItem } from "./TimelineContextSummarizedItem";
import { useChatThemeOptional } from "../themes";

interface LLMCallClusterProps {
  item: LLMCallClusterItem;
  isStreaming?: boolean;
}

function renderNonProductSubItem(subItem: LLMCallSubItem, isStreaming: boolean) {
  switch (subItem.type) {
    case "reasoning":
      return (
        <TimelineReasoningItem
          key={subItem.id}
          item={{
            type: "assistant.reasoning",
            id: subItem.id,
            turnId: "",
            text: subItem.text,
            isOpen: subItem.isOpen,
            ts: subItem.ts,
          }}
          isStreaming={isStreaming}
        />
      );
    case "content":
      return (
        <TimelineContentItem
          key={subItem.id}
          item={{
            type: "assistant.content",
            id: subItem.id,
            turnId: "",
            text: subItem.text,
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

export function LLMCallCluster({ item, isStreaming = false }: LLMCallClusterProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  
  const theme = useChatThemeOptional();
  const themeId = theme?.themeId || "default";

  // 分离子项：内容、商品、推理、其他
  const contentItems = item.children.filter((c) => c.type === "content");
  const productItems = item.children.filter((c) => c.type === "products");
  const reasoningItems = item.children.filter((c) => c.type === "reasoning");
  const otherItems = item.children.filter(
    (c) => c.type !== "content" && c.type !== "products" && c.type !== "reasoning"
  );

  const hasReasoning = reasoningItems.length > 0;
  const isRunning = item.status === "running";

  return (
    <div className="flex flex-col gap-3">
      {/* 1. 推理过程 */}
      {hasReasoning && (
        <div className={cn(
          "rounded-xl overflow-hidden",
          themeId === "default" && "bg-zinc-50/80 dark:bg-zinc-800/40",
          themeId === "ethereal" && "bg-[var(--chat-surface-secondary)]",
          themeId === "industrial" && "bg-[var(--chat-surface-secondary)]"
        )}>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-xl",
              themeId === "default" && "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
              themeId === "ethereal" && "text-[var(--chat-text-secondary)] hover:opacity-80",
              themeId === "industrial" && "text-[var(--chat-text-secondary)] hover:opacity-80"
            )}
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
          >
            <Brain className="h-3.5 w-3.5" />
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className="text-xs font-medium">思考过程</span>
            {item.elapsedMs !== undefined && item.status !== "running" && (
              <span className="text-xs opacity-40">{item.elapsedMs}ms</span>
            )}
            <div className="ml-auto">
              {isReasoningExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-40" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              )}
            </div>
          </button>
          
          {isReasoningExpanded && (
            <div className="px-3 pb-3 space-y-3">
              {reasoningItems.map((child) => renderNonProductSubItem(child, isStreaming))}
            </div>
          )}
        </div>
      )}

      {/* 2. AI 回复内容 */}
      {contentItems.map((child) => renderNonProductSubItem(child, isStreaming))}

      {/* 3. 商品推荐 */}
      {productItems.length > 0 && (
        <div className={cn(
          "rounded-xl p-4",
          themeId === "default" && "bg-zinc-50/80 dark:bg-zinc-800/30",
          themeId === "ethereal" && "bg-[var(--chat-surface-secondary)]",
          themeId === "industrial" && "bg-[var(--chat-surface-secondary)]"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <span className={cn(
              "text-xs font-medium",
              themeId === "default" && "text-zinc-500 dark:text-zinc-400",
              themeId === "ethereal" && "text-[var(--chat-text-primary)]",
              themeId === "industrial" && "text-[var(--chat-text-primary)] uppercase tracking-wider"
            )}>
              推荐商品
            </span>
          </div>
          {productItems.map((child) => (
            <TimelineProductsItem
              key={child.id}
              item={{
                type: "assistant.products",
                id: child.id,
                turnId: "",
                products: child.type === "products" ? (child.products as unknown as Product[]) : [],
                ts: child.ts,
              }}
            />
          ))}
        </div>
      )}

      {/* 4. 其他项 */}
      {otherItems.map((child) => renderNonProductSubItem(child, isStreaming))}
    </div>
  );
}
