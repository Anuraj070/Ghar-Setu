/**
 * GharSetu (घर सेतु) - Client Application Controller
 * v4.0 AI Renovation Scoping & B2B Construction Procurement Platform
 * 
 * Modules:
 * 1. Persistent Storage (LocalStorage + API sync for products, orders, estimates, cart, auth)
 * 2. Visual Effects (WebGL Shader, Particle Canvases, 3D Tilt, Scroll Progress, Typewriter, Counters)
 * 3. Feedback & Toasts (Toast alert notification system)
 * 4. Dynamic Marketplace (Live search, category filter, dynamic catalog, product detail modal)
 * 5. AI Scoper & BoQ Generator (Gemini AI API + CPWD parametric estimation engine fallback)
 * 6. Printable Official BoQ Estimate (Print/PDF formatted document with signatures)
 * 7. Contractor Hub & Depot Order Tracker (Order tracking, status timeline, saved estimates)
 * 8. Procurement Cart & Checkout (Local cart persistence & 3PL depot dispatch allocation)
 * 9. Contractor Authentication & Session Management (Login, Register, Logout, Form validation)
 */

// ═════════════════════════════════════════════════════════════════════
// 1. PERSISTENT STATE & DEFAULT DATA
// ═════════════════════════════════════════════════════════════════════

const DEFAULT_PRODUCTS = [
  { id: 'prod-001', name: 'Ambuja Portland Cement', meta: '50kg Bag • Grade 53 • Verified Depot', price: 380, originalPrice: 450, discount: 15, category: 'cement', stock: 240, unit: 'bag', specs: 'IS:12269 certified. High early strength formulation engineered for RCC slabs, structural beams, columns, and high-durability plastering.', tags: ['cement', 'grade53', 'portland', 'ambuja'] },
  { id: 'prod-002', name: 'Astral CPVC Pipes (Heavy Duty)', meta: '3m Length • 1-inch • Plumbing Grade', price: 420, originalPrice: 510, discount: 18, category: 'plumbing', stock: 180, unit: 'piece', specs: 'SDR 11 certified up to 93°C hot/cold potable water distribution. 100% lead-free formulation with NSF international approval.', tags: ['cpvc', 'pipe', 'plumbing', 'astral'] },
  { id: 'prod-003', name: 'Asian Paints Tractor Emulsion', meta: '20L Bucket • Matte White Finish', price: 2850, originalPrice: 3240, discount: 12, category: 'paint', stock: 90, unit: 'bucket', specs: 'Smooth plastic emulsion finish offering superior coverage (260-300 sq.ft/L for 1 coat) with anti-fungal shield and washability.', tags: ['paint', 'emulsion', 'asian paints'] },
  { id: 'prod-004', name: 'Polycab FR Wire 1.5 sq mm', meta: '90m Coil • Fire Retardant • ISI Marked', price: 1580, originalPrice: 1750, discount: 10, category: 'electrical', stock: 120, unit: 'coil', specs: 'IS:694 certified copper conductor. 100% electrolytic grade with oxygen-index >29% flame-retardant virgin PVC sheath.', tags: ['wire', 'electrical', 'fr', 'polycab'] },
  { id: 'prod-005', name: 'Ebco Soft-Close Cabinet Hinges', meta: 'Pack of 4 Pairs • Concealed Mount', price: 960, originalPrice: 1200, discount: 20, category: 'hardware', stock: 300, unit: 'pack', specs: 'Nickel-plated cold-rolled steel with integrated hydraulic soft-close damper. 105° opening angle tested for 50,000 motion cycles.', tags: ['hinge', 'cabinet', 'hardware', 'ebco'] },
  { id: 'prod-006', name: 'Birla White Wall Seal Primer', meta: '1 Bag (30kg) • Interior/Exterior', price: 755, originalPrice: 820, discount: 8, category: 'paint', stock: 150, unit: 'bag', specs: 'White cement-based polymer modified reactive primer. Penetrates substrate capillaries to permanently eliminate alkali efflorescence.', tags: ['primer', 'paint', 'wall', 'birla'] },
  { id: 'prod-007', name: 'UltraTech Super Cement', meta: '50kg Bag • Grade 53 PPC/OPC', price: 395, originalPrice: 455, discount: 13, category: 'cement', stock: 320, unit: 'bag', specs: 'Engineered micro-fine slag particles creating an impermeable concrete barrier resisting sulfate and chloride attack.', tags: ['cement', 'ultratech', 'ppc'] },
  { id: 'prod-008', name: 'Finolex CPVC Ball Valve', meta: '1-inch • Heavy Duty Brass Core', price: 280, originalPrice: 340, discount: 18, category: 'plumbing', stock: 200, unit: 'piece', specs: 'Full-port design for zero friction pressure drop. Leak-proof PTFE seats with ergonomic high-torque quarter-turn lever.', tags: ['valve', 'cpvc', 'finolex'] },
  { id: 'prod-009', name: 'Dr. Fixit Damp Shield Elasto', meta: '4kg Bucket • Polymer Waterproofing', price: 1450, originalPrice: 1720, discount: 16, category: 'paint', stock: 110, unit: 'bucket', specs: 'Synthetic elastomeric polymer waterproof barrier with 300% elongation, bridging active hairline structural and plaster cracks.', tags: ['waterproofing', 'seepage', 'dr fixit', 'primer'] },
  { id: 'prod-010', name: 'Schneider Electric 16A MCB', meta: 'Single Pole • C-Curve Industrial Grade', price: 220, originalPrice: 275, discount: 20, category: 'electrical', stock: 160, unit: 'piece', specs: '10kA breaking capacity according to IS/IEC 60898-1. Bi-connect terminals with positive contact indication flag.', tags: ['mcb', 'switch', 'electrical', 'schneider'] }
];

// Seed persistent storage if not present
if (!localStorage.getItem('gharsetu_products')) {
  localStorage.setItem('gharsetu_products', JSON.stringify(DEFAULT_PRODUCTS));
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

// Page Loader Dismiss
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 500);
  }
});

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
  const phrases = ['Structured Code', 'Clear BoQ Plans', 'Verified Contracts', 'On-Budget Jobs'];
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

function animateCounter(el, target, prefix = 'Rs.', duration = 1000) {
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
  grid.innerHTML = products.map((p, idx) => `
    <div class="product reveal stagger-${(idx % 3) + 1} cursor-pointer" data-name="${p.name.toLowerCase()} ${(p.tags || []).join(' ')}" data-cat="${p.category}" onclick="handleProductCardClick(event, '${p.id}')">
      <div class="discount-pill">${p.discount}% OFF</div>
      <div>
        <h3>${p.name}</h3>
        <p class="product-meta">${p.meta}</p>
      </div>
      <div>
        <div class="pricing-wrap">
          <span class="price">Rs.${p.price.toLocaleString('en-IN')}</span>
          <strike>Rs.${p.originalPrice.toLocaleString('en-IN')}</strike>
        </div>
        <div class="qty-control" onclick="event.stopPropagation()">
          <button class="qty-btn" onclick="changeQty(this,-1)">−</button>
          <span class="qty-val">1</span>
          <button class="qty-btn" onclick="changeQty(this,1)">+</button>
        </div>
        <div style="display:flex;gap:.5rem;margin-top:.6rem;">
          <button class="btn-outline" style="flex:1;" onclick="event.stopPropagation();addToCartQty(this,'${p.name} (${p.unit})',${p.price})">Add to Job Cart</button>
          <button class="btn-outline" style="padding:.5rem .75rem;font-size:.85rem;" onclick="event.stopPropagation();openProductDetailModal('${p.id}')" title="Technical Specs">ℹ️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function handleProductCardClick(event, id) {
  if (event.target.tagName !== 'BUTTON' && !event.target.classList.contains('qty-btn')) {
    openProductDetailModal(id);
  }
}

function filterMarketplace() {
  const searchInput = document.getElementById('marketSearch');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  document.querySelectorAll('#storeGrid .product').forEach(p => {
    const n = p.getAttribute('data-name') || '';
    const c = p.getAttribute('data-cat') || '';
    const matchesQ = !q || n.includes(q);
    const matchesC = activeCat === 'all' || c === activeCat;
    const isVisible = matchesQ && matchesC;
    p.classList.toggle('hidden', !isVisible);
    if (isVisible) {
      p.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    }
  });
}

function filterByCategory(btn, cat) {
  activeCat = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
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
  showToast(`Added ${qtyVal}x ${name} to Job Cart`, '📦');
}

// Product Technical Detail Modal
function openProductDetailModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;

  document.getElementById('detailProdTitle').innerText = product.name;
  document.getElementById('detailProdCategory').innerText = (product.category || 'MATERIAL').toUpperCase() + ' • REGIONAL DEPOT CERTIFIED';
  document.getElementById('detailProdMeta').innerText = product.meta;
  document.getElementById('detailProdPrice').innerText = 'Rs.' + product.price.toLocaleString('en-IN');
  document.getElementById('detailProdOriginal').innerText = 'Rs.' + product.originalPrice.toLocaleString('en-IN');
  document.getElementById('detailProdDiscount').innerText = product.discount + '% Wholesale Discount';
  document.getElementById('detailProdSpecs').innerText = product.specs || 'Certified according to Bureau of Indian Standards (BIS) and regional building regulations.';
  document.getElementById('detailProdStock').innerText = (product.stock || 150) + ' ' + (product.unit || 'units') + ' available at nearest regional depot hub.';

  const addBtn = document.getElementById('detailAddToCartBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      addToCartQty(addBtn, `${product.name} (${product.unit})`, product.price);
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
    [0, 'Tokenizing spatial and renovation requirements...'],
    [25, 'Analyzing Indian Standard (IS) codes & trades...'],
    [55, 'Cross-referencing regional distributor depot catalog...'],
    [80, 'Compiling labor schedule & BoQ quantities...'],
    [100, 'Finalizing scope document...']
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
      body: JSON.stringify({ description: input, city })
    });
    const data = await res.json();
    clearInterval(pipelineInterval);
    if (fill) fill.style.width = '100%';

    if (data.success && data.scope) {
      applyScopeData(data.scope, data.input || input, data.city || city);
    } else {
      showToast('Could not synthesize scope. Running local engine.', '⚠️');
      setupScopeDataFallback(input.toLowerCase(), city);
    }
  } catch (err) {
    clearInterval(pipelineInterval);
    console.warn('API call failed; using local CPWD parametric engine', err);
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

function applyScopeData(s, originalInput, city) {
  lastScopeData = { ...s, input: originalInput, city: city || 'Mumbai' };
  localStorage.setItem('gharsetu_last_scope', JSON.stringify(lastScopeData));

  // Save to persistent estimates history
  const savedEstimates = JSON.parse(localStorage.getItem('gharsetu_estimates') || '[]');
  savedEstimates.unshift({
    id: 'EST-' + Math.floor(100000 + Math.random() * 900000),
    title: originalInput,
    city,
    trades: s.trades,
    duration: s.duration,
    total: s.grandTotal || (s.laborCost + (s.materialCost || 0)),
    date: new Date().toISOString()
  });
  localStorage.setItem('gharsetu_estimates', JSON.stringify(savedEstimates.slice(0, 10)));

  const tradesEl = document.getElementById('resTrades');
  const durEl = document.getElementById('resDuration');
  const badgeEl = document.getElementById('resConfidenceBadge');

  if (tradesEl) tradesEl.innerText = s.trades;
  if (durEl) durEl.innerText = s.duration;
  if (badgeEl) {
    badgeEl.innerHTML = `✓ Scope Synthesized (${s.confidence}%) • <small style="font-weight:700;color:var(--terracotta);">${s.engine || 'GharSetu Core'}</small>`;
  }

  laborBaseCost = Number(s.laborCost) || 3000;
  currentBoQ = (s.boq || []).map(item => ({ ...item, checked: true }));
  renderBoQ();
  renderTechnicalNotes(s.technicalNotes);
}

function renderTechnicalNotes(notes) {
  const card = document.getElementById('resTechnicalNotesCard');
  const list = document.getElementById('resTechnicalNotesList');
  if (!card || !list) return;
  if (notes && notes.length > 0) {
    list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}

// Fallback Engine (For static demo deployments like GitHub Pages)
function setupScopeDataFallback(input, city = 'Mumbai') {
  let type = 'General Renovation';
  let trades = '1 General Contractor, 1 Artisan';
  let duration = '2-3 Days';
  let labor = 4200;
  let notes = ['Adhere strictly to CPWD schedule of rates', 'Verify site moisture before coating'];
  let boq = [];

  if (input.includes('waterproof') || input.includes('seep') || input.includes('damp')) {
    type = 'Waterproofing & Damp Repair';
    trades = '1 Waterproofing Specialist, 1 Mason';
    duration = '2-3 Days (Curing Required)';
    labor = 3600;
    notes = ['Moisture test surface (<12%) before polymer elastomeric application', 'Allow 24-hr curing between coats'];
    boq = [
      { name: 'Dr. Fixit Damp Shield Elasto (4kg)', price: 1450, qty: 2, unit: 'bucket', checked: true },
      { name: 'Dr. Fixit Super Latex SBR Bonding (5L)', price: 1650, qty: 1, unit: 'can', checked: true },
      { name: 'Birla White Wall Putty Waterproof (30kg)', price: 920, qty: 1, unit: 'bag', checked: true },
      { name: 'Glass Fiber Mesh Tape (50m)', price: 340, qty: 1, unit: 'roll', checked: true }
    ];
  } else if (input.includes('leak') || input.includes('pipe') || input.includes('tap') || input.includes('plumb')) {
    type = 'Plumbing & Drainage';
    trades = '1 Master Plumber, 1 Assistant';
    duration = '1 Day (4-6 hrs)';
    labor = 1600;
    notes = ['Pressure test all concealed joints at 10 bar before closing tiles', 'Ensure heavy-duty CPVC solvent cement is applied'];
    boq = [
      { name: 'Astral CPVC Pipe (1-inch, 2x3m Heavy Duty)', price: 840, qty: 1, unit: 'set', checked: true },
      { name: 'Finolex Brass Stop Cock Valve (Concealed)', price: 650, qty: 1, unit: 'piece', checked: true },
      { name: 'Teflon Tape + Heavy Duty CPVC Solvent', price: 180, qty: 1, unit: 'kit', checked: true },
      { name: 'Chrome Basin Mixer Tap (ISI Marked)', price: 1250, qty: 1, unit: 'piece', checked: true }
    ];
  } else if (input.includes('wire') || input.includes('electr') || input.includes('switch')) {
    type = 'Electrical Overhaul';
    trades = '2 Certified Electricians';
    duration = '2 Days (14 hrs)';
    labor = 3500;
    notes = ['Conform strictly to IS:732 Indian wiring safety standards', 'Megger insulation test recommended after pull-through'];
    boq = [
      { name: 'Polycab 1.5 sq mm FR Wire (2 Coils, 90m)', price: 3160, qty: 2, unit: 'coil', checked: true },
      { name: 'Modular Switch Plates & 6A/16A Switches', price: 1850, qty: 1, unit: 'set', checked: true },
      { name: 'Schneider 16A C-Curve Single Pole MCB', price: 660, qty: 1, unit: 'set', checked: true },
      { name: 'PVC Conduit Pipes & Junction Boxes Kit', price: 950, qty: 1, unit: 'set', checked: true }
    ];
  } else {
    type = 'Painting & Carpentry';
    trades = '1 Painter, 1 Carpenter';
    duration = '2-3 Days';
    labor = 4200;
    notes = ['Light-sand with 220 grit between putty and primer coats', 'Ensure calibrated 19mm marine grade plywood'];
    boq = [
      { name: 'Asian Paints Royale Emulsion (10L Bucket)', price: 3850, qty: 1, unit: 'bucket', checked: true },
      { name: 'Birla White Wall Seal Primer (1 Bag 30kg)', price: 755, qty: 1, unit: 'bag', checked: true },
      { name: 'Commercial Grade Marine Ply (19mm Half Sheet)', price: 1450, qty: 1, unit: 'sheet', checked: true },
      { name: 'Ebco Soft-Close Cabinet Hinges (2 Pairs)', price: 480, qty: 1, unit: 'pack', checked: true }
    ];
  }

  const fallbackScope = {
    type,
    trades,
    duration,
    confidence: 96.8,
    laborCost: labor,
    technicalNotes: notes,
    boq,
    engine: 'GharSetu Parametric Engine v4.0 (CPWD Benchmarks)'
  };

  applyScopeData(fallbackScope, input, city);
}

function renderBoQ() {
  const list = document.getElementById('resMaterialsList');
  if (!list) return;
  let html = '', materialTotal = 0;
  currentBoQ.forEach((item, i) => {
    const itemTotal = item.price * (item.qty || 1);
    if (item.checked) materialTotal += itemTotal;
    html += `
      <li>
        <label class="boq-item-label">
          <input type="checkbox" class="boq-checkbox" ${item.checked ? 'checked' : ''} onchange="toggleBoQItem(${i})">
          <span>${item.name} ${item.qty ? '(' + item.qty + ' ' + (item.unit || '') + ')' : ''}</span>
        </label>
        <span class="item-price">Rs.${itemTotal.toLocaleString('en-IN')}</span>
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
    showToast('Select at least one item from the BoQ', '⚠️');
    return;
  }
  selected.forEach(item => cartItems.push({ name: item.name, price: item.price, qty: item.qty || 1 }));
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();
  showToast(`Pushed ${selected.length} items to Job Cart!`, '📦');
}

function copyProjectSummary() {
  const trades = document.getElementById('resTrades')?.innerText || '--';
  const duration = document.getElementById('resDuration')?.innerText || '--';
  const total = document.getElementById('resCost')?.innerText || 'Rs.0';
  const text = `GharSetu Verified Scope\nTrades: ${trades}\nDuration: ${duration}\nTotal: ${total}\nSource: GharSetu AI Engine v4.0`;
  navigator.clipboard.writeText(text).then(() => showToast('Scope copied to clipboard!', '📋'));
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
    document.getElementById('dashEmailCity').innerText = `${authUser.email} • ${authUser.city || 'Mumbai'} (Depot Tier 1)`;
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

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Syncing with Regional Depot Hub... 🚚</div>';

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
        <div style="font-size:2.2rem;margin-bottom:.5rem;">📦</div>
        <div style="font-weight:700;color:var(--text-main);">No dispatches allocated yet</div>
        <p style="font-size:.85rem;margin-top:.3rem;">Add materials from the BoQ or B2B store and complete checkout.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = orders.map(ord => {
    const itemsText = (ord.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ');
    const dateStr = new Date(ord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div style="background:var(--surface-elevated,#fafafa);border:1px solid var(--border-subtle);border-radius:14px;padding:1.2rem;transition:.2s;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;">
          <div style="display:flex;align-items:center;gap:.6rem;">
            <span style="font-weight:800;color:var(--terracotta);font-size:.95rem;">${ord.id}</span>
            <span style="font-size:.75rem;background:#ECFDF5;color:#10B981;font-weight:700;padding:.2rem .6rem;border-radius:12px;">● Depot Allocated</span>
          </div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--text-main);">Rs.${(ord.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <p style="font-size:.85rem;color:var(--text-main);font-weight:600;margin-bottom:.4rem;">${itemsText || 'General construction supplies'}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:var(--text-muted);border-top:1px dashed var(--border-subtle);padding-top:.6rem;">
          <span>📅 Placed: ${dateStr}</span>
          <span>📍 Hub: ${ord.city || 'Mumbai'} (Dispatch: 48h)</span>
        </div>
      </div>
    `;
  }).join('');
}

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
  showToast('Item removed from cart', '🗑');
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
        Your procurement cart is empty<br><span style="font-size:2.5rem;display:inline-block;margin-top:.5rem;">🧱</span>
      </p>
    `;
    totalDisplay.innerText = 'Rs.0';
    return;
  }

  let html = '', total = 0;
  cartItems.forEach((item, idx) => {
    total += item.price;
    html += `
      <div class="cart-item">
        <div>
          <h5>${item.name}</h5>
          <p>Rs.${item.price.toLocaleString('en-IN')}</p>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">Remove</button>
      </div>
    `;
  });

  listEl.innerHTML = html;
  totalDisplay.innerText = 'Rs.' + total.toLocaleString('en-IN');
}

async function checkoutCart(event) {
  if (!cartItems.length) {
    showToast('Add items to cart first', '⚠️');
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.innerText = 'Allocating Depot Hub...';

  const contactName = authUser ? authUser.name : 'Verified Contractor';
  const city = (authUser && authUser.city) || (document.getElementById('userCity')?.value) || 'Mumbai';
  const total = cartItems.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);

  // Create persistent order object
  const newOrder = {
    id: 'GS-' + Math.floor(100000 + Math.random() * 900000),
    status: 'depot_allocated',
    items: [...cartItems],
    total,
    contact_name: contactName,
    city,
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems,
        contactName,
        city,
        notes: 'Placed via GharSetu Web Platform'
      })
    });
    const data = await res.json();
    if (data.success && data.order) {
      newOrder.id = data.order.id;
    }
  } catch (err) {
    console.warn('Backend offline; storing order locally in localStorage', err);
  }

  // Persist locally in localStorage
  const existingOrders = JSON.parse(localStorage.getItem('gharsetu_orders') || '[]');
  existingOrders.unshift(newOrder);
  localStorage.setItem('gharsetu_orders', JSON.stringify(existingOrders));

  showToast(`${newOrder.id} allocated to nearest regional depot! 🚚`, '✓');
  cartItems = [];
  localStorage.setItem('gharsetu_cart', JSON.stringify(cartItems));
  updateCartCounter();

  btn.disabled = false;
  btn.innerText = 'Proceed to B2B Dispatch 🚚';
  setTimeout(() => toggleCart(false), 800);
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
  if (title) title.textContent = isLogin ? 'Contractor Login' : 'Create Account';
  if (sub) sub.textContent = isLogin ? 'Access your GharSetu dashboard' : 'Join verified contractors on GharSetu';
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
    <div style="font-weight:700;margin-bottom:.4rem;padding-bottom:.4rem;border-bottom:1px solid var(--border,#eee);">👷 ${authUser.name}</div>
    <div style="font-size:.82rem;color:var(--text-muted,#888);margin-bottom:.3rem;">📧 ${authUser.email}</div>
    <div style="font-size:.82rem;color:var(--text-muted,#888);margin-bottom:.8rem;">🏙️ ${authUser.city || 'Not set'}</div>
    <button onclick="document.getElementById('contractorMenu').remove();openDashboardModal();" style="width:100%;padding:.6rem;background:#E25822;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.85rem;margin-bottom:.5rem;">📋 View Hub Dispatches</button>
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
    btn.innerHTML = 'Contractor Login';
    btn.style = '';
    btn.onclick = e => { e.preventDefault(); openAuthModal(); };
  }
  const mobileLink = document.getElementById('mobileAuthLink');
  if (mobileLink) {
    mobileLink.innerHTML = 'Contractor Login';
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
