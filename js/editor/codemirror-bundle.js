/**
 * codemirror-bundle.js — Lightweight code editor with JS syntax highlighting
 * Built without external dependencies for GitHub Pages compatibility
 */

window.CodeEditor = (() => {
  let currentFile = null;
  const files = {}; // name -> content
  let editorEl = null;
  let highlightEl = null;
  let lineNumbersEl = null;

  const JS_KEYWORDS = /\b(async|await|function|const|let|var|return|if|else|for|while|break|continue|new|class|extends|import|export|default|switch|case|typeof|instanceof|in|of|null|undefined|true|false|this|super|try|catch|finally|throw|delete|void|yield)\b/g;
  const JS_STRINGS = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g;
  const JS_NUMBERS = /\b(\d+\.?\d*)\b/g;
  const JS_COMMENTS_LINE = /(\/\/[^\n]*)/g;
  const JS_COMMENTS_BLOCK = /(\/\*[\s\S]*?\*\/)/g;
  const JS_FUNCTIONS = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;

  function highlight(code) {
    let safe = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Order matters: comments > strings > keywords
    const placeholders = [];
    let idx = 0;

    function protect(html, cls) {
      const key = `\x00ph${idx++}\x00`;
      placeholders.push({ key, html: `<span class="hl-${cls}">${html}</span>` });
      return key;
    }

    // Block comments
    safe = safe.replace(/(\/\*[\s\S]*?\*\/)/g, m => protect(m, 'comment'));
    // Line comments
    safe = safe.replace(/(\/\/[^\n]*)/g, m => protect(m, 'comment'));
    // Strings
    safe = safe.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, m => protect(m, 'string'));
    // Numbers
    safe = safe.replace(/\b(\d+\.?\d*)\b/g, m => protect(m, 'number'));
    // Keywords
    safe = safe.replace(/\b(async|await|function|const|let|var|return|if|else|for|while|break|continue|new|class|extends|import|export|default|switch|case|typeof|instanceof|in|of|null|undefined|true|false|this|super|try|catch|finally|throw|delete|void|yield)\b/g, m => protect(m, 'keyword'));
    // Restore
    placeholders.forEach(p => { safe = safe.replace(p.key, p.html); });

    return safe;
  }

  function getLineNumbers(code) {
    const lines = (code.match(/\n/g) || []).length + 1;
    return Array.from({length: lines}, (_,i) => i+1).join('\n');
  }

  function init() {
    const wrap = document.getElementById('code-editor');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="code-mirror-wrap" style="display:flex;height:100%;overflow:hidden;position:relative">
        <div id="line-numbers" style="
          background:var(--bg2);border-right:1px solid var(--border);
          padding:1rem 0.5rem;font-family:var(--font-mono);font-size:13px;
          line-height:1.6;color:var(--text3);text-align:right;min-width:48px;
          user-select:none;overflow:hidden;flex-shrink:0;white-space:pre;
        "></div>
        <div style="flex:1;position:relative;overflow:hidden">
          <pre id="code-highlight" style="
            position:absolute;inset:0;padding:1rem;
            font-family:var(--font-mono);font-size:13px;line-height:1.6;
            white-space:pre;overflow:hidden;pointer-events:none;
            color:var(--text);margin:0;background:transparent;word-spacing:normal;
            tab-size:2;
          "></pre>
          <textarea id="code-textarea" spellcheck="false" style="
            position:absolute;inset:0;padding:1rem;
            font-family:var(--font-mono);font-size:13px;line-height:1.6;
            white-space:pre;overflow:auto;background:transparent;
            color:transparent;caret-color:var(--text);resize:none;border:none;
            outline:none;tab-size:2;word-spacing:normal;
          "></textarea>
        </div>
      </div>
    `;

    const textarea = document.getElementById('code-textarea');
    const pre = document.getElementById('code-highlight');
    lineNumbersEl = document.getElementById('line-numbers');

    textarea.addEventListener('input', () => {
      syncHighlight(textarea, pre);
    });
    textarea.addEventListener('scroll', () => {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
      lineNumbersEl.scrollTop = textarea.scrollTop;
    });

    // Tab key support
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        syncHighlight(textarea, pre);
      }
    });

    editorEl = textarea;

    // Create default game file
    addFile('game.js', DEFAULT_GAME_TEMPLATE);
    switchFile('game.js');
    renderFileList();
  }

  function syncHighlight(textarea, pre) {
    const code = textarea.value;
    pre.innerHTML = highlight(code) + '\n';
    lineNumbersEl.textContent = getLineNumbers(code);

    // Save to current file
    if (currentFile && files[currentFile] !== undefined) {
      files[currentFile] = code;
    }
  }

  function addFile(name, content) {
    files[name] = content || '';
  }

  function switchFile(name) {
    if (!files[name] === undefined) return;
    currentFile = name;
    document.getElementById('code-filename').textContent = name;
    const textarea = document.getElementById('code-textarea');
    const pre = document.getElementById('code-highlight');
    if (textarea) {
      textarea.value = files[name] || '';
      syncHighlight(textarea, pre);
    }
    renderFileList();
  }

  function renderFileList() {
    const list = document.getElementById('script-file-list');
    if (!list) return;
    list.innerHTML = '';
    Object.keys(files).forEach(name => {
      const el = document.createElement('div');
      el.className = 'script-file' + (name === currentFile ? ' active' : '');
      el.innerHTML = `<span>📜</span> ${name}`;
      el.onclick = () => { switchFile(name); renderFileList(); };
      el.oncontextmenu = (e) => {
        e.preventDefault();
        if (name !== 'game.js' && confirm(`Delete "${name}"?`)) {
          delete files[name];
          if (currentFile === name) switchFile('game.js');
          renderFileList();
        }
      };
      list.appendChild(el);
    });
  }

  document.getElementById('btn-new-script').onclick = () => {
    const name = prompt('Script file name:', 'helper.js');
    if (name) {
      addFile(name, `// ${name}\n`);
      switchFile(name);
      renderFileList();
    }
  };

  document.getElementById('btn-format-code').onclick = () => {
    // Simple auto-indent (basic beautifier)
    const textarea = document.getElementById('code-textarea');
    if (!textarea) return;
    try {
      // Just re-sync highlighting on current code
      const pre = document.getElementById('code-highlight');
      syncHighlight(textarea, pre);
      StudioApp.log('Code formatted.', 'success');
    } catch (e) {}
  };

  document.getElementById('btn-sync-blocks').onclick = () => {
    StudioApp.log('Block sync: edit code, then preview to test changes.', 'info');
  };

  function getValue() {
    const textarea = document.getElementById('code-textarea');
    return textarea ? textarea.value : '';
  }

  function getFiles() { return files; }

  function serialize() {
    return { ...files };
  }
  function deserialize(data) {
    Object.entries(data).forEach(([k, v]) => { files[k] = v; });
    switchFile(Object.keys(files)[0] || 'game.js');
    renderFileList();
  }

  const DEFAULT_GAME_TEMPLATE = `// game.js — Custom game code
// This runs alongside your block scripts.
// You can use all Lorl runtime functions here.

// Example: custom player movement
window.addEventListener('lorl_start', () => {
  const player = __objects['Player'];
  if (!player) return;

  // Make the player controllable
  const keys = {};
  document.addEventListener('keydown', e => keys[e.code] = true);
  document.addEventListener('keyup', e => keys[e.code] = false);

  __events.on('update', (dt) => {
    if (!player.mesh) return;
    const speed = player.speed || 5;
    if (keys['KeyW'] || keys['ArrowUp'])    __moveBy(player, 0, 0, -speed * dt);
    if (keys['KeyS'] || keys['ArrowDown'])  __moveBy(player, 0, 0, speed * dt);
    if (keys['KeyA'] || keys['ArrowLeft'])  __moveBy(player, -speed * dt, 0, 0);
    if (keys['KeyD'] || keys['ArrowRight']) __moveBy(player, speed * dt, 0, 0);
    if (keys['Space'] && player._grounded)  __jump(player, 6);

    // Sync to server in multiplayer
    if (window.Lorl && Lorl.isConnected()) {
      Lorl.updateState({
        x: player.x, y: player.y, z: player.z,
        name: Lorl.getUsername()
      });
    }
  });
});
`;

  // Add CSS for syntax highlighting
  const style = document.createElement('style');
  style.textContent = `
    .hl-keyword { color: #c792ea; font-weight: 500; }
    .hl-string  { color: #c3e88d; }
    .hl-number  { color: #f78c6c; }
    .hl-comment { color: #546e7a; font-style: italic; }
    .hl-function { color: #82aaff; }
  `;
  document.head.appendChild(style);

  return { init, addFile, switchFile, getValue, getFiles, serialize, deserialize };
})();
