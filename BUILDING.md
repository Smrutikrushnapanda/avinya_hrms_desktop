# Avinya HRMS Monitor — Build & Release

## Prerequisites

- Node.js 20+
- npm

Native modules (`uiohook-napi`, `get-windows`) ship prebuilt binaries per
platform and are fetched at `npm install` time. **You cannot cross-build the
Windows installer from macOS** — always build on the target OS (or use CI
below).

## Local builds

```bash
npm install
npm run make   # runs electron-vite build && electron-builder
```

| OS | Output | Location |
|----|--------|----------|
| macOS | `Avinya HRMS Monitor-<ver>[-arm64].dmg` (x64 + arm64) | `release/` |
| Windows | `Avinya HRMS Monitor Setup <ver>.exe` (NSIS, x64) | `release/` |
| Linux | `Avinya HRMS Monitor-<ver>.AppImage` | `release/` |

### API base URL

The base URL is baked in at build time via `VITE_API_BASE_URL`:

- Unset (default) → `https://avinyahrms.duckdns.org` (production)
- Set in `.env`/`.env.local` → that value (e.g. `http://localhost:8080` for dev)

Do not commit a `.env` pointing at localhost, or installers will target the
wrong backend.

## CI releases (GitHub Actions)

`.github/workflows/build.yml` builds on native runners for every tag push and
manual dispatch:

- `macos-14` → both DMGs
- `windows-latest` → NSIS installer

Artifacts are uploaded for every run; when you push a `v*` tag, a GitHub
Release is created automatically with both installers attached.

### Make a release

```bash
git add -A && git commit -m "chore: release v0.2.0"
git push origin main
git tag v0.2.0
git push origin v0.2.0
```

Then grab the installers from the Release page.

### Fallback (no CI)

Build on a Windows machine/VM:

```bash
git clone https://github.com/Smrutikrushnapanda/avinya_hrms_desktop.git
cd avinya_hrms_desktop
npm install
npm run make
```

## Installing the app (no Apple Developer account)

The installers are unsigned, so macOS/Windows show a one-time warning. That's
expected — no Apple Developer account or paid certificate is required.

### macOS

1. Download the `.dmg` (choose `-arm64` on Apple Silicon, plain on Intel).
2. Open it and drag **Avinya HRMS Monitor** into the Applications folder.
3. Run the fix script (download it from the Release page or use this repo's):

   ```bash
   curl -L -o fix-macos.sh https://github.com/Smrutikrushnapanda/avinya_hrms_desktop/releases/latest/download/fix-macos.sh
   chmod +x fix-macos.sh
   ./fix-macos.sh
   ```

   That strips the quarantine flag and applies a local signature so macOS
   stops complaining, then launches the app.

### Windows

Run the `Setup` exe, then on the SmartScreen prompt click **More info** →
**Run anyway**. That's it.

## Notes

- Installers are unsigned: macOS shows "unidentified developer"
  (right-click → Open) and Windows shows a SmartScreen warning until code
  signing is configured.
- Icons: `build/icon.png` (mac), `build/icon.ico` (Windows, generated from
  the PNG). Regenerate with `png-to-ico` if you update the PNG.
