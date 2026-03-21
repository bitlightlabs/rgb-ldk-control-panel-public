# Release Workflow

This document describes the current `release` workflow in [`.github/workflows/release.yml`](./workflows/release.yml).

## Triggers

| Event | Condition | Result |
|-------|-----------|--------|
| Push to `main` | Branch push | `build` + `release-private` |
| Push tag | Tag matches `v*` | `build` + `release-public` |
| Pull request | Any PR | `build` only |

## Jobs

### `build`

Runs on every trigger and builds release artifacts for:

- macOS on `macos-14` using `--target universal-apple-darwin`
- Linux on `ubuntu-22.04`
- Windows on `windows-latest`

Artifacts are uploaded as `binaries-{platform}` for downstream release jobs.

### `release-private`

Runs only on pushes to `main`.

What it does:

1. Downloads all platform artifacts.
2. Collects bundled binaries into `release-assets/`.
3. Generates `checksum.txt` with SHA-256 hashes.
4. Creates a date-suffixed tag name from `package.json` version.
5. Generates a release body with download table and checksums.
6. Publishes a prerelease in the source repository with `GITHUB_TOKEN`.

### `release-public`

Runs only on tag pushes.

What it does:

1. Downloads all platform artifacts.
2. Collects bundled binaries into `release-assets/`.
3. Generates `checksum.txt` with SHA-256 hashes.
4. Reuses the pushed git tag as the release tag.
5. Publishes a non-prerelease release in the source repository.
6. Optionally publishes a draft release to `vars.RELEASE_REPO` when that variable is configured and differs from the source repository.

## Required secrets and variables

| Name | Type | Purpose |
|------|------|---------|
| `GITHUB_TOKEN` | Secret (automatic) | Build and release access in the source repository |
| `APPLE_CERTIFICATE` | Secret | Base64-encoded `.p12` signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Secret | Password for the signing certificate |
| `APPLE_SIGNING_IDENTITY` | Secret | macOS signing identity |
| `RELEASE_TOKEN` | Secret | Token used for the optional external release mirror |
| `RELEASE_PAT` | Secret | `GITHUB_TOKEN` override for the optional external release mirror |
| `RELEASE_REPO` | Variable | Optional external release repository in `owner/repo` format |

## Release checklist

1. Bump the version in `package.json` when preparing a new release.
2. Merge the release content to `main`.
3. Verify `build` passes on all target platforms.
4. For a tagged release, create and push a `v*` tag:

```bash
git checkout main
git pull origin main
git tag v0.2.0
git push origin v0.2.0
```

5. Review the generated release entry, attached artifacts, and checksums.
6. If `RELEASE_REPO` is configured, review and publish the mirrored draft release there as well.

## Notes

- The workflow currently uses local macOS signing only. It does not perform notarization.
- Release body formatting is generated inline in the workflow; update the heredoc there if the format needs to change.
