// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', { scope: '/markdown-viewer/' })
    .then(reg => console.log('service worker registered', reg))
    .catch(err => console.log('service worker registration failed', err));
}

// theme handling - persist preference
let isDarkMode = localStorage.getItem('theme') !== 'light';

// track active panzoom instances for cleanup
let activePanzoomInstances = [];

// apply saved theme on load
if (!isDarkMode) {
  document.body.classList.add('light-theme');
  const hlStyle = document.querySelector('link[href*="highlight.js"]');
  if (hlStyle) {
    hlStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  }
}

// configure marked with syntax highlighting via marked-highlight extension
const { markedHighlight: markedHighlightFn } = globalThis.markedHighlight;

marked.use(
  markedHighlightFn({
    langPrefix: 'hljs language-',
    highlight: function(code, lang) {
      // skip mermaid blocks - they will be rendered as diagrams
      // must escape HTML since highlight return values are treated as raw HTML
      if (lang === 'mermaid') {
        return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.error('highlight error:', err);
        }
      }
      return hljs.highlightAuto(code).value;
    }
  })
);

marked.setOptions({
  breaks: true,
  gfm: true
});

// initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: isDarkMode ? 'dark' : 'default',
});

// destroy all active panzoom instances
function disposePanzoomInstances() {
  activePanzoomInstances.forEach(pz => pz.dispose());
  activePanzoomInstances = [];
}

// dom elements
const dropZone = document.getElementById('dropZone');
const content = document.getElementById('content');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const wordCount = document.getElementById('wordCount');
const readTime = document.getElementById('readTime');
const fileInput = document.getElementById('fileInput');
const openFileBtn = document.getElementById('openFile');
const toggleThemeBtn = document.getElementById('toggleTheme');
const scrollTopBtn = document.getElementById('scrollTop');
const helpBtn = document.getElementById('helpBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const closeModal = document.getElementById('closeModal');

// theme toggle
toggleThemeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  document.body.classList.toggle('light-theme', !isDarkMode);

  // update highlight.js theme
  const hlStyle = document.querySelector('link[href*="highlight.js"]');
  if (hlStyle) {
    hlStyle.href = isDarkMode
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  }

  // update mermaid theme and re-render diagrams
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
  });

  if (content.style.display !== 'none') {
    // close fullscreen and dispose panzoom before re-render
    closeDiagramFullscreen();
    disposePanzoomInstances();

    const mermaidDivs = content.querySelectorAll('.mermaid');
    mermaidDivs.forEach(div => {
      const source = div.getAttribute('data-mermaid-source');
      if (source) {
        div.textContent = source;
        div.removeAttribute('data-processed');
        div.removeAttribute('id');
      }
    });

    if (mermaidDivs.length > 0) {
      mermaid.run({ querySelector: '.mermaid', suppressErrors: true })
        .then(() => initializePanzoom())
        .catch(err => console.error('mermaid re-render error:', err));
    }
  }
});

// file handling api - handle files opened from os
if ('launchQueue' in window) {
  console.log('file handling api supported');
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files.length) {
      return;
    }

    // handle the first file
    const fileHandle = launchParams.files[0];
    const file = await fileHandle.getFile();
    await renderMarkdownFile(file);
  });
}

// manual file selection
openFileBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    await renderMarkdownFile(file);
  }
});

// drag and drop support
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown'))) {
    await renderMarkdownFile(file);
  } else {
    // show inline error instead of alert
    const dropContent = dropZone.querySelector('.drop-zone-content');
    const errorP = document.createElement('p');
    errorP.className = 'error-message';
    errorP.textContent = 'Please drop a .md or .markdown file.';
    dropContent.appendChild(errorP);

    setTimeout(() => {
      const errMsg = dropContent.querySelector('.error-message');
      if (errMsg) errMsg.remove();
    }, 3000);
  }
});

// render mermaid diagrams after markdown is parsed
async function renderMermaidDiagrams() {
  disposePanzoomInstances();

  const codeBlocks = content.querySelectorAll('code.language-mermaid');
  if (codeBlocks.length === 0) return;

  codeBlocks.forEach((codeBlock, index) => {
    const pre = codeBlock.parentElement;

    // create wrapper structure
    const wrapper = document.createElement('div');
    wrapper.classList.add('diagram-wrapper');
    wrapper.setAttribute('data-diagram-id', index);

    // zoom controls (appear on hover via CSS)
    wrapper.innerHTML = `
      <div class="zoom-controls">
        <button data-zoom="in" aria-label="Zoom in" title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button data-zoom="out" aria-label="Zoom out" title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button data-zoom="reset" aria-label="Reset zoom" title="Reset zoom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        </button>
        <button data-zoom="fullscreen" aria-label="Fullscreen" title="Fullscreen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <span class="zoom-hint">Ctrl+scroll to zoom</span>
      </div>
    `;

    // diagram container
    const container = document.createElement('div');
    container.classList.add('diagram-container');

    const mermaidDiv = document.createElement('div');
    mermaidDiv.classList.add('mermaid');
    mermaidDiv.textContent = codeBlock.textContent;
    mermaidDiv.setAttribute('data-mermaid-source', codeBlock.textContent);

    container.appendChild(mermaidDiv);
    wrapper.appendChild(container);
    pre.replaceWith(wrapper);
  });

  try {
    await mermaid.run({ querySelector: '.mermaid', suppressErrors: true });
  } catch (err) {
    console.error('mermaid rendering error:', err);
  }

  initializePanzoom();
}

// initialize panzoom on all rendered mermaid SVGs
function initializePanzoom() {
  const wrappers = content.querySelectorAll('.diagram-wrapper');

  wrappers.forEach(wrapper => {
    const container = wrapper.querySelector('.diagram-container');
    const svg = container.querySelector('.mermaid svg');
    if (!svg) return;

    // remove mermaid's inline max-width so panzoom can scale freely
    svg.style.maxWidth = 'none';

    const pz = panzoom(svg, {
      maxZoom: 10,
      minZoom: 0.1,
      smoothScroll: false,
      zoomDoubleClickSpeed: 1,
      bounds: false,
      boundsPadding: 0.1,
      beforeWheel: function(e) {
        // only zoom when Ctrl is held, otherwise let page scroll
        return !e.ctrlKey;
      }
    });

    activePanzoomInstances.push(pz);

    // wire up zoom control buttons
    const controls = wrapper.querySelector('.zoom-controls');
    controls.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const action = button.getAttribute('data-zoom');
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      if (action === 'in') {
        pz.smoothZoom(cx, cy, 1.5);
      } else if (action === 'out') {
        pz.smoothZoom(cx, cy, 0.67);
      } else if (action === 'reset') {
        pz.moveTo(0, 0);
        pz.zoomAbs(0, 0, 1);
      } else if (action === 'fullscreen') {
        openDiagramFullscreen(wrapper);
      }
    });
  });
}

// fullscreen diagram modal
const diagramFullscreen = document.getElementById('diagramFullscreen');
const fullscreenContainer = document.getElementById('fullscreenContainer');
const closeFullscreenBtn = document.getElementById('closeFullscreen');
let fullscreenPanzoom = null;

function openDiagramFullscreen(wrapper) {
  const svg = wrapper.querySelector('.mermaid svg');
  if (!svg) return;

  // clone the SVG so the inline one stays untouched
  const clonedSvg = svg.cloneNode(true);

  // remap IDs to avoid collisions with the original SVG
  clonedSvg.querySelectorAll('[id]').forEach(el => {
    const oldId = el.id;
    const newId = 'fs-' + oldId;
    el.id = newId;
    clonedSvg.querySelectorAll(`[href="#${oldId}"]`).forEach(ref => {
      ref.setAttribute('href', '#' + newId);
    });
    clonedSvg.querySelectorAll('*').forEach(node => {
      for (const attr of node.attributes) {
        if (attr.value.includes(`url(#${oldId})`)) {
          node.setAttribute(attr.name, attr.value.replace(`url(#${oldId})`, `url(#${newId})`));
        }
      }
    });
  });

  fullscreenContainer.innerHTML = '';
  fullscreenContainer.appendChild(clonedSvg);

  diagramFullscreen.style.display = 'flex';

  // initialize panzoom on the cloned SVG (no beforeWheel guard in fullscreen)
  fullscreenPanzoom = panzoom(clonedSvg, {
    maxZoom: 20,
    minZoom: 0.05,
    smoothScroll: false,
    bounds: false
  });
}

function closeDiagramFullscreen() {
  if (fullscreenPanzoom) {
    fullscreenPanzoom.dispose();
    fullscreenPanzoom = null;
  }
  fullscreenContainer.innerHTML = '';
  diagramFullscreen.style.display = 'none';
}

closeFullscreenBtn.addEventListener('click', closeDiagramFullscreen);

diagramFullscreen.addEventListener('click', (e) => {
  if (e.target === diagramFullscreen) {
    closeDiagramFullscreen();
  }
});

// wire up fullscreen zoom controls
document.querySelector('.fullscreen-controls').addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button || !fullscreenPanzoom) return;

  const action = button.getAttribute('data-zoom');
  const rect = fullscreenContainer.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  if (action === 'in') {
    fullscreenPanzoom.smoothZoom(cx, cy, 1.5);
  } else if (action === 'out') {
    fullscreenPanzoom.smoothZoom(cx, cy, 0.67);
  } else if (action === 'reset') {
    fullscreenPanzoom.moveTo(0, 0);
    fullscreenPanzoom.zoomAbs(0, 0, 1);
  }
});

// render markdown file
async function renderMarkdownFile(file) {
  try {
    const text = await file.text();

    // dispose panzoom before destroying DOM nodes
    disposePanzoomInstances();

    // render markdown
    const html = marked.parse(text);
    content.innerHTML = html;

    // render mermaid diagrams
    await renderMermaidDiagrams();

    // update ui
    dropZone.style.display = 'none';
    content.style.display = 'block';
    fileInfo.style.display = 'flex';

    // update file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    const stats = getTextStats(text);
    wordCount.textContent = stats.words.toLocaleString() + ' words';
    readTime.textContent = stats.minutes + ' min read';

    // update page title
    document.title = `${file.name} - Markdown Viewer`;

    // scroll to top
    window.scrollTo(0, 0);

  } catch (err) {
    console.error('error rendering markdown:', err);
    const errorEl = document.createElement('p');
    errorEl.style.color = '#f85149';
    errorEl.textContent = 'Error loading file: ' + err.message;
    content.innerHTML = '';
    content.appendChild(errorEl);
    content.style.display = 'block';
  }
}

// format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// text stats for word count and reading time
function getTextStats(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { words, minutes };
}

// scroll to top button
window.addEventListener('scroll', () => {
  scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// keyboard shortcuts help modal
helpBtn.addEventListener('click', () => {
  shortcutsModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
  shortcutsModal.style.display = 'none';
});

shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) {
    shortcutsModal.style.display = 'none';
  }
});

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ctrl/cmd + o to open file
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    fileInput.click();
  }

  // ctrl/cmd + d to toggle theme
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    toggleThemeBtn.click();
  }

  // ? to show shortcuts help
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    shortcutsModal.style.display = shortcutsModal.style.display === 'none' ? 'flex' : 'none';
  }

  // escape to close fullscreen or modal
  if (e.key === 'Escape') {
    if (diagramFullscreen.style.display !== 'none') {
      closeDiagramFullscreen();
    } else {
      shortcutsModal.style.display = 'none';
    }
  }
});

console.log('markdown viewer initialized');
