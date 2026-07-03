/* ============================================================
   ECOTECH DSTV — interactions
   1. Sticky nav + mobile menu
   2. Scroll reveal + counters
   3. Hero signal-particle canvas
   4. 3D tilt cards
   5. Three.js interactive satellite dish
   ============================================================ */

// ---------- 1. Nav ----------
const nav = document.getElementById("nav");
const navLinks = document.getElementById("navLinks");
const burger = document.getElementById("navBurger");

window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 40);
});

burger.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- 2. Scroll reveal + counters ----------
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

const counterIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const dur = 1400;
      const t0 = performance.now();
      (function tick(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
      counterIO.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll(".stat__num").forEach((el) => counterIO.observe(el));

// ---------- 3. Hero particles (floating signal dots) ----------
(function heroParticles() {
  const canvas = document.getElementById("heroParticles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, dots;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    const n = Math.min(90, Math.floor((w * h) / 22000));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      green: Math.random() > 0.5,
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  (function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.green
        ? "rgba(141,198,63,0.55)"
        : "rgba(67,170,255,0.5)";
      ctx.fill();
    }
    // connect nearby dots
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(141,198,63,${0.12 * (1 - dist / 110)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  })();
})();

// ---------- 4. 3D tilt cards ----------
document.querySelectorAll(".tilt").forEach((card) => {
  const strength = 10;
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.transform = `rotateY(${(px - 0.5) * strength * 2}deg) rotateX(${(0.5 - py) * strength * 2}deg) translateZ(6px)`;
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateY(0) rotateX(0) translateZ(0)";
  });
});

// ---------- 5. Three.js satellite dish ----------
(function dish3D() {
  const canvas = document.getElementById("dishCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.2, 7.2);
  camera.lookAt(0, 0.4, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x8899cc, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8dc63f, 0.9);
  rim.position.set(-5, 2, -4);
  scene.add(rim);
  const blue = new THREE.PointLight(0x2196f3, 1.1, 20);
  blue.position.set(0, -2, 4);
  scene.add(blue);

  const group = new THREE.Group();
  scene.add(group);

  // The dish assembly opens toward +Z (the camera) when group.rotation.y = 0
  const dishAssembly = new THREE.Group();
  dishAssembly.position.y = 0.55;
  group.add(dishAssembly);

  // --- Shallow parabolic reflector ---
  const DISH_R = 1.7;
  const CURVE = 0.13; // depth coefficient -> shallow, plate-like bowl
  const points = [];
  for (let i = 0; i <= 28; i++) {
    const x = (i / 28) * DISH_R;
    points.push(new THREE.Vector2(x, CURVE * x * x));
  }
  const dishGeo = new THREE.LatheGeometry(points, 80);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xeef1f6,
    metalness: 0.15,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const dishMesh = new THREE.Mesh(dishGeo, dishMat);
  dishMesh.rotation.x = Math.PI / 2 - 0.15; // bowl opens to +Z, tilted slightly skyward
  dishAssembly.add(dishMesh);

  // Green rim around the dish opening (flyer accent)
  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(DISH_R, 0.04, 12, 90),
    new THREE.MeshStandardMaterial({ color: 0x8dc63f, metalness: 0.5, roughness: 0.3 })
  );
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = CURVE * DISH_R * DISH_R;
  dishMesh.add(rimRing);

  // Small hub at the centre of the reflector
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xc7cddd, metalness: 0.4, roughness: 0.4 })
  );
  hub.position.y = 0.05;
  dishMesh.add(hub);

  // --- LNB arm: rises from the bottom edge to the focal point in front ---
  const armMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: 0.6, roughness: 0.35 });
  // dish local space: +Y = facing axis, +Z = world-down after the x-rotation
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.32, 1.62),  // bottom rim
    new THREE.Vector3(0, 1.05, 1.15),  // sweep forward
    new THREE.Vector3(0, 1.5, 0.12),   // focal point on the dish axis
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 24, 0.045, 10), armMat);
  dishMesh.add(arm);

  // LNB head at the focal point, aimed back at the reflector
  const lnb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 20), armMat.clone());
  lnb.material.color.set(0xe8eaf0);
  lnb.position.set(0, 1.55, 0.05);
  dishMesh.add(lnb);

  // --- Mount: bracket + pole BEHIND the dish (no intersection) ---
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x39415c, metalness: 0.55, roughness: 0.4 });
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.4), poleMat);
  bracket.position.set(0, 0.5, -0.28);
  group.add(bracket);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.9, 16), poleMat);
  pole.position.set(0, -0.75, -0.42);
  group.add(pole);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.65, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x222a44, metalness: 0.4, roughness: 0.6 })
  );
  base.position.set(0, -2.2, -0.42);
  group.add(base);

  // --- Signal rings pulsing straight out of the dish axis ---
  const ringMat = () =>
    new THREE.MeshBasicMaterial({ color: 0x8dc63f, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.47, 56), ringMat());
    ring.userData.offset = i / 4;
    ring.position.set(0, 0.75, 1.9); // in front of the LNB, on the dish axis
    group.add(ring);
    rings.push(ring);
  }

  // --- Starfield backdrop ---
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 30;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    starPos[i * 3 + 2] = -6 - Math.random() * 14;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x6f86c9, size: 0.05, transparent: true, opacity: 0.8 }))
  );

  group.rotation.y = -0.5;

  // --- Drag to rotate ---
  let dragging = false;
  let px = 0, py = 0;
  let rotX = 0;
  const REST_Y = -0.35; // showcase angle: front of dish toward the viewer

  const signalFill = document.getElementById("signalFill");
  const signalVal = document.getElementById("signalVal");

  function pointerDown(e) {
    dragging = true;
    px = e.clientX ?? e.touches[0].clientX;
    py = e.clientY ?? e.touches[0].clientY;
  }
  function pointerMove(e) {
    if (!dragging) return;
    const x = e.clientX ?? e.touches[0].clientX;
    const y = e.clientY ?? e.touches[0].clientY;
    const dx = x - px;
    const dy = y - py;
    px = x;
    py = y;
    group.rotation.y += dx * 0.008;
    rotX = Math.max(-0.5, Math.min(0.5, rotX + dy * 0.004));
  }
  function pointerUp() { dragging = false; }

  stage.addEventListener("mousedown", pointerDown);
  window.addEventListener("mousemove", pointerMove);
  window.addEventListener("mouseup", pointerUp);
  stage.addEventListener("touchstart", pointerDown, { passive: true });
  window.addEventListener("touchmove", pointerMove, { passive: true });
  window.addEventListener("touchend", pointerUp);

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!dragging) {
      // glide back to the showcase angle with a gentle sway
      const rest = REST_Y + Math.sin(t * 0.5) * 0.12;
      group.rotation.y += (rest - group.rotation.y) * 0.025;
      rotX += (0 - rotX) * 0.02;
    }
    group.rotation.x = rotX;
    group.position.y = Math.sin(t * 0.9) * 0.08; // gentle float

    // pulse rings outward along the dish axis
    rings.forEach((ring) => {
      const p = (t * 0.35 + ring.userData.offset) % 1;
      const s = 0.6 + p * 3.2;
      ring.scale.set(s, s, 1);
      ring.position.z = 1.9 + p * 2.6;
      ring.position.y = 0.75 + p * 0.5; // follow the slight skyward tilt
      ring.material.opacity = 0.7 * (1 - p);
    });

    // fake signal meter: strongest when dish faces the camera
    if (signalFill && signalVal) {
      const facing = Math.cos(group.rotation.y) * Math.cos(rotX);
      const pct = Math.round(55 + Math.max(0, facing) * 45);
      signalFill.style.width = pct + "%";
      signalVal.textContent = pct + "%";
    }

    renderer.render(scene, camera);
  })();
})();
