window.StudioApp = (() => {
  const objects = [];
  const scripts = {};
  const assets = [];
  let selectedObjectId = null;
  let workspace = null;
  let suppressBlocklyEvents = false;
  let currentTemplateKey = 'blank';

  const KEY_OPTIONS = [
    ['W','KeyW'],['A','KeyA'],['S','KeyS'],['D','KeyD'],
    ['Arrow Up','ArrowUp'],['Arrow Left','ArrowLeft'],['Arrow Down','ArrowDown'],['Arrow Right','ArrowRight'],
    ['Space','Space'],['Shift','ShiftLeft'],['Ctrl','ControlLeft'],['Alt','AltLeft'],
    ['Q','KeyQ'],['E','KeyE'],['R','KeyR'],['F','KeyF'],
    ['1','Digit1'],['2','Digit2'],['3','Digit3'],['4','Digit4'],['5','Digit5'],
    ['Enter','Enter'],['Escape','Escape'],['Tab','Tab']
  ];

  const TEMPLATES = {
    blank: { name: 'Blank', objects: [], customCode: '' },
    three_d: {
      name: '3D Starter',
      objects: [
        { type: 'plane', name: 'Ground', x: 0, y: 0, z: 0, scaleX: 24, scaleY: 1, scaleZ: 24, color: '#5d6675' },
        { type: 'character', name: 'Player', x: 0, y: 1, z: 0, color: '#00d4aa' },
        { type: 'camera', name: 'MainCamera', x: 0, y: 5, z: 9, isPlayerCamera: true },
      ],
      customCode: `// 3D starter: top-down action movement\n__events.on('update', (dt) => {\n  const player = Object.values(__objects).find(o => /player/i.test(o.name));\n  if (!player) return;\n  const spd = 6 * dt;\n  if (__isKeyDown('KeyW') || __isKeyDown('ArrowUp')) __moveBy(player, 0, 0, -spd);\n  if (__isKeyDown('KeyS') || __isKeyDown('ArrowDown')) __moveBy(player, 0, 0, spd);\n  if (__isKeyDown('KeyA') || __isKeyDown('ArrowLeft')) __moveBy(player, -spd, 0, 0);\n  if (__isKeyDown('KeyD') || __isKeyDown('ArrowRight')) __moveBy(player, spd, 0, 0);\n});`
    },
    first_person: {
      name: 'First Person',
      objects: [
        { type: 'plane', name: 'Ground', x: 0, y: 0, z: 0, scaleX: 30, scaleY: 1, scaleZ: 30, color: '#4f5b64' },
        { type: 'character', name: 'Player', x: 0, y: 1.7, z: 0, color: '#f9b233' },
        { type: 'camera', name: 'PlayerCamera', x: 0, y: 1.7, z: 0, isPlayerCamera: true },
      ],
      customCode: `// First person template\nlet __fpYaw = 0;\nconst __fpMouse = (e) => { __fpYaw += e.movementX * 0.002; };\ndocument.addEventListener('click', () => document.body.requestPointerLock && document.body.requestPointerLock());\ndocument.addEventListener('pointerlockchange', () => {\n  if (document.pointerLockElement) document.addEventListener('mousemove', __fpMouse);\n  else document.removeEventListener('mousemove', __fpMouse);\n});\n__events.on('update', (dt) => {\n  const player = Object.values(__objects).find(o => /player/i.test(o.name));\n  if (!player) return;\n  player.rotY = __fpYaw * 57.2958;\n  const spd = 5 * dt;\n  if (__isKeyDown('KeyW')) __moveForward(player, spd);\n  if (__isKeyDown('KeyS')) __moveForward(player, -spd);\n  if (__isKeyDown('KeyA')) __turnY(player, -120 * dt);\n  if (__isKeyDown('KeyD')) __turnY(player, 120 * dt);\n});`
    },
    third_person: {
      name: 'Third Person',
      objects: [
        { type: 'plane', name: 'Ground', x: 0, y: 0, z: 0, scaleX: 30, scaleY: 1, scaleZ: 30, color: '#556677' },
        { type: 'character', name: 'Player', x: 0, y: 1, z: 0, color: '#7fc8ff' },
        { type: 'camera', name: 'FollowCamera', x: 0, y: 4, z: 8, isPlayerCamera: true },
      ],
      customCode: `// Third person template\n__events.on('update', (dt) => {\n  const player = Object.values(__objects).find(o => /player/i.test(o.name));\n  if (!player) return;\n  const spd = 4.5 * dt;\n  if (__isKeyDown('KeyW')) __moveForward(player, spd);\n  if (__isKeyDown('KeyS')) __moveForward(player, -spd);\n  if (__isKeyDown('KeyA')) __turnY(player, -140 * dt);\n  if (__isKeyDown('KeyD')) __turnY(player, 140 * dt);\n});`
    },
    two_d: {
      name: '2D',
      objects: [
        { type: 'plane', name: 'Playfield', x: 0, y: -0.5, z: 0, scaleX: 28, scaleY: 1, scaleZ: 16, color: '#2d3145' },
        { type: 'character', name: 'Player', x: -6, y: 0.6, z: 0, color: '#ff8899' },
        { type: 'camera', name: 'OrthoCamera', x: 0, y: 12, z: 0, rotX: -90, isPlayerCamera: true },
      ],
      customCode: `// 2D template: side-scroller movement lock\n__events.on('update', (dt) => {\n  const player = Object.values(__objects).find(o => /player/i.test(o.name));\n  if (!player) return;\n  const spd = 7 * dt;\n  if (__isKeyDown('ArrowLeft') || __isKeyDown('KeyA')) __moveBy(player, -spd, 0, 0);\n  if (__isKeyDown('ArrowRight') || __isKeyDown('KeyD')) __moveBy(player, spd, 0, 0);\n  if (__isKeyDown('ArrowUp') || __isKeyDown('Space')) __moveBy(player, 0, spd, 0);\n  if (__isKeyDown('ArrowDown') || __isKeyDown('ShiftLeft')) __moveBy(player, 0, -spd, 0);\n  __setPos(player, player.x || 0, player.y || 0, 0);\n});`
    }
  };

  const tutorials = {
    blocks: ['Use Blockly blocks to create object scripts.', 'Each object has a dedicated block workspace.', 'Blocks → Code compiles with Blockly JavaScript generator.', 'Code → Blocks restores from BLOCKLY_META comments (best effort).'],
    code: ['Code tab has generated scene + block code + custom code.', 'Scene updates are auto-translated into code.', 'You can keep custom JS in the CUSTOM CODE section.'],
    scene: ['Scene tab places objects in 3D with camera presets.', 'Added objects are translated into scene code.', 'Mark a camera with “PlayerCam=yes” to use it in runtime.'],
    assets: ['Import textures/audio/models here.', 'Assets are embedded in .lorlgame export and available at runtime.']
  };

  function setupBlockly() {
    const darkTheme = (Blockly.Themes && Blockly.Themes.Dark) || ((Blockly.Theme && Blockly.Theme.defineTheme && Blockly.Themes && Blockly.Themes.Classic) ? Blockly.Theme.defineTheme('lorlDark', {
      base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#0f1020',
        toolboxBackgroundColour: '#15152a',
        toolboxForegroundColour: '#e2e2f0',
        flyoutBackgroundColour: '#1a1a32',
        flyoutForegroundColour: '#e2e2f0',
        flyoutOpacity: 1,
        scrollbarColour: '#444477',
        insertionMarkerColour: '#00e5ff',
        insertionMarkerOpacity: 0.4,
      },
      fontStyle: { family: 'Sora, sans-serif', weight: '500', size: 12 },
    }) : undefined);

    workspace = Blockly.inject('blocklyDiv', {
      toolbox: {
        kind: 'categoryToolbox',
        contents: [
          { kind: 'category', name: 'Events', colour: '#f59e0b', contents: [{ kind: 'block', type: 'event_start' }, { kind: 'block', type: 'event_update' }, { kind: 'block', type: 'event_key_down' }, { kind: 'block', type: 'event_key_up' }] },
          { kind: 'category', name: 'Motion', colour: '#06b6d4', contents: [{ kind: 'block', type: 'move_by' }, { kind: 'block', type: 'set_position' }, { kind: 'block', type: 'move_forward' }, { kind: 'block', type: 'turn_y' }, { kind: 'block', type: 'look_at_name' }] },
          { kind: 'category', name: 'Appearance', colour: '#ec4899', contents: [{ kind: 'block', type: 'set_color_hex' }, { kind: 'block', type: 'set_scale_xyz' }] },
          { kind: 'category', name: 'UI', colour: '#84cc16', contents: [{ kind: 'block', type: 'show_text' }] },
          { kind: 'category', name: 'Logic', colour: '#8b5cf6', contents: [{ kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'key_is_down' }, { kind: 'block', type: 'wait_seconds' }] },
          { kind: 'category', name: 'Math', colour: '#10b981', contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }] },
          { kind: 'category', name: 'Text', colour: '#64748b', contents: [{ kind: 'block', type: 'text' }, { kind: 'block', type: 'text_print' }] },
          { kind: 'category', name: 'Variables', custom: 'VARIABLE' }
        ]
      },
      grid: { spacing: 20, length: 3, colour: '#2a2a4a', snap: true },
      theme: darkTheme,
      renderer: 'zelos'
    });

    const gen = Blockly.JavaScript || (window.javascript && window.javascript.javascriptGenerator);

    Blockly.Blocks.event_start = { init() { this.appendDummyInput().appendField('when game starts'); this.appendStatementInput('DO'); this.setColour('#f59e0b'); this.setNextStatement(false); this.setPreviousStatement(false); } };
    gen.forBlock.event_start = block => `__events.on('start', async () => {\n${gen.statementToCode(block,'DO')}});\n`;

    Blockly.Blocks.event_key_down = { init() { this.appendDummyInput().appendField('when key').appendField(new Blockly.FieldDropdown(KEY_OPTIONS), 'KEY').appendField('pressed'); this.appendStatementInput('DO'); this.setColour('#f59e0b'); } };
    gen.forBlock.event_key_down = block => `__events.on('keydown:${block.getFieldValue('KEY')}', async () => {\n${gen.statementToCode(block,'DO')}});\n`;

    Blockly.Blocks.event_key_up = { init() { this.appendDummyInput().appendField('when key').appendField(new Blockly.FieldDropdown(KEY_OPTIONS), 'KEY').appendField('released'); this.appendStatementInput('DO'); this.setColour('#f59e0b'); } };
    gen.forBlock.event_key_up = block => `__events.on('keyup:${block.getFieldValue('KEY')}', async () => {
${gen.statementToCode(block,'DO')}});
`;

    Blockly.Blocks.event_update = { init() { this.appendDummyInput().appendField('every frame'); this.appendStatementInput('DO'); this.setColour('#f59e0b'); } };
    gen.forBlock.event_update = block => `__events.on('update', async (dt) => {
${gen.statementToCode(block,'DO')}});
`;


    Blockly.Blocks.move_by = { init() { this.appendDummyInput().appendField('move by x').appendField(new Blockly.FieldNumber(0), 'X').appendField('y').appendField(new Blockly.FieldNumber(0), 'Y').appendField('z').appendField(new Blockly.FieldNumber(0), 'Z'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#06b6d4'); } };
    gen.forBlock.move_by = b => `__moveBy(self, ${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('Z')});\n`;

    Blockly.Blocks.set_position = { init() { this.appendDummyInput().appendField('set position x').appendField(new Blockly.FieldNumber(0), 'X').appendField('y').appendField(new Blockly.FieldNumber(0), 'Y').appendField('z').appendField(new Blockly.FieldNumber(0), 'Z'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#06b6d4'); } };
    gen.forBlock.set_position = b => `__setPos(self, ${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('Z')});\n`;

    Blockly.Blocks.move_forward = { init() { this.appendDummyInput().appendField('move forward').appendField(new Blockly.FieldNumber(1), 'DIST'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#06b6d4'); } };
    gen.forBlock.move_forward = b => `__moveForward(self, ${b.getFieldValue('DIST')});
`;

    Blockly.Blocks.turn_y = { init() { this.appendDummyInput().appendField('turn Y by').appendField(new Blockly.FieldNumber(10), 'DEG').appendField('deg'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#06b6d4'); } };
    gen.forBlock.turn_y = b => `__turnY(self, ${b.getFieldValue('DEG')});
`;


    Blockly.Blocks.look_at_name = { init() { this.appendDummyInput().appendField('look at object').appendField(new Blockly.FieldTextInput('Player'), 'NAME'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#06b6d4'); } };
    gen.forBlock.look_at_name = b => `__lookAt(self, ${JSON.stringify(b.getFieldValue('NAME'))});\n`;

    function makeColorField(defaultColor) {
      if (Blockly.FieldColour) return new Blockly.FieldColour(defaultColor);
      if (Blockly.fieldRegistry && Blockly.fieldRegistry.fromJson) {
        try { return Blockly.fieldRegistry.fromJson({ type: 'field_colour', colour: defaultColor }); } catch (_) {}
      }
      return new Blockly.FieldTextInput(defaultColor);
    }

    Blockly.Blocks.set_color_hex = { init() { this.appendDummyInput().appendField('set color').appendField(makeColorField('#ff0000'), 'COLOR'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#ec4899'); } };
    gen.forBlock.set_color_hex = b => `__setColor(self, ${JSON.stringify(b.getFieldValue('COLOR'))});\n`;

    Blockly.Blocks.set_scale_xyz = { init() { this.appendDummyInput().appendField('set scale x').appendField(new Blockly.FieldNumber(1,0.01), 'X').appendField('y').appendField(new Blockly.FieldNumber(1,0.01), 'Y').appendField('z').appendField(new Blockly.FieldNumber(1,0.01), 'Z'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#ec4899'); } };
    gen.forBlock.set_scale_xyz = b => `__setScale(self, ${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('Z')});\n`;

    Blockly.Blocks.show_text = { init() { this.appendDummyInput().appendField('show text').appendField(new Blockly.FieldTextInput('Hello'), 'MSG').appendField('for sec').appendField(new Blockly.FieldNumber(2,0), 'SEC'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#84cc16'); } };
    gen.forBlock.show_text = b => `__showText(${JSON.stringify(b.getFieldValue('MSG'))}, ${b.getFieldValue('SEC')});\n`;

    Blockly.Blocks.wait_seconds = { init() { this.appendDummyInput().appendField('wait sec').appendField(new Blockly.FieldNumber(1,0), 'SEC'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#8b5cf6'); } };
    gen.forBlock.wait_seconds = b => `await __wait(${b.getFieldValue('SEC')});
`;

    Blockly.Blocks.key_is_down = { init() { this.appendDummyInput().appendField('key').appendField(new Blockly.FieldDropdown(KEY_OPTIONS), 'KEY').appendField('is down?'); this.setOutput(true, 'Boolean'); this.setColour('#8b5cf6'); } };
    gen.forBlock.key_is_down = b => [`__isKeyDown(${JSON.stringify(b.getFieldValue('KEY'))})`, gen.ORDER_FUNCTION_CALL || 2];


    workspace.addChangeListener(() => {
      if (suppressBlocklyEvents || !selectedObjectId) return;
      scripts[selectedObjectId] = Blockly.serialization.workspaces.save(workspace);
      syncCodeFromBlocks();
    });
  }

  function nextObjName(type) { return `${type}_${objects.filter(o => o.type === type).length + 1}`; }

  function addObject(type = 'cube', seed = {}) {
    const id = seed.id || `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const defaults = { id, type, name: seed.name || nextObjName(type), x: 0, y: type === 'plane' ? 0 : 0.5, z: 0, rotX: 0, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, color: '#4488ff', isPlayerCamera: false };
    const obj = { ...defaults, ...seed, id, type };
    objects.push(obj);
    renderObjects();
    if (Scene3D.initialized()) Scene3D.addObject(obj);
    return obj;
  }

  function clearProject() {
    const toRemove = [...objects];
    toRemove.forEach(o => Scene3D.initialized() && Scene3D.removeObject(o.id));
    objects.length = 0;
    Object.keys(scripts).forEach(k => delete scripts[k]);
    selectedObjectId = null;
    renderObjects();
    document.getElementById('props-content').innerHTML = '<div class="log">Select an object</div>';
    suppressBlocklyEvents = true; workspace.clear(); suppressBlocklyEvents = false;
  }

  function applyTemplate(key, opts = {}) {
    const tpl = TEMPLATES[key] || TEMPLATES.blank;
    currentTemplateKey = key in TEMPLATES ? key : 'blank';
    document.getElementById('template-select').value = key;
    clearProject();
    tpl.objects.forEach(seed => addObject(seed.type, { ...seed }));
    if (objects[0]) selectObject(objects[0].id);
    syncCodeFromBlocks(tpl.customCode || '');
    try { localStorage.setItem('lorl:lastTemplate', key); } catch (_) {}
    if (!opts.silent) log(`Applied template: ${tpl.name}`, 'success');
  }

  function openTemplateOverlay() {
    const overlay = document.getElementById('template-overlay');
    overlay.classList.remove('hidden');

    const choose = (key) => {
      overlay.classList.add('hidden');
      applyTemplate(key);
      log('Studio ready. Template loaded.', 'success');
    };

    overlay.querySelectorAll('[data-template]').forEach(btn => {
      btn.onclick = () => choose(btn.dataset.template);
    });
  }

  function renderObjects() {
    const tree = document.getElementById('object-tree');
    tree.innerHTML = objects.map(o => `<div class="obj-row ${o.id === selectedObjectId ? 'selected' : ''}" data-id="${o.id}"><span>${o.type} • ${escapeHtml(o.name)}</span><span>🗑</span></div>`).join('') || '<div class="log">No objects</div>';
    tree.querySelectorAll('.obj-row').forEach(row => {
      row.onclick = (e) => {
        const obj = objects.find(o => o.id === row.dataset.id);
        if (!obj) return;
        if (e.target.textContent === '🗑') {
          Scene3D.initialized() && Scene3D.removeObject(obj.id);
          const i = objects.findIndex(x => x.id === obj.id);
          if (i >= 0) objects.splice(i, 1);
          delete scripts[obj.id];
          if (selectedObjectId === obj.id) selectedObjectId = null;
          renderObjects();
          syncCodeFromBlocks();
        } else {
          selectObject(obj.id);
        }
      };
    });
  }

  function selectObject(id) {
    selectedObjectId = id;
    renderObjects();
    renderProps(objects.find(o => o.id === id));
    suppressBlocklyEvents = true;
    workspace.clear();
    if (scripts[id]) {
      try {
        Blockly.serialization.workspaces.load(scripts[id], workspace);
      } catch (err) {
        log('Failed to load block script for this object; script was reset.', 'warn');
        delete scripts[id];
      }
    }
    suppressBlocklyEvents = false;
  }

  function renderProps(obj) {
    const p = document.getElementById('props-content');
    if (!obj) return (p.innerHTML = '<div class="log">Select an object</div>');
    p.innerHTML = '';
    const fields = [['name', 'text'], ['x', 'number'], ['y', 'number'], ['z', 'number'], ['rotY', 'number'], ['scaleX', 'number'], ['scaleY', 'number'], ['scaleZ', 'number'], ['color', 'text']];
    if (obj.type === 'camera') fields.push(['isPlayerCamera', 'select']);
    fields.forEach(([key, type]) => {
      const row = document.createElement('div'); row.className = 'prop';
      const label = document.createElement('span'); label.textContent = key;
      let input;
      if (type === 'select') {
        input = document.createElement('select');
        input.innerHTML = `<option value="false">No</option><option value="true" ${obj[key] ? 'selected' : ''}>Yes</option>`;
      } else {
        input = document.createElement('input'); input.type = type; input.value = obj[key];
      }
      input.oninput = () => {
        obj[key] = type === 'number' ? parseFloat(input.value) || 0 : (type === 'select' ? input.value === 'true' : input.value);
        Scene3D.initialized() && Scene3D.updateObject(obj);
        syncCodeFromBlocks();
      };
      row.append(label, input); p.appendChild(row);
    });
  }

  function sceneJsonCode() { return `const __sceneObjects = ${JSON.stringify(objects, null, 2)};\n`; }

  function buildBlockCodeForObject(obj) {
    const data = scripts[obj.id];
    if (!data) return '';
    const temp = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(data, temp);
    const gen = Blockly.JavaScript || (window.javascript && window.javascript.javascriptGenerator);
    const generated = gen.workspaceToCode(temp);
    temp.dispose();
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return `// BLOCKLY_META:${obj.id}:${encoded}\n(function(){\nconst self = __sceneObjects.find(o => o.id === ${JSON.stringify(obj.id)});\nif(!self) return;\n${generated}\n})();\n`;
  }

  function extractCustomFromEditor() {
    const text = document.getElementById('code-textarea').value;
    const m = text.match(/\/\/ === CUSTOM CODE START ===([\s\S]*?)\/\/ === CUSTOM CODE END ===/);
    return m ? m[1].trim() : '';
  }

  function syncCodeFromBlocks(customOverride) {
    const custom = customOverride !== undefined ? customOverride : extractCustomFromEditor();
    const sections = [
      '// === GENERATED SCENE ===',
      sceneJsonCode(),
      `const __templateMode = ${JSON.stringify(currentTemplateKey)};`,
      '// === GENERATED BLOCK SCRIPTS ===',
      ...objects.map(buildBlockCodeForObject),
      '// === CUSTOM CODE START ===',
      custom || '// Write custom code here',
      '// === CUSTOM CODE END ==='
    ];
    document.getElementById('code-textarea').value = sections.join('\n\n');
  }

  function syncBlocksFromCode() {
    const code = document.getElementById('code-textarea').value;
    const re = /\/\/ BLOCKLY_META:([^:]+):([^\n]+)/g;
    let m; let count = 0;
    while ((m = re.exec(code))) {
      try {
        scripts[m[1]] = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
        count++;
      } catch (_) {}
    }
    if (selectedObjectId) selectObject(selectedObjectId);
    log(count ? `Restored ${count} Blockly workspace(s).` : 'No BLOCKLY_META found. Cannot fully restore manual code.', count ? 'success' : 'warn');
  }

  function runtimeLibCode() {
    return `const __objects = {};\nconst __vars = {};\nconst __events = (()=>{ const m={}; return { on:(e,cb)=>(m[e]=(m[e]||[]).concat(cb)), emit:(e,d)=>((m[e]||[]).forEach(f=>f(d))), stopAll:()=>Object.keys(m).forEach(k=>m[k]=[]) };})();\n\nfunction __setPos(o,x,y,z){o.x=x;o.y=y;o.z=z;if(o.mesh)o.mesh.position.set(x,y,z);}\nfunction __moveBy(o,x,y,z){__setPos(o,(o.x||0)+x,(o.y||0)+y,(o.z||0)+z);}\nfunction __lookAt(o,name){const t=Object.values(__objects).find(v=>v.name===name);if(t&&o.mesh)o.mesh.lookAt(t.x||0,t.y||0,t.z||0);}\nfunction __setColor(o,c){o.color=c;if(o.mesh&&o.mesh.material)o.mesh.material.color.set(c);}\nfunction __setScale(o,x,y,z){o.scaleX=x;o.scaleY=y;o.scaleZ=z;if(o.mesh)o.mesh.scale.set(x,y,z);}\nfunction __showText(msg,sec){const el=document.getElementById('__hud_msg')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'__hud_msg'});el.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);padding:8px 12px;background:#0009;color:#fff;border-radius:8px;z-index:20';el.textContent=msg;setTimeout(()=>el.remove(),(sec||2)*1000);}
function __wait(sec){return new Promise(r=>setTimeout(r,(sec||0)*1000));}
const __keyState = {};
function __isKeyDown(code){return !!__keyState[code];}
function __moveForward(o,dist){const yaw=(o.rotY||0)*Math.PI/180;__moveBy(o,Math.sin(yaw)*dist,0,-Math.cos(yaw)*dist);}
function __turnY(o,deg){o.rotY=(o.rotY||0)+deg;if(o.mesh)o.mesh.rotation.y=(o.rotY||0)*Math.PI/180;}
`;
  }

  function buildPlayableHtml() {
    const editorCode = document.getElementById('code-textarea').value;
    const sanitizedEditorCode = editorCode
      .replace(/\/\/ === GENERATED SCENE ===[\s\S]*?\/\/ === GENERATED BLOCK SCRIPTS ===/, '// === GENERATED BLOCK SCRIPTS ===')
      .replace(/const __sceneObjects\s*=\s*[\s\S]*?;\n/, '')
      .replace(/const __templateMode\s*=\s*[^;]+;\n/, '');
    return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0a0a12}canvas{display:block;width:100%;height:100%}</style>
</head><body>
<canvas id="game"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
${runtimeLibCode()}
const __sceneObjects = ${JSON.stringify(objects)};
const __templateMode = ${JSON.stringify(currentTemplateKey)};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1020);

const camDef = __sceneObjects.find(o => o.type === 'camera' && o.isPlayerCamera) || __sceneObjects.find(o => o.type === 'camera');
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
if (camDef) {
  camera.position.set(camDef.x || 0, camDef.y || 6, camDef.z || 10);
  camera.rotation.set(((camDef.rotX||0)*Math.PI/180), ((camDef.rotY||0)*Math.PI/180), ((camDef.rotZ||0)*Math.PI/180));
} else {
  camera.position.set(0, 6, 10);
}
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

scene.add(new THREE.HemisphereLight(0xffffff,0x333344,1));
const dl = new THREE.DirectionalLight(0xffffff,0.8); dl.position.set(8,12,6); scene.add(dl);

for (const o of __sceneObjects) {
  let mesh = null;
  const mat = new THREE.MeshStandardMaterial({ color: o.color || '#4488ff' });
  if (o.type === 'cube') mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
  else if (o.type === 'sphere') mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5,20,12), mat);
  else if (o.type === 'cylinder') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1,16), mat);
  else if (o.type === 'plane') { mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), mat); mesh.rotation.x = -Math.PI/2; }
  else if (o.type === 'character') { const g=new THREE.Group(); const torso=new THREE.Mesh(new THREE.BoxGeometry(0.6,1,0.4),mat); const head=new THREE.Mesh(new THREE.SphereGeometry(0.25,12,10),mat); head.position.y=0.75; g.add(torso); g.add(head); mesh=g; }

  if (mesh) {
    mesh.position.set(o.x || 0, o.y || 0, o.z || 0);
    mesh.rotation.set((o.rotX||0)*Math.PI/180, (o.rotY||0)*Math.PI/180, (o.rotZ||0)*Math.PI/180);
    mesh.scale.set(o.scaleX || 1, o.scaleY || 1, o.scaleZ || 1);
    scene.add(mesh);
    o.mesh = mesh;
  }
  __objects[o.id] = o;
}

${sanitizedEditorCode}

const player = __sceneObjects.find(o => o.type === 'character' && /player/i.test(o.name)) || __sceneObjects.find(o => o.type === 'character');
const followDist = 6;
const followHeight = 3;

addEventListener('keydown', e => { __keyState[e.code]=true; __events.emit('keydown:' + e.code); });
addEventListener('keyup', e => { __keyState[e.code]=false; __events.emit('keyup:' + e.code); });
__events.emit('start');

(function loop(){
  requestAnimationFrame(loop);
  if (camDef && camDef.isPlayerCamera && player && player.mesh) {
    if (__templateMode === 'first_person') {
      const yaw = (player.rotY || 0) * Math.PI / 180;
      camera.position.lerp(new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 1.5, player.mesh.position.z), 0.3);
      camera.lookAt(player.mesh.position.x + Math.sin(yaw) * 8, player.mesh.position.y + 1.5, player.mesh.position.z - Math.cos(yaw) * 8);
    } else if (__templateMode === 'two_d') {
      camera.position.lerp(new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + 3, 11), 0.16);
      camera.lookAt(player.mesh.position.x, player.mesh.position.y, 0);
    } else {
      camera.position.lerp(new THREE.Vector3(player.mesh.position.x, player.mesh.position.y + followHeight, player.mesh.position.z + followDist), 0.1);
      camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1, player.mesh.position.z);
    }
  }
  __events.emit('update', 1/60);
  renderer.render(scene, camera);
})();
<\/script>
</body></html>`;
  }

  function previewGame() {
    syncCodeFromBlocks();
    const html = buildPlayableHtml();
    const frame = document.getElementById('preview-frame');
    frame.removeAttribute('src');
    frame.srcdoc = html;
    log('Preview running.', 'success');
  }

  async function exportGame() {
    syncCodeFromBlocks();
    const zip = new JSZip();
    const projectName = document.getElementById('project-name').value || 'my_game';
    const gameId = projectName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    zip.file('manifest.json', JSON.stringify({ id: gameId, name: projectName, author: 'Unknown', description: '', version: '1.0.0', lorlVersion: '1' }, null, 2));
    zip.file('index.html', buildPlayableHtml());
    zip.file('.lorl-studio-data', JSON.stringify({ projectName, currentTemplateKey, objects, scripts, assets, code: document.getElementById('code-textarea').value }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${gameId || 'game'}.lorlgame`; a.click();
    URL.revokeObjectURL(a.href);
    log('Exported .lorlgame (html runtime + studio data).', 'success');
  }

  async function importGame(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const dataFile = zip.file('.lorl-studio-data');
    if (!dataFile) throw new Error('Missing .lorl-studio-data.');
    const payload = JSON.parse(await dataFile.async('string'));
    clearProject();
    currentTemplateKey = payload.currentTemplateKey && TEMPLATES[payload.currentTemplateKey] ? payload.currentTemplateKey : currentTemplateKey;
    document.getElementById('template-select').value = currentTemplateKey;
    (payload.objects || []).forEach(o => addObject(o.type, o));
    Object.assign(scripts, payload.scripts || {});
    assets.splice(0, assets.length, ...(payload.assets || []));
    renderAssets();
    if (payload.code) document.getElementById('code-textarea').value = payload.code;
    if (objects[0]) selectObject(objects[0].id);
    log(`Imported ${file.name}`, 'success');
  }

  function ensureScene() {
    if (!Scene3D.initialized()) {
      Scene3D.init();
      objects.forEach(o => Scene3D.addObject(o));
    }
  }

  function renderAssets() {
    const grid = document.getElementById('assets-grid');
    grid.innerHTML = assets.map(a => `<div class="asset-card">📦 ${escapeHtml(a.name)}</div>`).join('') || '<div class="log">No assets yet.</div>';
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        if (btn.dataset.tab === 'scene') ensureScene();
      };
    });
  }

  function setupTutorials() {
    let idx = 0;
    const overlay = document.getElementById('tutorial-overlay');
    const title = document.getElementById('tutorial-title');
    const body = document.getElementById('tutorial-body');
    function show() {
      const tab = document.querySelector('.tab-btn.active')?.dataset.tab || 'blocks';
      const list = tutorials[tab];
      title.textContent = `${tab} tutorial (${idx + 1}/${list.length})`;
      body.textContent = list[idx];
      overlay.classList.remove('hidden');
    }
    document.getElementById('btn-tutorial').onclick = () => { idx = 0; show(); };
    document.getElementById('tutorial-next').onclick = () => { const tab = document.querySelector('.tab-btn.active')?.dataset.tab || 'blocks'; idx = (idx + 1) % tutorials[tab].length; show(); };
    document.getElementById('tutorial-close').onclick = () => overlay.classList.add('hidden');
  }

  function setupUi() {
    setupTabs();
    setupTutorials();

    document.getElementById('btn-add-object').onclick = () => {
      const type = prompt('Type: cube, sphere, cylinder, plane, character, camera', 'cube') || 'cube';
      addObject(type.trim().toLowerCase());
      syncCodeFromBlocks();
    };

    document.querySelectorAll('#scene-toolbar [data-add]').forEach(btn => btn.onclick = () => { addObject(btn.dataset.add); syncCodeFromBlocks(); });
    document.querySelectorAll('#scene-toolbar [data-view]').forEach(btn => btn.onclick = () => Scene3D.setView(btn.dataset.view));

    document.getElementById('btn-sync-from-blocks').onclick = () => syncCodeFromBlocks();
    document.getElementById('btn-sync-to-blocks').onclick = syncBlocksFromCode;
    document.getElementById('btn-preview').onclick = previewGame;
    document.getElementById('btn-export').onclick = exportGame;

    document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { await importGame(file); } catch (err) { log(`Import failed: ${err.message}`, 'error'); }
      e.target.value = '';
    };

    document.getElementById('btn-import-asset').onclick = () => document.getElementById('asset-file-input').click();
    document.getElementById('asset-file-input').onchange = async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        assets.push({ name: f.name, type: f.type, data });
      }
      renderAssets();
      log(`Imported ${e.target.files.length} asset(s).`, 'success');
      e.target.value = '';
    };

    document.getElementById('btn-apply-template').onclick = () => {
      if (objects.length && !confirm('Apply a new template? This replaces current scene/blocks/code.')) return;
      applyTemplate(document.getElementById('template-select').value);
    };
  }

  function log(message, level = 'info') {
    const el = document.createElement('div');
    el.className = `log ${level}`;
    el.textContent = message;
    const out = document.getElementById('console-output');
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  function boot() {
    setupBlockly();
    setupUi();
    try {
      const last = localStorage.getItem('lorl:lastTemplate');
      if (last && TEMPLATES[last]) document.getElementById('template-select').value = last;
    } catch (_) {}
    openTemplateOverlay();
  }

  boot();
  return { log, selectObject, refreshProps: () => renderProps(objects.find(o => o.id === selectedObjectId)) };
})();
