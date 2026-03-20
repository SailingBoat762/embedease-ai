# 功能详解

本文档是 README 的扩展，收录了四种 Agent 类型的详细说明、记忆系统介绍、后台管理模块一览以及完整的功能流程图。

---

## 🤖 四种 Agent 类型

### 1. 商品推荐助手（Product Agent）

**适用场景**：电商网站、商品导购、购物咨询

**核心能力**：
- 🔍 **智能搜索** — 理解自然语言需求，精准匹配商品
- 💰 **预算筛选** — 按价格区间自动过滤
- 📊 **商品对比** — 横向对比多款商品的参数和优劣
- 🏷️ **分类浏览** — 按品类、品牌、用途探索商品
- ⭐ **精选推荐** — 推荐热门、高评分商品
- 🔗 **相似推荐** — 找到类似款式或功能的替代品
- 🛒 **购买引导** — 提供购买链接和下单指引

**典型对话**：
- "帮我找 3000 元以内适合跑步的耳机" → 推荐运动耳机列表
- "索尼和 Bose 降噪耳机哪个好？" → 详细对比表格
- "这款有什么颜色？" → 查看商品详情和规格

---

### 2. FAQ 问答助手（FAQ Agent）

**适用场景**：客服系统、售后支持、常见问题解答

**核心能力**：
- 📚 **FAQ 检索** — 从知识库快速找到最相关的答案
- 🎯 **精准匹配** — 理解问题意图，匹配最佳答案
- 💬 **多轮澄清** — 问题不明确时主动追问
- 👨‍💼 **人工转接** — 无法回答时引导人工客服

**典型对话**：
- "如何退货？" → 返回退货政策和流程
- "发货需要多久？" → 查找物流相关 FAQ
- "会员有什么优惠？" → 展示会员权益说明

---

### 3. 知识库助手（KB Agent）

**适用场景**：企业内部知识库、文档检索、技术支持

**核心能力**：
- 📖 **文档检索** — 从海量文档中找到相关内容
- 🔎 **语义搜索** — 理解查询意图，不局限于关键词
- 📌 **引用来源** — 回答时标注文档出处
- 🎓 **知识整合** — 综合多个文档给出完整答案

**典型对话**：
- "如何配置 SSL 证书？" → 从技术文档中检索步骤
- "公司的报销流程是什么？" → 查找内部制度文档
- "这个 API 怎么调用？" → 返回 API 文档和示例

---

### 4. 自定义助手（Custom Agent）

**适用场景**：特殊业务需求、混合场景、实验性功能

**可自定义项**：
- **知识源**：绑定任意已有的 KnowledgeConfig（商品库 / FAQ / 向量文档 / 混合源）
- **工具能力**：多选"搜索/查询/比较/筛选/FAQ 搜索/知识库搜索"等能力组合
- **中间件策略**：独立控制 16 个中间件（TODO 规划、上下文压缩、模型重试、模型降级、工具重试、记忆系统等）
- **提示词 & 开场白**：自带模板，可按业务编辑系统提示、欢迎语、推荐问题
- **渠道策略**：嵌入组件和客服面板可独立控制展示、按钮、唤起动作

---

## 🧠 智能记忆系统

| 类型 | 功能 | 示例 |
|------|------|------|
| **👤 用户画像** | 记住用户的偏好和习惯 | 记住"喜欢苹果品牌"、"预算通常在 3000 左右" |
| **📝 事实记忆** | 存储对话中的关键事实 | 记住"上次看过索尼 XM5" |
| **🕸️ 知识图谱** | 建立实体之间的关联 | 关联"用户 → 喜欢 → 降噪耳机" |

---

## 🔧 后台管理模块

| 模块 | 功能 |
|------|------|
| **🎯 快速配置** | 可视化向导，3 步完成 Agent 配置（推荐新手使用） |
| **🤖 Agent 配置** | 单 Agent 模式配置，设置提示词、工具、中间件 |
| **🔀 编排配置** | 多 Agent 编排模式，Supervisor 路由与子 Agent 管理 |
| **🎭 技能管理** | AI 智能生成技能，动态注入 Agent |
| **📝 提示词管理** | 统一管理系统提示词模板 |
| **🕷️ 爬虫管理** | 自动从网站抓取商品信息（支持 SPA） |
| **💬 会话管理** | 查看所有对话记录、用户信息、消息统计 |
| **👤 用户管理** | 用户列表、画像查看 |
| **⚙️ 设置中心** | LLM 配置、系统参数、模式切换 |
| **👨‍💼 客服工作台** | 人工客服介入、企业微信通知、消息编辑、撤回、重新生成 |

---

## 📊 功能流程图

### 用户侧完整流程

```mermaid
graph TD
    Start[用户访问网站] --> Entry{访问入口}

    Entry -->|Web 界面| Web[打开对话界面]
    Entry -->|嵌入组件| Embed[悬浮窗弹出]

    Web --> Greeting[显示开场白]
    Embed --> Greeting

    Greeting --> Questions[推荐问题按钮]
    Questions --> UserInput[用户输入需求]

    UserInput --> AgentProcess{Agent 处理}

    AgentProcess --> ToolCall[调用工具]

    ToolCall --> Search[搜索商品]
    ToolCall --> Filter[价格筛选]
    ToolCall --> Compare[商品对比]
    ToolCall --> FAQ[FAQ 查询]
    ToolCall --> KB[知识库检索]

    Search --> Result[展示结果]
    Filter --> Result
    Compare --> Result
    FAQ --> Result
    KB --> Result

    Result --> ProductCard[商品卡片 / 时间线]

    ProductCard --> UserAction{用户操作}

    UserAction -->|继续提问| UserInput
    UserAction -->|购买| End[获取购买链接]
    UserAction -->|需要人工| Handoff[转人工客服]

    Handoff --> Notify[企业微信通知]
    Notify --> SupportChat[人工对话]
    SupportChat --> End

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style AgentProcess fill:#fff4e1
```

---

### 管理侧完整流程

```mermaid
graph TD
    Admin[管理员登录] --> Dashboard[管理后台首页]

    Dashboard --> QuickSetup[快速配置]
    Dashboard --> ModeMgmt[模式管理]
    Dashboard --> SystemMgmt[系统管理]
    Dashboard --> SupportMgmt[客服管理]

    QuickSetup --> QS1[选择 Agent 类型]
    QS1 --> QS2[配置知识源]
    QS2 --> QS3[设置开场白]
    QS3 --> QSComplete[Agent 创建完成]

    ModeMgmt --> SingleMode[单 Agent 模式]
    ModeMgmt --> MultiMode[编排模式]

    SingleMode --> ConfigPrompt[配置提示词]
    SingleMode --> ConfigTools[选择工具类别]
    SingleMode --> ConfigMiddleware[中间件开关]

    MultiMode --> SupervisorConfig[Supervisor 配置]
    MultiMode --> SubAgentMgmt[子 Agent 管理]

    SystemMgmt --> SkillMgmt[技能管理]
    SystemMgmt --> CrawlerMgmt[爬虫管理]
    SystemMgmt --> Settings[设置中心]

    SupportMgmt --> ConvList[会话列表]
    SupportMgmt --> NotifyConfig[通知配置]

    ConvList --> TakeOver[接管会话]
    TakeOver --> WechatNotify[企业微信通知]
    TakeOver --> SupportReply[客服回复]

    style Admin fill:#e1f5e1
    style QSComplete fill:#e1f0ff
```

---

### 快速配置（Quick Setup）流程

```mermaid
graph TD
    Start[访问 /admin/quick-setup] --> HealthCheck{系统健康检查}

    HealthCheck -->|通过| Step1[步骤 1: 选择 Agent 类型]
    HealthCheck -->|失败| Error[显示错误提示]
    Error --> FixIssue[修复后重试]

    Step1 --> TypeSelect{选择类型}

    TypeSelect -->|商品推荐| Step2Product[步骤 2: 导入商品数据]
    TypeSelect -->|FAQ 问答| Step2FAQ[步骤 2: 添加 FAQ 条目]
    TypeSelect -->|知识库| Step2KB[步骤 2: 上传文档]
    TypeSelect -->|自定义| Step2Custom[步骤 2: 自定义配置]

    Step2Product --> Step3[步骤 3: 设置开场白 & 推荐问题]
    Step2FAQ --> Step3
    Step2KB --> Step3
    Step2Custom --> Step3

    Step3 --> Preview[预览效果]
    Preview --> Save[保存并激活 Agent]
    Save --> TestChat[测试对话]

    style Start fill:#e1f5e1
    style Save fill:#e1f0ff
```
