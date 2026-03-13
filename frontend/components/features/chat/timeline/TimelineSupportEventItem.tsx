"use client";

import { Headphones, MessageCircle, UserCheck, UserMinus } from "lucide-react";
import { MessageContent } from "@/components/prompt-kit/message";
import type { SupportEventItem } from "@/hooks/use-timeline-reducer";
import { cn } from "@/lib/utils";

interface TimelineSupportEventItemProps {
  item: SupportEventItem;
}

export function TimelineSupportEventItem({ item }: TimelineSupportEventItemProps) {
  if (item.eventType === "human_message" && item.content) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Headphones className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              人工客服
            </span>
            {item.operator && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {item.operator}
              </span>
            )}
          </div>
          <MessageContent
            markdown
            className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 sm:max-w-[75%]"
          >
            {item.content}
          </MessageContent>
        </div>
      </div>
    );
  }

  if (item.eventType === "human_mode") {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{item.message || "您的消息已发送给客服，请等待回复"}</span>
        </div>
      </div>
    );
  }

  if (item.eventType === "handoff_started") {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <UserCheck className="h-3.5 w-3.5" />
          <span>{item.message || "人工客服已接入"}</span>
        </div>
      </div>
    );
  }

  if (item.eventType === "handoff_ended") {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <UserMinus className="h-3.5 w-3.5" />
          <span>{item.message || "人工客服已结束服务"}</span>
        </div>
      </div>
    );
  }

  if (item.eventType === "connected") {
    return null;
  }

  return null;
}
