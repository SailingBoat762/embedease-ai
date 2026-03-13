#!/usr/bin/env bash
set -euo pipefail

# SDK 版本一致性检查
# 可作为 pre-commit hook 或 CI 步骤使用
#
# 用法:
#   ./scripts/check-sdk-version.sh        # 检查并报告
#   ./scripts/check-sdk-version.sh --fix  # 自动修复 CHAT_SDK_VERSION 常量

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

FE_SDK="$PROJECT_ROOT/frontend/packages/chat-sdk"
FE_REACT="$PROJECT_ROOT/frontend/packages/chat-sdk-react"
BE_SDK="$PROJECT_ROOT/backend/packages/langgraph-agent-kit"

FIX_MODE=false
[[ "${1:-}" == "--fix" ]] && FIX_MODE=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

get_json_version() {
  python3 -c "import json; print(json.load(open('$1'))['version'])"
}

# ── 读取版本号 ──
FE_VER=$(get_json_version "$FE_SDK/package.json")
REACT_VER=$(get_json_version "$FE_REACT/package.json")

BE_VER="N/A"
if [[ -f "$BE_SDK/pyproject.toml" ]]; then
  BE_VER=$(grep -E '^version\s*=' "$BE_SDK/pyproject.toml" | head -1 | sed 's/.*"\(.*\)".*/\1/')
fi

CONST_FILE="$FE_SDK/src/core/index.ts"
CONST_VER="N/A"
if [[ -f "$CONST_FILE" ]]; then
  CONST_VER=$(grep 'CHAT_SDK_VERSION' "$CONST_FILE" | sed 's/.*"\(.*\)".*/\1/')
fi

echo ""
echo "SDK 版本检查"
echo "════════════════════════════════════"
printf "  %-22s %s\n" "chat-sdk:" "$FE_VER"
printf "  %-22s %s\n" "chat-sdk-react:" "$REACT_VER"
printf "  %-22s %s\n" "langgraph-agent-kit:" "$BE_VER"
printf "  %-22s %s\n" "CHAT_SDK_VERSION:" "$CONST_VER"
echo "════════════════════════════════════"
echo ""

# ── 检查 ──
if [[ "$FE_VER" != "$REACT_VER" ]]; then
  echo -e "${RED}[FAIL]${NC} chat-sdk ($FE_VER) != chat-sdk-react ($REACT_VER)"
  ERRORS=$((ERRORS + 1))
fi

if [[ "$BE_VER" != "N/A" && "$FE_VER" != "$BE_VER" ]]; then
  echo -e "${YELLOW}[WARN]${NC} 前端 ($FE_VER) != 后端 ($BE_VER)"
fi

if [[ "$CONST_VER" != "N/A" && "$FE_VER" != "$CONST_VER" ]]; then
  if $FIX_MODE; then
    echo -e "${YELLOW}[FIX]${NC} CHAT_SDK_VERSION: $CONST_VER -> $FE_VER"
    sed -i '' "s/CHAT_SDK_VERSION = \"$CONST_VER\"/CHAT_SDK_VERSION = \"$FE_VER\"/" "$CONST_FILE"
  else
    echo -e "${RED}[FAIL]${NC} package.json ($FE_VER) != CHAT_SDK_VERSION ($CONST_VER)"
    echo "       运行 $0 --fix 可自动修复"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}[OK]${NC} 版本号一致: $FE_VER"
  exit 0
else
  echo ""
  echo -e "${RED}发现 $ERRORS 个版本不一致${NC}"
  exit 1
fi
