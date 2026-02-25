window.StudioApp = (() => {
  const objects = [];
  const scripts = {};
  const assets = [];
  let selectedObjectId = null;
  let workspace = null;

  const TUTORIALS = {
    blocks: [
      'Blocks tab: drag blocks from the toolbox. Each object has its own workspace.',
      'Use Blocks → Code to generate JavaScript using Blockly\'s official generator.',
      'Use Code → Blocks to restore blocks from code metadata comments.'
    ],
    code: [
      'Code tab shows generated block code + scene bootstrap code + your custom code.',
      'Scene code section is auto-generated from objects in the Scene tab.',
      'If metadata comments exist, Code → Blocks can rebuild your block workspace.'
    ],
    scene: [
      'Scene tab is a real Three.js viewport where objects are visible and selectable.',
      'Buttons add new objects and update both the scene and code generation.',
      'Scene view buttons (persp/top/front) control camera orientation.'
    ],
    assets: [
      'Assets tab stores imported files as data URLs for export portability.',
      'Assets are bundled into .lorlgame as JSON in project.lorl.json.'
    ]
  };

  function initBlockly() {
    workspace = Blockly.inject('blocklyDiv', {
      toolbox: {
        kind: 'categoryToolbox',
        contents: [
          { kind: 'category', name: 'Events', colour: '#f59e0b', contents: [{ kind: 'block', type: 'event_start' }] },
          { kind: 'category', name: 'Motion', colour: '#3b82f6', contents: [{ kind: 'block', type: 'move_by' }, { kind: 'block', type: 'set_position' }] },
          { kind: 'category', name: 'Logic', colour: '#8b5cf6', contents: [{ kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'logic_compare' }] },
          { kind: 'category', name: 'Math', colour: '#10b981', contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }] },
          { kind: 'category', name: 'Text', colour: '#ec4899', contents: [{ kind: 'block', type: 'text' }, { kind: 'block', type: 'text_print' }] }
        ]
      },
      grid: { spacing: 20, length: 3, colour: '#2a2a4a', snap: true }
    });

    const jsGen = Blockly.JavaScript || (window.javascript && window.javascript.javascriptGenerator);

    Blockly.Blocks.event_start = {
      init() {
        this.appendDummyInput().appendField('when game starts');
        this.appendStatementInput('DO');
        this.setColour('#f59e0b');
      }
    };
    jsGen.forBlock.event_start = block => {
      const body = jsGen.statementToCode(block, 'DO');
      return `window.addEventListener('load', () => {\n${body}});\n`;
    };

    Blockly.Blocks.move_by = {
      init() {
        this.appendDummyInput()
          .appendField('move by x').appendField(new Blockly.FieldNumber(0), 'X')
          .appendField('y').appendField(new Blockly.FieldNumber(0), 'Y')
          .appendField('z').appendField(new Blockly.FieldNumber(0), 'Z');
        this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#3b82f6');
      }
    };
    jsGen.forBlock.move_by = block => {
      return `self.x += ${block.getFieldValue('X')}; self.y += ${block.getFieldValue('Y')}; self.z += ${block.getFieldValue('Z')};\n`;
    };

    Blockly.Blocks.set_position = {
      init() {
        this.appendDummyInput()
          .appendField('set position x').appendField(new Blockly.FieldNumber(0), 'X')
          .appendField('y').appendField(new Blockly.FieldNumber(0), 'Y')
          .appendField('z').appendField(new Blockly.FieldNumber(0), 'Z');
        this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#3b82f6');
      }
    };
    jsGen.forBlock.set_position = block => `self.x=${block.getFieldValue('X')}; self.y=${block.getFieldValue('Y')}; self.z=${block.getFieldValue('Z')};\n`;

    workspace.addChangeListener(() => {
      if (!selectedObjectId) return;
      scripts[selectedObjectId] = Blockly.serialization.workspaces.save(workspace);
      updateCodeFromBlocks();
    });
  }

  function addObject(type='cube') {
    const id = `obj_${Date.now()}_${Math.floor(Math.random()*9999)}`;
    const obj = { id, type, name: `${type}_${objects.filter(o => o.type===type).length + 1}`, x:0, y: type==='plane'?0:0.5, z:0, color:'#4488ff', scaleX:1, scaleY:1, scaleZ:1 };
    if (type === 'plane') { obj.scaleX = 8; obj.scaleZ = 8; obj.color = '#666666'; }
    objects.push(obj);
    renderObjects();
    selectObject(id);
    if (Scene3D.initialized()) Scene3D.addObject(obj);
  }

  function renderObjects() {
    const tree = document.getElementById('object-tree');
    tree.innerHTML = '';
    objects.forEach(o => {
      const row = document.createElement('div');
      row.className = `obj-row ${o.id===selectedObjectId?'selected':''}`;
      row.textContent = `${o.type} • ${o.name}`;
      row.onclick = () => selectObject(o.id);
      tree.appendChild(row);
    });
  }

  function selectObject(id) {
    selectedObjectId = id;
    renderObjects();
    const obj = objects.find(o => o.id === id);
    renderProps(obj);
    const data = scripts[id];
    workspace.clear();
    if (data) Blockly.serialization.workspaces.load(data, workspace);
  }

  function renderProps(obj) {
    const p = document.getElementById('props-content');
    if (!obj) { p.textContent = 'Select an object'; return; }
    p.innerHTML = '';
    [['name','text'],['x','number'],['y','number'],['z','number'],['color','text']].forEach(([key,type]) => {
      const row = document.createElement('div'); row.className = 'prop';
      const label = document.createElement('span'); label.textContent = key;
      const input = document.createElement('input'); input.type = type; input.value = obj[key];
      input.oninput = () => { obj[key] = type==='number' ? parseFloat(input.value)||0 : input.value; Scene3D.updateObject(obj); updateCodeFromBlocks(); };
      row.append(label, input); p.appendChild(row);
    });
  }

  function sceneCode() {
    return `// Scene setup\nconst sceneObjects = ${JSON.stringify(objects, null, 2)};\n`;
  }

  function blockCodeForObject(obj) {
    const data = scripts[obj.id];
    if (!data) return '';
    const temp = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(data, temp);
    const gen = Blockly.JavaScript || (window.javascript && window.javascript.javascriptGenerator);
    const generated = gen.workspaceToCode(temp);
    temp.dispose();
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return `// BLOCKLY_META:${obj.id}:${encoded}\n(function(){\nconst self = sceneObjects.find(o=>o.id===${JSON.stringify(obj.id)});\n${generated}\n})();\n`;
  }

  function updateCodeFromBlocks() {
    const code = [sceneCode(), '// Blockly generated scripts\n', ...objects.map(blockCodeForObject)].join('\n');
    document.getElementById('code-textarea').value = code;
  }

  function codeToBlocks() {
    const code = document.getElementById('code-textarea').value;
    const re = /\/\/ BLOCKLY_META:([^:]+):([^\n]+)/g;
    let m; let count = 0;
    while ((m = re.exec(code))) {
      try {
        const id = m[1];
        const decoded = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
        scripts[id] = decoded;
        count++;
      } catch (_) {}
    }
    if (selectedObjectId) selectObject(selectedObjectId);
    log(count ? `Restored ${count} block workspace(s) from code metadata.` : 'No Blockly metadata found in code.', count ? 'success' : 'warn');
  }

  async function preview() {
    updateCodeFromBlocks();
    const userCode = document.getElementById('code-textarea').value;
    const html = `<!doctype html><html><body style="margin:0;background:#111"><pre id="out" style="color:#9ef;padding:12px"></pre><script>const log=(m)=>document.getElementById('out').textContent+=m+'\\n';${userCode};log('Preview loaded');<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    document.getElementById('preview-frame').src = URL.createObjectURL(blob);
    log('Preview updated.', 'success');
  }

  async function exportProject() {
    const zip = new JSZip();
    const payload = {
      projectName: document.getElementById('project-name').value,
      objects,
      scripts,
      assets,
      code: document.getElementById('code-textarea').value
    };
    zip.file('project.lorl.json', JSON.stringify(payload, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(payload.projectName || 'project').replace(/\s+/g,'_')}.lorlgame`;
    a.click();
    URL.revokeObjectURL(a.href);
    log('Exported project (without encryption).', 'success');
  }

  function initSceneTab() {
    if (!Scene3D.initialized()) {
      Scene3D.init();
      objects.forEach(o => Scene3D.addObject(o));
    }
  }

  function setupAssets() {
    document.getElementById('btn-import-asset').onclick = () => document.getElementById('asset-file-input').click();
    document.getElementById('asset-file-input').onchange = async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        assets.push({ name: f.name, type: f.type, data });
      }
      renderAssets();
      log(`Imported ${e.target.files.length} asset(s).`, 'success');
    };
  }

  function renderAssets() {
    const grid = document.getElementById('assets-grid');
    grid.innerHTML = assets.map(a => `<div class="log">📦 ${a.name}</div>`).join('') || '<div class="log">No assets yet.</div>';
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
        if (tab === 'scene') initSceneTab();
      };
    });
  }

  function setupTutorials() {
    let tab = 'blocks', idx = 0;
    const overlay = document.getElementById('tutorial-overlay');
    const title = document.getElementById('tutorial-title');
    const body = document.getElementById('tutorial-body');
    const show = () => {
      const activeBtn = document.querySelector('.tab-btn.active');
      tab = activeBtn ? activeBtn.dataset.tab : 'blocks';
      const list = TUTORIALS[tab];
      title.textContent = `${tab[0].toUpperCase()+tab.slice(1)} tutorial (${idx+1}/${list.length})`;
      body.textContent = list[idx];
      overlay.classList.remove('hidden');
    };
    document.getElementById('btn-tutorial').onclick = () => { idx = 0; show(); };
    document.getElementById('tutorial-next').onclick = () => {
      const list = TUTORIALS[tab];
      idx = (idx + 1) % list.length;
      show();
    };
    document.getElementById('tutorial-close').onclick = () => overlay.classList.add('hidden');
  }

  function log(message, level='info') {
    const el = document.createElement('div');
    el.className = `log ${level}`;
    el.textContent = message;
    document.getElementById('console-output').appendChild(el);
    document.getElementById('console-output').scrollTop = 1e9;
  }

  function boot() {
    setupTabs();
    setupAssets();
    setupTutorials();
    initBlockly();

    document.getElementById('btn-add-object').onclick = () => addObject('cube');
    document.querySelectorAll('#scene-toolbar [data-add]').forEach(btn => btn.onclick = () => addObject(btn.dataset.add));
    document.querySelectorAll('#scene-toolbar [data-view]').forEach(btn => btn.onclick = () => Scene3D.setView(btn.dataset.view));

    document.getElementById('btn-sync-from-blocks').onclick = updateCodeFromBlocks;
    document.getElementById('btn-sync-to-blocks').onclick = codeToBlocks;
    document.getElementById('btn-preview').onclick = preview;
    document.getElementById('btn-export').onclick = exportProject;

    addObject('plane');
    addObject('cube');
    log('Studio ready. Blockly + code sync + scene + assets initialized.', 'success');
  }

  boot();
  return { log };
})();
