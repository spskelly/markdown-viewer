// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('service worker registered', reg))
    .catch(err => console.log('service worker registration failed', err));
}

// configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error('highlight error:', err);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// dom elements
const dropZone = document.getElementById('dropZone');
const content = document.getElementById('content');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileInput = document.getElementById('fileInput');
const openFileBtn = document.getElementById('openFile');
const toggleThemeBtn = document.getElementById('toggleTheme');

// theme handling
let isDarkMode = true;
toggleThemeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('light-theme', !isDarkMode);
  // update highlight.js theme
  const hlStyle = document.querySelector('link[href*="highlight.js"]');
  if (hlStyle) {
    hlStyle.href = isDarkMode 
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
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
    alert('please drop a markdown (.md) file');
  }
});

// render markdown file
async function renderMarkdownFile(file) {
  try {
    const text = await file.text();
    
    // render markdown
    const html = marked.parse(text);
    content.innerHTML = html;
    
    // update ui
    dropZone.style.display = 'none';
    content.style.display = 'block';
    fileInfo.style.display = 'flex';
    
    // update file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // update page title
    document.title = `${file.name} - Markdown Viewer`;
    
    // scroll to top
    window.scrollTo(0, 0);
    
  } catch (err) {
    console.error('error rendering markdown:', err);
    alert('error loading file: ' + err.message);
  }
}

// format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

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
});

console.log('markdown viewer initialized');
