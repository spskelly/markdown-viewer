# Markdown Viewer PWA

A lightweight, fast, and beautiful markdown file viewer that works as a Progressive Web App. Set it as your default `.md` file handler and enjoy instant, gorgeous markdown rendering.

## Features

- 🚀 **Instant loading** - Offline-first PWA with service worker caching
- 📂 **File handler** - Set as default app for `.md` files (Chromium browsers)
- 🎨 **Beautiful rendering** - GitHub-style markdown with syntax highlighting
- 🌓 **Dark/Light mode** - Toggle between themes
- ⌨️ **Keyboard shortcuts** - Quick access to common actions
- 📱 **Responsive** - Works great on desktop and mobile
- 💾 **Drag & drop** - Drop files directly onto the viewer

## Quick Start

### 1. Serve the files

You need to serve these files over HTTPS (or localhost) for PWA features to work. Choose one:

**Option A: Python SimpleHTTPServer (easiest)**
```bash
cd markdown-viewer
python3 -m http.server 8000
```
Then visit: http://localhost:8000

**Option B: Node.js http-server**
```bash
npm install -g http-server
cd markdown-viewer
http-server -p 8000
```

**Option C: Deploy to GitHub Pages, Netlify, Vercel, or Cloudflare Pages**
- Just push the `markdown-viewer` folder to your repo
- These platforms automatically serve with HTTPS

### 2. Install as PWA

1. Open the app in Chrome/Edge/Chromium browser
2. Look for the install icon in the address bar (or ⋮ menu → "Install Markdown Viewer")
3. Click to install

### 3. Set as default file handler

After installing:
1. Right-click any `.md` file on your system
2. Choose "Open with" → "Choose another app"
3. Select "Markdown Viewer" from the list
4. Check "Always use this app"

Now double-clicking any `.md` file opens it beautifully!

## Keyboard Shortcuts

- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + D` - Toggle dark/light mode

## Features Explained

### File Handling API
The app uses the File Handling API to register as a handler for `.md` and `.markdown` files. This is currently supported in Chromium-based browsers (Chrome, Edge, Brave, etc.).

### Syntax Highlighting
Code blocks are automatically highlighted using highlight.js with support for 100+ languages.

### Offline Support
Once installed, the app works completely offline. All assets are cached via service worker.

### Drag & Drop
Can't set as default? Just drag any markdown file onto the app window.

## Browser Support

- ✅ Chrome/Edge/Brave (full support including file handler)
- ✅ Firefox (works, but no file handler API yet)
- ✅ Safari (works, but no file handler API yet)

## Development

Want to modify it? All the code is straightforward:

- `index.html` - App shell
- `app.js` - Main logic (file handling, rendering)
- `styles.css` - GitHub-style markdown CSS
- `manifest.json` - PWA configuration
- `service-worker.js` - Offline caching

## Libraries Used

- **marked.js** - Markdown parsing
- **highlight.js** - Syntax highlighting
- **Service Worker API** - Offline support
- **File Handling API** - Default file handler

## Why This Exists

There's a surprising gap in the ecosystem - no lightweight, dedicated markdown viewer. Everything is either:
- A heavy editor (VSCode, Typora)
- A browser extension (clunky file:// handling)
- A terminal tool (not graphical)

This fills that gap: double-click → instant beautiful rendering. That's it.

## License

MIT - do whatever you want with it

---

Built because .md files deserve better than notepad 💚
