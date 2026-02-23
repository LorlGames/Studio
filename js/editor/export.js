/**
 * export.js — Packages the game as a .lorlgame file
 * Supports optional AES-GCM password encryption of Studio project data
 */

window.Exporter = (() => {
  async function exportGame(objects, blockScripts, customFiles, assets, meta) {
    const JSZip = window.JSZip;
    if (!JSZip) { alert('JSZip not loaded yet. Please wait and try again.'); return; }

    const zip = new JSZip();

    // manifest.json
    const manifest = {
      id:          meta.id          || ('game_' + Date.now()),
      name:        meta.name        || 'My Game',
      author:      meta.author      || 'Unknown',
      description: meta.description || '',
      version:     meta.version     || '1.0.0',
      lorlVersion: '1',
      encrypted:   !!meta.password,
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Generate game JS
    const gameJS = CodeGen.generateGameJS(
      objects,
      blockScripts,
      Object.entries(customFiles).map(([name, content]) => ({ name, content }))
    );

    // Asset inline strings
    const assetInlines = assets.map(a => {
      if (a.type === 'textures') return `__assetUrls["${escHtml(a.name)}"] = "${a.data}";`;
      return '';
    }).join('\n');

    // Build playable index.html (never encrypted — games always play)
    const indexHtml = buildIndexHtml(manifest, gameJS, assetInlines);
    zip.file('index.html', indexHtml);

    // Studio project data (for re-import)
    const studioData = JSON.stringify({
      version: '1',
      objects,
      blockScripts,
      customFiles,
      assets: assets.map(a => ({ ...a })), // full asset data
      manifest,
    });

    if (meta.password) {
      // ── ENCRYPT studio data ──
      StudioApp.log('Encrypting with AES-GCM 256-bit…', 'info');
      const encBuffer = await LorldCrypto.encrypt(studioData, meta.password);
      const encBase64 = LorldCrypto.bufferToBase64(encBuffer);
      zip.file('game.enc', encBase64);
      zip.file('.lorl-encrypted', JSON.stringify({
        algorithm: 'AES-GCM-256',
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        hint: meta.passwordHint || '',
      }));
      StudioApp.log('Encryption complete ✓', 'success');
    } else {
      // Plain studio data
      zip.file('.lorl-studio-data', studioData);
    }

    // Add asset files to ZIP
    assets.forEach(a => {
      try {
        if (a.data && a.data.startsWith('data:')) {
          const b64 = a.data.split(',')[1];
          if (b64) zip.file('assets/' + a.name, b64, { base64: true });
        }
      } catch (_) {}
    });

    // Generate and trigger download
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (manifest.id || 'game') + '.lorlgame';
    a.click();
    URL.revokeObjectURL(url);

    StudioApp.log(`✓ Exported "${manifest.name}" → ${a.download}${manifest.encrypted ? ' (encrypted)' : ''}`, 'success');
  }

  // ── Build the playable index.html ──
  function buildIndexHtml(manifest, gameJS, assetInlines) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escHtml(manifest.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a12; overflow: hidden; width: 100vw; height: 100vh; font-family: sans-serif; }
    #game-canvas { display: block; width: 100%; height: 100%; }
    #hud { position: fixed; inset: 0; pointer-events: none; z-index: 100; }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div id="hud"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <script>
// Asset URLs
const __assetUrls = {};
${assetInlines}

// Lorl SDK bridge (injected when playing through Lorl platform)
window.addEventListener('message', e => {
  if (e.data && e.data.lorlInit) {
    const {serverUrl, roomId, username} = e.data.lorlInit;
    if (window.Lorl) Lorl._init(serverUrl, roomId, username);
  }
});
window.addEventListener('load', () => {
  window.parent && window.parent.postMessage({lorlReady: true}, '*');
  window.dispatchEvent(new Event('lorl_start'));
});
  <\/script>
  <script>
${gameJS}
  <\/script>
</body>
</html>`;
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { exportGame };
})();
