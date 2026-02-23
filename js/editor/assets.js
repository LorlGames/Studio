/**
 * assets.js — Asset management (import, store, display)
 */

window.Assets = (() => {
  let assets = []; // { id, name, type, data (base64 or url), mime }
  let currentCat = 'all';

  const ICONS = { models: '📦', textures: '🖼️', sounds: '🔊', scripts: '📜' };

  function getType(mime, ext) {
    if (!mime && ext) {
      if (['obj','gltf','glb'].includes(ext)) return 'models';
      if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'textures';
      if (['mp3','wav','ogg'].includes(ext)) return 'sounds';
      return 'scripts';
    }
    if (mime.startsWith('image/')) return 'textures';
    if (mime.startsWith('audio/')) return 'sounds';
    if (['model/obj','model/gltf'].includes(mime)) return 'models';
    return 'models';
  }

  async function importFiles(files) {
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const type = getType(file.type, ext);
      const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);

      const data = await new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        if (['png','jpg','jpeg','gif','webp','svg'].includes(ext) || file.type.startsWith('image/')) {
          r.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
          r.readAsDataURL(file);
        } else {
          r.readAsDataURL(file);
        }
      });

      assets.push({ id, name: file.name, type, data, mime: file.type });
      StudioApp.log(`Imported: ${file.name}`, 'success');
    }
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('assets-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = currentCat === 'all' ? assets : assets.filter(a => a.type === currentCat);
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-hint" style="grid-column:1/-1">No assets yet.<br>Import files to get started.</div>';
      return;
    }
    filtered.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.dataset.id = asset.id;
      if (asset.type === 'textures') {
        card.innerHTML = `<img class="asset-card-preview" src="${asset.data}" alt="${asset.name}"/><div class="asset-card-name">${asset.name}</div>`;
      } else {
        card.innerHTML = `<div class="asset-card-icon">${ICONS[asset.type]||'📄'}</div><div class="asset-card-name">${asset.name}</div>`;
      }
      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (confirm(`Delete "${asset.name}"?`)) {
          assets = assets.filter(a => a.id !== asset.id);
          renderGrid();
        }
      });
      grid.appendChild(card);
    });
  }

  function getAssets() { return assets; }
  function getAsset(id) { return assets.find(a => a.id === id); }
  function getAssetNames(type) { return assets.filter(a => !type || a.type === type).map(a => a.name); }

  function serialize() {
    return assets.map(a => ({ id: a.id, name: a.name, type: a.type, data: a.data, mime: a.mime }));
  }
  function deserialize(data) {
    assets = data || [];
    renderGrid();
  }

  // Category filter
  document.querySelectorAll('.asset-cat').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.asset-cat').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      currentCat = el.dataset.cat;
      renderGrid();
    });
  });

  document.getElementById('btn-import-asset').onclick = () => {
    document.getElementById('asset-file-input').click();
  };
  document.getElementById('asset-file-input').onchange = (e) => {
    if (e.target.files.length) importFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  // Texture painter
  let texCtx, texTool = 'draw', texBrush = 8;
  let texDrawing = false;
  
  document.getElementById('btn-new-texture').onclick = () => {
    showModal('modal-texture');
    const c = document.getElementById('texture-canvas');
    texCtx = c.getContext('2d');
    texCtx.fillStyle = '#222233';
    texCtx.fillRect(0, 0, 256, 256);
  };

  function setupTexturePainter() {
    const c = document.getElementById('texture-canvas');
    if (!c) return;

    c.addEventListener('mousedown', e => { texDrawing = true; texDraw(e); });
    c.addEventListener('mousemove', e => { if (texDrawing) texDraw(e); });
    c.addEventListener('mouseup', () => texDrawing = false);
    c.addEventListener('mouseleave', () => texDrawing = false);

    function texDraw(e) {
      if (!texCtx) return;
      const rect = c.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 256;
      const y = (e.clientY - rect.top) / rect.height * 256;
      const color = document.getElementById('tex-color').value;
      const size = parseInt(document.getElementById('tex-brush-size').value);

      if (texTool === 'fill') {
        texCtx.fillStyle = color;
        texCtx.fillRect(0, 0, 256, 256);
        return;
      }
      texCtx.beginPath();
      texCtx.arc(x, y, size/2, 0, Math.PI*2);
      if (texTool === 'erase') {
        texCtx.fillStyle = '#222233';
      } else {
        texCtx.fillStyle = color;
      }
      texCtx.fill();
    }

    document.getElementById('tex-tool-draw').onclick = () => { texTool='draw'; };
    document.getElementById('tex-tool-erase').onclick = () => { texTool='erase'; };
    document.getElementById('tex-tool-fill').onclick = () => { texTool='fill'; };
    document.getElementById('tex-clear').onclick = () => {
      if (texCtx) { texCtx.fillStyle='#222233'; texCtx.fillRect(0,0,256,256); }
    };
  }
  setTimeout(setupTexturePainter, 500);

  document.getElementById('modal-tex-save').onclick = () => {
    const c = document.getElementById('texture-canvas');
    const name = document.getElementById('tex-name-input').value || 'texture';
    const data = c.toDataURL('image/png');
    const id = 'tex_' + Date.now();
    assets.push({ id, name: name + '.png', type: 'textures', data, mime: 'image/png' });
    renderGrid();
    StudioApp.log(`Texture "${name}" created!`, 'success');
    closeModal();
  };
  document.getElementById('modal-tex-cancel').onclick = closeModal;

  function showModal(id) { document.getElementById('modal-overlay').classList.remove('hidden'); document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
  function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

  return { importFiles, getAssets, getAsset, getAssetNames, serialize, deserialize, renderGrid };
})();
