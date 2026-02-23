/**
 * studio.js — Main Lorl Studio application controller
 */

window.StudioApp = (() => {
  // ── State ──
  let objects = []; // All game objects
  let selectedObjectId = null;
  let history = []; // Undo stack
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  const OBJECT_DEFAULTS = {
    script:    { icon: '📜', x: 0, y: 0, z: 0 },
    cube:      { icon: '⬜', x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, color: '#4488ff', material: 'standard', physics: false, mass: 1, friction: 0.5, castShadow: true, collider: 'box' },
    sphere:    { icon: '⬭', x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, color: '#ff4444', material: 'standard', physics: false, mass: 1, collider: 'sphere' },
    cylinder:  { icon: '⬛', x: 0, y: 0.5, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, color: '#44ff88', material: 'standard', physics: false },
    plane:     { icon: '▬', x: 0, y: 0, z: 0, scaleX: 10, scaleY: 1, scaleZ: 10, color: '#888888', material: 'standard', physics: false, collider: 'box' },
    character: { icon: '🧍', x: 0, y: 0.9, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, color: '#ffaa00', material: 'standard', physics: true, mass: 70, collider: 'capsule', speed: 5 },
    camera:    { icon: '📷', x: 0, y: 5, z: 10, rotX: -15, fov: 60, near: 0.1, isMain: true },
    light:     { icon: '💡', x: 0, y: 5, z: 0, color: '#ffffff', lightType: 'point', intensity: 1, range: 20 },
    trigger:   { icon: '🔲', x: 0, y: 0, z: 0, scaleX: 3, scaleY: 3, scaleZ: 3, color: '#00ffaa' },
    particle:  { icon: '✨', x: 0, y: 0, z: 0 },
    sound:     { icon: '🔊', x: 0, y: 0, z: 0, volume: 1, loop: false, autoPlay: false },
    ui:        { icon: '🖼', x: 0, y: 0, z: 0 },
    spawn:     { icon: '🚀', x: 0, y: 0, z: 0 },
  };

  // ── Panels ──
  function navigate(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('btn-' + tab).classList.add('active');

    if (tab === 'scene' && !Scene3D.initialized()) {
      Scene3D.init();
      objects.forEach(o => Scene3D.addObject(o));
    }
  }

  document.getElementById('btn-blocks').onclick = () => navigate('blocks');
  document.getElementById('btn-code').onclick   = () => navigate('code');
  document.getElementById('btn-scene').onclick  = () => navigate('scene');
  document.getElementById('btn-assets').onclick = () => navigate('assets');

  // ── Object tree ──
  function renderObjectTree() {
    const tree = document.getElementById('object-tree');
    if (objects.length === 0) {
      tree.innerHTML = '<div class="empty-hint">No objects yet.<br>Click + to add one.</div>';
      return;
    }
    tree.innerHTML = '';
    objects.forEach(obj => {
      const el = document.createElement('div');
      el.className = 'obj-item' + (obj.id === selectedObjectId ? ' selected' : '');
      el.dataset.id = obj.id;
      el.innerHTML = `
        <span class="obj-item-icon">${obj.icon || '📦'}</span>
        <span class="obj-item-name">${escHtml(obj.name)}</span>
        <button class="obj-visibility" title="Toggle visible">👁</button>
        <button class="obj-delete" title="Delete">✕</button>
      `;
      el.onclick = (e) => {
        if (e.target.classList.contains('obj-delete') || e.target.classList.contains('obj-visibility')) return;
        selectObject(obj.id);
      };
      el.querySelector('.obj-visibility').onclick = (e) => {
        e.stopPropagation();
        obj.visible = !obj.visible;
        Scene3D.updateObject(obj);
        log(`${obj.name}: ${obj.visible ? 'shown' : 'hidden'}`, 'info');
      };
      el.querySelector('.obj-delete').onclick = (e) => {
        e.stopPropagation();
        deleteObject(obj.id);
      };
      tree.appendChild(el);
    });
  }

  function selectObject(id) {
    selectedObjectId = id;
    renderObjectTree();
    const obj = objects.find(o => o.id === id);
    if (obj) {
      PropertiesPanel.render(obj, (o, prop, val) => {
        // Update scene 3d
        Scene3D.updateObject(o);
        renderObjectTree();
        saveHistory();
      });
      BlockCanvas.switchObject(id);
      log(`Selected: ${obj.name}`, 'info');
    }
  }

  function addObject(type) {
    const defaults = OBJECT_DEFAULTS[type] || {};
    const id = 'obj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const count = objects.filter(o => o.type === type).length + 1;
    const obj = {
      ...defaults,
      id,
      type,
      name: (type.charAt(0).toUpperCase() + type.slice(1)) + (count > 1 ? count : ''),
      tag: '',
      visible: true,
      rotX: defaults.rotX || 0,
      rotY: defaults.rotY || 0,
      rotZ: defaults.rotZ || 0,
    };
    objects.push(obj);
    Scene3D.addObject(obj);
    renderObjectTree();
    selectObject(id);
    saveHistory();
    log(`Added ${obj.name}`, 'success');
    return obj;
  }

  function deleteObject(id) {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    if (!confirm(`Delete "${obj.name}"?`)) return;
    objects = objects.filter(o => o.id !== id);
    Scene3D.removeObject(id);
    if (selectedObjectId === id) {
      selectedObjectId = null;
      document.getElementById('props-content').innerHTML = '<div class="empty-hint">Select an object</div>';
    }
    renderObjectTree();
    saveHistory();
    log(`Deleted ${obj.name}`, 'info');
  }

  function refreshProps() {
    const obj = objects.find(o => o.id === selectedObjectId);
    if (obj) PropertiesPanel.render(obj, (o) => { Scene3D.updateObject(o); });
  }

  // ── Add object modal ──
  document.getElementById('btn-add-object').onclick = () => showModal('modal-add-object');
  document.getElementById('modal-obj-cancel').onclick = closeModal;
  document.querySelectorAll('.otype-card').forEach(card => {
    card.onclick = () => {
      closeModal();
      addObject(card.dataset.type);
      navigate('blocks');
    };
  });

  // ── Scene tools ──
  document.getElementById('tool-select').onclick = () => Scene3D.setTool('select');
  document.getElementById('tool-move').onclick   = () => Scene3D.setTool('move');
  document.getElementById('tool-rotate').onclick = () => Scene3D.setTool('rotate');
  document.getElementById('tool-scale').onclick  = () => Scene3D.setTool('scale');

  ['cube','sphere','cylinder','plane','light','camera','spawn'].forEach(type => {
    const btn = document.getElementById('tool-add-' + type);
    if (btn) btn.onclick = () => { addObject(type); navigate('scene'); };
  });

  // ── View buttons ──
  document.getElementById('vbtn-top').onclick   = () => { Scene3D.setView('top'); setViewActive('vbtn-top'); };
  document.getElementById('vbtn-front').onclick = () => { Scene3D.setView('front'); setViewActive('vbtn-front'); };
  document.getElementById('vbtn-right').onclick = () => { Scene3D.setView('right'); setViewActive('vbtn-right'); };
  document.getElementById('vbtn-persp').onclick = () => { Scene3D.setView('persp'); setViewActive('vbtn-persp'); };
  function setViewActive(id) { document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.id === id)); }

  // ── Palette ──
  function buildPalette() {
    const container = document.getElementById('palette-categories');
    container.innerHTML = '';
    BlockDefs.CATEGORIES.forEach(cat => {
      const section = document.createElement('div');
      section.className = 'palette-category';

      const header = document.createElement('div');
      header.className = 'palette-cat-header';
      header.style.color = cat.color;
      header.innerHTML = `<div class="cat-dot" style="background:${cat.color}"></div>${cat.icon} ${cat.name}`;
      let collapsed = false;
      header.onclick = () => {
        collapsed = !collapsed;
        blocksContainer.style.display = collapsed ? 'none' : '';
      };
      section.appendChild(header);

      const blocksContainer = document.createElement('div');
      blocksContainer.className = 'palette-cat-blocks';
      cat.blocks.forEach(blockDef => {
        const el = BlockRender.makePaletteBlock(blockDef, cat.color);
        blocksContainer.appendChild(el);
      });
      section.appendChild(blocksContainer);
      container.appendChild(section);
    });
  }

  // ── Preview ──
  document.getElementById('btn-preview').onclick = runPreview;
  document.getElementById('btn-play-preview').onclick = runPreview;
  document.getElementById('btn-popout-preview').onclick = () => {
    const html = Preview.buildGame(objects, BlockCanvas.getScripts(), CodeEditor.getFiles(), Assets.getAssets());
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  function runPreview() {
    log('Building game...', 'info');
    try {
      Preview.run(objects, BlockCanvas.getScripts(), CodeEditor.getFiles(), Assets.getAssets());
      log('Preview running!', 'success');
    } catch (e) {
      log('Build error: ' + e.message, 'error');
    }
  }

  // ── Export ──
  document.getElementById('btn-export').onclick = () => {
    const projectName = document.getElementById('project-name').value || 'My Game';
    document.getElementById('export-id').value = projectName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g,'');
    document.getElementById('export-name').value = projectName;
    const encToggle = document.getElementById('export-encrypt-toggle');
    if (encToggle) { encToggle.checked = false; document.getElementById('export-encrypt-fields').style.display = 'none'; }
    const pwField = document.getElementById('export-password');
    if (pwField) { pwField.value = ''; document.getElementById('export-password-confirm').value = ''; document.getElementById('export-password-hint').value = ''; }
    showModal('modal-export');
  };

  const encToggle = document.getElementById('export-encrypt-toggle');
  if (encToggle) {
    encToggle.onchange = function() {
      document.getElementById('export-encrypt-fields').style.display = this.checked ? 'block' : 'none';
    };
  }

  document.getElementById('modal-export-cancel').onclick = closeModal;
  document.getElementById('modal-export-confirm').onclick = async () => {
    const useEncryption = document.getElementById('export-encrypt-toggle')?.checked || false;
    const password = document.getElementById('export-password')?.value || '';
    const passwordConfirm = document.getElementById('export-password-confirm')?.value || '';
    const passwordHint = document.getElementById('export-password-hint')?.value || '';

    if (useEncryption) {
      if (!password) { alert('Please enter an encryption password.'); return; }
      if (password !== passwordConfirm) { alert('Passwords do not match.'); return; }
      if (password.length < 4) { alert('Password must be at least 4 characters.'); return; }
    }

    const meta = {
      id:          document.getElementById('export-id').value.trim() || 'my_game',
      name:        document.getElementById('export-name').value.trim() || 'My Game',
      author:      document.getElementById('export-author').value.trim(),
      description: document.getElementById('export-desc').value.trim(),
      password:    useEncryption ? password : null,
      passwordHint: useEncryption ? passwordHint : '',
    };

    const confirmBtn = document.getElementById('modal-export-confirm');
    const origText = confirmBtn.textContent;
    confirmBtn.textContent = useEncryption ? '⏳ Encrypting…' : '⏳ Packaging…';
    confirmBtn.disabled = true;

    try {
      closeModal();
      await Exporter.exportGame(objects, BlockCanvas.getScripts(), CodeEditor.getFiles(), Assets.getAssets(), meta);
    } finally {
      confirmBtn.textContent = origText;
      confirmBtn.disabled = false;
    }
  };

  // ── Import .lorlgame ──
  const importGameInput = document.getElementById('import-game-input');
  if (document.getElementById('btn-import')) {
    document.getElementById('btn-import').onclick = () => importGameInput.click();
  }
  importGameInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGameInput.value = '';
    if (!confirm(`Import "${file.name}" into Studio?\n\nThis will replace your current project. Export any unsaved work first.`)) return;
    log(`Importing ${file.name}…`, 'info');
    try {
      const result = await Importer.importGame(file);
      if (!result) { log('Import cancelled.', 'warn'); return; }
      await loadProject(result.project, result.manifest);
      log(`✓ Imported "${result.manifest.name}" successfully!`, 'success');
    } catch (err) {
      log('Import failed: ' + err.message, 'error');
      alert('Import failed:\n\n' + err.message);
    }
  };


  // ── History ──
  function saveHistory() {
    const state = JSON.stringify(objects.map(o => ({ ...o, el: undefined })));
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }

  document.getElementById('btn-undo').onclick = () => {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreState(history[historyIndex]);
    log('Undo', 'info');
  };
  document.getElementById('btn-redo').onclick = () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreState(history[historyIndex]);
    log('Redo', 'info');
  };

  function restoreState(stateStr) {
    try {
      const state = JSON.parse(stateStr);
      // Rebuild scene
      objects.forEach(o => Scene3D.removeObject(o.id));
      objects = state;
      objects.forEach(o => Scene3D.addObject(o));
      renderObjectTree();
      if (selectedObjectId && !objects.find(o => o.id === selectedObjectId)) selectedObjectId = null;
    } catch(e) {}
  }

  // ── Console ──
  function log(msg, level = 'info') {
    const out = document.getElementById('console-output');
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'console-line';
    const t = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = `<span class="console-time">${t}</span><span class="console-msg ${level}">${escHtml(String(msg))}</span>`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  document.getElementById('btn-clear-console').onclick = () => {
    document.getElementById('console-output').innerHTML = '';
  };

  // ── Modal helpers ──
  function showModal(id) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
  document.getElementById('modal-overlay').onclick = (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  };

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Init ──
  function init() {
    buildPalette();
    CodeEditor.init();
    BlockCanvas.switchObject(null);
    navigate('blocks');

    // Add starter objects
    const ground = addObject('plane');
    ground.name = 'Ground';
    ground.color = '#445566';
    ground.scaleX = 20; ground.scaleZ = 20;

    const player = addObject('character');
    player.name = 'Player';
    player.x = 0; player.y = 0.9; player.z = 0;
    player.color = '#00d4aa';

    const cam = addObject('camera');
    cam.name = 'MainCamera';

    saveHistory();
    log('Lorl Studio ready! 🎮', 'success');
    log('Drag blocks onto the canvas to script your objects.', 'info');
    log('Right-click a block to delete it.', 'info');
  }

  init();


  // ── Load project from imported data ──
  async function loadProject(project, manifest) {
    // Clear scene
    objects.forEach(o => Scene3D.removeObject(o.id));
    objects = [];
    selectedObjectId = null;

    // Update project name
    if (manifest && manifest.name) {
      const nameInput = document.getElementById('project-name');
      if (nameInput) nameInput.value = manifest.name;
    }

    // Restore objects
    if (project.objects && Array.isArray(project.objects)) {
      project.objects.forEach(obj => {
        objects.push(obj);
        if (Scene3D.initialized()) Scene3D.addObject(obj);
      });
    }
    renderObjectTree();

    // Restore block scripts
    if (project.blockScripts) {
      BlockCanvas.deserialize(project.blockScripts);
    }

    // Restore code files
    if (project.customFiles) {
      CodeEditor.deserialize(project.customFiles);
    }

    // Restore assets
    if (project.assets) {
      Assets.deserialize(project.assets);
    }

    // Select first object
    if (objects.length > 0) selectObject(objects[0].id);

    navigate('blocks');
    saveHistory();
  }

  return { log, selectObject, addObject, deleteObject, refreshProps };
})();
