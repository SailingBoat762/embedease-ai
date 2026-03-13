#!/usr/bin/env bash
set -euo pipefail

# SDK 同步脚本
# 将 embedease-ai 中的 SDK 源码同步到所有消费方项目
#
# 用法:
#   ./scripts/sync-sdk.sh                       # 同步到所有目标
#   ./scripts/sync-sdk.sh --target sdk          # 只同步到 embedease-sdk
#   ./scripts/sync-sdk.sh --target skill-know   # 只同步到 Skill-Know
#   ./scripts/sync-sdk.sh --target mobile-mcp   # 只同步到 mobile-mcp
#   ./scripts/sync-sdk.sh --tag v0.3.0          # 同步后在 embedease-sdk 打 tag
#   ./scripts/sync-sdk.sh --dry-run             # 仅显示将执行的操作

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── 目标仓库路径 ──
SDK_REPO="${SDK_REPO:-$(dirname "$PROJECT_ROOT")/embedease-sdk}"
SKILL_KNOW_REPO="${SKILL_KNOW_REPO:-$(dirname "$PROJECT_ROOT")/Skill-Know}"
MOBILE_MCP_REPO="${MOBILE_MCP_REPO:-$(dirname "$(dirname "$PROJECT_ROOT")")/gitee/mobile-mcp}"

# ── SDK 源目录 ──
FE_SDK_SRC="$PROJECT_ROOT/frontend/packages/chat-sdk"
FE_REACT_SRC="$PROJECT_ROOT/frontend/packages/chat-sdk-react"
BE_SDK_SRC="$PROJECT_ROOT/backend/packages/langgraph-agent-kit"

# ── 解析参数 ──
TARGET="all"
TAG=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --target)  TARGET="$2"; shift 2 ;;
    --tag)     TAG="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      echo "用法: $0 [--target sdk|skill-know|mobile-mcp|all] [--tag vX.Y.Z] [--dry-run]"
      exit 0
      ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

# ── rsync 排除列表 ──
RSYNC_EXCLUDE=(
  --exclude='node_modules/'
  --exclude='dist/'
  --exclude='.turbo/'
  --exclude='__pycache__/'
  --exclude='*.pyc'
  --exclude='.pytest_cache/'
  --exclude='*.egg-info/'
)

sync_dir() {
  local src="$1" dst="$2" label="$3"
  if [[ ! -d "$src" ]]; then
    fail "源目录不存在: $src"
  fi
  if [[ ! -d "$(dirname "$dst")" ]]; then
    warn "目标父目录不存在: $(dirname "$dst")，跳过"
    return 1
  fi
  if $DRY_RUN; then
    info "[dry-run] rsync $src/ -> $dst/"
    return 0
  fi
  mkdir -p "$dst"
  rsync -av --delete "${RSYNC_EXCLUDE[@]}" "$src/" "$dst/"
  ok "$label 同步完成"
}

# ── 版本检查 ──
check_versions() {
  info "检查版本号一致性..."
  local fe_ver react_ver be_ver const_ver

  fe_ver=$(python3 -c "import json; print(json.load(open('$FE_SDK_SRC/package.json'))['version'])")
  react_ver=$(python3 -c "import json; print(json.load(open('$FE_REACT_SRC/package.json'))['version'])")

  if [[ -f "$BE_SDK_SRC/pyproject.toml" ]]; then
    be_ver=$(grep -E '^version\s*=' "$BE_SDK_SRC/pyproject.toml" | head -1 | sed 's/.*"\(.*\)".*/\1/')
  else
    be_ver="N/A"
  fi

  const_ver=$(grep 'CHAT_SDK_VERSION' "$FE_SDK_SRC/src/core/index.ts" 2>/dev/null | sed 's/.*"\(.*\)".*/\1/' || echo "N/A")

  info "  chat-sdk:        $fe_ver"
  info "  chat-sdk-react:  $react_ver"
  info "  langgraph-kit:   $be_ver"
  info "  CHAT_SDK_VERSION: $const_ver"

  local all_match=true
  if [[ "$fe_ver" != "$react_ver" ]]; then
    warn "chat-sdk ($fe_ver) != chat-sdk-react ($react_ver)"
    all_match=false
  fi
  if [[ "$be_ver" != "N/A" && "$fe_ver" != "$be_ver" ]]; then
    warn "前端 ($fe_ver) != 后端 ($be_ver)"
    all_match=false
  fi
  if [[ "$const_ver" != "N/A" && "$fe_ver" != "$const_ver" ]]; then
    warn "package.json ($fe_ver) != CHAT_SDK_VERSION ($const_ver)"
    all_match=false
  fi

  if $all_match; then
    ok "版本号一致: $fe_ver"
  else
    warn "版本号不一致，请手动确认"
  fi
}

# ── 同步到 embedease-sdk ──
sync_to_sdk() {
  if [[ ! -d "$SDK_REPO" ]]; then
    warn "embedease-sdk 仓库不存在: $SDK_REPO，跳过"
    return 0
  fi
  info "同步到 embedease-sdk ($SDK_REPO)..."
  sync_dir "$FE_SDK_SRC"   "$SDK_REPO/frontend/chat-sdk"             "chat-sdk -> SDK"
  sync_dir "$FE_REACT_SRC" "$SDK_REPO/frontend/chat-sdk-react"       "chat-sdk-react -> SDK"
  sync_dir "$BE_SDK_SRC"   "$SDK_REPO/backend/langgraph-agent-kit"   "langgraph-agent-kit -> SDK"
}

# ── 同步到 Skill-Know ──
sync_to_skill_know() {
  if [[ ! -d "$SKILL_KNOW_REPO" ]]; then
    warn "Skill-Know 仓库不存在: $SKILL_KNOW_REPO，跳过"
    return 0
  fi
  info "同步到 Skill-Know ($SKILL_KNOW_REPO)..."
  sync_dir "$FE_SDK_SRC"   "$SKILL_KNOW_REPO/frontend/packages/chat-sdk"       "chat-sdk -> Skill-Know"
  sync_dir "$FE_REACT_SRC" "$SKILL_KNOW_REPO/frontend/packages/chat-sdk-react" "chat-sdk-react -> Skill-Know"

  if [[ -d "$SKILL_KNOW_REPO/backend/packages" ]]; then
    sync_dir "$BE_SDK_SRC" "$SKILL_KNOW_REPO/backend/packages/langgraph-agent-kit" "langgraph-agent-kit -> Skill-Know"
  fi
}

# ── 同步到 mobile-mcp ──
sync_to_mobile_mcp() {
  if [[ ! -d "$MOBILE_MCP_REPO" ]]; then
    warn "mobile-mcp 仓库不存在: $MOBILE_MCP_REPO，跳过"
    return 0
  fi
  info "同步到 mobile-mcp ($MOBILE_MCP_REPO)..."
  sync_dir "$FE_SDK_SRC"   "$MOBILE_MCP_REPO/frontend/packages/chat-sdk"       "chat-sdk -> mobile-mcp"
  sync_dir "$FE_REACT_SRC" "$MOBILE_MCP_REPO/frontend/packages/chat-sdk-react" "chat-sdk-react -> mobile-mcp"

  if [[ -d "$MOBILE_MCP_REPO/agent-app/packages" ]]; then
    sync_dir "$BE_SDK_SRC" "$MOBILE_MCP_REPO/agent-app/packages/langgraph-agent-kit" "langgraph-agent-kit -> mobile-mcp"
  fi
}

# ── 打 tag ──
apply_tag() {
  if [[ -z "$TAG" ]]; then return 0; fi
  if [[ ! -d "$SDK_REPO/.git" ]]; then
    warn "embedease-sdk 不是 git 仓库，跳过 tag"
    return 0
  fi
  if $DRY_RUN; then
    info "[dry-run] git tag $TAG in $SDK_REPO"
    return 0
  fi
  info "在 embedease-sdk 打 tag: $TAG"
  (
    cd "$SDK_REPO"
    git add .
    git commit -m "chore: 同步 SDK $TAG" || true
    git tag "$TAG"
    ok "已创建 tag: $TAG"
    echo ""
    info "推送到远程："
    echo "  cd $SDK_REPO && git push origin main && git push origin $TAG"
  )
}

# ── 主流程 ──
echo ""
info "═══════════════════════════════════════"
info " SDK 同步脚本"
info "═══════════════════════════════════════"
echo ""

check_versions
echo ""

case "$TARGET" in
  sdk)
    sync_to_sdk
    ;;
  skill-know)
    sync_to_skill_know
    ;;
  mobile-mcp)
    sync_to_mobile_mcp
    ;;
  all)
    sync_to_sdk
    echo ""
    sync_to_skill_know
    echo ""
    sync_to_mobile_mcp
    ;;
  *)
    fail "未知目标: $TARGET (可选: sdk, skill-know, mobile-mcp, all)"
    ;;
esac

echo ""
apply_tag
echo ""
ok "同步完成！"
