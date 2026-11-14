/**
 * GharSetu (घर सेतु) - Client Application Controller
 * Homeowner Repair & Renovation Coordination Platform (Prototype Demo)
 * 
 * Modules:
 * 1. Persistent Storage (LocalStorage + API sync for products, orders, estimates, cart, auth)
 * 2. Visual Effects (WebGL Shader, Particle Canvases, 3D Tilt, Scroll Progress, Typewriter, Counters)
 * 3. Feedback & Toasts (Toast alert notification system)
 * 4. Dynamic Marketplace (Live search, category filter, dynamic catalog, product detail modal)
 * 5. AI Scoper & BoQ Generator (Gemini AI API + CPWD parametric estimation engine fallback)
 * 6. Printable Official BoQ Estimate (Print/PDF formatted document with signatures)
 * 7. Project & Quote Tracker (Request tracking, status timeline, saved scopes)
 * 8. Repair Plan & Quote Submission (Local plan persistence & quote request routing)
 * 9. Pro Partner Authentication & Session Management (Login, Register, Logout, Form validation)
 */

// ═════════════════════════════════════════════════════════════════════
// 1. SECURITY & INPUT SANITIZATION
// ═════════════════════════════════════════════════════════════════════

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_PRODUCTS = [
  { id: 'prod-001', name: 'Astral CPVC Heavy Duty Pipes (1-inch)', meta: '3m Length • SDR 11 • Plumbing Benchmark (Demo Data)', price: 420, originalPrice: 490, discount: 14, category: 'plumbing', stock: 120, unit: 'piece', specs: 'SDR 11 certified up to 93°C hot/cold potable water. Indicative demo material benchmark for home plumbing repairs.', tags: ['cpvc', 'pipe', 'plumbing', 'astral', 'leak'] },
  { id: 'prod-002', name: 'Jaquar Cast Brass Bib Cock Tap', meta: 'Quarter Turn Ceramic Cartridge • Chrome Plated (Demo Data)', price: 1150, originalPrice: 1350, discount: 15, category: 'plumbing', stock: 60, unit: 'piece', specs: 'Standard chrome-finished brass bib tap. Reference benchmark for bathroom & kitchen sanitary fittings. (Demo Data)', tags: ['tap', 'faucet', 'plumbing', 'jaquar', 'bathroom'] },
  { id: 'prod-003', name: 'Polycab FR Wire 1.5 sq mm', meta: '90m Coil • Fire Retardant Copper (Demo Data)', price: 1580, originalPrice: 1750, discount: 10, category: 'electrical', stock: 80, unit: 'coil', specs: 'IS:694 certified flame retardant copper wiring coil. Indicative reference rate for apartment rewiring. (Demo Data)', tags: ['wire', 'electrical', 'fr', 'polycab', 'wiring'] },
  { id: 'prod-004', name: 'Schneider Electric Easy9 MCB (16A Single Pole)', meta: 'C-Curve • 10kA Breaking Capacity (Demo Data)', price: 185, originalPrice: 220, discount: 16, category: 'electrical', stock: 150, unit: 'piece', specs: 'Miniature circuit breaker for household distribution boards. Standard benchmark component for electrical safety. (Demo Data)', tags: ['mcb', 'schneider', 'electrical', 'breaker', 'switch'] },
  { id: 'prod-005', name: 'Asian Paints Tractor Emulsion (Matte White)', meta: '20L Bucket • Interior Acrylic Grade (Demo Data)', price: 2850, originalPrice: 3240, discount: 12, category: 'painting', stock: 50, unit: 'bucket', specs: 'Smooth interior acrylic emulsion offering 260-300 sq.ft/L coverage. Benchmark rate for residential wall painting. (Demo Data)', tags: ['paint', 'emulsion', 'asian paints', 'painting', 'wall'] },
  { id: 'prod-006', name: 'Birla White Polymer Wall Putty', meta: '40kg Bag • Drywall Surface Prep (Demo Data)', price: 820, originalPrice: 940, discount: 13, category: 'painting', stock: 75, unit: 'bag', specs: 'White polymer plaster for smoothing interior walls prior to primer and paint application. (Demo Data)', tags: ['putty', 'birla white', 'wall putty', 'painting'] },
  { id: 'prod-007', name: 'Dr. Fixit 101 LW+ Integral Waterproofing', meta: '5L Can • Plaster & Concrete Admixture (Demo Data)', price: 640, originalPrice: 720, discount: 11, category: 'waterproofing', stock: 90, unit: 'can', specs: 'IS:2645 compliant liquid waterproofing admixture for damp wall and mortar repairs. (Demo Data)', tags: ['waterproofing', 'dr fixit', 'admixture', 'damp', 'leakage'] },
  { id: 'prod-008', name: 'Dr. Fixit Fastflex Acrylic Polymer Membrane', meta: '12kg Pack • 2-Part Flexible Coating (Demo Data)', price: 2650, originalPrice: 2950, discount: 10, category: 'waterproofing', stock: 40, unit: 'pack', specs: 'Elastomeric waterproofing coating for balconies, sunken slabs, and bathroom wet areas. (Demo Data)', tags: ['waterproofing', 'fastflex', 'coating', 'balcony', 'seepage'] },
  { id: 'prod-009', name: 'CenturyPly MR Commercial Plywood (19mm)', meta: '8ft x 4ft Sheet • Moisture Resistant (Demo Data)', price: 2450, originalPrice: 2800, discount: 12, category: 'carpentry', stock: 65, unit: 'sheet', specs: 'IS:303 moisture-resistant plywood for wardrobes, kitchen cabinetry, and shelving repairs. (Demo Data)', tags: ['plywood', 'centuryply', 'carpentry', 'wood', 'cabinet'] },
  { id: 'prod-010', name: 'Godrej Nav-Tal Brass Mortise Door Lock', meta: 'Double Cylinder • 6-Lever Mechanism (Demo Data)', price: 1450, originalPrice: 1720, discount: 16, category: 'carpentry', stock: 45, unit: 'set', specs: 'Heavy-duty solid brass door lock with computer-cut keys. Standard rate benchmark for wooden door hardware. (Demo Data)', tags: ['lock', 'door lock', 'godrej', 'carpentry', 'hardware'] },
  { id: 'prod-011', name: 'Ebco Soft-Close Concealed Cabinet Hinges', meta: 'Pack of 4 Pairs • Hydraulic Damper (Demo Data)', price: 960, originalPrice: 1200, discount: 20, category: 'carpentry', stock: 110, unit: 'pack', specs: 'Nickel-plated steel hinges with zero-creak hydraulic dampers. Benchmark repair hardware for kitchen cabinets. (Demo Data)', tags: ['hinge', 'cabinet', 'carpentry', 'hardware', 'ebco'] },
  { id: 'prod-012', name: 'Finolex CPVC Ball Valve', meta: '1-inch • Heavy Duty Brass Core (Demo Data)', price: 280, originalPrice: 340, discount: 18, category: 'plumbing', stock: 200, unit: 'piece', specs: 'Full-port leak-proof ball valve for domestic plumbing lines. (Demo Data)', tags: ['valve', 'cpvc', 'finolex', 'plumbing'] }
];

// Seed persistent storage if not present or upgrade to v4 (Homeowner 5 Services)
if (!localStorage.getItem('gharsetu_products_v4')) {
  localStorage.setItem('gharsetu_products', JSON.stringify(DEFAULT_PRODUCTS));
  localStorage.setItem('gharsetu_products_v4', 'true');
  // Reset any cached cart from old contractor prototype
  localStorage.removeItem('gharsetu_cart');
}
if (!localStorage.getItem('gharsetu_orders')) {
  localStorage.setItem('gharsetu_orders', JSON.stringify([]));
}
if (!localStorage.getItem('gharsetu_estimates')) {
  localStorage.setItem('gharsetu_estimates', JSON.stringify([]));
}

let cartItems = JSON.parse(localStorage.getItem('gharsetu_cart') || '[]');
let authToken = localStorage.getItem('gharsetu_token') || localStorage.getItem('buildiq_token');
let authUser = JSON.parse(localStorage.getItem('gharsetu_user') || localStorage.getItem('buildiq_user') || 'null');
let currentBoQ = [];
let laborBaseCost = 5000;
let lastScopeData = JSON.parse(localStorage.getItem('gharsetu_last_scope') || 'null');
let activeCat = 'all';
let allProducts = JSON.parse(localStorage.getItem('gharsetu_products') || JSON.stringify(DEFAULT_PRODUCTS));

// ═════════════════════════════════════════════════════════════════════
// 2. USER FEEDBACK TOAST NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════════

function showToast(text, icon = '✓') {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  const textEl = document.getElementById('toastText');
  const iconEl = document.getElementById('toastIcon');
  if (textEl) textEl.innerText = text;
  if (iconEl) iconEl.innerText = icon;
  toast.classList.add('show');
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ═════════════════════════════════════════════════════════════════════
// 3. VISUAL EFFECTS, CANVAS & ANIMATIONS
// ═════════════════════════════════════════════════════════════════════

// Page Loader Dismiss - Instant and Smooth
function dismissPageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
  }
}
document.addEventListener('DOMContentLoaded', () => setTimeout(dismissPageLoader, 200));
window.addEventListener('load', dismissPageLoader);

// Scroll Progress Tracker
window.addEventListener('scroll', () => {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / (docHeight || 1)) * 100;
  progressBar.style.width = scrollPercent + '%';

  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', scrollTop > 60);

  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', scrollTop > 400);
});

// Cursor Glow Follower
const glow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
if (glow) {
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();
}

// WebGL GLSL Shader Background
(function initWebGL() {
  const canvas = document.getElementById('webgl-bg');
  if (!canvas) return;
  const gl = canvas.getContext('webgl');
  if (!gl) { canvas.style.display = 'none'; return; }

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const vsSrc = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
  const fsSrc = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_res;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
    }
    float fbm(vec2 p){
      float v=0.0,a=0.5;
      for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}
      return v;
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_res;
      float n=fbm(uv*3.0+u_time*0.08);
      float n2=fbm(uv*5.0-u_time*0.05+10.0);
      vec3 c1=vec3(0.886,0.345,0.133);
      vec3 c2=vec3(1.0,0.55,0.35);
      vec3 c3=vec3(1.0,0.97,0.94);
      vec3 col=mix(c3,mix(c2,c1,n*0.5),n2*0.15);
      gl_FragColor=vec4(col,0.12);
    }
  `;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(vsSrc, gl.VERTEX_SHADER));
  gl.attachShader(prog, compileShader(fsSrc, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');

  function draw(t) {
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// Floating Building Blocks Canvas
(function initBlocks() {
  const canvas = document.getElementById('blocks-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const blocks = [];
  const COLORS = ['#E25822', '#FF8C60', '#FFB088', '#D4A574', '#C49A6C', '#B8860B', '#CD853F'];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 30; i++) {
    const w = Math.random() * 28 + 12, h = Math.random() * 18 + 8;
    blocks.push({
      x: Math.random() * 2000, y: Math.random() * 2000, w, h,
      baseX: Math.random() * 2000, baseY: Math.random() * 2000,
      vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12,
      rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - .5) * .002,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * .1 + .03,
      parallaxFactor: Math.random() * .015 + .005,
      bobPhase: Math.random() * Math.PI * 2, bobSpeed: Math.random() * .006 + .003, bobAmp: Math.random() * 6 + 3
    });
  }

  let mxC = W / 2, myC = H / 2;
  document.addEventListener('mousemove', e => { mxC = e.clientX; myC = e.clientY; });

  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    time++;
    blocks.forEach(b => {
      b.baseX += b.vx; b.baseY += b.vy;
      if (b.baseX < -50) b.baseX = W + 50; if (b.baseX > W + 50) b.baseX = -50;
      if (b.baseY < -50) b.baseY = H + 50; if (b.baseY > H + 50) b.baseY = -50;
      const dx = (mxC - W / 2) * b.parallaxFactor;
      const dy = (myC - H / 2) * b.parallaxFactor;
      const bob = Math.sin(time * b.bobSpeed + b.bobPhase) * b.bobAmp;
      b.x = b.baseX + dx; b.y = b.baseY + dy + bob;
      b.rotation += b.rotSpeed;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      ctx.globalAlpha = b.opacity;
      ctx.beginPath();
      ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 3);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// Floating Parallax Elements
(function() {
  const floats = document.querySelectorAll('.float-el');
  document.addEventListener('mousemove', e => {
    const cx = e.clientX / window.innerWidth - .5;
    const cy = e.clientY / window.innerHeight - .5;
    floats.forEach((el, i) => {
      const f = (i + 1) * 8;
      el.style.transform = `translate(${-cx * f}px,${-cy * f}px) rotate(${cx * 6}deg)`;
    });
  });
})();

// 3D Tilt Effect on Cards
document.addEventListener('mouseover', e => {
  const card = e.target.closest('.product, .testimonial-card');
  if (!card) return;
  card.onmousemove = ev => {
    const rect = card.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width - .5;
    const y = (ev.clientY - rect.top) / rect.height - .5;
    card.style.transform = `translateY(-8px) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  };
  card.onmouseleave = () => { card.style.transform = ''; };
});

// Scroll Reveal Observer
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Number Counter Observer
const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const t = parseInt(e.target.getAttribute('data-target')) || 0;
      animateCounter(e.target, t, '', 1600);
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('[data-target]').forEach(el => statsObserver.observe(el));

// Typewriter Hero Effect
(function initTypewriter() {
  const tw = document.getElementById('typewriterTarget');
  if (!tw) return;
  const phrases = ['Customizable preliminary scope', 'Fair Price Benchmarks', 'Transparent Local Quotes', 'Stress-Free Repairs'];
  let pi = 0, ci = 0, del = false;
  function typewrite() {
    const cur = phrases[pi];
    if (!del) {
      tw.textContent = cur.slice(0, ++ci);
      if (ci === cur.length) { del = true; setTimeout(typewrite, 1800); return; }
    } else {
      tw.textContent = cur.slice(0, --ci);
      if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; }
    }
    setTimeout(typewrite, del ? 50 : 90);
  }
  setTimeout(typewrite, 1500);
})();

// Button Click Ripple Effect
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.btn-primary, .btn-hero-primary, .btn-outline');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const r = document.createElement('span');
  r.className = 'ripple';
  const sz = Math.max(rect.width, rect.height) * 2;
  r.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - rect.left - sz / 2}px;top:${e.clientY - rect.top - sz / 2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Dark / Light Mode Switcher
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  root.setAttribute('data-theme', nextTheme);
  if (nextTheme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  localStorage.setItem('gs-theme', nextTheme);
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = nextTheme === 'dark' ? '🌙' : '☀️';
}
(function restoreTheme() {
  const saved = localStorage.getItem('gs-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  if (saved === 'dark') document.documentElement.classList.add('dark');
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = saved === 'dark' ? '🌙' : '☀️';
})();

// Mobile Menu Navigation
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const ham = document.getElementById('hamburger');
  if (menu) menu.classList.toggle('open');
  if (ham) ham.classList.toggle('open');
}
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const ham = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (ham) ham.classList.remove('open');
}

function animateCounter(el, target, prefix = '₹', duration = 800) {
  if (!el) return;
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.innerText = prefix + Math.floor(ease * target).toLocaleString('en-IN');
    if (t < 1) requestAnimationFrame(update);
    else el.innerText = prefix + target.toLocaleString('en-IN');
  }
  requestAnimationFrame(update);
}

// ═════════════════════════════════════════════════════════════════════
// 4. DYNAMIC MARKETPLACE, LIVE SEARCH & DETAIL MODAL
// ═════════════════════════════════════════════════════════════════════

const PRODUCT_IMAGES = {
  'prod-001': 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80', // CPVC Pipes
  'prod-002': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80', // Brass Tap
  'prod-003': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80', // FR Wire
  'prod-004': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80', // MCB Breaker
  'prod-005': 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80', // Tractor Emulsion
  'prod-006': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', // Wall Putty
  'prod-007': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80', // Dr. Fixit Waterproofing
  'prod-008': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80', // Fastflex Membrane
  'prod-009': 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80', // CenturyPly Wood
  'prod-010': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80', // Godrej Brass Lock
  'prod-011': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80', // Ebco Hinges
};

const CATEGORY_DEFAULT_IMAGES = {
  plumbing: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80',
  electrical: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
  painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
  paint: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
  waterproofing: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  carpentry: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80',
  hardware: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
};

async function loadMarketplaceProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success && data.products && data.products.length > 0) {
      allProducts = data.products;
      localStorage.setItem('gharsetu_products', JSON.stringify(allProducts));
    }
  } catch (err) {
    console.warn('API unreachable; loading cached products from localStorage', err);
    allProducts = JSON.parse(localStorage.getItem('gharsetu_products') || JSON.stringify(DEFAULT_PRODUCTS));
  }
  renderProductsGrid(allProducts);
}

function renderProductsGrid(products) {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  const categoryIcons = {
    plumbing: '🚰',
    electrical: '⚡',
    painting: '🎨',
    paint: '🎨',
    waterproofing: '💧',
    carpentry: '🪵',
    hardware: '🔩'
  };
  grid.innerHTML = products.map((p, idx) => {
    const cat = (p.category || 'repair').toLowerCase().trim();
    const icon = categoryIcons[cat] || '🛠️';
    const originalPrice = p.originalPrice || Math.round((p.price || 0) * 1.2);
    const discount = p.discount || Math.round(((originalPrice - p.price) / originalPrice) * 100);
    const imgUrl = p.image_url || PRODUCT_IMAGES[p.id] || CATEGORY_DEFAULT_IMAGES[cat] || 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80';
    return `
    <div class="product visible cursor-pointer" data-name="${escapeHTML((p.name || '').toLowerCase())} ${(p.tags || []).map(t => escapeHTML(t)).join(' ')}" data-cat="${escapeHTML(cat)}" onclick="handleProductCardClick(event, '${escapeHTML(p.id)}')">
      <div class="product-media">
        <img src="${imgUrl}" alt="${escapeHTML(p.name)}" class="product-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="product-img-fallback">
          <span>${icon}</span>
        </div>
        <span class="product-cat-pill">${icon} ${escapeHTML(cat.toUpperCase())}</span>
        <span class="product-discount-badge">DEMO BENCHMARK</span>
      </div>

      <div class="product-body">
        <h3 class="product-title">${escapeHTML(p.name)}</h3>
        <p class="product-meta">${escapeHTML(p.meta || '')}</p>
        <div class="product-badge-row">
          <span class="badge-benchmark">✓ Prototype Benchmark</span>
          <span class="badge-stock">Standard Quality</span>
        </div>
      </div>

      <div class="product-footer">
        <div class="pricing-wrap">
          <span class="price">₹${(p.price || 0).toLocaleString('en-IN')}</span>
          <strike>₹${(originalPrice || 0).toLocaleString('en-IN')}</strike>
          <span class="benchmark-tag">Demo Benchmark</span>
        </div>
        <div class="product-action-row">
          <div class="qty-control" onclick="event.stopPropagation()">
            <button class="qty-btn" onclick="changeQty(this,-1)" aria-label="Decrease quantity">−</button>
            <span class="qty-val">1</span>
            <button class="qty-btn" onclick="changeQty(this,1)" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn-primary add-cart-btn" onclick="event.stopPropagation();addToCartQty(this,'${escapeHTML(p.name)} (${escapeHTML(p.unit || 'unit')})',${p.price})">Add to Plan</button>
          <button class="btn-specs-icon" onclick="event.stopPropagation();openProductDetailModal('${escapeHTML(p.id)}')" title="Technical Specs">ℹ️</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Add empty state placeholder
  const noRes = document.createElement('div');
  noRes.id = 'storeNoResults';
  noRes.className = 'hidden';
  noRes.style = 'grid-column: 1 / -1; padding: 3rem 1rem; text-align: center; color: var(--text-muted);';
  noRes.innerHTML = `
    <div style="font-size: 2.5rem; margin-bottom: .6rem;">🔍</div>
    <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: .4rem;">No services or materials match your filter</div>
    <p style="font-size:.88rem; margin-bottom: 1rem;">Try searching for other repair tasks or select a different category.</p>
    <button class="btn-outline" style="display:inline-block;width:auto;padding:.6rem 1.4rem;" onclick="filterByCategory(document.querySelector('.cat-tab[data-cat=\\'all\\']'), 'all')">Show All Services</button>
  `;
  grid.appendChild(noRes);

  // Re-apply filter state to freshly rendered DOM
  filterMarketplace();
}

function handleProductCardClick(event, id) {
  if (event.target.tagName !== 'BUTTON' && !event.target.classList.contains('qty-btn')) {
    openProductDetailModal(id);
  }
}

function filterMarketplace() {
  const searchInput = document.getElementById('marketSearch');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const targetCat = (activeCat || 'all').toLowerCase().trim();
  let visibleCount = 0;

  document.querySelectorAll('#storeGrid .product').forEach(p => {
    const n = (p.getAttribute('data-name') || '').toLowerCase();
    const c = (p.getAttribute('data-cat') || '').toLowerCase().trim();
    const matchesQ = !q || n.includes(q);
    const matchesC = targetCat === 'all' || c === targetCat;
    const isVisible = matchesQ && matchesC;

    p.classList.toggle('hidden', !isVisible);
    if (isVisible) {
      visibleCount++;
      p.style.opacity = '1';
      p.style.transform = 'none';
    }
  });

  const noResults = document.getElementById('storeNoResults');
  if (noResults) {
    noResults.classList.toggle('hidden', visibleCount > 0);
  }
}

function filterByCategory(btn, cat) {
  activeCat = (cat || 'all').toLowerCase().trim();
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`.cat-tab[data-cat="${activeCat}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }
  filterMarketplace();
}

function changeQty(btn, delta) {
  const valSpan = btn.parentElement.querySelector('.qty-val');
  let currentVal = parseInt(valSpan.textContent) || 1;
  currentVal = Math.max(1, Math.min(50, currentVal + delta));
  valSpan.textContent = currentVal;
}

function addToCartQty(btn, name, price) {
  const productCard = btn.closest('.product');
  const qtyVal = productCard ? parseInt(productCard.querySelector('.qty-val').textContent) || 1 : 1;
  for (let i = 0; i < qtyVal; i++) {
    cartItems.push({ name, price, qty: 1 });
  }
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();
  showToast(`Added ${qtyVal}x ${name} to Repair Plan 📋`, '✓');
}

// Product Technical Detail Modal
function openProductDetailModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;

  const cat = (product.category || 'repair').toLowerCase().trim();
  const imgUrl = product.image_url || PRODUCT_IMAGES[product.id] || CATEGORY_DEFAULT_IMAGES[cat] || 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80';
  const imgEl = document.getElementById('detailProdImg');
  if (imgEl) {
    imgEl.src = imgUrl;
    imgEl.alt = product.name;
  }

  document.getElementById('detailProdTitle').innerText = product.name;
  document.getElementById('detailProdCategory').innerText = (product.category || 'SERVICE').toUpperCase() + ' • BENCHMARK GUIDE (DEMO DATA)';
  document.getElementById('detailProdMeta').innerText = product.meta;
  document.getElementById('detailProdPrice').innerText = '₹' + product.price.toLocaleString('en-IN');
  document.getElementById('detailProdOriginal').innerText = '₹' + (product.originalPrice || Math.round(product.price * 1.2)).toLocaleString('en-IN');
  document.getElementById('detailProdDiscount').innerText = 'Demo Benchmark Rate';
  document.getElementById('detailProdSpecs').innerText = product.specs || 'Indicative specification benchmark according to standard trade requirements.';
  document.getElementById('detailProdStock').innerText = 'Reference quality standard (Demo)';

  const addBtn = document.getElementById('detailAddToCartBtn');
  if (addBtn) {
    addBtn.innerText = 'Add to Repair Plan 📋';
    addBtn.onclick = () => {
      addToCartQty(addBtn, `${product.name} (${product.unit || 'unit'})`, product.price);
      closeProductDetailModal();
    };
  }

  modal.style.display = 'flex';
}

function closeProductDetailModal() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.style.display = 'none';
}

// ═════════════════════════════════════════════════════════════════════
// 5. AI SCOPE & BOQ ESTIMATION (WITH LOCAL PERSISTENCE)
// ═════════════════════════════════════════════════════════════════════

function setPrompt(text) {
  const input = document.getElementById('userInput');
  if (input) {
    input.value = text;
    simulateAI();
  }
}

async function simulateAI() {
  const inputEl = document.getElementById('userInput');
  const input = inputEl ? inputEl.value.trim() : '';
  const citySelect = document.getElementById('userCity');
  const city = citySelect ? citySelect.value : 'Mumbai';

  // Input Validation
  if (!input) {
    showToast('Please describe your renovation project', '⚠️');
    if (inputEl) inputEl.focus();
    return;
  }

  const loader = document.getElementById('loader');
  const results = document.getElementById('results');
  const fill = document.getElementById('pipelineFill');
  const status = document.getElementById('pipelineStatus');

  if (results) results.style.display = 'none';
  if (loader) loader.style.display = 'block';
  if (fill) fill.style.width = '0%';

  const steps = [
    [0, 'Analyzing repair & spatial requirements...'],
    [25, 'Identifying relevant trade skills (Plumbing, Electrical, etc.)...'],
    [55, 'Cross-referencing standard material specs & CPWD benchmarks...'],
    [80, 'Synthesizing labor schedules & scope checklist...'],
    [100, 'Finalizing customizable preliminary scope...']
  ];
  let stepIdx = 0;
  const pipelineInterval = setInterval(() => {
    if (stepIdx >= steps.length) { clearInterval(pipelineInterval); return; }
    const [percent, msg] = steps[stepIdx++];
    if (fill) fill.style.width = percent + '%';
    if (status) status.innerText = msg;
  }, 320);

  try {
    const res = await fetch('/api/scope/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input, description: input, city })
    });
    const data = await res.json();
    clearInterval(pipelineInterval);
    if (fill) fill.style.width = '100%';

    if (data.success && data.scope) {
      applyScopeData(data.scope, data.input || input, data.city || city);
    } else {
      showToast('Synthesizing preliminary scope via local engine.', 'ℹ️');
      setupScopeDataFallback(input.toLowerCase(), city);
    }
  } catch (err) {
    clearInterval(pipelineInterval);
    console.warn('API call failed; using local parametric engine', err);
    setupScopeDataFallback(input.toLowerCase(), city);
  } finally {
    setTimeout(() => {
      if (loader) loader.style.display = 'none';
      if (results) {
        results.style.display = 'block';
        setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      }
    }, 450);
  }
}

// Spatial Dimension Parser (Extracts room dimensions or explicit sq.ft from natural language)
function parseSpatialDimensions(text) {
  if (!text) return { floor_sqft: 120, wall_sqft: 440, display: "120 sq.ft (Standard room)" };
  const lower = text.toLowerCase();

  // 1. '10 by 12', '10x12', '10 x 12', '12 by 10'
  const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:x|by|\*|\s+by\s+)\s*(\d+(?:\.\d+)?)/);
  if (dimMatch) {
    const d1 = parseFloat(dimMatch[1]);
    const d2 = parseFloat(dimMatch[2]);
    const floor = Math.max(20, Math.round(d1 * d2));
    const wall = Math.max(80, Math.round(2 * (d1 + d2) * 10)); // 10 ft ceiling height
    return {
      floor_sqft: floor,
      wall_sqft: wall,
      display: `${floor} sq.ft (${Math.round(d1)}' × ${Math.round(d2)}' room)`
    };
  }

  // 2. '150 sq ft', '300 sqft', '250 square feet'
  const areaMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:sq\s*ft|sqft|square\s*feet|sq\s*meter|sqm)/);
  if (areaMatch) {
    let val = parseFloat(areaMatch[1]);
    if (lower.includes('meter') || lower.includes('sqm')) val *= 10.764;
    const floor = Math.round(val);
    return {
      floor_sqft: floor,
      wall_sqft: Math.round(floor * 3.5),
      display: `${floor} sq.ft`
    };
  }

  if (lower.includes('balcony') || lower.includes('terrace')) {
    return { floor_sqft: 60, wall_sqft: 160, display: "60 sq.ft (Standard balcony)" };
  }
  if (lower.includes('bathroom') || lower.includes('toilet') || lower.includes('washroom')) {
    return { floor_sqft: 45, wall_sqft: 220, display: "45 sq.ft (Standard bathroom)" };
  }
  if (lower.includes('kitchen')) {
    return { floor_sqft: 90, wall_sqft: 320, display: "90 sq.ft (Standard kitchen)" };
  }
  if (lower.includes('living') || lower.includes('hall')) {
    return { floor_sqft: 220, wall_sqft: 600, display: "220 sq.ft (Standard living room)" };
  }
  return { floor_sqft: 120, wall_sqft: 440, display: "120 sq.ft (Standard bedroom)" };
}

function applyScopeData(s, originalInput, city) {
  const normTrades = Array.isArray(s.trades) ? s.trades.join(', ') : (s.trades || 'Home Maintenance');
  const normDuration = s.duration || s.estimated_duration || '2-3 Days';
  const normLabor = Number(s.laborCost || s.labor_subtotal) || 3000;
  const rawBoQ = s.boq || s.materials || [];
  const normBoQ = rawBoQ.map(item => ({
    name: item.name || item.material || 'Service / Material Item',
    spec: item.spec || 'Standard Specification (Demo Data)',
    qty: item.qty || 1,
    unit: item.unit || 'unit',
    price: item.price || item.rate || 0,
    total: item.total || ((item.price || item.rate || 0) * (item.qty || 1)),
    checked: true
  }));
  const normNotes = s.technicalNotes || s.technical_notes || [];
  const normEngine = s.engine || 'GharSetu Scoping Core v4.0';
  const normMatSubtotal = s.materialCost || s.material_subtotal || normBoQ.reduce((sum, i) => sum + i.total, 0);
  const normGrandTotal = s.grandTotal || s.grand_total || (normLabor + normMatSubtotal);

  // Dynamic Spatial Footprint
  const normAreaSqft = s.estimated_area_sqft || 120;
  const normAreaDisplay = s.estimated_area_display || `${normAreaSqft} sq.ft`;
  const areaEl = document.getElementById('resArea');
  const areaNoteEl = document.getElementById('resAreaNote');
  if (areaEl) areaEl.innerText = normAreaDisplay;
  if (areaNoteEl) {
    areaNoteEl.innerText = s.wall_surface_sqft ? `Wall surface: ~${s.wall_surface_sqft} sq.ft` : 'Calculated spatial footprint';
  }

  lastScopeData = {
    ...s,
    trades: normTrades,
    duration: normDuration,
    laborCost: normLabor,
    estimated_area_sqft: normAreaSqft,
    estimated_area_display: normAreaDisplay,
    wall_surface_sqft: s.wall_surface_sqft,
    boq: normBoQ,
    technicalNotes: normNotes,
    engine: normEngine,
    grandTotal: normGrandTotal,
    input: originalInput,
    city: city || 'Mumbai'
  };
  localStorage.setItem('gharsetu_last_scope', JSON.stringify(lastScopeData));

  // Save to persistent estimates history
  const savedEstimates = JSON.parse(localStorage.getItem('gharsetu_estimates') || '[]');
  savedEstimates.unshift({
    id: 'SCOPE-' + Math.floor(100000 + Math.random() * 900000),
    title: originalInput,
    city,
    trades: normTrades,
    duration: normDuration,
    total: normGrandTotal,
    date: new Date().toISOString()
  });
  localStorage.setItem('gharsetu_estimates', JSON.stringify(savedEstimates.slice(0, 10)));

  const tradesEl = document.getElementById('resTrades');
  const durEl = document.getElementById('resDuration');
  const badgeEl = document.getElementById('resConfidenceBadge');

  if (tradesEl) tradesEl.innerText = normTrades;
  if (durEl) durEl.innerText = normDuration;
  if (badgeEl) {
    badgeEl.innerHTML = `✓ Preliminary Scope Generated • Customizable preliminary scope <small style="font-weight:700;color:var(--terracotta);margin-left:.4rem;">(Prototype Demo)</small>`;
  }

  laborBaseCost = normLabor;
  currentBoQ = normBoQ;
  renderBoQ();
  renderTechnicalNotes(normNotes);

  // Trigger Provider Matching and Quote Loading
  const tradeListForMatching = Array.isArray(s.trades) ? s.trades : [normTrades];
  loadMatchedProvidersForScope(city || 'Mumbai', tradeListForMatching, normLabor, normMatSubtotal, normBoQ);
}

function renderTechnicalNotes(notes) {
  const card = document.getElementById('resTechnicalNotesCard');
  const list = document.getElementById('resTechnicalNotesList');
  if (!card || !list) return;
  if (notes && notes.length > 0) {
    list.innerHTML = notes.map(n => `<li>${escapeHTML(n)}</li>`).join('');
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}

// Fallback Engine (For static demo deployments like GitHub Pages)
function setupScopeDataFallback(input, city = 'Mumbai') {
  const dims = parseSpatialDimensions(input);
  let type = 'Home Repair & Maintenance';
  let trades = '1 General Handyman, 1 Trade Specialist';
  let duration = '1-2 Days';
  let labor = 2800;
  let notes = [
    `Calculated spatial footprint: ${dims.display} (Estimated wall surface: ~${dims.wall_sqft} sq.ft)`,
    'On-site verification recommended before finalizing contract',
    'Ensure licensed trade professional performs structural/concealed work'
  ];
  let boq = [];

  if (input.includes('waterproof') || input.includes('seep') || input.includes('damp')) {
    type = 'Waterproofing & Moisture Treatment';
    trades = 'Waterproofing Specialist, Mason';
    duration = dims.floor_sqft > 150 ? '3-4 Days (Includes Curing)' : '2-3 Days (Includes Curing)';
    labor = Math.round(2200 + dims.floor_sqft * 12);
    notes = [
      `Treatment area: ${dims.display} floor footprint`,
      'Moisture test surface (<12% moisture) prior to elastomeric coating application',
      'Allow 24-hr ponding water test to verify seal integrity'
    ];
    const fastflexQty = Math.max(1, Math.ceil(dims.floor_sqft / 80));
    boq = [
      { name: 'Dr. Fixit 101 LW+ Integral Waterproofing (5L)', spec: 'IS:2645 compliant mortar admixture', price: 640, qty: Math.max(1, Math.ceil(dims.floor_sqft / 100)), unit: 'can', checked: true },
      { name: 'Dr. Fixit Fastflex Flexible Membrane (12kg)', spec: '2-Part polymer coating for slab sealing', price: 2650, qty: fastflexQty, unit: 'pack', checked: true },
      { name: 'Glass Fiber Reinforcing Mesh (50m)', spec: 'Alkali-resistant mesh for crack bridging', price: 1100, qty: 1, unit: 'roll', checked: true },
      { name: 'Polymer Crack Fill & Touch-Up Putty (5kg)', spec: 'Water-resistant interior filler', price: 420, qty: Math.max(1, Math.ceil(dims.floor_sqft / 120)), unit: 'tub', checked: true }
    ];
  } else if (input.includes('leak') || input.includes('pipe') || input.includes('tap') || input.includes('plumb') || input.includes('drain')) {
    type = 'Plumbing & Sanitary Repair';
    trades = 'Licensed Plumber, Plumbing Assistant';
    duration = '1 Day (3-5 hrs)';
    labor = 1800;
    notes = [
      'Hydrostatic pressure test recommended after solvent joint curing',
      'Check water pressure regulator if tap washers wear out repeatedly'
    ];
    boq = [
      { name: 'Astral CPVC Heavy Duty Pipe (1-inch, SDR 11)', spec: 'IS:15778 certified 3m length', price: 420, qty: 2, unit: 'pieces', checked: true },
      { name: 'Jaquar Cast Brass Bib Cock Tap', spec: 'Quarter-turn ceramic cartridge, chrome plated', price: 1150, qty: 1, unit: 'piece', checked: true },
      { name: 'Astral CPVC Solvent Weld & Teflon Tape Kit', spec: 'Fast-curing high-pressure sealant', price: 380, qty: 1, unit: 'kit', checked: true },
      { name: 'Brass Angle Stop Valve (Concealed)', spec: 'Quarter-turn shutoff for sanitary line', price: 460, qty: 1, unit: 'piece', checked: true }
    ];
  } else if (input.includes('wire') || input.includes('electr') || input.includes('switch') || input.includes('mcb') || input.includes('short')) {
    type = 'Electrical Wiring & Fixtures';
    trades = 'Certified Electrician, Assistant';
    duration = dims.floor_sqft > 200 ? '2-3 Days' : '1-2 Days';
    labor = Math.round(1800 + dims.floor_sqft * 7);
    notes = [
      `Wiring layout calibrated to ${dims.display} floor footprint`,
      'Ensure IS:732 earthing and loop impedance verification',
      'Megger insulation check recommended for older concealed conduits'
    ];
    const wireCoils = Math.max(1, Math.ceil(dims.floor_sqft / 80));
    boq = [
      { name: 'Polycab FR Flame Retardant Wire 1.5 sq mm', spec: 'IS:694 certified 90m coil', price: 1580, qty: wireCoils, unit: 'coils', checked: true },
      { name: 'Schneider Electric Easy9 16A Single Pole MCB', spec: 'C-curve 10kA breaking capacity', price: 185, qty: 4, unit: 'pieces', checked: true },
      { name: 'Anchor Roma 8-Module Switchboard Set', spec: 'Flame-retardant polycarbonate with modular switches', price: 890, qty: Math.max(1, Math.ceil(dims.floor_sqft / 100)), unit: 'sets', checked: true },
      { name: 'PVC Conduits & Junction Accessories Kit', spec: 'Heavy-duty insulated conduit fittings', price: 540, qty: 1, unit: 'kit', checked: true }
    ];
  } else if (input.includes('carpenter') || input.includes('wood') || input.includes('cabinet') || input.includes('hinge') || input.includes('door') || input.includes('lock') || input.includes('plywood')) {
    type = 'Carpentry & Woodwork';
    trades = 'Artisan Carpenter';
    duration = '1-2 Days';
    labor = 2500;
    notes = [
      'Seal all exposed plywood edges before laminate bonding to resist humidity',
      'Inspect door frame plumb before mortise lock chiseling'
    ];
    boq = [
      { name: 'CenturyPly MR Grade Commercial Plywood (19mm)', spec: 'IS:303 moisture resistant 8x4 sheet', price: 2450, qty: 1, unit: 'sheet', checked: true },
      { name: 'Godrej Nav-Tal Brass Mortise Door Lock', spec: 'Double cylinder 6-lever mechanism with brass keys', price: 1450, qty: 1, unit: 'set', checked: true },
      { name: 'Ebco Soft-Close Hydraulic Concealed Hinges', spec: 'Pack of 4 pairs, zero-creak hydraulic dampers', price: 960, qty: 1, unit: 'pack', checked: true },
      { name: 'Fevicol Marine Waterproof Wood Adhesive (1kg)', spec: 'D3 water-resistant synthetic resin glue', price: 390, qty: 1, unit: 'bottle', checked: true }
    ];
  } else {
    type = 'Interior Wall Painting & Surface Prep';
    trades = 'Painter, Wall Finishing Artisan';
    duration = dims.wall_sqft > 800 ? '3-4 Days' : (dims.wall_sqft > 400 ? '2-3 Days' : '1-2 Days');
    labor = Math.round(1800 + dims.wall_sqft * 3.2);
    notes = [
      `Surface area scaled to ${dims.display} (~${dims.wall_sqft} sq.ft gross wall area)`,
      'Surface moisture test recommended prior to primer application (max allowable moisture: 12%)',
      'Light-sand with 220-grit paper between putty and emulsion coats'
    ];
    const puttyBags = Math.max(1, Math.ceil(dims.wall_sqft / 250));
    const primerCans = Math.max(1, Math.ceil(dims.wall_sqft / 700));
    const paintBuckets = Math.max(1, Math.ceil(dims.wall_sqft / 900));
    boq = [
      { name: 'Asian Paints Tractor Emulsion (Matte White)', spec: '20L bucket, superior 260 sq.ft/L coverage', price: 2850, qty: paintBuckets, unit: 'bucket', checked: true },
      { name: 'Birla White Polymer Wall Putty (40kg)', spec: 'IS:15489 certified white polymer plaster', price: 820, qty: puttyBags, unit: 'bags', checked: true },
      { name: 'Asian Paints Decoprime Alkali Primer (10L)', spec: 'Deep penetrating water-thinnable alkali shield', price: 1420, qty: primerCans, unit: 'can', checked: true },
      { name: 'Painter Consumables Kit (Rollers, Masking Tape, Drop Sheet)', spec: 'Standard finishing consumables pack', price: 650, qty: 1, unit: 'kit', checked: true }
    ];
  }

  const fallbackScope = {
    type,
    trades,
    duration,
    estimated_area_sqft: dims.floor_sqft,
    estimated_area_display: dims.display,
    wall_surface_sqft: dims.wall_sqft,
    laborCost: labor,
    technicalNotes: notes,
    boq,
    estimate_type: 'Customizable Preliminary Scope (Prototype Demo)',
    disclaimer: 'Indicative benchmark estimate for quotation comparison. Not a guaranteed price. (Demo data)',
    engine: 'GharSetu Parametric Scoping Core (CPWD Reference)'
  };

  applyScopeData(fallbackScope, input, city);
}

// ═════════════════════════════════════════════════════════════════════
// PROVIDER MATCHING & LIVE QUOTING (PROTOTYPE DEMO)
// ═════════════════════════════════════════════════════════════════════

async function loadMatchedProvidersForScope(city, trades, laborSubtotal, materialSubtotal, items) {
  const card = document.getElementById('resProvidersCard');
  const list = document.getElementById('resProvidersList');
  const countEl = document.getElementById('providersMatchCount');
  if (!card || !list) return;

  card.style.display = 'block';
  list.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--text-muted);">
      <div style="display:inline-block;width:24px;height:24px;border:3px solid var(--warm-200);border-top-color:var(--terracotta);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:.5rem;"></div>
      <div>Matching verified trade professionals in ${escapeHTML(city || 'Mumbai')}...</div>
    </div>
  `;

  const tradeArr = Array.isArray(trades) ? trades : [trades];
  let providers = [];

  try {
    const res = await fetch('/api/providers/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: city || 'Mumbai',
        trades: tradeArr,
        labor_subtotal: laborSubtotal,
        material_subtotal: materialSubtotal,
        items: items
      })
    });
    const data = await res.json();
    if (data.success && data.providers && data.providers.length > 0) {
      providers = data.providers;
    }
  } catch (e) {
    console.warn('Provider match endpoint offline; using local matched providers (demo)', e);
  }

  // Fallback demo providers if server offline
  if (!providers.length) {
    const baseTotal = (laborSubtotal || 3000) + (materialSubtotal || 2500);
    providers = [
      {
        quote_id: 'Q-' + Math.floor(1000 + Math.random() * 9000),
        provider_id: 'pro-001',
        provider_name: 'Apex Trade Specialists',
        trade: tradeArr[0] || 'Plumbing',
        city: city || 'Mumbai',
        rating: 4.9,
        review_count: 58,
        experience_years: 11,
        badge: 'Top Rated Pro',
        avatar_color: 'linear-gradient(135deg,#0284C7,#0369A1)',
        labor_quote: Math.round((laborSubtotal || 3000) * 0.98),
        material_quote: Math.round(materialSubtotal || 2500),
        total_quote: Math.round(baseTotal * 0.98),
        variance: '-2% (Competitive)',
        earliest_inspection: 'Tomorrow, 10:00 AM - 12:00 PM',
        specialties: ['Standardized BoQ verification', 'Rapid mobilization', '1-year warranty']
      },
      {
        quote_id: 'Q-' + Math.floor(1000 + Math.random() * 9000),
        provider_id: 'pro-002',
        provider_name: 'Metro Craftsmen Hub',
        trade: tradeArr[0] || 'Electrical',
        city: city || 'Mumbai',
        rating: 4.8,
        review_count: 42,
        experience_years: 9,
        badge: 'Fastest Availability',
        avatar_color: 'linear-gradient(135deg,#F59E0B,#D97706)',
        labor_quote: Math.round((laborSubtotal || 3000) * 1.04),
        material_quote: Math.round(materialSubtotal || 2500),
        total_quote: Math.round(baseTotal * 1.04),
        variance: '+4% (Premium Service)',
        earliest_inspection: 'Today, 4:00 PM - 6:00 PM',
        specialties: ['Licensed team', 'Material pickup assistance', 'Site cleanup included']
      }
    ];
  }

  if (countEl) countEl.innerText = `${providers.length} Trade Pros Matched (Demo)`;

  list.innerHTML = providers.map(p => {
    const initials = (p.provider_name || 'Trade Pro').split(' ').map(w => w[0]).slice(0, 2).join('');
    const specialtiesBadges = (p.specialties || []).slice(0, 2).map(s => `
      <span style="font-size:.7rem;background:rgba(0,0,0,0.04);color:var(--text-muted);padding:.15rem .45rem;border-radius:4px;">${escapeHTML(s)}</span>
    `).join('');

    return `
      <div style="background:var(--surface-white,#fff);border:1.5px solid var(--border-subtle);border-radius:14px;padding:1.2rem;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,.03);position:relative;">
        <div>
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.8rem;">
            <div style="width:44px;height:44px;border-radius:12px;background:${p.avatar_color || 'var(--terracotta)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;flex-shrink:0;">
              ${initials}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:800;font-size:.98rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(p.provider_name)}</div>
              <div style="font-size:.78rem;color:var(--text-muted);display:flex;align-items:center;gap:.35rem;margin-top:.1rem;">
                <span style="color:#F59E0B;font-weight:700;">★ ${p.rating}</span>
                <span>(${p.review_count} reviews)</span>
                <span>•</span>
                <span>${p.experience_years}y exp</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom:.8rem;display:flex;gap:.4rem;flex-wrap:wrap;">
            <span style="font-size:.7rem;font-weight:700;color:var(--accent-green);background:rgba(16,185,129,.1);padding:.2rem .5rem;border-radius:4px;">${escapeHTML(p.badge || 'Verified Pro')}</span>
            ${specialtiesBadges}
          </div>

          <!-- Quote Breakdown -->
          <div style="background:var(--warm-50,#FFFBF7);border:1px dashed var(--warm-200,#FFE4CC);border-radius:10px;padding:.75rem .9rem;margin-bottom:.9rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;font-size:.78rem;color:var(--text-muted);">
              <span>Labor Proposal:</span>
              <span style="font-weight:600;color:var(--text-main);">₹${(p.labor_quote || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;font-size:.78rem;color:var(--text-muted);">
              <span>Materials (BoQ benchmark):</span>
              <span style="font-weight:600;color:var(--text-main);">₹${(p.material_quote || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px dashed var(--warm-200,#FFE4CC);padding-top:.4rem;">
              <span style="font-weight:800;font-size:.84rem;color:var(--text-main);">Preliminary Quote:</span>
              <span style="font-size:1.15rem;font-weight:800;color:var(--terracotta);">₹${(p.total_quote || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style="font-size:.76rem;color:var(--text-muted);display:flex;align-items:center;gap:.4rem;margin-bottom:1rem;">
            <span>⏱️ Earliest Inspection:</span>
            <strong style="color:var(--text-main);">${escapeHTML(p.earliest_inspection || 'Tomorrow')}</strong>
          </div>
        </div>

        <div>
          <button 
            type="button" 
            class="btn-primary" 
            style="width:100%;padding:.65rem .8rem;font-size:.85rem;font-weight:700;border-radius:10px;justify-content:center;"
            onclick="handleScheduleProvider('${escapeHTML(p.provider_id)}', '${escapeHTML(p.provider_name).replace(/'/g, "\\'")}', '${escapeHTML(p.quote_id)}', ${p.total_quote}, '${escapeHTML(p.earliest_inspection || 'Tomorrow, 10:00 AM')}')"
          >
            Select &amp; Schedule Inspection (Demo) 📅
          </button>
          <div style="text-align:center;font-size:.7rem;color:var(--text-muted);margin-top:.4rem;">
            Demo quote comparison • No payment required
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleScheduleProvider(providerId, providerName, quoteId, totalQuote, slot) {
  let lastScope = lastScopeData || {};
  let reqId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);

  const orderPayload = {
    customer_name: 'Homeowner',
    customer_email: authUser ? authUser.email : 'homeowner@example.com',
    city: lastScope.city || 'Mumbai',
    trades: Array.isArray(lastScope.trades) ? lastScope.trades : [lastScope.trades || 'Home Maintenance'],
    items: (lastScope.boq || []).length > 0 ? lastScope.boq : [{ name: lastScope.input || 'Home Repair Scope', qty: 1, price: totalQuote }],
    subtotal: totalQuote,
    gst: 0,
    total: totalQuote
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();
    if (data.success && data.order) {
      reqId = data.order.id;
    }
  } catch (err) {
    console.warn('API error creating order; proceeding with local record', err);
  }

  // Accept quote on backend
  try {
    await fetch('/api/quotes/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: reqId,
        quote_id: quoteId,
        provider_name: providerName,
        slot: slot
      })
    });
  } catch (err) {
    console.warn('API error accepting quote; proceeding with local record', err);
  }

  // Update local orders
  const existingOrders = JSON.parse(localStorage.getItem('gharsetu_orders') || '[]');
  const newOrder = {
    id: reqId,
    status: `Inspection Scheduled with ${providerName}`,
    items: orderPayload.items,
    total: totalQuote,
    customer_name: orderPayload.customer_name,
    city: orderPayload.city,
    created_at: new Date().toISOString(),
    scheduled_slot: slot,
    provider_name: providerName
  };
  existingOrders.unshift(newOrder);
  localStorage.setItem('gharsetu_orders', JSON.stringify(existingOrders));

  showToast(`Inspection scheduled with ${providerName} for ${slot}! (Demo)`, '🎉');

  // Open the project tracker modal so user sees the result immediately
  setTimeout(() => {
    openDashboardModal();
  }, 600);
}

function renderBoQ() {
  const list = document.getElementById('resMaterialsList');
  if (!list) return;
  let html = '', materialTotal = 0;
  currentBoQ.forEach((item, i) => {
    const itemRate = item.price || item.rate || 0;
    const itemTotal = itemRate * (item.qty || 1);
    if (item.checked) materialTotal += itemTotal;
    const specSnippet = item.spec ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem;font-weight:400;">${escapeHTML(item.spec)}</div>` : '';
    html += `
      <li style="display:flex;justify-content:space-between;align-items:center;padding:.9rem .5rem;border-bottom:1px solid var(--border-subtle);">
        <label class="boq-item-label" style="display:flex;align-items:flex-start;gap:.75rem;cursor:pointer;flex:1;">
          <input type="checkbox" class="boq-checkbox" style="margin-top:.3rem;" ${item.checked ? 'checked' : ''} onchange="toggleBoQItem(${i})">
          <div>
            <div style="font-weight:700;color:var(--text-main);font-size:.93rem;">${escapeHTML(item.name || item.material)} <span style="font-size:.82rem;font-weight:500;color:var(--text-muted);">(${item.qty || 1} ${escapeHTML(item.unit || 'unit')})</span></div>
            ${specSnippet}
          </div>
        </label>
        <div style="text-align:right;min-width:110px;">
          <div class="item-price" style="font-size:.95rem;">₹${itemTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">₹${itemRate.toLocaleString('en-IN')}/${escapeHTML(item.unit || 'unit')} (Benchmark)</div>
        </div>
      </li>
    `;
  });
  list.innerHTML = html;
  animateCounter(document.getElementById('resCost'), laborBaseCost + materialTotal);
}

function toggleBoQItem(i) {
  if (currentBoQ[i]) {
    currentBoQ[i].checked = !currentBoQ[i].checked;
    renderBoQ();
  }
}

function addBoQToCart() {
  const selected = currentBoQ.filter(i => i.checked);
  if (!selected.length) {
    showToast('Select at least one scope item', '⚠️');
    return;
  }
  selected.forEach(item => cartItems.push({ name: item.name || item.material, price: item.price || item.rate || 0, qty: item.qty || 1 }));
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();
  showToast(`Added ${selected.length} items to Repair Plan! 📋`, '✓');
  toggleCart(true);
}

function copyProjectSummary() {
  const trades = document.getElementById('resTrades')?.innerText || '--';
  const duration = document.getElementById('resDuration')?.innerText || '--';
  const total = document.getElementById('resCost')?.innerText || 'Rs.0';
  const text = `GharSetu Preliminary Scope (Prototype Demo)\nTrades: ${trades}\nDuration: ${duration}\nPreliminary Benchmark Total: ${total}\n*Indicative demo benchmark for homeowner quotation.`;
  navigator.clipboard.writeText(text).then(() => showToast('Preliminary scope copied!', '📋'));
}

// ═════════════════════════════════════════════════════════════════════
// 6. PRINT / PDF ESTIMATE EXPORT MODAL
// ═════════════════════════════════════════════════════════════════════

function openPrintEstimate() {
  const modal = document.getElementById('printModal');
  if (!modal) return;

  const data = lastScopeData || {
    input: document.getElementById('userInput')?.value || 'Renovation Project',
    city: document.getElementById('userCity')?.value || 'Mumbai',
    trades: document.getElementById('resTrades')?.innerText || '1 General Contractor',
    duration: document.getElementById('resDuration')?.innerText || '2-3 Days',
    laborCost: laborBaseCost,
    engine: 'GharSetu AI Core v4.0',
    boq: currentBoQ
  };

  const refId = 'GS-' + Math.floor(100000 + Math.random() * 900000);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  document.getElementById('printRefId').innerText = refId;
  document.getElementById('printDate').innerText = 'Date: ' + dateStr;
  document.getElementById('printCity').innerText = 'Region: ' + (data.city || 'Mumbai');
  document.getElementById('printProjectDesc').innerText = data.input || document.getElementById('userInput')?.value;
  document.getElementById('printTrades').innerText = data.trades || '--';
  document.getElementById('printDuration').innerText = data.duration || '--';
  document.getElementById('printEngine').innerText = data.engine || 'GharSetu AI Core';

  const tbody = document.getElementById('printBoQTableBody');
  let tbodyHtml = '', matTotal = 0;

  (data.boq || currentBoQ).forEach((item, idx) => {
    if (item.checked !== false) {
      const q = item.qty || 1;
      const rowTotal = item.price * q;
      matTotal += rowTotal;
      tbodyHtml += `
        <tr style="border-bottom:1px solid #EEF1F6;">
          <td style="padding:.7rem;color:#6B7A90;">${idx + 1}</td>
          <td style="padding:.7rem;font-weight:600;">${item.name}</td>
          <td style="padding:.7rem;text-align:center;">${q}</td>
          <td style="padding:.7rem;text-align:center;text-transform:capitalize;">${item.unit || 'unit'}</td>
          <td style="padding:.7rem;text-align:right;">₹${item.price.toLocaleString('en-IN')}</td>
          <td style="padding:.7rem;text-align:right;font-weight:700;">₹${rowTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }
  });

  if (tbody) tbody.innerHTML = tbodyHtml;
  const labor = Number(data.laborCost) || laborBaseCost;
  const grand = matTotal + labor;

  const matEl = document.getElementById('printMatTotal');
  const labEl = document.getElementById('printLaborTotal');
  const grandEl = document.getElementById('printGrandTotal');

  if (matEl) matEl.innerText = '₹' + matTotal.toLocaleString('en-IN');
  if (labEl) labEl.innerText = '₹' + labor.toLocaleString('en-IN');
  if (grandEl) grandEl.innerText = '₹' + grand.toLocaleString('en-IN');

  modal.style.display = 'flex';
}

function closePrintModal() {
  const modal = document.getElementById('printModal');
  if (modal) modal.style.display = 'none';
}

// ═════════════════════════════════════════════════════════════════════
// 7. CONTRACTOR WORKSPACE & ORDER TRACKER
// ═════════════════════════════════════════════════════════════════════

async function openDashboardModal() {
  const modal = document.getElementById('dashboardModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const card = document.getElementById('dashContractorCard');
  if (authUser && card) {
    card.style.display = 'flex';
    document.getElementById('dashName').innerText = authUser.name;
    document.getElementById('dashEmailCity').innerText = `${authUser.email} • ${authUser.city || 'Mumbai'} (Local Pro Partner)`;
  } else if (card) {
    card.style.display = 'none';
  }

  // Populate Saved Quotes View
  const savedEstimates = JSON.parse(localStorage.getItem('gharsetu_estimates') || '[]');
  const quoteDesc = document.getElementById('dashQuoteDesc');
  const quoteMeta = document.getElementById('dashQuoteMeta');

  if (savedEstimates.length > 0) {
    const latest = savedEstimates[0];
    if (quoteDesc) quoteDesc.innerText = latest.title;
    if (quoteMeta) quoteMeta.innerText = `${latest.trades} • ${latest.duration} • Total Est: Rs.${Number(latest.total).toLocaleString('en-IN')} (${latest.city})`;
  } else if (lastScopeData) {
    if (quoteDesc) quoteDesc.innerText = lastScopeData.input;
    if (quoteMeta) quoteMeta.innerText = `${lastScopeData.trades} • ${lastScopeData.duration}`;
  }

  await loadDepotOrders();
}

function closeDashboardModal() {
  const modal = document.getElementById('dashboardModal');
  if (modal) modal.style.display = 'none';
}

async function loadDepotOrders() {
  const list = document.getElementById('dashOrdersList');
  if (!list) return;

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Syncing with Homeowner Quote Hub... 🏠</div>';

  let orders = [];
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success && data.orders) {
      orders = data.orders;
      localStorage.setItem('gharsetu_orders', JSON.stringify(orders));
    } else {
      orders = JSON.parse(localStorage.getItem('gharsetu_orders') || '[]');
    }
  } catch (err) {
    console.warn('API unreachable; loading cached orders from localStorage', err);
    orders = JSON.parse(localStorage.getItem('gharsetu_orders') || '[]');
  }

  const countBadge = document.getElementById('dashOrderCount');
  if (countBadge) countBadge.innerText = orders.length;

  if (!orders.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--text-muted);border:1px dashed var(--border-subtle);border-radius:14px;">
        <div style="font-size:2.2rem;margin-bottom:.5rem;">📋</div>
        <div style="font-weight:700;color:var(--text-main);">No quote requests submitted yet</div>
        <p style="font-size:.85rem;margin-top:.3rem;">Plan a scope above or add items from the benchmark guide to request competitive local quotes.</p>
      </div>
    `;
    return;
  }

  const ordersHTML = orders.map(ord => {
    const itemsText = (ord.items || []).map(i => `${parseInt(i.qty || 1, 10)}x ${escapeHTML(i.name)}`).join(', ');
    const dateStr = new Date(ord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    
    // Parse matched quotes if available from API/database
    let matchedQuotes = [];
    if (ord.matched_quotes) {
      matchedQuotes = typeof ord.matched_quotes === 'string' ? JSON.parse(ord.matched_quotes) : ord.matched_quotes;
    }

    let quotesSection = '';
    if (matchedQuotes && matchedQuotes.length > 0) {
      quotesSection = `
        <div style="margin-top:.9rem;padding-top:.8rem;border-top:1px dashed var(--border-subtle);">
          <div style="font-size:.76rem;font-weight:800;color:var(--terracotta);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:0.5px;">
            Matched Competitive Quotes (${matchedQuotes.length}) • Prototype Demo
          </div>
          <div style="display:flex;flex-direction:column;gap:.55rem;">
            ${matchedQuotes.map(q => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:.65rem .85rem;border-radius:10px;border:1px solid var(--border-subtle);font-size:.82rem;flex-wrap:wrap;gap:.4rem;">
                <div>
                  <div style="font-weight:700;color:var(--text-main);">${escapeHTML(q.provider_name)} <span style="color:#F59E0B;font-size:.74rem;">★ ${q.rating}</span></div>
                  <div style="font-size:.74rem;color:var(--text-muted);">Earliest inspection: ${escapeHTML(q.earliest_inspection || 'Tomorrow, 10:00 AM')}</div>
                </div>
                <div style="display:flex;align-items:center;gap:.6rem;">
                  <div style="text-align:right;">
                    <div style="font-weight:800;color:var(--terracotta);font-size:.92rem;">₹${(q.total_quote || 0).toLocaleString('en-IN')}</div>
                    <span style="font-size:.7rem;padding:.15rem .45rem;border-radius:4px;font-weight:700;${q.status === 'Accepted' ? 'background:#ECFDF5;color:#10B981;' : 'background:#EFF6FF;color:#2563EB;'}">
                      ${q.status || 'Quote Received'}
                    </span>
                  </div>
                  ${q.status !== 'Accepted' ? `
                    <button 
                      type="button" 
                      class="btn-primary" 
                      style="padding:.35rem .65rem;font-size:.75rem;font-weight:700;border-radius:6px;"
                      onclick="handleScheduleProvider('${escapeHTML(q.provider_id || '')}', '${escapeHTML(q.provider_name || '').replace(/'/g, "\\'")}', '${escapeHTML(q.quote_id || '')}', ${q.total_quote || 0}, '${escapeHTML(q.earliest_inspection || 'Tomorrow, 10:00 AM')}')"
                    >
                      Schedule Visit
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div style="background:var(--surface-elevated,#fafafa);border:1px solid var(--border-subtle);border-radius:14px;padding:1.2rem;transition:.2s;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;flex-wrap:wrap;gap:.4rem;">
          <div style="display:flex;align-items:center;gap:.6rem;">
            <span style="font-weight:800;color:var(--terracotta);font-size:.95rem;">${escapeHTML(ord.id)}</span>
            <span style="font-size:.75rem;background:#ECFDF5;color:#10B981;font-weight:700;padding:.2rem .6rem;border-radius:12px;">● ${escapeHTML(ord.status || 'Quotes Received (Demo)')}</span>
          </div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--text-main);">₹${(ord.total || 0).toLocaleString('en-IN')} <span style="font-size:.75rem;font-weight:500;color:var(--text-muted);">(Preliminary Est.)</span></div>
        </div>
        <p style="font-size:.85rem;color:var(--text-main);font-weight:600;margin-bottom:.4rem;">${itemsText || 'Standard repair scope items'}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:var(--text-muted);border-top:1px dashed var(--border-subtle);padding-top:.6rem;">
          <span>📅 Submitted: ${dateStr}</span>
          <span>📍 Region: ${escapeHTML(ord.city || 'Mumbai')}</span>
        </div>
        ${quotesSection}
      </div>
    `;
  }).join('');

  const demoQuotesHTML = `
    <div style="margin-top:1.2rem;padding:1.1rem 1.3rem;background:var(--warm-50);border:1px dashed var(--warm-200);border-radius:14px;">
      <h4 style="font-size:.88rem;font-weight:800;color:var(--terracotta);margin-bottom:.6rem;display:flex;align-items:center;gap:.4rem;">
        <span>👷</span> Seeded Local Pro Responses (Prototype Demo Data)
      </h4>
      <div style="display:flex;flex-direction:column;gap:.6rem;font-size:.84rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:.7rem 1rem;border-radius:10px;border:1px solid var(--border-subtle);">
          <div>
            <div style="font-weight:700;color:var(--text-main);">Apex Trade Solutions <span style="color:#F59E0B;font-size:.78rem;">★★★★★ (4.9)</span></div>
            <div style="font-size:.76rem;color:var(--text-muted);">Local trade crew (Demo Data) • Indicative proposal</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;color:var(--terracotta);">₹3,850</div>
            <span style="font-size:.72rem;background:#ECFDF5;color:#10B981;padding:.15rem .45rem;border-radius:6px;font-weight:700;">Demo Quote</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:.7rem 1rem;border-radius:10px;border:1px solid var(--border-subtle);">
          <div>
            <div style="font-weight:700;color:var(--text-main);">Metro Craftsmen Hub <span style="color:#F59E0B;font-size:.78rem;">★★★★☆ (4.8)</span></div>
            <div style="font-size:.76rem;color:var(--text-muted);">Independent local trade team (Demo Data) • Indicative proposal</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;color:var(--terracotta);">₹4,100</div>
            <span style="font-size:.72rem;background:#ECFDF5;color:#10B981;padding:.15rem .45rem;border-radius:6px;font-weight:700;">Demo Quote</span>
          </div>
        </div>
      </div>
      <p style="font-size:.74rem;color:var(--text-muted);margin-top:.6rem;margin-bottom:0;">*Demonstration only: Quotes shown are illustrative mockups to demonstrate the homeowner comparison workflow.</p>
    </div>
  `;

  list.innerHTML = ordersHTML + (orders.some(o => o.matched_quotes && o.matched_quotes.length > 0) ? '' : demoQuotesHTML);
}

const loadHomeownerOrders = loadDepotOrders;

function switchDashTab(tab) {
  const isOrders = tab === 'orders';
  const ordersView = document.getElementById('dashOrdersView');
  const quotesView = document.getElementById('dashQuotesView');
  const tabOrders = document.getElementById('dashTabOrders');
  const tabQuotes = document.getElementById('dashTabQuotes');

  if (ordersView) ordersView.style.display = isOrders ? 'block' : 'none';
  if (quotesView) quotesView.style.display = isOrders ? 'none' : 'block';
  if (tabOrders) {
    tabOrders.style.color = isOrders ? 'var(--terracotta)' : 'var(--text-muted)';
    tabOrders.style.borderBottom = isOrders ? '2px solid var(--terracotta)' : 'none';
  }
  if (tabQuotes) {
    tabQuotes.style.color = isOrders ? 'var(--text-muted)' : 'var(--terracotta)';
    tabQuotes.style.borderBottom = isOrders ? 'none' : '2px solid var(--terracotta)';
  }
}

// ═════════════════════════════════════════════════════════════════════
// 8. CART & CHECKOUT (WITH LOCALSTORAGE PERSISTENCE)
// ═════════════════════════════════════════════════════════════════════

function toggleCart(open) {
  const overlay = document.getElementById('cartOverlay');
  if (!overlay) return;
  if (open) {
    renderCart();
    overlay.classList.add('open');
  } else {
    overlay.classList.remove('open');
  }
}

function removeFromCart(index) {
  cartItems.splice(index, 1);
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();
  renderCart();
  showToast('Item removed from Repair Plan', '🗑');
}

function updateCartCounter() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  badge.innerText = cartItems.length;
  badge.classList.add('cart-bump');
  setTimeout(() => badge.classList.remove('cart-bump'), 300);
}

function renderCart() {
  const listEl = document.getElementById('cartItemList');
  const totalDisplay = document.getElementById('cartTotalDisplay');
  if (!listEl || !totalDisplay) return;

  if (!cartItems.length) {
    listEl.innerHTML = `
      <p style="color:var(--text-muted);text-align:center;margin-top:3rem;font-size:.92rem;">
        Your Repair Plan is empty<br><span style="font-size:2.5rem;display:inline-block;margin-top:.5rem;">🛠️</span>
      </p>
    `;
    totalDisplay.innerText = 'Rs.0';
    return;
  }

  let html = '', total = 0;
  cartItems.forEach((item, idx) => {
    total += (item.price || 0) * (item.qty || 1);
    html += `
      <div class="cart-item">
        <div>
          <h5>${escapeHTML(item.name)}</h5>
          <p>₹${(item.price || 0).toLocaleString('en-IN')} (Benchmark)</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">Remove</button>
      </div>
    `;
  });

  listEl.innerHTML = html;
  totalDisplay.innerText = '₹' + total.toLocaleString('en-IN');
}

async function checkoutCart(event) {
  if (!cartItems.length) {
    showToast('Add items to your repair plan first', '⚠️');
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.innerText = 'Submitting Quote Request (Demo)...';

  const contactName = authUser ? authUser.name : 'Homeowner (Demo)';
  const city = (authUser && authUser.city) || (document.getElementById('userCity')?.value) || 'Mumbai';
  const total = cartItems.reduce((s, i) => s + ((i.price || 0) * (i.qty || 1)), 0);

  // Create persistent quote request object
  const newOrder = {
    id: 'REQ-' + Math.floor(100000 + Math.random() * 900000),
    status: 'Quotes Requested (Demo)',
    items: [...cartItems],
    total,
    customer_name: contactName,
    city,
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: contactName,
        customer_email: authUser ? authUser.email : 'homeowner@example.com',
        city,
        items: cartItems,
        subtotal: total,
        gst: 0,
        total: total
      })
    });
    const data = await res.json();
    if (data.success && data.order) {
      newOrder.id = data.order.id;
    }
  } catch (err) {
    console.warn('Backend offline; storing request locally in localStorage', err);
  }

  // Persist locally in localStorage
  const existingOrders = JSON.parse(localStorage.getItem('gharsetu_orders') || '[]');
  existingOrders.unshift(newOrder);
  localStorage.setItem('gharsetu_orders', JSON.stringify(existingOrders));

  showToast(`Quote request ${newOrder.id} submitted! Seeded local pros notified (Demo) 🚀`, '✓');
  cartItems = [];
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();

  btn.disabled = false;
  btn.innerText = 'Request Quotes from Local Pros 🚀';
  setTimeout(() => {
    toggleCart(false);
    openDashboardModal();
  }, 900);
}

// ═════════════════════════════════════════════════════════════════════
// 9. CONTRACTOR AUTH & SESSIONS
// ═════════════════════════════════════════════════════════════════════

function openAuthModal() {
  if (authUser) {
    showContractorMenu();
    return;
  }
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
    const msg = document.getElementById('authMsg');
    if (msg) msg.textContent = '';
  }
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  const title = document.getElementById('authTitle');
  const sub = document.getElementById('authSubtitle');
  const msg = document.getElementById('authMsg');

  if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
  if (regForm) regForm.style.display = isLogin ? 'none' : 'block';
  if (tabLogin) {
    tabLogin.style.background = isLogin ? '#E25822' : 'transparent';
    tabLogin.style.color = isLogin ? '#fff' : 'var(--text-muted,#666)';
  }
  if (tabReg) {
    tabReg.style.background = isLogin ? 'transparent' : '#E25822';
    tabReg.style.color = isLogin ? 'var(--text-muted,#666)' : '#fff';
  }
  if (title) title.textContent = isLogin ? 'Pro Partner Login' : 'Register as Pro Partner (Demo)';
  if (sub) sub.textContent = isLogin ? 'Access your local trade partner portal (Prototype Demo)' : 'Register your local trade service on GharSetu (Prototype Demo)';
  if (msg) msg.textContent = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  // Form Validation
  if (!email || !password) {
    document.getElementById('authMsg').textContent = '❌ Please enter email and password';
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('gharsetu_token', data.token);
      localStorage.setItem('gharsetu_user', JSON.stringify(data.contractor));
      authToken = data.token;
      authUser = data.contractor;
      closeAuthModal();
      updateNavForLoggedIn();
      showToast('Welcome back, ' + data.contractor.name + '! 🎉');
    } else {
      document.getElementById('authMsg').textContent = '❌ ' + data.message;
    }
  } catch (err) {
    // Demo Mode Fallback
    const demoContractor = { id: 'c-demo', name: email.split('@')[0], email, city: 'Mumbai' };
    localStorage.setItem('gharsetu_token', 'demo-token');
    localStorage.setItem('gharsetu_user', JSON.stringify(demoContractor));
    authToken = 'demo-token';
    authUser = demoContractor;
    closeAuthModal();
    updateNavForLoggedIn();
    showToast('Logged in as ' + demoContractor.name + ' (Demo Mode)', '✓');
  } finally {
    btn.textContent = 'Login →';
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const city = document.getElementById('regCity')?.value.trim() || 'Mumbai';
  const phone = document.getElementById('regPhone')?.value.trim() || '9876543210';
  const password = document.getElementById('regPassword')?.value;

  // Validation
  if (!name || !email || !password) {
    document.getElementById('authMsg').textContent = '❌ Please fill in all required fields';
    return;
  }
  if (password.length < 6) {
    document.getElementById('authMsg').textContent = '❌ Password must be at least 6 characters';
    return;
  }

  const btn = document.getElementById('registerBtn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, city })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('gharsetu_token', data.token);
      localStorage.setItem('gharsetu_user', JSON.stringify(data.contractor));
      authToken = data.token;
      authUser = data.contractor;
      closeAuthModal();
      updateNavForLoggedIn();
      showToast('Welcome to GharSetu, ' + data.contractor.name + '! 🏗️');
    } else {
      document.getElementById('authMsg').textContent = '❌ ' + data.message;
    }
  } catch (err) {
    const demoContractor = { id: 'c-' + Date.now(), name, email, city };
    localStorage.setItem('gharsetu_token', 'demo-token');
    localStorage.setItem('gharsetu_user', JSON.stringify(demoContractor));
    authToken = 'demo-token';
    authUser = demoContractor;
    closeAuthModal();
    updateNavForLoggedIn();
    showToast('Welcome to GharSetu, ' + name + '! 🏗️');
  } finally {
    btn.textContent = 'Create Account →';
    btn.disabled = false;
  }
}

function updateNavForLoggedIn() {
  const btn = document.getElementById('authNavBtn');
  if (authUser && btn) {
    btn.innerHTML = '👷 ' + authUser.name.split(' ')[0];
    btn.style.background = 'linear-gradient(135deg,#E25822,#ff7043)';
    btn.style.color = '#fff';
    btn.style.padding = '.45rem 1rem';
    btn.style.borderRadius = '20px';
    btn.style.fontWeight = '700';
    btn.onclick = e => { e.preventDefault(); showContractorMenu(); };
  }
  const mobileLink = document.getElementById('mobileAuthLink');
  if (authUser && mobileLink) {
    mobileLink.innerHTML = '👷 ' + authUser.name + ' (Profile)';
    mobileLink.onclick = () => { closeMobileMenu(); openDashboardModal(); };
  }
}

function showContractorMenu() {
  const existing = document.getElementById('contractorMenu');
  if (existing) { existing.remove(); return; }
  const menu = document.createElement('div');
  menu.id = 'contractorMenu';
  menu.style.cssText = 'position:fixed;top:70px;right:2rem;background:var(--card-bg,#fff);border-radius:14px;padding:1rem;box-shadow:0 12px 40px rgba(0,0,0,.15);z-index:9998;min-width:220px;animation:slideUp .2s ease;';
  menu.innerHTML = `
    <div style="font-weight:700;margin-bottom:.4rem;padding-bottom:.4rem;border-bottom:1px solid var(--border,#eee);">👷 ${escapeHTML(authUser.name)}</div>
    <div style="font-size:.82rem;color:var(--text-muted,#888);margin-bottom:.3rem;">📧 ${escapeHTML(authUser.email)}</div>
    <div style="font-size:.82rem;color:var(--text-muted,#888);margin-bottom:.8rem;">🏙️ ${escapeHTML(authUser.city || 'Not set')}</div>
    <button onclick="document.getElementById('contractorMenu').remove();openDashboardModal();" style="width:100%;padding:.6rem;background:#E25822;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.85rem;margin-bottom:.5rem;">📋 Project &amp; Quote Tracker</button>
    <button onclick="logoutContractor()" style="width:100%;padding:.5rem;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;">Logout</button>
  `;
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!menu.contains(e.target) && e.target !== document.getElementById('authNavBtn')) {
        menu.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 100);
}

function logoutContractor() {
  localStorage.removeItem('gharsetu_token');
  localStorage.removeItem('gharsetu_user');
  authToken = null;
  authUser = null;
  const btn = document.getElementById('authNavBtn');
  if (btn) {
    btn.innerHTML = 'Pro Partner (Demo)';
    btn.style = '';
    btn.onclick = e => { e.preventDefault(); openAuthModal(); };
  }
  const mobileLink = document.getElementById('mobileAuthLink');
  if (mobileLink) {
    mobileLink.innerHTML = 'Pro Partner (Demo)';
    mobileLink.onclick = () => { closeMobileMenu(); openAuthModal(); };
  }
  const menu = document.getElementById('contractorMenu');
  if (menu) menu.remove();
  showToast('Logged out successfully');
}

// ═════════════════════════════════════════════════════════════════════
// 10. BOOTSTRAP INITIALIZATION
// ═════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  updateCartCounter();
  loadMarketplaceProducts();
  if (authUser) updateNavForLoggedIn();

  // Initialize initial scope estimate
  const inputEl = document.getElementById('userInput');
  if (inputEl) {
    setupScopeDataFallback(inputEl.value.toLowerCase(), document.getElementById('userCity')?.value || 'Mumbai');
  }

  // Ping backend API status
  fetch('/api/health')
    .then(r => r.json())
    .then(d => {
      console.log(`%c✅ GharSetu API v${d.version} active [${d.service}]`, 'color:#10B981;font-weight:bold;');
    })
    .catch(() => {
      console.log('%cℹ️ Running in Static Client Mode (Persistent LocalStorage Enabled)', 'color:#E25822;font-weight:bold;');
    });
});
