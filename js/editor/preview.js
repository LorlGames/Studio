/**
 * preview.js — Build and run game in iframe preview
 */

window.Preview = (() => {
  function buildGame(objects, blockScripts, customFiles, assets) {
    const jsCode = CodeGen.generateGameJS(
      objects,
      blockScripts,
      Object.entries(customFiles).map(([name, content]) => ({ name, content }))
    );

    const assetInlines = assets.map(a => {
      if (a.type === 'textures') return `__assetUrls["${a.name}"] = "${a.data}";`;
      return '';
    }).join('\n');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lorl Game Preview</title>
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

// Dispatch lorl_start
window.addEventListener('load', () => {
  window.dispatchEvent(new Event('lorl_start'));
});
  <\/script>
  <script>
${jsCode}
  <\/script>
</body>
</html>`;
    return html;
  }

  function run(objects, blockScripts, customFiles, assets) {
    const html = buildGame(objects, blockScripts, customFiles, assets);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const frame = document.getElementById('preview-frame');
    frame.src = url;

    // Hide overlay
    document.getElementById('preview-overlay').style.display = 'none';

    // Relay console messages
    frame.onload = () => {
      try {
        const fw = frame.contentWindow;
        const origLog = fw.console.log.bind(fw.console);
        const origError = fw.console.error.bind(fw.console);
        const origWarn = fw.console.warn.bind(fw.console);
        fw.console.log = (...a) => { origLog(...a); StudioApp.log(a.join(' '), 'info'); };
        fw.console.error = (...a) => { origError(...a); StudioApp.log(a.join(' '), 'error'); };
        fw.console.warn = (...a) => { origWarn(...a); StudioApp.log(a.join(' '), 'warn'); };
      } catch(_) {}
    };

    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return html;
  }

  function stop() {
    const frame = document.getElementById('preview-frame');
    frame.src = 'about:blank';
    document.getElementById('preview-overlay').style.display = '';
  }

  return { run, stop, buildGame };
})();
