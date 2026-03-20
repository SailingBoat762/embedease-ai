# 🤖 EmbedeaseAI Agent

<div align="center">

![演示动图](docs/agent0.gif)

**开箱即用的 AI 智能客服系统 — 一行代码嵌入任何网站，帮用户找到心仪商品**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.13-green?logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-v1.2-orange)](https://langchain.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)

</div>

---

## 📸 界面预览

| 产品落地页 | 聊天界面 | 管理后台 |
|-----------|---------|---------|
| ![落地页](docs/screenshots/landing-page.avif) | ![聊天界面](docs/screenshots/chat-interface.avif) | ![仪表盘](docs/screenshots/admin-dashboard.avif) |

| 快速配置向导 | 客服工作台 | 技能管理 |
|------------|---------|---------|
| ![快速配置](docs/screenshots/quick-setup.avif) | ![客服工作台](docs/screenshots/support-workbench.avif) | ![技能管理](docs/screenshots/skills-list.avif) |

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🤖 **多类型 Agent** | 商品推荐 / FAQ 问答 / 知识库 / 自定义，按场景选择 |
| 🧠 **智能记忆** | 用户画像 + 事实记忆 + 知识图谱，记住每个用户的偏好 |
| 🔌 **一行嵌入** | JS 脚本嵌入任意网站，右下角悬浮客服窗口 |
| 📱 **实时推送** | 匿名用户发起对话时，企业微信 / Webhook 即时推送 |
| 👨‍💼 **客服接管** | 人工客服一键接管 AI 会话，支持消息编辑、撤回、重新生成 |
| 🔀 **多 Agent 编排** | Supervisor 模式，多 Agent 协作与智能路由 |
| 🎭 **技能系统** | AI 智能生成技能，动态注入 Agent |
| 🛠️ **多 LLM 支持** | 一键切换 OpenAI / DeepSeek / SiliconFlow 等 |
| 🕷️ **网站爬虫** | 自动从网站抓取商品信息（支持 SPA） |

---

## 🚀 快速开始

### 方式一：Docker 一键部署（推荐）

```bash
git clone https://github.com/你的账号/embedeaseai-agent.git
cd embedeaseai-agent
./install.sh   # 交互式向导：选 LLM 提供商、填 API Key、自动启动
```

启动后访问：

| 地址 | 用途 |
|------|------|
| http://localhost:3000/admin/quick-setup | 🎯 首次配置（推荐从这里开始） |
| http://localhost:3000 | 💬 对话界面 |
| http://localhost:3000/admin | ⚙️ 管理后台 |
| http://localhost:8000/docs | 📄 API 文档 |

### 方式二：本地开发

```bash
# 启动依赖服务
docker compose up -d qdrant

# 后端
cd backend
cp .env.example .env        # 填入 LLM_API_KEY 等 4 项必填配置
uv sync
uv run uvicorn app.main:app --reload --port 8000

# 前端（新终端）
cd frontend
pnpm install
pnpm build:packages          # ⚠️ 首次必须执行，构建本地 SDK 包
pnpm dev
```

---

## ⚙️ 配置说明

编辑 `backend/.env`，**只需填这 4 项**即可启动：

```bash
LLM_PROVIDER=siliconflow
LLM_API_KEY=sk-your-key-here
LLM_BASE_URL=https://api.siliconflow.cn/v1
LLM_CHAT_MODEL=moonshotai/Kimi-K2-Thinking
```

### 支持的 LLM 服务商

| 服务商 | 推荐场景 | API Key 获取 |
|--------|---------|------------|
| **SiliconFlow** 🏆 | 国内首选，价格便宜 | https://cloud.siliconflow.cn |
| **DeepSeek** | 中文能力强 | https://platform.deepseek.com |
| **OpenAI** | 效果最好 | https://platform.openai.com |
| **Anthropic** | 长上下文 | https://console.anthropic.com |

### 常用可选配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `MEMORY_ENABLED` | 记忆系统 | `true` |
| `CRAWLER_ENABLED` | 网站爬虫 | `false` |
| `MINIO_ENABLED` | 图片上传 | `false` |
| `DATABASE_BACKEND` | 数据库类型 | `sqlite`（生产推荐 `postgres`）|

> 完整配置说明见 `backend/.env.example`

---

## 🔌 嵌入到你的网站

```bash
cd frontend && pnpm build:embed
# 产物：dist/embed/embedeaseai-chat.js
```

将文件上传到 CDN，然后在网站中引入：

```html
<script
  src="https://your-cdn.com/embedeaseai-chat.js"
  data-auto-init
  data-api-base-url="https://your-backend.com"
  data-title="商品推荐助手">
</script>
```

配置企业微信推送（可选），用户发起对话时实时通知客服：

```bash
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
```

> ⚠️ 跨域：确保 `backend/.env` 的 `CORS_ORIGINS` 包含你的网站域名

---

## 🛠️ 常用命令

```bash
# Docker 部署运维
docker compose -f docker-compose.prod.yml ps       # 查看状态
docker compose -f docker-compose.prod.yml logs -f  # 查看日志
docker compose -f docker-compose.prod.yml restart  # 重启
./scripts/backup.sh                                # 备份数据
./scripts/update.sh                                # 更新应用

# 本地开发
uv run uvicorn app.main:app --reload --port 8000   # 启动后端
pnpm dev                                            # 启动前端
uv run ruff check --fix                            # 后端代码检查
pnpm lint                                           # 前端代码检查
```

---

## ❓ 常见问题

<details>
<summary><b>启动报错 "Qdrant connection failed"</b></summary>

```bash
docker compose up -d qdrant   # 等待约 30 秒后重试
```
</details>

<details>
<summary><b>前端报错 "Cannot find module @embedease/chat-sdk"</b></summary>

```bash
cd frontend && pnpm build:packages
```
</details>

<details>
<summary><b>前端无法连接后端 / CORS 报错</b></summary>

在 `backend/.env` 添加：`CORS_ORIGINS=http://localhost:3000`，重启后端。
</details>

<details>
<summary><b>如何添加商品数据？</b></summary>

- **管理后台**：`/admin` → 商品管理
- **脚本导入**：`cd backend && uv run python scripts/import_products.py`
- **爬虫抓取**：管理后台 → 爬虫管理
</details>

<details>
<summary><b>如何切换 LLM 提供商？</b></summary>

修改 `backend/.env`（本地）或 `.env.docker`（Docker），重启服务。
</details>

<details>
<summary><b>数据在哪里？如何备份？</b></summary>

- SQLite：`backend/data/*.db`
- Qdrant：Docker volume `qdrant_data`
- 备份：`./scripts/backup.sh`
</details>

<details>
<summary><b>如何部署到生产环境？</b></summary>

1. 运行 `./install.sh`（自动完成所有配置）
2. 可选切换 PostgreSQL：`DATABASE_BACKEND=postgres`，加 `--profile postgres`
3. 配置 Nginx 反向代理和 SSL
</details>

---

## 📁 项目结构

```
embedeaseai-agent/
├── backend/                   # FastAPI 后端
│   ├── app/
│   │   ├── core/              # JWT、配置、依赖注入
│   │   ├── models/            # SQLAlchemy 数据模型
│   │   ├── services/
│   │   │   ├── agent/         # Agent 核心（工具链 + 中间件）
│   │   │   ├── memory/        # 记忆系统
│   │   │   └── websocket/     # WebSocket 服务
│   │   └── routers/           # API 路由
│   └── scripts/               # import_products, create_admin
├── frontend/                  # Next.js 前端
│   ├── app/
│   │   ├── admin/             # 管理后台
│   │   ├── chat/              # 用户聊天界面
│   │   └── support/           # 客服工作台
│   └── embed/                 # 嵌入式组件源码
├── scripts/                   # 运维脚本（backup / restore / update）
├── docker-compose.yml         # 开发环境
├── docker-compose.prod.yml    # 生产环境
├── install.sh                 # 一键安装向导
└── quick-start.sh             # 快速启动（已安装后使用）
```

---

## 📖 更多文档

- `docs/FEATURES.md` — 四种 Agent 类型详解、记忆系统、功能流程图
- `docs/BACKEND_ARCHITECTURE.md` — 后端架构详解
- `docs/FRONTEND_ARCHITECTURE.md` — 前端架构详解
- `docs/ENV_CONFIG.md` — 完整环境变量说明
- `http://localhost:8000/docs` — API 接口文档（启动后访问）

---

## 📄 许可证

MIT License

---

<div align="center">

**如果觉得有用，请给个 ⭐ Star 支持一下！**

</div>
