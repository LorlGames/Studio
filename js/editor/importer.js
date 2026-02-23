/**
 * importer.js — Import .lorlgame files into Lorl Studio
 * Handles both plain and encrypted games
 */

window.Importer = (() => {

  async function importGame(file) {
    const JSZip = window.JSZip;
    if (!JSZip) throw new Error('JSZip not loaded');

    let zip;
    try {
      const buf = await file.arrayBuffer();
      zip = await JSZip.loadAsync(buf);
    } catch (e) {
      throw new Error('Not a valid .lorlgame file (could not read ZIP): ' + e.message);
    }

    // Read manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) throw new Error('Missing manifest.json — is this a valid .lorlgame?');
    const manifest = JSON.parse(await manifestFile.async('string'));

    // Check for encryption
    const encMarker = zip.file('.lorl-encrypted');
    const encFile   = zip.file('game.enc');
    const isEncrypted = !!(encMarker && encFile);

    let studioData;

    if (isEncrypted) {
      // ── Prompt for password ──
      studioData = await decryptWithPrompt(zip, encFile, manifest);
      if (!studioData) return null; // User cancelled
    } else {
      // ── Plain import ──
      const plainDataFile = zip.file('.lorl-studio-data');
      if (!plainDataFile) {
        // No studio data — try to reconstruct from index.html
        throw new Error(
          'This .lorlgame has no Studio data embedded.\n\n' +
          'It was likely exported without Studio or is a manually-made game.\n' +
          'Only games exported from Lorl Studio can be imported.'
        );
      }
      studioData = await plainDataFile.async('string');
    }

    // Parse studio data
    let project;
    try {
      project = JSON.parse(studioData);
    } catch (e) {
      throw new Error('Studio data is corrupted: ' + e.message);
    }

    return { manifest, project };
  }

  async function decryptWithPrompt(zip, encFile, manifest) {
    const encMarkerFile = zip.file('.lorl-encrypted');
    let encInfo = {};
    try { encInfo = JSON.parse(await encMarkerFile.async('string')); } catch(_) {}

    // Show password modal
    return new Promise((resolve) => {
      showPasswordModal(manifest, encInfo, async (password) => {
        if (password === null) { resolve(null); return; }
        try {
          const encBase64  = await encFile.async('string');
          const encBuffer  = LorldCrypto.base64ToBuffer(encBase64);
          const plaintext  = await LorldCrypto.decrypt(encBuffer, password);
          resolve(plaintext);
        } catch (e) {
          showDecryptError(manifest, encInfo, resolve, e.message);
        }
      });
    });
  }

  function showPasswordModal(manifest, encInfo, callback) {
    const overlay = document.getElementById('modal-overlay');
    const existingModal = document.getElementById('modal-import-password');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-import-password';
    modal.className = 'modal';
    modal.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
        <span style="font-size:1.5rem">🔒</span>
        <h2 style="margin:0">Encrypted Game</h2>
      </div>
      <p style="color:var(--text2);margin:0.5rem 0 0.25rem"><strong style="color:var(--text)">${escHtml(manifest.name)}</strong> is password-protected.</p>
      <p style="color:var(--text2);font-size:0.85rem;margin-bottom:1.25rem">Enter the password to decrypt and import this game into Studio.</p>
      ${encInfo.hint ? `<div style="background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.82rem;color:var(--text2)">💬 Hint: ${escHtml(encInfo.hint)}</div>` : ''}
      <label style="font-size:0.78rem;color:var(--text2)">Password</label>
      <input type="password" id="import-password-input" placeholder="Enter password…" autocomplete="off"
        style="margin:0.35rem 0 0.25rem;width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-mono,monospace);font-size:0.9rem;padding:0.6rem 0.85rem;outline:none;"/>
      <div id="import-pw-error" style="color:#ef4444;font-size:0.78rem;min-height:1.2rem;margin-top:0.25rem"></div>
      <div class="modal-actions">
        <button class="btn-secondary" id="import-pw-cancel">Cancel</button>
        <button class="btn-run" id="import-pw-confirm">🔓 Decrypt</button>
      </div>
    `;

    overlay.classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    overlay.appendChild(modal);

    const inp = modal.querySelector('#import-password-input');
    const confirmBtn = modal.querySelector('#import-pw-confirm');
    const cancelBtn = modal.querySelector('#import-pw-cancel');

    setTimeout(() => inp.focus(), 100);

    confirmBtn.onclick = () => {
      const pw = inp.value;
      if (!pw) { modal.querySelector('#import-pw-error').textContent = 'Please enter a password.'; return; }
      confirmBtn.textContent = '⏳ Decrypting…';
      confirmBtn.disabled = true;
      modal.remove();
      overlay.classList.add('hidden');
      callback(pw);
    };

    cancelBtn.onclick = () => {
      modal.remove();
      overlay.classList.add('hidden');
      callback(null);
    };

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmBtn.click();
    });
  }

  function showDecryptError(manifest, encInfo, resolve, errorMsg) {
    const overlay = document.getElementById('modal-overlay');
    const existingModal = document.getElementById('modal-import-password');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-import-password';
    modal.className = 'modal';
    modal.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
        <span style="font-size:1.5rem">❌</span>
        <h2 style="margin:0">Wrong Password</h2>
      </div>
      <p style="color:var(--text2);margin:0.5rem 0 1rem">The password you entered is incorrect. Please try again.</p>
      ${encInfo.hint ? `<div style="background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.82rem;color:var(--text2)">💬 Hint: ${escHtml(encInfo.hint)}</div>` : ''}
      <label style="font-size:0.78rem;color:var(--text2)">Try again</label>
      <input type="password" id="import-password-input" placeholder="Password…" autocomplete="off"
        style="margin:0.35rem 0 0.25rem;width:100%;background:var(--bg3);border:1px solid #ef4444;border-radius:8px;color:var(--text);font-family:var(--font-mono,monospace);font-size:0.9rem;padding:0.6rem 0.85rem;outline:none;"/>
      <div class="modal-actions">
        <button class="btn-secondary" id="import-pw-cancel">Cancel</button>
        <button class="btn-run" id="import-pw-confirm">🔓 Try Again</button>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.appendChild(modal);

    const inp = modal.querySelector('#import-password-input');
    const confirmBtn = modal.querySelector('#import-pw-confirm');
    const cancelBtn = modal.querySelector('#import-pw-cancel');

    setTimeout(() => inp.focus(), 100);

    confirmBtn.onclick = async () => {
      const pw = inp.value;
      if (!pw) return;
      confirmBtn.textContent = '⏳ Decrypting…'; confirmBtn.disabled = true;
      modal.remove();
      overlay.classList.add('hidden');
      try {
        const encFile2 = window._currentImportZip?.file('game.enc');
        if (!encFile2) { resolve(null); return; }
        const encBase64 = await encFile2.async('string');
        const encBuffer = LorldCrypto.base64ToBuffer(encBase64);
        const plaintext = await LorldCrypto.decrypt(encBuffer, pw);
        resolve(plaintext);
      } catch (e) {
        showDecryptError(manifest, encInfo, resolve, e.message);
      }
    };

    cancelBtn.onclick = () => { modal.remove(); overlay.classList.add('hidden'); resolve(null); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirmBtn.click(); });
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { importGame };
})();
