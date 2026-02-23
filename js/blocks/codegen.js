/**
 * codegen.js — Converts block scripts to JavaScript for the game runtime
 */

window.CodeGen = (() => {

  function blocksToJS(objectId, blocks, objectDefs) {
    if (!blocks || blocks.length === 0) return '';
    
    const lines = [];
    lines.push(`// === Script: ${objectId} ===`);
    lines.push(`(function() {`);
    lines.push(`  const self = __objects["${objectId}"];`);
    lines.push(`  if (!self) return;`);

    // Group hat blocks and their children
    // For now, flat sequential processing grouped by hat type
    const hats = blocks.filter(b => {
      const def = findDef(b.id);
      return def && def.type === 'hat';
    });
    const stacks = blocks.filter(b => {
      const def = findDef(b.id);
      return def && def.type !== 'hat';
    });

    hats.forEach(hat => {
      const code = genHat(hat, stacks, objectId);
      lines.push(code);
    });

    // Standalone blocks without hats get wrapped in onStart
    const orphans = stacks.filter(b => !isChildOf(b, hats, blocks));
    if (orphans.length) {
      lines.push(`  __events.on("start", function() {`);
      orphans.forEach(b => { lines.push('    ' + genBlock(b, objectId)); });
      lines.push(`  });`);
    }

    lines.push(`})();`);
    return lines.join('\n');
  }

  function isChildOf(block, hats, all) {
    // Simplified: all non-hat blocks near a hat are considered children
    return false; // Let codegen handle them
  }

  function findDef(blockId) {
    for (const cat of BlockDefs.CATEGORIES) {
      const b = cat.blocks.find(b => b.id === blockId);
      if (b) return b;
    }
    return null;
  }

  function v(block, fieldName) {
    const val = block.values && block.values[fieldName] !== undefined ? block.values[fieldName] : '';
    // Quote strings that aren't numbers
    if (!isNaN(val) && val !== '') return val;
    return JSON.stringify(val);
  }

  function vNum(block, fieldName) {
    const val = block.values && block.values[fieldName] !== undefined ? block.values[fieldName] : '0';
    return isNaN(val) ? `parseFloat(${JSON.stringify(val)})` : val;
  }

  function vRaw(block, fieldName) {
    return block.values && block.values[fieldName] !== undefined ? block.values[fieldName] : '';
  }

  function genHat(hat, childBlocks, objectId) {
    const id = hat.id;
    const inner = childBlocks.map(b => '    ' + genBlock(b, objectId)).join('\n');

    switch (id) {
      case 'on_start':   return `  __events.on("start", async function() {\n${inner}\n  });`;
      case 'on_update':  return `  __events.on("update", async function(dt) {\n${inner}\n  });`;
      case 'on_keydown': return `  __events.on("keydown:${vRaw(hat,'key')}", async function() {\n${inner}\n  });`;
      case 'on_keyup':   return `  __events.on("keyup:${vRaw(hat,'key')}", async function() {\n${inner}\n  });`;
      case 'on_click':   return `  __events.on("click:${objectId}", async function() {\n${inner}\n  });`;
      case 'on_collide': return `  __events.on("collide:${objectId}:${vRaw(hat,'tag')}", async function(other) {\n${inner}\n  });`;
      case 'on_trigger': return `  __events.on("trigger:${objectId}:${vRaw(hat,'tag')}", async function(other) {\n${inner}\n  });`;
      case 'on_message': return `  __events.on("msg:${vRaw(hat,'msg')}", async function(data) {\n${inner}\n  });`;
      case 'on_player_join': return `  if(window.Lorl) Lorl.on("playerJoined", async function(p) { const player = p;\n${inner}\n  });`;
      case 'on_player_leave': return `  if(window.Lorl) Lorl.on("playerLeft", async function(p) { const player = p;\n${inner}\n  });`;
      case 'on_timer':   return `  setInterval(async function() {\n${inner}\n  }, ${vNum(hat,'sec')} * 1000);`;
      case 'on_overlap': return `  __events.on("overlap:${objectId}:${vRaw(hat,'tag')}", async function(other) {\n${inner}\n  });`;
      case 'def_func':   return `  async function ${vRaw(hat,'name')}() {\n${inner}\n  }`;
      default: return `  // Unknown hat: ${id}`;
    }
  }

  function genBlock(b, objectId) {
    const id = b.id;
    switch (id) {
      // Control
      case 'wait':         return `await __wait(${vNum(b,'sec')});`;
      case 'wait_frames':  return `await __waitFrames(${vNum(b,'n')});`;
      case 'repeat':       return `for(let __i=0;__i<${vNum(b,'n')};__i++){`;
      case 'forever':      return `while(true){`;
      case 'if':           return `if(${vRaw(b,'cond')||'true'}){`;
      case 'if_else':      return `if(${vRaw(b,'cond')||'true'}){`;
      case 'while':        return `while(${vRaw(b,'cond')||'true'}){`;
      case 'break':        return `break;`;
      case 'stop_all':     return `__events.stopAll();`;
      case 'call_func':    return `await ${vRaw(b,'name')}();`;
      case 'return':       return `return ${vRaw(b,'val')||'undefined'};`;

      // Motion
      case 'move_forward': return `__moveForward(self, ${vNum(b,'dist')});`;
      case 'set_pos':      return `__setPos(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'move_by':      return `__moveBy(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'set_rot':      return `__setRot(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'rotate_by':    return `__rotateBy(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'look_at':      return `__lookAt(self, ${v(b,'target')});`;
      case 'glide_to':     return `await __glideTo(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')}, ${vNum(b,'sec')});`;
      case 'set_speed':    return `self.speed = ${vNum(b,'spd')};`;
      case 'teleport':     return `__teleport(self);`;
      case 'face_player':  return `__facePlayer(self);`;
      case 'orbit':        return `__orbit(self, ${v(b,'target')}, ${vNum(b,'radius')});`;

      // Physics
      case 'add_force':    return `__addForce(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'set_velocity': return `__setVelocity(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'jump':         return `__jump(self, ${vNum(b,'force')});`;
      case 'set_gravity':  return `__setGravity(${vNum(b,'g')});`;
      case 'set_physics':  return `__setPhysics(self, ${vRaw(b,'enabled')});`;
      case 'set_mass':     return `__setMass(self, ${vNum(b,'mass')});`;
      case 'set_friction': return `__setFriction(self, ${vNum(b,'f')});`;
      case 'freeze_rot':   return `__freezeRot(self, ${vRaw(b,'freeze')});`;
      case 'raycast':      return `const __hit = __raycast(self, ${vNum(b,'dist')});`;
      case 'is_grounded':  return `__isGrounded(self)`;

      // Appearance
      case 'set_color':    return `__setColor(self, ${v(b,'color')});`;
      case 'set_texture':  return `__setTexture(self, ${v(b,'tex')});`;
      case 'set_material': return `__setMaterial(self, ${v(b,'mat')});`;
      case 'set_emissive': return `__setEmissive(self, ${v(b,'color')}, ${vNum(b,'intensity')});`;
      case 'set_opacity':  return `__setOpacity(self, ${vNum(b,'opacity')});`;
      case 'set_visible':  return `self.mesh && (self.mesh.visible = ${vRaw(b,'vis')});`;
      case 'set_scale':    return `__setScale(self, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'show_shadow':  return `__setShadow(self, ${vRaw(b,'cast')});`;
      case 'play_anim':    return `__playAnim(self, ${v(b,'anim')}, ${vRaw(b,'loop')});`;
      case 'stop_anim':    return `__stopAnim(self);`;
      case 'set_fog':      return `__setFog(${v(b,'color')}, ${vNum(b,'density')});`;
      case 'set_skybox':   return `__setSkyColor(${v(b,'color')});`;

      // Sound
      case 'play_sound':   return `__playSound(${v(b,'snd')});`;
      case 'stop_sound':   return `__stopSound(${v(b,'snd')});`;
      case 'play_music':   return `__playMusic(${v(b,'snd')});`;
      case 'stop_music':   return `__stopMusic();`;
      case 'set_volume':   return `__setVolume(${vNum(b,'vol')});`;
      case 'play_3d':      return `__play3DSound(self, ${v(b,'snd')});`;
      case 'beep':         return `__beep(${vNum(b,'hz')}, ${vNum(b,'dur')});`;

      // UI
      case 'show_text':    return `__showText(${v(b,'msg')}, ${vNum(b,'sec')});`;
      case 'hud_set_text': return `__hudSetText(${v(b,'id')}, ${v(b,'text')});`;
      case 'hud_show':     return `__hudShow(${v(b,'id')}, ${vRaw(b,'show')});`;
      case 'show_dialog':  return `await __showDialog(${v(b,'msg')}, ${v(b,'btn')});`;
      case 'countdown':    return `__countdown(${vNum(b,'sec')});`;
      case 'screen_shake': return `__screenShake(${vNum(b,'intensity')}, ${vNum(b,'dur')});`;
      case 'set_cursor':   return `document.body.style.cursor = ${v(b,'cur')};`;
      case 'lock_pointer': return `${vRaw(b,'lock')} ? document.body.requestPointerLock() : document.exitPointerLock();`;

      // Multiplayer
      case 'send_message': return `if(window.Lorl && Lorl.isConnected()) Lorl.sendMessage(${v(b,'msg')}, ${v(b,'data')});`;
      case 'sync_var':     return `if(window.Lorl && Lorl.isConnected()) Lorl.updateState({[${v(b,'var')}]: __vars[${v(b,'var')}]});`;
      case 'get_players':  return `(window.Lorl ? Lorl.getPlayers() : [])`;
      case 'get_player_count': return `(window.Lorl ? Lorl.getPlayers().length : 1)`;
      case 'my_player_id': return `(window.Lorl ? Lorl.getPlayerId() : "local")`;
      case 'my_username':  return `(window.Lorl ? Lorl.getUsername() : "Player")`;

      // Variables
      case 'set_var':      return `__vars[${v(b,'name')}] = ${vRaw(b,'val')};`;
      case 'change_var':   return `__vars[${v(b,'name')}] = (__vars[${v(b,'name')}] || 0) + ${vNum(b,'by')};`;
      case 'get_var':      return `__vars[${v(b,'name')}]`;
      case 'get_prop':     return `__getProp(__objects[${v(b,'obj')}], ${v(b,'prop')})`;
      case 'set_prop':     return `__setProp(__objects[${v(b,'obj')}], ${v(b,'prop')}, ${vRaw(b,'val')});`;

      // Models
      case 'spawn_object': return `__spawn(${v(b,'template')}, ${vNum(b,'x')}, ${vNum(b,'y')}, ${vNum(b,'z')});`;
      case 'destroy_self': return `__destroy(self);`;
      case 'destroy_obj':  return `__destroy(__objects[${v(b,'name')}]);`;
      case 'clone_obj':    return `__clone(__objects[${v(b,'name')}]);`;
      case 'find_obj':     return `__objects[${v(b,'name')}]`;
      case 'find_tag':     return `__findTag(${v(b,'tag')})`;
      case 'set_tag':      return `self.tags = self.tags || []; self.tags.push(${v(b,'tag')});`;
      case 'set_shape':    return `__setShape(self, ${v(b,'shape')});`;
      case 'set_size':     return `__setSize(self, ${vNum(b,'w')}, ${vNum(b,'h')}, ${vNum(b,'d')});`;
      case 'attach_to':    return `__attachTo(self, ${v(b,'parent')});`;
      case 'detach':       return `__detach(self);`;
      case 'emit_particles': return `__emitParticles(self, ${v(b,'fx')}, ${vNum(b,'count')});`;

      // Math
      case 'math_op':      return `(${vNum(b,'a')} ${vRaw(b,'op')||'+'} ${vNum(b,'b')})`;
      case 'random':       return `(Math.random() * (${vNum(b,'max')} - ${vNum(b,'min')}) + ${vNum(b,'min')})`;
      case 'abs':          return `Math.abs(${vNum(b,'n')})`;
      case 'round':        return `Math.round(${vNum(b,'n')})`;
      case 'clamp':        return `Math.min(${vNum(b,'max')}, Math.max(${vNum(b,'min')}, ${vNum(b,'val')}))`;
      case 'compare':      return `(${vNum(b,'a')} ${mapOp(vRaw(b,'op'))} ${vNum(b,'b')})`;
      case 'and':          return `(${vRaw(b,'a')||'true'} && ${vRaw(b,'b')||'true'})`;
      case 'or':           return `(${vRaw(b,'a')||'false'} || ${vRaw(b,'b')||'false'})`;
      case 'not':          return `!(${vRaw(b,'a')||'false'})`;
      case 'distance':     return `__distance(self, ${v(b,'obj')})`;
      case 'lerp':         return `(${vNum(b,'a')} + (${vNum(b,'b')} - ${vNum(b,'a')}) * ${vNum(b,'t')})`;

      // Advanced
      case 'run_code':     return (vRaw(b,'code') || '');
      case 'print':        return `console.log(${v(b,'msg')});`;
      case 'alert':        return `alert(${v(b,'msg')});`;
      case 'local_storage_set': return `localStorage.setItem(${v(b,'key')}, JSON.stringify(${vRaw(b,'val')}));`;
      case 'local_storage_get': return `JSON.parse(localStorage.getItem(${v(b,'key')}) || 'null')`;

      default: return `/* unknown block: ${id} */`;
    }
  }

  function mapOp(op) {
    const map = { '=':'===','≠':'!==','<':'<','>':'>','≤':'<=','≥':'>=' };
    return map[op] || op;
  }

  // Generate full game JS from all objects and their block scripts
  function generateGameJS(objects, blockScripts, customScripts) {
    const parts = [];
    parts.push(RUNTIME_LIB);
    parts.push('');
    parts.push('// === Object setup ===');

    // Create object entries
    objects.forEach(obj => {
      parts.push(`__objects["${obj.id}"] = {`);
      parts.push(`  id: "${obj.id}", name: "${obj.name}", type: "${obj.type}",`);
      parts.push(`  x: ${obj.x||0}, y: ${obj.y||0}, z: ${obj.z||0},`);
      parts.push(`  rotX: ${obj.rotX||0}, rotY: ${obj.rotY||0}, rotZ: ${obj.rotZ||0},`);
      parts.push(`  scaleX: ${obj.scaleX||1}, scaleY: ${obj.scaleY||1}, scaleZ: ${obj.scaleZ||1},`);
      parts.push(`  color: "${obj.color||'#4488ff'}", visible: true, tags: [], speed: 5,`);
      parts.push(`  mesh: null, velocity: {x:0,y:0,z:0}, mass: 1, physics: false,`);
      parts.push(`};`);
    });
    parts.push('');
    parts.push('// === Custom scripts ===');
    customScripts.forEach(s => parts.push(s.content || ''));
    parts.push('');
    parts.push('// === Block-generated scripts ===');
    Object.entries(blockScripts).forEach(([objId, blocks]) => {
      parts.push(blocksToJS(objId, blocks, objects));
    });
    parts.push('');
    parts.push('// === Start ===');
    parts.push('__initScene();');
    parts.push('__events.emit("start");');
    return parts.join('\n');
  }

  const RUNTIME_LIB = `
// ══════════════════════════════════════
//   LORL GAME RUNTIME
// ══════════════════════════════════════
const __objects = {};
const __vars = {};
const __sounds = {};
let __gravity = -9.8;
let __music = null;
let __animFrameId = null;
let __lastTime = 0;
let __running = true;

const __events = (() => {
  const _listeners = {};
  let _stopped = false;
  return {
    on(ev, cb) {
      (_listeners[ev] = _listeners[ev] || []).push(cb);
    },
    emit(ev, data) {
      if (_stopped && ev !== 'start') return;
      (_listeners[ev] || []).forEach(cb => { try { cb(data); } catch(e) { console.error('[Lorl]', e); } });
    },
    stopAll() { _stopped = true; },
  };
})();

function __wait(sec) { return new Promise(r => setTimeout(r, sec * 1000)); }
function __waitFrames(n) { return new Promise(r => { let c = 0; const f = () => (++c < n ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }); }

// Scene
let __scene, __camera, __renderer, __canvas3d;

function __initScene() {
  __canvas3d = document.getElementById('game-canvas');
  if (!__canvas3d) { __canvas3d = document.createElement('canvas'); __canvas3d.id = 'game-canvas'; document.body.appendChild(__canvas3d); }
  
  if (typeof THREE === 'undefined') { console.warn('No THREE.js'); return; }

  __scene = new THREE.Scene();
  __scene.background = new THREE.Color(0x87ceeb);

  __camera = new THREE.PerspectiveCamera(60, __canvas3d.clientWidth / __canvas3d.clientHeight, 0.1, 1000);
  __camera.position.set(0, 5, 15);
  __camera.lookAt(0, 0, 0);

  __renderer = new THREE.WebGLRenderer({ canvas: __canvas3d, antialias: true });
  __renderer.setSize(__canvas3d.clientWidth, __canvas3d.clientHeight);
  __renderer.shadowMap.enabled = true;
  __renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Ambient + directional light
  __scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(10, 20, 10); sun.castShadow = true;
  __scene.add(sun);

  // Create scene objects
  Object.values(__objects).forEach(__createMesh);

  // Resize
  const ro = new ResizeObserver(() => {
    if (!__canvas3d.parentElement) return;
    const w = __canvas3d.clientWidth, h = __canvas3d.clientHeight;
    __renderer.setSize(w, h);
    __camera.aspect = w / h;
    __camera.updateProjectionMatrix();
  });
  ro.observe(__canvas3d.parentElement || document.body);

  // Input
  const keys = {};
  document.addEventListener('keydown', e => {
    if (!keys[e.code]) { keys[e.code] = true; __events.emit('keydown:' + e.code, e); __events.emit('keydown:' + e.key, e); }
  });
  document.addEventListener('keyup', e => {
    keys[e.code] = false; __events.emit('keyup:' + e.code, e); __events.emit('keyup:' + e.key, e);
  });
  __canvas3d.addEventListener('click', () => __events.emit('click:canvas'));

  // Game loop
  function loop(ts) {
    if (!__running) return;
    const dt = Math.min((ts - __lastTime) / 1000, 0.05);
    __lastTime = ts;
    
    // Physics step
    Object.values(__objects).forEach(obj => {
      if (!obj.physics || !obj.mesh) return;
      obj.velocity.y += __gravity * dt;
      obj.mesh.position.x += obj.velocity.x * dt;
      obj.mesh.position.y += obj.velocity.y * dt;
      obj.mesh.position.z += obj.velocity.z * dt;
      // Floor clamp
      if (obj.mesh.position.y < 0.5) { obj.mesh.position.y = 0.5; obj.velocity.y = 0; obj._grounded = true; } else { obj._grounded = false; }
      obj.x = obj.mesh.position.x; obj.y = obj.mesh.position.y; obj.z = obj.mesh.position.z;
    });

    __events.emit('update', dt);
    __renderer.render(__scene, __camera);
    __animFrameId = requestAnimationFrame(loop);
  }
  __animFrameId = requestAnimationFrame(loop);
}

function __createMesh(obj) {
  if (!__scene || !obj.type) return;
  let geo;
  switch(obj.type) {
    case 'cube':      geo = new THREE.BoxGeometry(obj.scaleX||1, obj.scaleY||1, obj.scaleZ||1); break;
    case 'sphere':    geo = new THREE.SphereGeometry((obj.scaleX||1)/2, 16, 12); break;
    case 'cylinder':  geo = new THREE.CylinderGeometry((obj.scaleX||1)/2, (obj.scaleX||1)/2, obj.scaleY||1, 16); break;
    case 'plane':     geo = new THREE.PlaneGeometry(obj.scaleX||5, obj.scaleZ||5); break;
    case 'character': geo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.4, 1.2, 4, 8) : new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8); break;
    case 'script': case 'trigger': case 'sound': case 'ui': return;
    case 'light': {
      const light = new THREE.PointLight(obj.color || 0xffffff, 1, 20);
      light.position.set(obj.x||0, obj.y||3, obj.z||0);
      __scene.add(light);
      obj.lightRef = light;
      return;
    }
    default: geo = new THREE.BoxGeometry(1,1,1);
  }
  const mat = new THREE.MeshStandardMaterial({ color: obj.color || '#4488ff' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(obj.x||0, obj.y||0.5, obj.z||0);
  mesh.rotation.set((obj.rotX||0)*Math.PI/180, (obj.rotY||0)*Math.PI/180, (obj.rotZ||0)*Math.PI/180);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.objId = obj.id;
  __scene.add(mesh);
  obj.mesh = mesh;
}

// ── Motion helpers ──
function __setPos(obj, x, y, z) { if(!obj||!obj.mesh) return; obj.mesh.position.set(x,y,z); obj.x=x;obj.y=y;obj.z=z; }
function __moveBy(obj, dx, dy, dz) { if(!obj||!obj.mesh) return; obj.mesh.position.x+=dx; obj.mesh.position.y+=dy; obj.mesh.position.z+=dz; obj.x=obj.mesh.position.x; obj.y=obj.mesh.position.y; obj.z=obj.mesh.position.z; }
function __moveForward(obj, dist) { if(!obj||!obj.mesh) return; const d = new THREE.Vector3(0,0,-dist).applyQuaternion(obj.mesh.quaternion); obj.mesh.position.add(d); }
function __setRot(obj, x, y, z) { if(!obj||!obj.mesh) return; obj.mesh.rotation.set(x*Math.PI/180, y*Math.PI/180, z*Math.PI/180); }
function __rotateBy(obj, dx, dy, dz) { if(!obj||!obj.mesh) return; obj.mesh.rotation.x+=dx*Math.PI/180; obj.mesh.rotation.y+=dy*Math.PI/180; obj.mesh.rotation.z+=dz*Math.PI/180; }
function __lookAt(obj, targetName) { if(!obj||!obj.mesh) return; const t = __objects[targetName]; if(t&&t.mesh) obj.mesh.lookAt(t.mesh.position); }
function __setScale(obj, x, y, z) { if(!obj||!obj.mesh) return; obj.mesh.scale.set(x,y,z); }
async function __glideTo(obj, x, y, z, sec) {
  if(!obj||!obj.mesh) return;
  const start = obj.mesh.position.clone();
  const end = new THREE.Vector3(x,y,z);
  const startT = performance.now();
  await new Promise(res => {
    function step() {
      const t = Math.min((performance.now()-startT)/(sec*1000),1);
      obj.mesh.position.lerpVectors(start, end, t);
      if(t<1) requestAnimationFrame(step); else res();
    } requestAnimationFrame(step);
  });
}
function __teleport(obj) { if(!obj||!obj.mesh) return; obj.mesh.position.set(0,2,0); }
function __facePlayer(obj) {}

// ── Physics ──
function __addForce(obj, x, y, z) { if(!obj) return; obj.velocity.x+=(x||0); obj.velocity.y+=(y||0); obj.velocity.z+=(z||0); }
function __setVelocity(obj, x, y, z) { if(!obj) return; obj.velocity={x,y,z}; }
function __jump(obj, f) { if(!obj||!obj._grounded) return; obj.velocity.y=f; obj._grounded=false; }
function __setGravity(g) { __gravity=g; }
function __setPhysics(obj, on) { if(obj) obj.physics=on; }
function __setMass(obj, m) { if(obj) obj.mass=m; }
function __setFriction(obj, f) { if(obj) obj.friction=f; }
function __freezeRot(obj, on) {}
function __isGrounded(obj) { return obj && obj._grounded; }
function __raycast(obj, dist) { return null; }
function __distance(obj, targetName) { const t=__objects[targetName]; if(!obj||!t||!obj.mesh||!t.mesh) return 0; return obj.mesh.position.distanceTo(t.mesh.position); }

// ── Appearance ──
function __setColor(obj, color) { if(obj&&obj.mesh) obj.mesh.material.color.set(color); }
function __setTexture(obj, url) {}
function __setMaterial(obj, type) { if(!obj||!obj.mesh) return; const m = obj.mesh.material; m.metalness=type==='metal'?0.9:0; m.roughness=type==='metal'?0.1:type==='glass'?0:0.7; m.transparent=type==='glass'; m.opacity=type==='glass'?0.3:1; m.wireframe=type==='wireframe'; }
function __setEmissive(obj, color, intensity) { if(obj&&obj.mesh) { obj.mesh.material.emissive=new THREE.Color(color); obj.mesh.material.emissiveIntensity=intensity; }}
function __setOpacity(obj, v) { if(obj&&obj.mesh) { obj.mesh.material.transparent=true; obj.mesh.material.opacity=v; }}
function __setShadow(obj, cast) { if(obj&&obj.mesh) { obj.mesh.castShadow=cast; }}
function __playAnim(obj, name, loop) {}
function __stopAnim(obj) {}
function __setFog(color, density) { if(__scene) __scene.fog=new THREE.FogExp2(color, density); }
function __setSkyColor(color) { if(__scene) __scene.background=new THREE.Color(color); }

// ── Sound ──
function __beep(hz, dur) { try { const ctx=new AudioContext(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=hz; g.gain.setValueAtTime(0.3,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur); o.start(); o.stop(ctx.currentTime+dur); } catch(_) {} }
function __playSound(url) { try { const a=new Audio(url); a.play(); __sounds[url]=a; } catch(_) {} }
function __stopSound(url) { if(__sounds[url]) __sounds[url].pause(); }
function __playMusic(url) { if(__music) __music.pause(); __music=new Audio(url); __music.loop=true; __music.play().catch(_=>{}); }
function __stopMusic() { if(__music) { __music.pause(); __music=null; } }
function __setVolume(v) { if(__music) __music.volume=Math.max(0,Math.min(1,v)); }
function __play3DSound(obj, url) { __playSound(url); }

// ── UI ──
const __hud = {};
function __showText(msg, sec) {
  const el=document.createElement('div');
  el.style.cssText='position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:0.75rem 1.5rem;border-radius:10px;font-size:1.2rem;z-index:999;font-family:sans-serif;';
  el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),sec*1000);
}
function __hudSetText(id, text) { let el=document.getElementById('hud_'+id); if(!el){el=document.createElement('div');el.id='hud_'+id;el.style.cssText='position:fixed;top:1rem;left:1rem;color:#fff;font-family:sans-serif;font-size:1rem;z-index:99;text-shadow:0 1px 3px #000;';document.body.appendChild(el);} el.textContent=text; __hud[id]=el; }
function __hudShow(id, show) { const el=document.getElementById('hud_'+id); if(el) el.style.display=show?'':'none'; }
async function __showDialog(msg, btn) { return new Promise(r => { const overlay=document.createElement('div'); overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;'; const box=document.createElement('div'); box.style.cssText='background:#1a1a2e;color:#fff;padding:2rem;border-radius:12px;text-align:center;font-family:sans-serif;max-width:300px;'; box.innerHTML=\`<p style="margin:0 0 1rem">\${msg}</p><button onclick="this.closest('[style]').previousElementSibling&&''" style="background:#7c3aed;color:#fff;border:none;padding:0.6rem 1.5rem;border-radius:8px;cursor:pointer;font-size:1rem">\${btn}</button>\`; overlay.appendChild(box); document.body.appendChild(overlay); overlay.querySelector('button').onclick=()=>{overlay.remove();r();}; }); }
function __countdown(sec) { let t=sec; const id=setInterval(()=>{ __hudSetText('_countdown','⏱ '+t); if(--t<0){clearInterval(id);__hudShow('_countdown',false);}},1000); }
function __screenShake(intensity, dur) {}

// ── Objects ──
function __spawn(template, x, y, z) { const obj={id:'spawn_'+Math.random().toString(36).slice(2),type:template.toLowerCase(),x,y,z,color:'#ff4444',scaleX:1,scaleY:1,scaleZ:1,velocity:{x:0,y:0,z:0},mass:1}; __objects[obj.id]=obj; __createMesh(obj); return obj; }
function __destroy(obj) { if(!obj) return; if(obj.mesh) __scene.remove(obj.mesh); delete __objects[obj.id]; }
function __clone(obj) { if(!obj) return; return __spawn(obj.type, obj.x+1, obj.y, obj.z); }
function __findTag(tag) { return Object.values(__objects).filter(o=>(o.tags||[]).includes(tag)); }
function __attachTo(obj, parentName) {}
function __detach(obj) {}
function __setShape(obj, shape) { if(!obj||!__scene) return; if(obj.mesh) __scene.remove(obj.mesh); obj.type=shape; __createMesh(obj); }
function __setSize(obj, w, h, d) { obj.scaleX=w;obj.scaleY=h;obj.scaleZ=d; if(obj.mesh) obj.mesh.scale.set(w,h,d); }
function __emitParticles(obj, fx, count) {
  if(!obj||!obj.mesh||!__scene) return;
  for(let i=0;i<Math.min(count,50);i++) {
    const g=new THREE.SphereGeometry(0.05,4,4);
    const m=new THREE.MeshBasicMaterial({color: fx==='fire'?0xff4400:fx==='stars'?0xffff00:0xffffff});
    const p=new THREE.Mesh(g,m);
    p.position.copy(obj.mesh.position);
    const vx=(Math.random()-0.5)*5, vy=Math.random()*5, vz=(Math.random()-0.5)*5;
    __scene.add(p);
    let life=0;
    function animP() { life+=0.016; p.position.x+=vx*0.016; p.position.y+=vy*0.016; p.position.z+=vz*0.016; m.opacity=1-life/1.5; m.transparent=true; if(life<1.5) requestAnimationFrame(animP); else __scene.remove(p); }
    requestAnimationFrame(animP);
  }
}
function __getProp(obj, prop) { if(!obj) return 0; const map={x:'x',y:'y',z:'z',rotX:'rotX',rotY:'rotY',rotZ:'rotZ'}; return obj[map[prop]||prop]; }
function __setProp(obj, prop, val) { if(!obj) return; obj[prop]=val; if(prop==='x'&&obj.mesh) obj.mesh.position.x=val; if(prop==='y'&&obj.mesh) obj.mesh.position.y=val; if(prop==='z'&&obj.mesh) obj.mesh.position.z=val; }
function __orbit(obj, targetName, radius) {}
function __facePlayer(obj) {}
`;

  return { generateGameJS };
})();
