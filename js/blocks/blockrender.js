/**
 * blockrender.js — Creates DOM elements for blocks
 */

window.BlockRender = (() => {
  const CAT_COLORS = {};
  BlockDefs.CATEGORIES.forEach(c => { CAT_COLORS[c.id] = c.color; });

  function getColor(catId) { return CAT_COLORS[catId] || '#666'; }

  // Create the palette entry (draggable template)
  function makePaletteBlock(blockDef, catColor) {
    const el = document.createElement('div');
    el.className = 'block-template';
    el.dataset.blockId = blockDef.id;
    el.style.borderLeftColor = catColor;
    el.style.color = catColor;
    el.innerHTML = `<span class="bt-icon">${blockDef.icon}</span><span>${blockDef.label}</span>`;
    el.draggable = true;
    return el;
  }

  // Create a placed block node in the canvas
  function makeBlockNode(blockDef, catColor, values = {}) {
    const el = document.createElement('div');
    el.className = 'block-node';
    el.dataset.blockId = blockDef.id;
    el.style.background = hexAlpha(catColor, 0.12);
    el.style.border = `1.5px solid ${hexAlpha(catColor, 0.5)}`;

    // Header
    const header = document.createElement('div');
    header.className = 'block-header';
    header.style.background = hexAlpha(catColor, 0.25);
    header.style.color = '#fff';
    header.innerHTML = `<span class="block-header-icon">${blockDef.icon}</span><span>${blockDef.label}</span>`;
    el.appendChild(header);

    // Body with fields
    if (blockDef.fields.length > 0) {
      const body = document.createElement('div');
      body.className = 'block-body';
      blockDef.fields.forEach(field => {
        const row = document.createElement('div');
        row.className = 'block-field';
        row.innerHTML = `<span class="block-field-label">${field.name}:</span>`;
        const val = values[field.name] !== undefined ? values[field.name] : field.default;
        const input = makeFieldInput(field, val, catColor);
        input.dataset.field = field.name;
        row.appendChild(input);
        body.appendChild(row);
      });
      el.appendChild(body);
    }

    // C-block container (for if/repeat/etc)
    if (blockDef.type === 'c' || blockDef.type === 'c2') {
      const container = document.createElement('div');
      container.className = 'block-subblocks';
      container.dataset.slot = 'inner';
      el.appendChild(container);

      if (blockDef.type === 'c2') {
        const elseLabel = document.createElement('div');
        elseLabel.style.cssText = 'font-size:0.75rem;color:rgba(255,255,255,0.5);padding:0.2rem 0.5rem;';
        elseLabel.textContent = 'else';
        el.appendChild(elseLabel);
        const elseContainer = document.createElement('div');
        elseContainer.className = 'block-subblocks';
        elseContainer.dataset.slot = 'else';
        el.appendChild(elseContainer);
      }
    }

    return el;
  }

  function makeFieldInput(field, value, catColor) {
    if (field.type === 'select' || field.type === 'key' || field.type === 'boolean') {
      const sel = document.createElement('select');
      sel.className = 'block-select';
      const options = field.options || (field.type === 'key' ? BlockDefs.KEY_OPTIONS : ['true','false']);
      options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o;
        if (String(o) === String(value)) opt.selected = true;
        sel.appendChild(opt);
      });
      return sel;
    }
    if (field.type === 'color') {
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = value || '#4488ff';
      inp.style.width = '40px'; inp.style.height = '24px';
      inp.style.border = 'none'; inp.style.borderRadius = '4px'; inp.style.cursor = 'pointer';
      return inp;
    }
    if (field.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'block-input';
      ta.value = value;
      ta.rows = 3; ta.style.resize = 'vertical';
      return ta;
    }
    if (field.type === 'boolean_slot') {
      const div = document.createElement('div');
      div.style.cssText = 'flex:1;background:rgba(0,0,0,0.2);border:1px dashed rgba(255,255,255,0.2);border-radius:4px;padding:0.2rem 0.5rem;font-size:0.72rem;color:rgba(255,255,255,0.4);min-width:60px;text-align:center;';
      div.textContent = field.name;
      div.dataset.boolSlot = field.name;
      return div;
    }
    // Default: text/number input
    const inp = document.createElement('input');
    inp.type = field.type === 'number' ? 'number' : 'text';
    inp.className = 'block-input';
    inp.value = value;
    inp.placeholder = field.default;
    return inp;
  }

  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { makePaletteBlock, makeBlockNode, getColor, hexAlpha };
})();
