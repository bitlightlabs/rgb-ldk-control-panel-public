# Release Workflow

This document explains the current tag-based CI/CD release pipeline in `.github/workflows/release.yml`.

---

## Triggers

| Event | Condition | What happens |
|-------|-----------|--------------|
| Push a `v*` tag | Tag push | `build` + `release` |

---

## Jobs

### 1. `build`

Builds the Tauri desktop app in parallel across three platforms:

| Platform | Runner | Build target | Artifacts |
|----------|--------|--------------|-----------|
| macOS | `macos-14` | `universal-apple-darwin` | `.dmg` |
| Linux | `ubuntu-22.04` | default | `.deb`, `.rpm`, `.AppImage` |
| Windows | `windows-latest` | default | `.msi`, `.exe` |

Artifacts are uploaded as `binaries-{platform}` and used by the `release` job.

#### macOS signing

The macOS build uses local code signing (no notarization). Required secrets:

- `APPLE_CERTIFICATE` - base64-encoded `.p12` certificate
- `APPLE_CERTIFICATE_PASSWORD` - certificate password
- `APPLE_SIGNING_IDENTITY` - signing identity string

### 2. `release`

> Condition: tag push matching `v*`.

Creates a **draft release** in the **current repository**.

Main steps:
1. Download and merge all `binaries-*` artifacts.
2. Collect files matching `RGB*` into `release-assets/` (spaces replaced with `_`).
3. Generate `release-assets/checksum.txt` with SHA-256 hashes.
4. Reuse the pushed tag from `GITHUB_REF` as `TAG_NAME`.
5. Generate `release-body.md` (downloads table + checksums).
6. Create GitHub release with:
   - `draft: true`
   - `prerelease: false`
   - `tag_name: ${{ env.TAG_NAME }}`

Implementation note:
- The workflow currently contains duplicated `Generate release body from template` and `Display Generated Release Body` steps. This does not change the final release content, but both step pairs run.

---

## Required Secrets

| Name | Type | Purpose | Used by |
|------|------|---------|---------|
| `APPLE_CERTIFICATE` | Secret | macOS signing cert (base64) | build (macOS) |
| `APPLE_CERTIFICATE_PASSWORD` | Secret | Cert password | build (macOS) |
| `APPLE_SIGNING_IDENTITY` | Secret | Signing identity | build (macOS) |

---

## How to Release

1. Ensure your code is ready on `main`.
2. Create and push a semver tag:

   ```bash
   git checkout main
   git pull origin main
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Wait for GitHub Actions to finish (`build` + `release`).
4. Open the repository's **Releases** page.
5. Review the generated draft release and publish it manually.

### Tag naming

| Scenario | Format | Example |
|----------|--------|---------|
| Production release | `v{semver}` | `v0.2.0` |

---

## Release Body

The release body is generated during CI and includes:

- **Downloads table** - every packaged artifact grouped by platform type.
- **Checksums** - SHA-256 values from `release-assets/checksum.txt`.

To change the format, edit the inline heredoc in the `Generate release body from template` step in `.github/workflows/release.yml`.

