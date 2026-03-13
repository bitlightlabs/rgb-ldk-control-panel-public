# macOS 签名与公证（Tauri）

本文针对当前仓库（Tauri 2）整理了可直接使用的 macOS 签名流程。

## 1. 前置条件

1. Apple Developer Program 账号（已开通）。
2. 在 Apple Developer 里有 `Developer ID Application` 证书。
3. 你已将证书导出为 `.p12`（带密码）。
4. 你的应用 `identifier` 已固定为当前值：`com.bitlight.rln`。

## 2. 本地打包签名（macOS）

在本机准备好环境变量后执行：

```bash
export APPLE_CERTIFICATE="$(base64 < /path/to/DeveloperID_Application.p12)"
export APPLE_CERTIFICATE_PASSWORD="<p12-password>"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"

# 二选一：公证方式 A（Apple ID）
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="<app-specific-password>"
export APPLE_TEAM_ID="<TEAMID>"

# 公证方式 B（App Store Connect API Key）
# export APPLE_API_ISSUER="<issuer-uuid>"
# export APPLE_API_KEY="<key-id>"
# export APPLE_API_KEY_PATH="/absolute/path/AuthKey_<key-id>.p8"

pnpm tauri build
```

产物默认在：

- `src-tauri/target/release/bundle/macos/*.app`
- `src-tauri/target/release/bundle/dmg/*.dmg`

## 3. 验证签名与公证结果

```bash
codesign --verify --deep --strict --verbose=2 "src-tauri/target/release/bundle/macos/RGB Lightning Node.app"
spctl -a -t exec -vv "src-tauri/target/release/bundle/macos/RGB Lightning Node.app"
```

`spctl` 输出里出现 `accepted` 通常表示通过 Gatekeeper 校验。

## 4. GitHub Actions secrets（已接入 release workflow）

已在 `.github/workflows/release.yml` 配置为双 macOS 架构发布：

- `macos-14` + `--target aarch64-apple-darwin`（Apple Silicon）
- `macos-13` + `--target x86_64-apple-darwin`（Intel）

以上两个 macOS job 都会使用以下签名/公证变量：

必需（签名）：

- `APPLE_CERTIFICATE`：p12 文件的 base64 内容
- `APPLE_CERTIFICATE_PASSWORD`：p12 密码
- `APPLE_SIGNING_IDENTITY`：Developer ID Application 证书名

公证方式 A（Apple ID）：

- `APPLE_ID`
- `APPLE_PASSWORD`（App 专用密码）
- `APPLE_TEAM_ID`

公证方式 B（API Key）：

- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_KEY_CONTENT`（`.p8` 文件 base64 内容）

说明：workflow 会在 macOS job 中将 `APPLE_API_KEY_CONTENT` 还原成临时 `AuthKey_*.p8` 文件并注入 `APPLE_API_KEY_PATH`。

## 5. 常见问题

1. `no identity found`
   - `APPLE_SIGNING_IDENTITY` 与证书 Common Name 不一致，或 p12 与密码不匹配。
2. `notarization failed`
   - Bundle ID / Team ID 不匹配，或 Apple ID 权限不足。
3. 本地 `base64` 兼容问题
   - 如果 `base64 < file` 不可用，用 `cat file | base64` 替代。
