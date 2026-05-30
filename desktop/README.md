# GJS RailForge Launcher

Modern Electron + Next.js desktop launcher/store for MSTS and Open Rails assets.

## Features

- User login/register against the Django JWT API.
- Asset browser using the existing `/api/assets/` backend.
- Download manager with progress events and resume support through HTTP range requests.
- One-click asset install into a saved local install directory.
- Installed asset manager with uninstall and open-folder actions.
- MSTS/Open Rails installation path detection with manual overrides.
- Download cache directory management.
- SHA-256 integrity verification support.
- Automatic dependency install setting for compatible assets.
- Desktop notifications.
- Auto updater hooks with `electron-updater`.
- Admin-configurable API URL.
- Windows EXE installer support via `electron-builder` NSIS.

## Folder Structure

```text
desktop/
  electron/          Electron main process, preload bridge, native launcher services
  renderer/          Next.js TypeScript Tailwind launcher UI
  assets/            Icons and future train artwork
  build/             Installer resources
  release/           Generated EXE installers
```

## Development

```bash
cd desktop
npm install
npm run dev
```

The launcher opens Electron and runs the Next renderer at `http://localhost:3010`.

## Build EXE Installer

```bash
cd desktop
npm install
npm run dist
```

Output appears in `desktop/release/` as:

```text
GJS-RailForge-Launcher-1.0.0-Setup.exe
```

## API Setup

Default API URL:

```text
http://localhost:8000/api
```

Users can change it inside Settings. For production, set:

```bash
GJS_RAILFORGE_API_URL=https://your-api-domain.com/api
```

## Production Notes

- Keep paid asset download URLs protected by the backend.
- Return signed file URLs for Cloudinary/S3 downloads when possible.
- Include SHA-256 hashes in asset metadata for stronger integrity checks.
- Host auto-update files at the `publish.url` configured in `package.json`.
- Replace placeholder artwork/icons in `assets/` and `build/` before final release.
