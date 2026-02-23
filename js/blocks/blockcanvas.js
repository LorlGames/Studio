/**
 * blockcanvas.js — Interactive block workspace
 * Handles: drag from palette, move blocks, zoom/pan, connections, serialization
 */

window.BlockCanvas = (() => {
  const canvas = document.getElementById('block-canvas');
  const hint = document.getElementById('canvas-hint');
  const zoomLabel = document.getElementById('zoom-label');

  let zoom = 1;
  let panX = 0, panY = 0;
  let isDraggingCanvas = false;
  let lastMX = 0, lastMY = 0;
  let draggingBlock = null;
  let dragOffX = 0, dragOffY = 0;
  let selectedBlock = null;

  // ObjectId -> [blocks]
  const objectScripts = {};
  let currentObjectId = null;

  // Apply transform
  function applyTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

  // ── Palette drag into canvas ──
  document.getElementById('palette-categories').addEventListener('dragstart', (e) => {
    const tpl = e.target.closest('.block-template');
    if (!tpl) return;
    e.dataTransfer.setData('block-id', tpl.dataset.blockId);
  });

  // ── Canvas drop zone ──
  const wrap = document.querySelector('.block-canvas-wrap');
  wrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('block-id');
    if (!blockId || !currentObjectId) {
      if (!currentObjectId) StudioApp.log('Select an object first!', 'warn');
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;
    addBlockAt(blockId, x, y);
  });

  // ── Canvas pan (middle mouse / right drag) ──
  wrap.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      isDraggingCanvas = true;
      lastMX = e.clientX; lastMY = e.clientY;
      e.preventDefault();
    } else if (e.button === 0 && e.target === canvas || e.target === wrap) {
      // Click empty space: deselect
      selectBlock(null);
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (isDraggingCanvas) {
      panX += e.clientX - lastMX;
      panY += e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      applyTransform();
    }
    if (draggingBlock) {
      const rect = wrap.getBoundingClientRect();
      const nx = (e.clientX - rect.left - panX) / zoom - dragOffX;
      const ny = (e.clientY - rect.top - panY) / zoom - dragOffY;
      draggingBlock.style.left = nx + 'px';
      draggingBlock.style.top = ny + 'px';
      const data = getBlockData(draggingBlock);
      if (data) { data.x = nx; data.y = ny; }
    }
  });
  document.addEventListener('mouseup', () => {
    isDraggingCanvas = false;
    draggingBlock = null;
  });
  wrap.addEventListener('contextmenu', e => e.preventDefault());

  // ── Zoom ──
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    panX = mx - (mx - panX) * delta;
    panY = my - (my - panY) * delta;
    zoom = Math.max(0.2, Math.min(3, zoom * delta));
    applyTransform();
  }, { passive: false });

  document.getElementById('btn-zoom-in').onclick = () => { zoom = Math.min(3, zoom * 1.2); applyTransform(); };
  document.getElementById('btn-zoom-out').onclick = () => { zoom = Math.max(0.2, zoom * 0.83); applyTransform(); };
  document.getElementById('btn-fit').onclick = fitView;

  // ── Add block ──
  function addBlockAt(blockId, x, y, values = {}) {
    if (!currentObjectId) return;
    if (!objectScripts[currentObjectId]) objectScripts[currentObjectId] = [];

    const cat = BlockDefs.CATEGORIES.find(c => c.blocks.find(b => b.id === blockId));
    if (!cat) return;
    const def = cat.blocks.find(b => b.id === blockId);
    if (!def) return;

    const color = BlockRender.getColor(cat.id);
    const el = BlockRender.makeBlockNode(def, color, values);
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    // Make draggable within canvas
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      e.stopPropagation();
      selectBlock(el);
      const rect2 = wrap.getBoundingClientRect();
      draggingBlock = el;
      dragOffX = (e.clientX - rect2.left - panX) / zoom - el.offsetLeft;
      dragOffY = (e.clientY - rect2.top - panY) / zoom - el.offsetTop;
    });

    // Right click = delete
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (confirm('Delete this block?')) {
        removeBlock(el);
      }
    });

    canvas.appendChild(el);
    hint.style.display = 'none';

    const blockData = { id: blockId, x, y, values, el };
    objectScripts[currentObjectId].push(blockData);

    selectBlock(el);
    return el;
  }

  function removeBlock(el) {
    if (!currentObjectId) return;
    const scripts = objectScripts[currentObjectId];
    if (!scripts) return;
    const i = scripts.findIndex(b => b.el === el);
    if (i >= 0) scripts.splice(i, 1);
    el.remove();
    if (selectedBlock === el) selectedBlock = null;
  }

  function getBlockData(el) {
    if (!currentObjectId || !objectScripts[currentObjectId]) return null;
    return objectScripts[currentObjectId].find(b => b.el === el);
  }

  function selectBlock(el) {
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = el;
    if (el) el.classList.add('selected');
  }

  // ── Switch object ──
  function switchObject(objectId) {
    // Save current
    currentObjectId = objectId;
    // Clear canvas
    Array.from(canvas.querySelectorAll('.block-node')).forEach(n => n.remove());
    hint.style.display = objectId ? 'none' : 'block';
    if (!objectId) { hint.style.display = 'block'; return; }
    // Load scripts for this object
    const scripts = objectScripts[objectId] || [];
    objectScripts[objectId] = scripts;
    scripts.forEach(b => {
      const cat = BlockDefs.CATEGORIES.find(c => c.blocks.find(bl => bl.id === b.id));
      if (!cat) return;
      const def = cat.blocks.find(bl => bl.id === b.id);
      const color = BlockRender.getColor(cat.id);
      const el = BlockRender.makeBlockNode(def, color, b.values);
      el.style.left = b.x + 'px';
      el.style.top = b.y + 'px';
      // Reassign dragging
      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
        e.stopPropagation();
        selectBlock(el);
        const rect2 = wrap.getBoundingClientRect();
        draggingBlock = el;
        dragOffX = (e.clientX - rect2.left - panX) / zoom - el.offsetLeft;
        dragOffY = (e.clientY - rect2.top - panY) / zoom - el.offsetTop;
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (confirm('Delete this block?')) removeBlock(el);
      });
      b.el = el;
      canvas.appendChild(el);
    });
    if (scripts.length > 0) hint.style.display = 'none';
    fitView();
  }

  function fitView() {
    const nodes = Array.from(canvas.querySelectorAll('.block-node'));
    if (!nodes.length) { panX = 60; panY = 60; zoom = 1; applyTransform(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const x = parseFloat(n.style.left);
      const y = parseFloat(n.style.top);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + n.offsetWidth); maxY = Math.max(maxY, y + n.offsetHeight);
    });
    const rect = wrap.getBoundingClientRect();
    const padX = 60, padY = 60;
    const scaleX = (rect.width - padX*2) / (maxX - minX || 1);
    const scaleY = (rect.height - padY*2) / (maxY - minY || 1);
    zoom = Math.min(1.2, scaleX, scaleY);
    panX = padX - minX * zoom;
    panY = padY - minY * zoom;
    applyTransform();
  }

  // ── Palette search ──
  document.getElementById('palette-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.block-template').forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.palette-category').forEach(cat => {
      const visible = [...cat.querySelectorAll('.block-template')].some(b => b.style.display !== 'none');
      cat.style.display = visible ? '' : 'none';
    });
  });

  // ── Serialize ──
  function serialize() {
    const out = {};
    Object.entries(objectScripts).forEach(([objId, blocks]) => {
      out[objId] = blocks.map(b => {
        // Collect current values from DOM inputs
        const values = {};
        if (b.el) {
          b.el.querySelectorAll('[data-field]').forEach(inp => {
            values[inp.dataset.field] = inp.value !== undefined ? inp.value : inp.textContent;
          });
        }
        return { id: b.id, x: b.x, y: b.y, values };
      });
    });
    return out;
  }

  function deserialize(data) {
    Object.entries(data).forEach(([objId, blocks]) => {
      objectScripts[objId] = [];
      blocks.forEach(b => {
        objectScripts[objId].push({ ...b, el: null });
      });
    });
  }

  function getScripts() { return objectScripts; }
  function getCurrentObjectId() { return currentObjectId; }

  applyTransform();

  return { switchObject, addBlockAt, serialize, deserialize, getScripts, getCurrentObjectId };
})();
