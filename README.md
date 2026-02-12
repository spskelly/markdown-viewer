# Markdown Viewer

A lightweight, instant markdown file viewer that runs as a Progressive Web App. Install it from your browser and set it as your default `.md` file handler — double-click any markdown file and it just works.

## Install

1. **Open** [spskelly.github.io/markdown-viewer](https://spskelly.github.io/markdown-viewer/)
2. **Install** — click the install icon in the address bar (or browser menu → "Install Markdown Viewer")
3. **Set as default** — right-click any `.md` file → "Open with" → "Markdown Viewer" → "Always use this app"

That's it. Now double-clicking any `.md` file opens it beautifully.

> Requires a Chromium browser (Chrome, Edge, Brave) for the file handler feature. Firefox and Safari can use the app but won't register as a file handler.

## Features

- **File handler** — registers as a default app for `.md` files on your system
- **Offline** — works without internet after install
- **Dark/Light mode** — toggle with `Ctrl+D` (preference saved)
- **Syntax highlighting** — 100+ languages via highlight.js
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, and more
- **Drag & drop** — drop files directly onto the window
- **Keyboard shortcuts** — press `?` for the full list
- **Print-friendly** — clean print stylesheet

## Why?

There's no lightweight, dedicated markdown viewer. Everything is either a heavy editor (VS Code, Typora), a clunky browser extension, or a terminal tool. This fills that gap: double-click → instant rendering.

## Development

Want to modify it? Clone the repo and serve over HTTPS (or localhost). The codebase is five files:

- `index.html` — app shell
- `app.js` — file handling, rendering, UI
- `styles.css` — GitHub-style markdown CSS
- `manifest.json` — PWA config
- `service-worker.js` — offline caching

## License

MIT
