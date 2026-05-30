# Desktop App Guide

This guide explains how to run and build the GJS RailForge Launcher desktop app.

## What The Desktop App Does

The desktop app is an Electron + Next.js launcher/store for MSTS and Open Rails digital assets. Users can:

- Login/register using the same backend API.
- Browse store assets.
- Download purchased/free assets.
- Track download progress.
- Install assets into a local MSTS/Open Rails folder.
- Manage installed assets.
- Configure API URL and download/install paths.
- Build a Windows EXE installer.

## Desktop App Folder

Main folder:

```text
desktop/
```

Important parts:

- `desktop/electron/` - Electron native app logic.
- `desktop/renderer/` - Next.js UI shown inside Electron.
- `desktop/package.json` - scripts and EXE build configuration.

## Required Services

Start backend first:

```bash
cd backend
.venv\Scripts\activate
python manage.py runserver
```

Backend API:

```text
http://localhost:8000/api
```

The desktop app uses:

```env
GJS_RAILFORGE_API_URL=http://localhost:8000/api
```

## Install Desktop Dependencies

```bash
cd desktop
npm install
```

## Run Desktop App In Development

```bash
cd desktop
npm run dev
```

This command starts:

- Next.js renderer on `http://localhost:3010`
- Electron desktop window connected to that renderer

## Desktop App Screens

| Screen | Use |
| --- | --- |
| Home | Launcher overview. |
| Store | Browse available MSTS/Open Rails assets. |
| Downloads | See download progress and downloaded files. |
| Installed | Manage installed assets. |
| Settings | Configure API URL, download folder, and install paths. |
| Login | Login/register with backend account. |
| About | App information. |

## Build Desktop App

Build renderer and Electron files:

```bash
cd desktop
npm run build
```

## Build Windows EXE Installer

```bash
cd desktop
npm run dist
```

Installer output appears in:

```text
desktop/release/
```

Expected installer name:

```text
GJS-RailForge-Launcher-1.0.0-Setup.exe
```

## Build Portable EXE

```bash
cd desktop
npm run dist:portable
```

## Important Desktop Files

| File | Use |
| --- | --- |
| `desktop/electron/main.ts` | Opens and controls the Electron window. |
| `desktop/electron/preload.ts` | Securely exposes desktop functions to the renderer UI. |
| `desktop/electron/download-manager.ts` | Handles asset download progress and resume logic. |
| `desktop/electron/installer.ts` | Installs/uninstalls downloaded asset files locally. |
| `desktop/electron/path-detection.ts` | Finds MSTS/Open Rails install folders. |
| `desktop/electron/store.ts` | Saves local desktop settings. |
| `desktop/renderer/app/store/page.tsx` | Store UI inside desktop app. |
| `desktop/renderer/app/downloads/page.tsx` | Downloads UI. |
| `desktop/renderer/app/installed/page.tsx` | Installed assets UI. |
| `desktop/renderer/app/settings/page.tsx` | Desktop app settings UI. |

## Production Notes

- Replace placeholder icons/artwork before final release.
- Set production API URL before building final EXE.
- Paid asset downloads should always stay protected by the backend.
- For auto updates, configure the `publish.url` in `desktop/package.json`.
- Test install/uninstall paths on a clean Windows machine before public release.

## Common Problems

| Problem | Fix |
| --- | --- |
| Desktop app opens but assets do not load | Start backend and check API URL in Settings. |
| Login fails | Check backend JWT/auth endpoints and user credentials. |
| Download fails | Check purchase status and backend file URL. |
| EXE build fails | Run `npm install`, then `npm run build`, then `npm run dist`. |
| Installer output not found | Check `desktop/release/`. |

