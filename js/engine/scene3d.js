/**
 * scene3d.js — Interactive 3D scene editor using Three.js
 */

window.Scene3D = (() => {
  let scene, camera, renderer, canvas;
  let objects3d = []; // { obj, root, pickMesh }
  let selectedPickMesh = null;
  let isDragging = false, prevMX = 0, prevMY = 0;
  let azimuth = 0.5, elevation = 0.5, radius = 20;
  let initialized = false;
  let activeTool = 'select';

  function init() {
    canvas = document.getElementById('scene-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2a);
    scene.fog = new THREE.Fog(0x1a1a2a, 30, 120);

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    updateCameraPos();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    scene.add(sun);

    scene.add(new THREE.GridHelper(50, 50, 0x333355, 0x222244));
    scene.add(new THREE.AxesHelper(3));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ visible: false })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    setupInput();
    new ResizeObserver(onResize).observe(canvas.parentElement);

    initialized = true;
    animate();
  }

  function animate() {
    if (!renderer) return;
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    const stats = document.getElementById('scene-stats');
    if (stats) stats.textContent = `Objects: ${objects3d.length} | Tool: ${activeTool}`;
  }

  function onResize() {
    if (!renderer || !camera || !canvas) return;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function updateCameraPos() {
    if (!camera) return;
    camera.position.x = radius * Math.sin(azimuth) * Math.cos(elevation);
    camera.position.y = radius * Math.sin(elevation);
    camera.position.z = radius * Math.cos(azimuth) * Math.cos(elevation);
    camera.lookAt(0, 0, 0);
  }

  function setupInput() {
    const el = canvas;
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) {
        isDragging = true;
        prevMX = e.clientX;
        prevMY = e.clientY;
      }
      if (e.button === 0) onClick(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMX;
      const dy = e.clientY - prevMY;
      azimuth -= dx * 0.008;
      elevation = Math.max(-1.4, Math.min(1.4, elevation + dy * 0.008));
      prevMX = e.clientX;
      prevMY = e.clientY;
      updateCameraPos();
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 1 || e.button === 2) isDragging = false;
    });

    el.addEventListener('wheel', (e) => {
      radius = Math.max(2, Math.min(120, radius + e.deltaY * 0.04));
      updateCameraPos();
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  function onClick(e) {
    if (!scene || !camera || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const picks = objects3d.map(o => o.pickMesh).filter(Boolean);
    const hits = raycaster.intersectObjects(picks, true);
    if (!hits.length) return selectObject3D(null);

    const picked = hits[0].object;
    const entry = objects3d.find(o => o.pickMesh === picked || (o.pickMesh && o.pickMesh.children.includes(picked)));
    selectObject3D(entry || null);
  }

  function highlight(entry, on) {
    if (!entry || !entry.pickMesh) return;
    entry.pickMesh.traverse((node) => {
      if (!node.material) return;
      if (node.material.emissive) {
        if (on) {
          node.userData._oldEmissive = node.material.emissive.getHex();
          node.material.emissive.setHex(0x2244ff);
        } else if (node.userData._oldEmissive !== undefined) {
          node.material.emissive.setHex(node.userData._oldEmissive);
        }
      }
    });
  }

  function selectObject3D(entry) {
    const prev = objects3d.find(o => o.pickMesh === selectedPickMesh);
    highlight(prev, false);

    selectedPickMesh = entry ? entry.pickMesh : null;
    if (!entry) return;

    highlight(entry, true);
    if (window.StudioApp && typeof window.StudioApp.selectObject === 'function') {
      window.StudioApp.selectObject(entry.obj.id);
    }
  }

  function makeRootForObject(obj) {
    const color = obj.color || '#4488ff';
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

    if (obj.type === 'character') {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.4), mat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), mat);
      head.position.y = 0.75;
      g.add(body, head);
      return { root: g, pickMesh: body };
    }

    if (obj.type === 'camera') {
      const g = new THREE.Group();
      const camBody = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x66ddff }));
      camBody.rotation.x = Math.PI / 2;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x113344 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.35;
      g.add(camBody, lens);
      return { root: g, pickMesh: camBody };
    }

    if (obj.type === 'light') {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), new THREE.MeshStandardMaterial({ color: obj.color || '#ffffff', emissive: obj.color || '#ffffff', emissiveIntensity: 0.4 }));
      return { root: bulb, pickMesh: bulb };
    }

    let mesh;
    switch (obj.type) {
      case 'cube': mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); break;
      case 'sphere': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), mat); break;
      case 'cylinder': mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), mat); break;
      case 'plane': {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      }
      default: mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    }
    return { root: mesh, pickMesh: mesh };
  }

  function addObject(obj) {
    if (!scene) return;
    const { root, pickMesh } = makeRootForObject(obj);
    root.position.set(obj.x || 0, obj.y || 0, obj.z || 0);
    root.rotation.set((obj.rotX || 0) * Math.PI / 180, (obj.rotY || 0) * Math.PI / 180, (obj.rotZ || 0) * Math.PI / 180);
    root.scale.set(obj.scaleX || 1, obj.scaleY || 1, obj.scaleZ || 1);
    root.castShadow = true;
    root.receiveShadow = true;

    scene.add(root);
    objects3d.push({ obj, root, pickMesh });
  }

  function removeObject(objId) {
    const i = objects3d.findIndex(o => o.obj.id === objId);
    if (i < 0) return;
    const od = objects3d[i];
    scene.remove(od.root);
    objects3d.splice(i, 1);
    if (selectedPickMesh === od.pickMesh) selectedPickMesh = null;
  }

  function updateObject(obj) {
    const od = objects3d.find(o => o.obj.id === obj.id);
    if (!od) return;
    od.root.position.set(obj.x || 0, obj.y || 0, obj.z || 0);
    od.root.rotation.set((obj.rotX || 0) * Math.PI / 180, (obj.rotY || 0) * Math.PI / 180, (obj.rotZ || 0) * Math.PI / 180);
    od.root.scale.set(obj.scaleX || 1, obj.scaleY || 1, obj.scaleZ || 1);
    od.root.traverse((n) => {
      if (n.material && obj.color) {
        if (n.material.color) n.material.color.set(obj.color);
      }
    });
  }

  function setView(view) {
    switch (view) {
      case 'top': azimuth = 0; elevation = Math.PI / 2 - 0.01; radius = 22; break;
      case 'front': azimuth = 0; elevation = 0; radius = 22; break;
      case 'right': azimuth = Math.PI / 2; elevation = 0; radius = 22; break;
      default: azimuth = 0.5; elevation = 0.5; radius = 20; break;
    }
    updateCameraPos();
  }

  function setTool(tool) { activeTool = tool; }

  return {
    init,
    addObject,
    removeObject,
    updateObject,
    setView,
    setTool,
    initialized: () => initialized,
  };
})();
