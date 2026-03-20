"""创建管理员账号 CLI 脚本

用法:
    uv run --project backend python -m scripts.create_admin \
        --email admin@example.com \
        --password secret123 \
        --name "管理员" \
        --role super_admin
"""

import argparse
import asyncio
import sys


async def main() -> None:
    parser = argparse.ArgumentParser(description="创建管理员账号")
    parser.add_argument("--email", required=True, help="管理员邮箱")
    parser.add_argument("--password", required=True, help="管理员密码（至少8位）")
    parser.add_argument("--name", default="Admin", help="管理员昵称")
    parser.add_argument(
        "--role",
        choices=["admin", "super_admin"],
        default="super_admin",
        help="角色（默认 super_admin）",
    )
    args = parser.parse_args()

    if len(args.password) < 8:
        print("错误：密码至少需要 8 位", file=sys.stderr)
        sys.exit(1)

    # 初始化数据库
    from app.core.database import init_db, get_db_context

    await init_db()

    async with get_db_context() as db:
        from app.services.auth_service import AdminAuthService, AuthError

        svc = AdminAuthService(db)
        try:
            admin = await svc.create_admin(
                email=args.email,
                password=args.password,
                name=args.name,
                role=args.role,
            )
            print(f"✅ 管理员创建成功")
            print(f"   ID:    {admin.id}")
            print(f"   Email: {admin.email}")
            print(f"   Name:  {admin.name}")
            print(f"   Role:  {admin.role}")
        except AuthError as e:
            print(f"❌ 创建失败: {e.message}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
