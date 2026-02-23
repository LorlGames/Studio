/**
 * scene3d.js — Interactive 3D scene editor using Three.js
 */

window.Scene3D = (() => {
  let scene, camera, renderer, canvas;
  let objects3d = []; // { mesh, objData }
  let selectedMesh = null;
  let orbitEnabled = true;
  let isDragging = false, prevMX = 0, prevMY = 0;
  let azimuth = 0.5, elevation = 0.5, radius = 20;
  let initialized = false;
  let activeTool = 'select';
  let gridHelper;

  function init() {
    canvas = document.getElementById('scene-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2a);
    scene.fog = new THREE.Fog(0x1a1a2a, 30, 100);

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(55, w/h, 0.1, 500);
    updateCameraPos();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    scene.add(sun);

    // Grid
    gridHelper = new THREE.GridHelper(40, 40, 0x333355, 0x222244);
    scene.add(gridHelper);

    // Axes
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    // Ground plane (invisible, for raycasting)
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, visible: false });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Input
    setupInput();

    // Resize observer
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement);

    // Render loop
    animate();
    initialized = true;
  }

  function animate() {
    if (!renderer) return;
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    document.getElementById('scene-stats').textContent = `Objects: ${objects3d.length} | Tool: ${activeTool}`;
  }

  function onResize() {
    if (!canvas || !renderer || !camera) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function updateCameraPos() {
    camera.position.x = radius * Math.sin(azimuth) * Math.cos(elevation);
    camera.position.y = radius * Math.sin(elevation);
    camera.position.z = radius * Math.cos(azimuth) * Math.cos(elevation);
    camera.lookAt(0, 0, 0);
  }

  function setupInput() {
    const el = canvas;
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) { isDragging = true; prevMX=e.clientX; prevMY=e.clientY; }
      if (e.button === 0) onClick(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMX, dy = e.clientY - prevMY;
      azimuth -= dx * 0.008;
      elevation = Math.max(-1.4, Math.min(1.4, elevation + dy * 0.008));
      updateCameraPos(); prevMX=e.clientX; prevMY=e.clientY;
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 1 || e.button === 2) isDragging = false; });
    el.addEventListener('wheel', (e) => {
      radius = Math.max(1, Math.min(100, radius + e.deltaY * 0.05));
      updateCameraPos(); e.preventDefault();
    }, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  function onClick(e) {
    if (!scene) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const meshes = objects3d.map(o => o.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const hit = hits[0].object;
      selectMesh(hit);
    } else {
      selectMesh(null);
    }
  }

  function selectMesh(mesh) {
    // Deselect prev
    if (selectedMesh && selectedMesh._origColor !== undefined) {
      selectedMesh.material.emissive.setHex(selectedMesh._origColor);
    }
    selectedMesh = mesh;
    if (mesh) {
      mesh._origColor = mesh.material.emissive ? mesh.material.emissive.getHex() : 0;
      if (mesh.material.emissive) mesh.material.emissive.setHex(0x2244ff);
      const objData = objects3d.find(o => o.mesh === mesh);
      if (objData) {
        renderSceneProps(objData.obj);
        // Also select in main object tree
        window.StudioApp && StudioApp.selectObject(objData.obj.id);
      }
    } else {
      document.getElementById('scene-props-content').innerHTML = '<div class="empty-hint">Select an object in the scene</div>';
    }
  }

  function renderSceneProps(obj) {
    const el = document.getElementById('scene-props-content');
    el.innerHTML = `
      <div class="prop-group">Transform</div>
      <div class="prop-row"><span class="prop-label">Name</span><input class="prop-input" id="sp-name" value="${obj.name}"/></div>
      <div class="prop-row"><span class="prop-label">X</span><input class="prop-input" type="number" id="sp-x" value="${(obj.x||0).toFixed(2)}" step="0.1"/></div>
      <div class="prop-row"><span class="prop-label">Y</span><input class="prop-input" type="number" id="sp-y" value="${(obj.y||0).toFixed(2)}" step="0.1"/></div>
      <div class="prop-row"><span class="prop-label">Z</span><input class="prop-input" type="number" id="sp-z" value="${(obj.z||0).toFixed(2)}" step="0.1"/></div>
      <div class="prop-group">Rotation</div>
      <div class="prop-row"><span class="prop-label">Rot X</span><input class="prop-input" type="number" id="sp-rx" value="${(obj.rotX||0).toFixed(1)}" step="1"/></div>
      <div class="prop-row"><span class="prop-label">Rot Y</span><input class="prop-input" type="number" id="sp-ry" value="${(obj.rotY||0).toFixed(1)}" step="1"/></div>
      <div class="prop-row"><span class="prop-label">Rot Z</span><input class="prop-input" type="number" id="sp-rz" value="${(obj.rotZ||0).toFixed(1)}" step="1"/></div>
      <div class="prop-group">Scale</div>
      <div class="prop-row"><span class="prop-label">Sc X</span><input class="prop-input" type="number" id="sp-sx" value="${(obj.scaleX||1).toFixed(2)}" step="0.1"/></div>
      <div class="prop-row"><span class="prop-label">Sc Y</span><input class="prop-input" type="number" id="sp-sy" value="${(obj.scaleY||1).toFixed(2)}" step="0.1"/></div>
      <div class="prop-row"><span class="prop-label">Sc Z</span><input class="prop-input" type="number" id="sp-sz" value="${(obj.scaleZ||1).toFixed(2)}" step="0.1"/></div>
      <div class="prop-group">Appearance</div>
      <div class="prop-row"><span class="prop-label">Color</span><input type="color" class="prop-color" id="sp-color" value="${obj.color||'#4488ff'}"/></div>
    `;
    const update = (prop, inputId, num=false) => {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      inp.addEventListener('change', () => {
        const v = num ? parseFloat(inp.value) : inp.value;
        obj[prop] = v;
        syncMesh(obj);
        if (window.StudioApp) StudioApp.refreshProps();
      });
    };
    ['name','x','y','z','rotX','rotY','rotZ','scaleX','scaleY','scaleZ'].forEach((p, i) => {
      update(p, ['sp-name','sp-x','sp-y','sp-z','sp-rx','sp-ry','sp-rz','sp-sx','sp-sy','sp-sz'][i], i > 0);
    });
    document.getElementById('sp-color').addEventListener('change', e => {
      obj.color = e.target.value;
      const od = objects3d.find(o => o.obj === obj);
      if (od && od.mesh) od.mesh.material.color.set(obj.color);
    });
  }

  function syncMesh(obj) {
    const od = objects3d.find(o => o.obj === obj);
    if (!od || !od.mesh) return;
    od.mesh.position.set(obj.x||0, obj.y||0, obj.z||0);
    od.mesh.rotation.set((obj.rotX||0)*Math.PI/180, (obj.rotY||0)*Math.PI/180, (obj.rotZ||0)*Math.PI/180);
    od.mesh.scale.set(obj.scaleX||1, obj.scaleY||1, obj.scaleZ||1);
  }

  function addObject(obj) {
    if (!scene) return;
    let geo, mat;
    mat = new THREE.MeshStandardMaterial({ color: obj.color || 0x4488ff, roughness: 0.7 });

    switch(obj.type) {
      case 'cube':      geo = new THREE.BoxGeometry(obj.scaleX||1, obj.scaleY||1, obj.scaleZ||1); break;
      case 'sphere':    geo = new THREE.SphereGeometry(0.5, 16, 12); break;
      case 'cylinder':  geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16); break;
      case 'plane':     geo = new THREE.PlaneGeometry(5, 5); break;
      case 'character': {
        const body = new THREE.Group();
        const torsoG = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const headG = new THREE.SphereGeometry(0.35, 8, 6);
        const torso = new THREE.Mesh(torsoG, mat);
        const head = new THREE.Mesh(headG, mat.clone());
        head.position.y = 1;
        body.add(torso); body.add(head);
        body.position.set(obj.x||0, obj.y||0, obj.z||0);
        body.castShadow = true;
        scene.add(body);
        objects3d.push({ mesh: torso, obj, group: body });
        return;
      }
      case 'light': {
        const pl = new THREE.PointLight(obj.color||0xffffff, 1, 20);
        pl.position.set(obj.x||0, obj.y||3, obj.z||0);
        scene.add(pl);
        const helper = new THREE.PointLightHelper(pl, 0.5);
        scene.add(helper);
        objects3d.push({ mesh: helper, obj });
        return;
      }
      case 'camera': {
        const ch = new THREE.CameraHelper(new THREE.PerspectiveCamera(60, 1.77, 0.1, 20));
        ch.position.set(obj.x||0, obj.y||2, obj.z||0);
        scene.add(ch);
        objects3d.push({ mesh: ch, obj });
        return;
      }
      case 'trigger': {
        geo = new THREE.BoxGeometry(2, 2, 2);
        mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true, opacity: 0.5, transparent: true });
        break;
      }
      case 'spawn': {
        geo = new THREE.ConeGeometry(0.3, 1, 8);
        mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        break;
      }
      case 'particle': {
        const pts = [];
        for(let i=0;i<50;i++) pts.push(new THREE.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2));
        const ptGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const ptMat = new THREE.PointsMaterial({ color: obj.color||0xffff00, size: 0.1 });
        const points = new THREE.Points(ptGeo, ptMat);
        points.position.set(obj.x||0, obj.y||0, obj.z||0);
        scene.add(points);
        objects3d.push({ mesh: points, obj });
        return;
      }
      default: geo = new THREE.BoxGeometry(1,1,1);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(obj.x||0, obj.y||0.5, obj.z||0);
    mesh.rotation.set((obj.rotX||0)*Math.PI/180, (obj.rotY||0)*Math.PI/180, (obj.rotZ||0)*Math.PI/180);
    mesh.scale.set(obj.scaleX||1, obj.scaleY||1, obj.scaleZ||1);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    objects3d.push({ mesh, obj });
  }

  function removeObject(objId) {
    const i = objects3d.findIndex(o => o.obj.id === objId);
    if (i < 0) return;
    const od = objects3d[i];
    if (od.mesh) scene.remove(od.mesh);
    if (od.group) scene.remove(od.group);
    objects3d.splice(i, 1);
    if (selectedMesh === od.mesh) selectedMesh = null;
  }

  function updateObject(obj) {
    const od = objects3d.find(o => o.obj.id === obj.id);
    if (od) syncMesh(obj);
  }

  function setView(view) {
    switch(view) {
      case 'top':   azimuth=0; elevation=Math.PI/2 - 0.01; radius=20; break;
      case 'front': azimuth=0; elevation=0; radius=20; break;
      case 'right': azimuth=Math.PI/2; elevation=0; radius=20; break;
      case 'persp': azimuth=0.5; elevation=0.5; radius=20; break;
    }
    updateCameraPos();
  }

  function setTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.scene-tool').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + tool);
    if (btn) btn.classList.add('active');
  }

  return { init, addObject, removeObject, updateObject, setView, setTool, initialized: () => initialized };
})();
