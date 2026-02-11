// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('service worker registered', reg))
    .catch(err => console.log('service worker registration failed', err));
}

// theme handling - persist preference
let isDarkMode = localStorage.getItem('theme') !== 'light';

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
  const codeBlocks = content.querySelectorAll('code.language-mermaid');
  if (codeBlocks.length === 0) return;

  codeBlocks.forEach(codeBlock => {
    const pre = codeBlock.parentElement;
    const mermaidDiv = document.createElement('div');
    mermaidDiv.classList.add('mermaid');
    mermaidDiv.textContent = codeBlock.textContent;
    mermaidDiv.setAttribute('data-mermaid-source', codeBlock.textContent);
    pre.replaceWith(mermaidDiv);
  });

  try {
    await mermaid.run({ querySelector: '.mermaid', suppressErrors: true });
  } catch (err) {
    console.error('mermaid rendering error:', err);
  }
}

// render markdown file
async function renderMarkdownFile(file) {
  try {
    const text = await file.text();

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

  // escape to close modal
  if (e.key === 'Escape') {
    shortcutsModal.style.display = 'none';
  }
});

console.log('markdown viewer initialized');
