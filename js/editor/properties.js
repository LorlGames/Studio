/**
 * properties.js — Right-side properties panel for selected objects
 */

window.PropertiesPanel = (() => {
  const TYPES = {
    script: { icon: '📜', label: 'Script' },
    cube: { icon: '⬜', label: 'Cube' },
    sphere: { icon: '⬭', label: 'Sphere' },
    cylinder: { icon: '⬛', label: 'Cylinder' },
    plane: { icon: '▬', label: 'Plane' },
    character: { icon: '🧍', label: 'Character' },
    camera: { icon: '📷', label: 'Camera' },
    light: { icon: '💡', label: 'Light' },
    trigger: { icon: '🔲', label: 'Trigger' },
    particle: { icon: '✨', label: 'Particles' },
    sound: { icon: '🔊', label: 'Sound' },
    ui: { icon: '🖼', label: 'UI Panel' },
    spawn: { icon: '🚀', label: 'Spawn' },
  };

  function render(obj, onChange) {
    const el = document.getElementById('props-content');
    if (!obj) { el.innerHTML = '<div class="empty-hint">Select an object</div>'; return; }

    const t = TYPES[obj.type] || { icon: '📦', label: obj.type };
    let html = `
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
        <span style="font-size:1.2rem">${t.icon}</span>
        <span style="font-weight:700;font-size:0.9rem">${t.label}</span>
      </div>
      <div class="prop-group">Identity</div>
      <div class="prop-row">
        <span class="prop-label">Name</span>
        <input class="prop-input" data-prop="name" value="${esc(obj.name)}"/>
      </div>
      <div class="prop-row">
        <span class="prop-label">Tag</span>
        <input class="prop-input" data-prop="tag" value="${esc(obj.tag||'')}"/>
      </div>
    `;

    // Transform (for mesh objects)
    if (!['script','sound','ui'].includes(obj.type)) {
      html += `
        <div class="prop-group">Transform</div>
        <div style="display:flex;gap:4px;margin-bottom:4px">
          <input class="prop-input" style="width:0;flex:1" data-prop="x" type="number" value="${r2(obj.x||0)}" step="0.1" placeholder="X"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="y" type="number" value="${r2(obj.y||0)}" step="0.1" placeholder="Y"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="z" type="number" value="${r2(obj.z||0)}" step="0.1" placeholder="Z"/>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:4px">
          <input class="prop-input" style="width:0;flex:1" data-prop="rotX" type="number" value="${r2(obj.rotX||0)}" step="1" placeholder="rX"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="rotY" type="number" value="${r2(obj.rotY||0)}" step="1" placeholder="rY"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="rotZ" type="number" value="${r2(obj.rotZ||0)}" step="1" placeholder="rZ"/>
        </div>
        <div style="display:flex;gap:4px">
          <input class="prop-input" style="width:0;flex:1" data-prop="scaleX" type="number" value="${r2(obj.scaleX||1)}" step="0.1" placeholder="sX" min="0.01"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="scaleY" type="number" value="${r2(obj.scaleY||1)}" step="0.1" placeholder="sY" min="0.01"/>
          <input class="prop-input" style="width:0;flex:1" data-prop="scaleZ" type="number" value="${r2(obj.scaleZ||1)}" step="0.1" placeholder="sZ" min="0.01"/>
        </div>
      `;
    }

    // Appearance
    if (['cube','sphere','cylinder','plane','character','trigger'].includes(obj.type)) {
      html += `
        <div class="prop-group">Appearance</div>
        <div class="prop-row">
          <span class="prop-label">Color</span>
          <input type="color" class="prop-color" data-prop="color" value="${obj.color||'#4488ff'}"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Material</span>
          <select class="prop-select" data-prop="material">
            ${['standard','metal','glass','emission','wireframe'].map(m => `<option ${obj.material===m?'selected':''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="prop-row">
          <span class="prop-label">Cast shadow</span>
          <button class="prop-toggle ${obj.castShadow!==false?'on':''}" data-prop="castShadow">${obj.castShadow!==false?'On':'Off'}</button>
        </div>
      `;
    }

    // Physics
    if (['cube','sphere','cylinder','character'].includes(obj.type)) {
      html += `
        <div class="prop-group">Physics</div>
        <div class="prop-row">
          <span class="prop-label">Physics</span>
          <button class="prop-toggle ${obj.physics?'on':''}" data-prop="physics">${obj.physics?'On':'Off'}</button>
        </div>
        <div class="prop-row">
          <span class="prop-label">Mass</span>
          <input class="prop-input" data-prop="mass" type="number" value="${obj.mass||1}" step="0.1" min="0.01"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Friction</span>
          <input class="prop-input" data-prop="friction" type="number" value="${obj.friction||0.5}" step="0.05" min="0"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Collider</span>
          <select class="prop-select" data-prop="collider">
            ${['box','sphere','mesh'].map(c => `<option ${obj.collider===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // Light properties
    if (obj.type === 'light') {
      html += `
        <div class="prop-group">Light</div>
        <div class="prop-row">
          <span class="prop-label">Type</span>
          <select class="prop-select" data-prop="lightType">
            ${['point','directional','spot','ambient'].map(lt => `<option ${obj.lightType===lt?'selected':''}>${lt}</option>`).join('')}
          </select>
        </div>
        <div class="prop-row">
          <span class="prop-label">Color</span>
          <input type="color" class="prop-color" data-prop="color" value="${obj.color||'#ffffff'}"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Intensity</span>
          <input class="prop-input" data-prop="intensity" type="number" value="${obj.intensity||1}" step="0.1"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Range</span>
          <input class="prop-input" data-prop="range" type="number" value="${obj.range||20}" step="1"/>
        </div>
      `;
    }

    // Camera properties
    if (obj.type === 'camera') {
      html += `
        <div class="prop-group">Camera</div>
        <div class="prop-row">
          <span class="prop-label">FOV</span>
          <input class="prop-input" data-prop="fov" type="number" value="${obj.fov||60}" step="1"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Near</span>
          <input class="prop-input" data-prop="near" type="number" value="${obj.near||0.1}" step="0.01"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Follow</span>
          <input class="prop-input" data-prop="follow" value="${obj.follow||''}"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">Main Cam</span>
          <button class="prop-toggle ${obj.isMain?'on':''}" data-prop="isMain">${obj.isMain?'Yes':'No'}</button>
        </div>
      `;
    }

    // Sound
    if (obj.type === 'sound') {
      html += `
        <div class="prop-group">Audio</div>
        <div class="prop-row">
          <span class="prop-label">File</span>
          <input class="prop-input" data-prop="soundFile" value="${obj.soundFile||''}"/>
        </div>
        <div class="prop-row">
          <span class="prop-label">AutoPlay</span>
          <button class="prop-toggle ${obj.autoPlay?'on':''}" data-prop="autoPlay">${obj.autoPlay?'On':'Off'}</button>
        </div>
        <div class="prop-row">
          <span class="prop-label">Loop</span>
          <button class="prop-toggle ${obj.loop?'on':''}" data-prop="loop">${obj.loop?'On':'Off'}</button>
        </div>
        <div class="prop-row">
          <span class="prop-label">Volume</span>
          <input class="prop-input" data-prop="volume" type="number" value="${obj.volume||1}" step="0.1" min="0" max="1"/>
        </div>
      `;
    }

    el.innerHTML = html;

    // Bind inputs
    el.querySelectorAll('[data-prop]').forEach(inp => {
      const prop = inp.dataset.prop;
      const ev = inp.tagName === 'SELECT' ? 'change' : (inp.classList.contains('prop-toggle') ? 'click' : 'input');
      inp.addEventListener(ev, () => {
        let val;
        if (inp.classList.contains('prop-toggle')) {
          obj[prop] = !obj[prop];
          inp.textContent = obj[prop] ? 'On' : 'Yes';
          inp.classList.toggle('on', !!obj[prop]);
          val = obj[prop];
        } else if (inp.type === 'number') {
          val = parseFloat(inp.value) || 0;
        } else if (inp.type === 'color' || inp.tagName === 'SELECT') {
          val = inp.value;
        } else {
          val = inp.value;
        }
        if (val !== undefined && !inp.classList.contains('prop-toggle')) obj[prop] = val;
        onChange && onChange(obj, prop, obj[prop]);
        Scene3D.updateObject(obj);
      });
    });
  }

  function r2(n) { return Math.round(n * 100) / 100; }
  function esc(s) { return String(s||'').replace(/"/g,'&quot;'); }

  return { render };
})();
