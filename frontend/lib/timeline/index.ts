/**
 * Timeline 模块统一导出
 *
 * SDK 类型/函数直接 re-export，业务 reducer 从本地导出
 */

// SDK 公共 API（types, helpers, actions, history, compose）
export {
  // types
  type ItemStatus,
  type ReasoningSubItem,
  type ContentSubItem,
  type ContextSummarizedSubItem,
  type LLMCallSubItem,
  type ToolCallSubItem,
  type TimelineItemBase,
  type UserMessageItem,
  type LLMCallClusterItem,
  type ToolCallItem,
  type ErrorItem,
  type FinalItem,
  type MemoryEventItem,
  type SupportEventItem,
  type GreetingItem,
  type WaitingItem,
  type SkillActivatedItem,
  type TimelineItem,
  type TimelineState,
  type HistoryMessage,
  // helpers
  getToolLabel,
  registerToolLabels,
  createInitialState,
  insertItem,
  updateItemById,
  removeWaitingItem,
  // actions
  addUserMessage,
  addGreetingMessage,
  startAssistantTurn,
  clearTurn,
  endTurn,
  // history
  historyToTimeline,
  // compose
  composeReducers,
  type CustomReducer,
} from "@embedease/chat-sdk";

// 使用本地 Product/TodoItem 的子项类型（覆盖 SDK 版本）
export type { ProductsSubItem, TodosSubItem } from "./types";

// 业务扩展 reducer（处理 3 个 app-specific support 事件）
export { timelineReducer } from "./reducer";

// 兼容旧组件的 legacy 类型别名
export type {
  ReasoningItem,
  ContentItem,
  ProductsItem,
  TodosItem,
  ContextSummarizedItem,
} from "./types";
