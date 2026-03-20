# EmbedeaseAI Agent 后端

基于 FastAPI + LangChain v1.2 + LangGraph 的智能 AI Agent 后端。

## 快速开始

```bash
# 1. 安装依赖
uv sync

# 2. 配置环境变量（仅需填 4 项 LLM 配置）
cp .env.example .env

# 3. 启动服务
uv run uvicorn app.main:app --reload --port 8000
```

完整部署说明见根目录 [README.md](../README.md)。

## 开发命令

```bash
# 启动（开发模式）
uv run uvicorn app.main:app --reload --port 8000

# 代码检查 + 自动修复
uv run ruff check --fix

# 运行测试
uv run pytest

# 导入示例数据
uv run python scripts/import_products.py

# 创建管理员账号
uv run python -m scripts.create_admin --email admin@example.com --password yourpassword

# 开启详细 Agent 日志调试
LOG_VERBOSE_AGENT=true uv run uvicorn app.main:app --reload --port 8000
```

## 日志配置

| 配置项 | 作用 | 默认值 |
|--------|------|--------|
| `LOG_VERBOSE_AGENT` | 输出 Agent/LLM 详细日志 | `false` |
| `LOG_SLOW_THRESHOLD_MS` | 慢调用阈值（超过则输出完整日志） | `3000` |
| `LOG_AGENT_FILE_ENABLED` | 启用 `agent.log` 分流 | `true` |

日志文件：`logs/app.log`（全量）、`logs/agent.log`（Agent 专用）

## 主要 API

```
GET  /health                              # 健康检查

POST /api/v1/auth/register                # 用户注册
POST /api/v1/auth/login                   # 用户登录
POST /api/v1/auth/refresh                 # 刷新 Token
POST /api/v1/admin/auth/login             # 管理员登录

POST /api/v1/users                        # 创建匿名用户
GET  /api/v1/users/{user_id}              # 获取用户信息

GET  /api/v1/conversations                # 获取会话列表
POST /api/v1/conversations                # 创建会话
GET  /api/v1/conversations/{id}/messages  # 获取消息列表

POST /api/v1/chat                         # 流式聊天（SSE）

GET  /api/v1/admin/...                    # 管理后台接口（需 Admin Token）
```

完整接口文档：启动后访问 `http://localhost:8000/docs`

## 目录结构

```
backend/
├── app/
│   ├── core/           # JWT、配置、数据库、依赖注入
│   ├── models/         # SQLAlchemy 数据模型
│   ├── schemas/        # Pydantic 请求/响应 Schema
│   ├── repositories/   # 数据访问层
│   ├── services/       # 业务逻辑
│   │   ├── agent/      #   Agent 核心（工具链 + 中间件矩阵）
│   │   ├── memory/     #   记忆系统
│   │   ├── skill/      #   技能系统
│   │   └── websocket/  #   WebSocket 服务
│   └── routers/        # API 路由
├── scripts/            # 运维脚本（import_products, create_admin）
├── data/               # 数据文件（SQLite DB、知识图谱）
└── tests/              # 测试
```

## 技术栈

- **FastAPI** + **uvicorn**: Web 框架
- **LangChain v1.2** + **LangGraph**: AI Agent 框架
- **SQLAlchemy** (async): ORM
- **SQLite** / **PostgreSQL**: 关系数据库
- **Qdrant**: 向量数据库
- **PyJWT** + **passlib[bcrypt]**: 认证
