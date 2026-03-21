# macOS Signing

This document describes the signing inputs used by the current Tauri 2 release workflow.

## Current CI behavior

The workflow currently:

- builds on `macos-14`
- adds both Apple targets inside the same job
- signs macOS artifacts with a local `.p12` certificate
- does not perform notarization in CI

## Required CI secrets

- `APPLE_CERTIFICATE`: base64-encoded `.p12` signing certificate
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12`
- `APPLE_SIGNING_IDENTITY`: signing identity name shown by macOS keychain tools

## Local signing example

For a local signed build, export the same values and run:

```bash
export APPLE_CERTIFICATE="$(base64 < /path/to/DeveloperID_Application.p12)"
export APPLE_CERTIFICATE_PASSWORD="<p12-password>"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"

pnpm tauri build
```

The bundle identifier is currently `com.bitlight.rln`.

## Build outputs

Local macOS artifacts are typically written to:

- `src-tauri/target/release/bundle/macos/*.app`
- `src-tauri/target/release/bundle/dmg/*.dmg`

For CI universal builds, check the target-specific directories produced by the release workflow.

## Verifying signatures

```bash
codesign --verify --deep --strict --verbose=2 "src-tauri/target/release/bundle/macos/RGB Lightning Node.app"
spctl -a -t exec -vv "src-tauri/target/release/bundle/macos/RGB Lightning Node.app"
```

If `spctl` reports `accepted`, Gatekeeper recognizes the signature.

## Notes

- Notarization is not wired into the current CI workflow.
- If notarization is added later, this document should be updated together with `.github/workflows/release.yml`.
- If `base64 < file` is not available on your shell, `cat file | base64` is an acceptable substitute.

## Common issues

1. `no identity found`
   - `APPLE_SIGNING_IDENTITY` does not match the certificate common name, or the `.p12` / password pair is wrong.
2. `bundle format unrecognized, invalid, or unsuitable`
   - Verify you are checking the built `.app` bundle, not an intermediate file.
3. `CSSMERR_TP_NOT_TRUSTED`
   - Import the signing certificate correctly into the active keychain and confirm the private key is present.
