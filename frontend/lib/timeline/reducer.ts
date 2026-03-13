/**
 * Timeline 业务扩展 reducer
 *
 * 仅处理 3 个 app-specific support 事件，其余全部委托给 SDK 内置 reducer：
 * - support.message_withdrawn  标记消息已撤回
 * - support.message_edited     更新消息内容 + 可选删除关联消息
 * - support.messages_deleted   按 ID 批量删除消息
 */

import {
  composeReducers,
  updateItemById,
  type CustomReducer,
  type TimelineState,
} from "@embedease/chat-sdk";

const businessReducer: CustomReducer = (state, event) => {
  const evt = event as { type: string; payload?: Record<string, unknown> };

  switch (evt.type) {
    case "support.message_withdrawn": {
      const payload = evt.payload as {
        message_id: string;
        withdrawn_by: string;
        withdrawn_at: string;
      };
      const idx = state.indexById[payload.message_id];
      if (idx === undefined) return state;
      return updateItemById(state, payload.message_id, (item) => {
        if (item.type !== "user.message") return item;
        return {
          ...item,
          isWithdrawn: true,
          withdrawnAt: payload.withdrawn_at,
          withdrawnBy: payload.withdrawn_by,
        };
      });
    }

    case "support.message_edited": {
      const payload = evt.payload as {
        message_id: string;
        new_content: string;
        edited_by: string;
        edited_at: string;
        deleted_message_ids?: string[];
      };

      let newState = state;
      const idx = newState.indexById[payload.message_id];
      if (idx !== undefined) {
        newState = updateItemById(newState, payload.message_id, (item) => {
          if (item.type !== "user.message") return item;
          return {
            ...item,
            content: payload.new_content,
            isEdited: true,
            editedAt: payload.edited_at,
            editedBy: payload.edited_by,
          };
        });
      }

      if (payload.deleted_message_ids?.length) {
        const deletedSet = new Set(payload.deleted_message_ids);
        const timeline = newState.timeline.filter((item) => !deletedSet.has(item.id));
        const indexById: Record<string, number> = {};
        timeline.forEach((item, i) => { indexById[item.id] = i; });
        newState = { ...newState, timeline, indexById };
      }
      return newState;
    }

    case "support.messages_deleted": {
      const payload = evt.payload as { message_ids: string[] };
      if (!payload.message_ids?.length) return state;
      const deletedSet = new Set(payload.message_ids);
      const timeline = state.timeline.filter((item) => !deletedSet.has(item.id));
      const indexById: Record<string, number> = {};
      timeline.forEach((item, i) => { indexById[item.id] = i; });
      return { ...state, timeline, indexById };
    }

    default:
      return null;
  }
};

export const timelineReducer = composeReducers(businessReducer);
