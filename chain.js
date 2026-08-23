/* ═══════════════════════════════════════════════════
   SKILLCHAIN — 3D chain-of-custody background
   A literal chain winds through space; the camera
   travels along it as the page scrolls. Five links glow
   to mark the five stages of a job; a lit packet slides
   along the chain on a loop, representing an active job
   moving through escrow toward payout.
═══════════════════════════════════════════════════ */

(function () {
  const canvas = document.getElementById('chain-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    document.body.classList.add('no-3d');
    return;
  }

  let hasWebGL = true;
  try {
    const test = document.createElement('canvas');
    hasWebGL = !!(window.WebGLRenderingContext &&
      (test.getContext('webgl') || test.getContext('experimental-webgl')));
  } catch (e) { hasWebGL = false; }

  if (!hasWebGL) {
    document.body.classList.add('no-3d');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = window.innerWidth < 760;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    document.body.classList.add('no-3d');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isNarrow ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);

  // ── Lighting: warm, minimal, just enough to read the metal ──
  scene.add(new THREE.AmbientLight(0x362c22, 1.1));
  const key = new THREE.DirectionalLight(0xfff2e2, 0.55);
  key.position.set(6, 8, 4);
  scene.add(key);
  const packetLight = new THREE.PointLight(0xe8590c, 2.4, 14, 2);
  scene.add(packetLight);

  // ── The path the chain follows ──
  const controlPoints = [
    new THREE.Vector3(-3.2, 1.1, 1),
    new THREE.Vector3(-4.2, -0.6, -5),
    new THREE.Vector3(-1.4, 1.3, -11),
    new THREE.Vector3(2.4, -1.0, -16.5),
    new THREE.Vector3(3.6, 1.4, -22.5),
    new THREE.Vector3(0.2, -1.2, -28.5),
    new THREE.Vector3(-3.4, 0.9, -34),
    new THREE.Vector3(-2.0, -0.8, -40),
    new THREE.Vector3(1.6, 0.6, -46)
  ];
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 400;

  const CHAIN_LENGTH = curve.getLength();
  const LINKS = isNarrow ? 90 : 140;

  // ── Chain links: instanced alternating torus geometry ──
  const linkGeo = new THREE.TorusGeometry(0.17, 0.05, isNarrow ? 6 : 8, 14);
  const linkMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a44, metalness: 0.55, roughness: 0.38, emissive: 0x1a1006, emissiveIntensity: 0.4
  });
  const chainMesh = new THREE.InstancedMesh(linkGeo, linkMat, LINKS);
  const dummy = new THREE.Object3D();

  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < LINKS; i++) {
    const t = i / (LINKS - 1);
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    dummy.position.copy(pos);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    // alternate perpendicular twist like real chain links
    dummy.rotateZ(i % 2 === 0 ? 0 : Math.PI / 2);
    dummy.updateMatrix();
    chainMesh.setMatrixAt(i, dummy.matrix);
  }
  chainMesh.instanceMatrix.needsUpdate = true;
  scene.add(chainMesh);

  // ── Glow sprite texture (radial gradient) ──
  function makeGlowTexture(hex) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, hex + 'ff');
    grad.addColorStop(0.35, hex + 'aa');
    grad.addColorStop(1, hex + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const glowOrange = makeGlowTexture('#e8590c');
  const glowGreen = makeGlowTexture('#2fae74');
  const glowCopper = makeGlowTexture('#e0b078');

  function makeGlowSprite(tex, scale) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(scale, scale, 1);
    return spr;
  }

  // ── Five checkpoint beads — one per stage of the flow ──
  const CHECKPOINTS = [
    { t: 0.05, color: 0x16130e, glow: glowCopper, label: 'post' },
    { t: 0.27, color: 0xe8590c, glow: glowOrange, label: 'escrow' },
    { t: 0.50, color: 0xb9834a, glow: glowCopper, label: 'travel' },
    { t: 0.73, color: 0xe8590c, glow: glowOrange, label: 'proof' },
    { t: 0.94, color: 0x2fae74, glow: glowGreen, label: 'release' }
  ];
  const beadGeo = new THREE.IcosahedronGeometry(0.34, 1);
  const beads = CHECKPOINTS.map((cp) => {
    const mat = new THREE.MeshStandardMaterial({
      color: cp.color, metalness: 0.4, roughness: 0.32,
      emissive: cp.color, emissiveIntensity: 0.35
    });
    const mesh = new THREE.Mesh(beadGeo, mat);
    mesh.position.copy(curve.getPointAt(cp.t));
    scene.add(mesh);
    const glow = makeGlowSprite(cp.glow, 1.6);
    glow.position.copy(mesh.position);
    scene.add(glow);
    return { mesh, glow, mat, t: cp.t };
  });

  // ── Traveling packet + comet trail ──
  const packet = makeGlowSprite(glowOrange, 0.9);
  scene.add(packet);
  const trailCount = 6;
  const trail = [];
  for (let i = 0; i < trailCount; i++) {
    const spr = makeGlowSprite(glowOrange, 0.55 - i * 0.06);
    spr.material.opacity = 0.5 - i * 0.07;
    scene.add(spr);
    trail.push(spr);
  }

  // ── Faint dust field for depth ──
  const DUST = isNarrow ? 220 : 420;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const t = Math.random();
    const base = curve.getPointAt(t);
    dustPos[i * 3] = base.x + (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = base.y + (Math.random() - 0.5) * 10;
    dustPos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 10;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xcbb794, size: 0.045, transparent: true, opacity: 0.35, sizeAttenuation: true });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ── Scroll → camera position along the curve ──
  let targetT = 0;
  let smoothT = 0;
  let mouseX = 0, mouseY = 0;
  const clock = new THREE.Clock();

  function docProgress() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  }

  function onScroll() { targetT = docProgress(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  }, { passive: true });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  const sideOffset = new THREE.Vector3();
  const hudFill = document.getElementById('hud-fill');
  const hudPct = document.getElementById('hud-pct');

  function render() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    smoothT += (targetT - smoothT) * (reduceMotion ? 1 : 0.06);
    const camT = Math.min(Math.max(smoothT * 0.94, 0), 0.97);
    const lookT = Math.min(camT + 0.045, 1);

    const camPos = curve.getPointAt(camT);
    const tangent = curve.getTangentAt(camT).normalize();
    sideOffset.set(-tangent.z, 0.35, tangent.x).normalize().multiplyScalar(1.9);

    const idleSway = reduceMotion ? 0 : Math.sin(elapsed * 0.15) * 0.25;
    camera.position.copy(camPos).add(sideOffset);
    camera.position.x += idleSway + mouseX * 0.6;
    camera.position.y += Math.cos(elapsed * 0.12) * 0.15 - mouseY * 0.35;

    const lookAt = curve.getPointAt(lookT);
    camera.lookAt(lookAt);

    // packet travels the full chain on a loop
    const packetT = reduceMotion ? 0.5 : (elapsed * 0.045) % 1;
    const packetPos = curve.getPointAt(packetT);
    packet.position.copy(packetPos);
    packetLight.position.copy(packetPos);

    trail.forEach((spr, i) => {
      const tt = ((packetT - (i + 1) * 0.012) % 1 + 1) % 1;
      spr.position.copy(curve.getPointAt(tt));
    });

    // brighten the checkpoint nearest current scroll position
    beads.forEach((b) => {
      const dist = Math.abs(camT - b.t);
      const focus = Math.max(0, 1 - dist * 9);
      const pulse = reduceMotion ? 0 : Math.sin(elapsed * 2 + b.t * 10) * 0.08;
      b.mat.emissiveIntensity = 0.32 + focus * 1.1 + pulse * focus;
      b.glow.material.opacity = 0.35 + focus * 0.65;
      const s = 1.4 + focus * 1.3;
      b.glow.scale.set(s, s, 1);
      const bs = 1 + focus * 0.25;
      b.mesh.scale.set(bs, bs, bs);
    });

    if (hudFill && hudPct) {
      hudFill.style.width = (smoothT * 100).toFixed(0) + '%';
      hudPct.textContent = String(Math.round(smoothT * 100)).padStart(2, '0') + '%';
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();