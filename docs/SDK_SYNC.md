---
name: sdk-sync
description: embedease-sdk 代码同步指南。当修改 SDK 代码后需要同步到独立仓库时触发。
触发场景：
- 修改 frontend/packages/chat-sdk 或 chat-sdk-react
- 修改 backend/packages/langgraph-agent-kit
- 需要发布新版本 SDK
alwaysApply: false
---

# embedease-sdk 代码同步指南

本项目是 SDK 的源头仓库，SDK 代码同时维护在：
1. **本项目**：`frontend/packages/` 和 `backend/packages/`
2. **独立仓库**：https://github.com/congwa/embedease-sdk

## SDK 目录结构

```
embedease-ai/
├── frontend/packages/
│   ├── chat-sdk/           # 前端核心 SDK
│   └── chat-sdk-react/     # React 封装
└── backend/packages/
    └── langgraph-agent-kit/ # 后端 Python SDK
```

## 同步流程

### 1. 修改 SDK 代码

在本项目中直接修改 SDK 代码：
- `frontend/packages/chat-sdk/src/`
- `frontend/packages/chat-sdk-react/src/`
- `backend/packages/langgraph-agent-kit/src/`

### 2. 更新版本号

修改以下文件的版本号：
- `frontend/packages/chat-sdk/package.json` → `version`
- `frontend/packages/chat-sdk-react/package.json` → `version`
- `backend/packages/langgraph-agent-kit/pyproject.toml` → `version`

**注意**：chat-sdk 和 chat-sdk-react 保持版本号一致

### 3. 更新 CHANGELOG

在各包的 `CHANGELOG.md` 中添加变更记录：

```markdown
## [x.x.x] - YYYY-MM-DD

### Added
- 新增 xxx 功能

### Changed
- 修改 xxx 行为

### Fixed
- 修复 xxx 问题
```

### 4. 同步到独立仓库（使用自动化脚本）

```bash
# 同步到所有目标（embedease-sdk + Skill-Know）
./scripts/sync-sdk.sh

# 只同步到 embedease-sdk
./scripts/sync-sdk.sh --target sdk

# 只同步到 Skill-Know
./scripts/sync-sdk.sh --target skill-know

# 同步并打 tag
./scripts/sync-sdk.sh --tag v0.x.x

# 预览（不实际执行）
./scripts/sync-sdk.sh --dry-run
```

脚本会自动：
- 使用 rsync 同步源码（排除 `node_modules/`、`dist/`、`__pycache__/` 等）
- 检查版本号一致性
- 可选自动 commit + tag

### 4b. 版本号一致性检查（可单独运行）

```bash
./scripts/check-sdk-version.sh         # 检查版本号
./scripts/check-sdk-version.sh --fix   # 自动修复 CHAT_SDK_VERSION 常量
```

> **手动同步（已不推荐）**：
> 如仍需手动同步，可参考 `sync-sdk.sh` 中的 rsync 命令。

## 版本号规范

遵循 SemVer 语义化版本：

| 变更类型 | 版本号变化 | 示例 |
|----------|-----------|------|
| Bug 修复 | PATCH +1 | 0.1.16 → 0.1.17 |
| 新功能（向后兼容） | MINOR +1 | 0.1.16 → 0.2.0 |
| 破坏性变更 | MAJOR +1 | 0.1.16 → 1.0.0 |

## 双 Timeline 架构说明

本项目中存在两套 Timeline 实现：

| 来源 | 路径 | 说明 |
|------|------|------|
| 本地 | `lib/timeline/` | 包含业务特有的事件处理和类型 |
| SDK | `@embedease/chat-sdk` | 通用 timeline 核心 |

### 为什么本地 Timeline 还不能移除

1. **业务特有 reducer 逻辑**（`lib/timeline/reducer.ts`）：
   - `support.message_withdrawn` — 标记用户消息为已撤回
   - `support.message_edited` — 更新用户消息内容
   - `support.messages_deleted` — 按 ID 删除消息
   - `assistant.final` 推理转内容修复（SiliconFlow 模型兼容）

2. **应用专属类型**：`Product`、`TodoItem` 等业务类型

3. **工具标签**：本地 `getToolLabel` 包含中文工具名映射

### 迁移路径

1. 将 support 事件处理移入 SDK（通过 `composeReducers` 自定义 reducer）
2. `chat-store.ts` 改用 SDK 的 `historyToTimeline`
3. 组件类型导入迁移到 SDK 类型
4. 移除 `lib/timeline/`、`lib/timeline-utils.ts` 和 legacy adapter
5. 移除 `NEXT_PUBLIC_USE_NEW_CHAT_SDK` 特性开关

## 同步检查清单

- [ ] SDK 代码修改完成
- [ ] 版本号已更新（三处）—— 可用 `./scripts/check-sdk-version.sh` 验证
- [ ] CHANGELOG 已更新
- [ ] 本项目已提交
- [ ] 运行 `./scripts/sync-sdk.sh --tag vX.Y.Z` 同步并打 Tag
- [ ] 推送 embedease-sdk 到远程
