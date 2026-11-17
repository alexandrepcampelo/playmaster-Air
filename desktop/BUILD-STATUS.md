# PlayMaster Air — Windows desktop build

This branch contains the initial Electron wrapper and the Windows NSIS packaging workflow.

## Build

GitHub Actions workflow: `.github/workflows/build-air-windows.yml`

Expected artifact: `PlayMaster-Air-Windows-Installer` containing the Windows `.exe` installer.

## Current limitations

The desktop wrapper is a packaging foundation only. The existing application still expects the PlayMaster API endpoints under `/api/`; the desktop wrapper currently returns HTTP 503 for those endpoints until a desktop-compatible backend is configured. Local media library integration, continuous playback validation, cue/deck routing, Voice Track, and Windows audio-device testing remain pending.

Do not treat the installer as production-ready until these integrations and Windows tests pass.
