/**
 * Timeline 类型 - 从 SDK re-export + 本地覆盖和 legacy 别名
 *
 * 大部分类型直接使用 SDK 定义，仅覆盖涉及本地 Product/TodoItem 的子项类型。
 */

export type {
  ItemStatus,
  ReasoningSubItem,
  ContentSubItem,
  ContextSummarizedSubItem,
  TimelineItemBase,
  UserMessageItem,
  LLMCallClusterItem,
  ToolCallItem,
  ErrorItem,
  FinalItem,
  MemoryEventItem,
  SupportEventItem,
  GreetingItem,
  WaitingItem,
  SkillActivatedItem,
  TimelineItem,
  TimelineState,
  HistoryMessage,
  LLMCallSubItem,
  ToolCallSubItem,
} from "@embedease/chat-sdk";

// 使用本地 Product/TodoItem 类型的子项（覆盖 SDK 版本）
import type { Product } from "@/types/product";
import type { TodoItem } from "@/types/chat";

export interface ProductsSubItem {
  type: "products";
  id: string;
  products: Product[];
  ts: number;
}

export interface TodosSubItem {
  type: "todos";
  id: string;
  todos: TodoItem[];
  ts: number;
}

// ==================== 兼容旧组件的类型别名 ====================

export interface ReasoningItem {
  type: "assistant.reasoning";
  id: string;
  turnId: string;
  llmCallId?: string;
  text: string;
  isOpen: boolean;
  ts: number;
}

export interface ContentItem {
  type: "assistant.content";
  id: string;
  turnId: string;
  llmCallId?: string;
  text: string;
  ts: number;
}

export interface ProductsItem {
  type: "assistant.products";
  id: string;
  turnId: string;
  products: Product[];
  ts: number;
}

export interface TodosItem {
  type: "assistant.todos";
  id: string;
  turnId: string;
  todos: TodoItem[];
  ts: number;
}

export interface ContextSummarizedItem {
  type: "context.summarized";
  id: string;
  turnId: string;
  messagesBefore: number;
  messagesAfter: number;
  tokensBefore?: number;
  tokensAfter?: number;
  ts: number;
}
