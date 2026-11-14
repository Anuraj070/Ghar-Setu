require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gharsetu-secure-secret-2026';

// Supabase (optional)
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
} catch(e) { console.error('Supabase init error:', e.message); }

// In-memory fallback
let _orders = [];
let _contractors = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false });
const scopeLimiter  = rateLimit({ windowMs: 60*1000, max: 30 });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 15 });
app.use(globalLimiter);

// Auth middleware
function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'Authentication required' });
  try { req.contractor = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch(e) { return res.status(401).json({ success:false, message:'Invalid or expired token' }); }
}

// Verified Indian Wholesale Products Catalog
const PRODUCTS = [
  { id:'prod-001', name:'Ambuja Portland Cement', meta:'50kg Bag • Grade 53 • Verified Depot', price:380, originalPrice:450, discount:15, category:'cement', stock:240, unit:'bag', tags:['cement','grade53','portland','ambuja'] },
  { id:'prod-002', name:'Astral CPVC Pipes (Heavy Duty)', meta:'3m Length • 1-inch • Plumbing Grade', price:420, originalPrice:510, discount:18, category:'plumbing', stock:180, unit:'piece', tags:['cpvc','pipe','plumbing','astral'] },
  { id:'prod-003', name:'Asian Paints Tractor Emulsion', meta:'20L Bucket • Matte White Finish', price:2850, originalPrice:3240, discount:12, category:'paint', stock:90, unit:'bucket', tags:['paint','emulsion','asian paints'] },
  { id:'prod-004', name:'Polycab FR Wire 1.5 sq mm', meta:'90m Coil • Fire Retardant • ISI Marked', price:1580, originalPrice:1750, discount:10, category:'electrical', stock:120, unit:'coil', tags:['wire','electrical','fr','polycab'] },
  { id:'prod-005', name:'Ebco Soft-Close Cabinet Hinges', meta:'Pack of 4 Pairs • Concealed Mount', price:960, originalPrice:1200, discount:20, category:'hardware', stock:300, unit:'pack', tags:['hinge','cabinet','hardware','ebco'] },
  { id:'prod-006', name:'Birla White Wall Seal Primer', meta:'1 Bag (30kg) • Interior/Exterior', price:755, originalPrice:820, discount:8, category:'paint', stock:150, unit:'bag', tags:['primer','paint','wall','birla'] },
  { id:'prod-007', name:'UltraTech Super Cement', meta:'50kg Bag • Grade 53 PPC/OPC', price:395, originalPrice:455, discount:13, category:'cement', stock:320, unit:'bag', tags:['cement','ultratech','ppc'] },
  { id:'prod-008', name:'Finolex CPVC Ball Valve', meta:'1-inch • Heavy Duty Brass Core', price:280, originalPrice:340, discount:18, category:'plumbing', stock:200, unit:'piece', tags:['valve','cpvc','finolex'] },
  { id:'prod-009', name:'Dr. Fixit Damp Shield Elasto', meta:'4kg Bucket • Polymer Waterproofing', price:1450, originalPrice:1720, discount:16, category:'paint', stock:110, unit:'bucket', tags:['waterproofing','seepage','dr fixit','primer'] },
  { id:'prod-010', name:'Schneider Electric 16A MCB', meta:'Single Pole • C-Curve Industrial Grade', price:220, originalPrice:275, discount:20, category:'electrical', stock:160, unit:'piece', tags:['mcb','switch','electrical','schneider'] }
];

// Fallback Parametric Construction Rules (Indian Standards / CPWD baseline)
const EXPANDED_RULES = {
  waterproofing: {
    keywords: ['seep', 'damp', 'leakage', 'waterproof', 'moisture', 'fungus', 'terrace', 'crack'],
    trades: '1 Waterproofing Specialist, 1 Mason',
    duration: '2-3 Days (Curing Required)',
    laborCost: 3600,
    confidence: 97.4,
    technicalNotes: ['Surface must be wire-brushed and moisture-tested (<12%) before polymer coating', 'Allow 24-hr curing between coats'],
    boq: [
      { name: 'Dr. Fixit Damp Shield Elasto (4kg)', price: 1450, unit: 'bucket', qty: 2 },
      { name: 'Dr. Fixit Super Latex SBR Waterproofing Bonding (5L)', price: 1650, unit: 'can', qty: 1 },
      { name: 'Birla White Wall Putty Waterproof (30kg)', price: 920, unit: 'bag', qty: 1 },
      { name: 'Glass Fiber Mesh Tape (50m)', price: 340, unit: 'roll', qty: 1 }
    ]
  },
  plumbing: {
    keywords: ['leak', 'pipe', 'tap', 'plumb', 'cpvc', 'drain', 'sink', 'toilet', 'bathroom', 'geyser', 'valve'],
    trades: '1 Master Plumber, 1 Assistant',
    duration: '1 Day (4-6 hrs)',
    laborCost: 1600,
    confidence: 96.8,
    technicalNotes: ['Pressure test joint connections at 10 bar before sealing chases', 'Ensure Teflon wrapping on all male threads'],
    boq: [
      { name: 'Astral CPVC Heavy Duty Pipe (1-inch, 2x3m)', price: 840, unit: 'set', qty: 1 },
      { name: 'Brass Concealed Stop Cock Valve (Finolex)', price: 650, unit: 'piece', qty: 1 },
      { name: 'Teflon Tape + Heavy Duty Solvent Cement', price: 180, unit: 'kit', qty: 1 },
      { name: 'Jaquar/Cera Compatible Basin Mixer Tap', price: 1250, unit: 'piece', qty: 1 }
    ]
  },
  electrical: {
    keywords: ['wire', 'electr', 'switch', 'mcb', 'circuit', 'board', 'socket', 'wiring', 'light', 'fan', 'ac point'],
    trades: '2 Certified Electricians',
    duration: '2 Days (14 hrs)',
    laborCost: 3500,
    confidence: 97.5,
    technicalNotes: ['Isolate main breaker before conduit tracing', 'Conform to IS:732 Indian wiring standards'],
    boq: [
      { name: 'Polycab 1.5 sq mm FR Wire (2 Coils, 90m each)', price: 3160, unit: 'coil', qty: 2 },
      { name: 'Modular 8-Module Switch Plates & Switches', price: 1850, unit: 'set', qty: 1 },
      { name: 'Schneider 16A C-Curve Single Pole MCB', price: 660, unit: 'set', qty: 1 },
      { name: 'Heavy Duty PVC Conduit Pipes & Junctions', price: 950, unit: 'set', qty: 1 }
    ]
  },
  painting: {
    keywords: ['paint', 'primer', 'repaint', 'wall', 'colour', 'color', 'emulsion', 'putty', 'ceiling'],
    trades: '2 Professional Painters',
    duration: '2-3 Days',
    laborCost: 3800,
    confidence: 98.2,
    technicalNotes: ['Apply 2 coats of Birla White Putty followed by 1 coat primer & 2 coats emulsion', 'Light sand between coats using 220-grit paper'],
    boq: [
      { name: 'Asian Paints Royale Luxury Emulsion (10L)', price: 3850, unit: 'bucket', qty: 1 },
      { name: 'Birla White Wall Seal Primer (1 Bag 30kg)', price: 755, unit: 'bag', qty: 1 },
      { name: 'JK / Birla Acrylic Wall Putty (20kg)', price: 620, unit: 'bag', qty: 1 },
      { name: 'Masking Tape + Microfiber Roller & Tray Kit', price: 340, unit: 'kit', qty: 1 }
    ]
  },
  carpentry: {
    keywords: ['cabinet', 'door', 'wood', 'ply', 'carpenter', 'shelf', 'cupboard', 'hinge', 'wardrobe', 'lock'],
    trades: '1 Master Carpenter, 1 Assistant',
    duration: '2 Days',
    laborCost: 2800,
    confidence: 95.8,
    technicalNotes: ['Ensure calibrated marine plywood (IS:710) for kitchen/bathroom proximity', 'Use soft-close concealed hinges with 35mm bore'],
    boq: [
      { name: 'Greenply / Century Marine Grade Ply (19mm, 8x4 sheet)', price: 2150, unit: 'sheet', qty: 1 },
      { name: 'Ebco Soft-Close Hydraulic Hinges (4 Pairs)', price: 960, unit: 'pack', qty: 1 },
      { name: 'Fevicol SH Synthetic Resin Adhesive (2kg)', price: 440, unit: 'can', qty: 1 },
      { name: 'Stainless Steel Screws & Anchor Fixings Pack', price: 220, unit: 'kit', qty: 1 }
    ]
  },
  general: {
    keywords: [],
    trades: '1 General Contractor, 2 Multi-Skilled Artisans',
    duration: '3-4 Days',
    laborCost: 5200,
    confidence: 93.5,
    technicalNotes: ['Multi-disciplinary civil & interior scope', 'Daily milestone sign-off recommended'],
    boq: [
      { name: 'Asian Paints Tractor Emulsion (10L)', price: 1650, unit: 'bucket', qty: 1 },
      { name: 'Birla White Wall Seal Primer (30kg)', price: 755, unit: 'bag', qty: 1 },
      { name: 'Commercial Grade Marine Plywood (19mm)', price: 1850, unit: 'sheet', qty: 1 },
      { name: 'Fasteners, Sealants & Minor Hardware Kit', price: 650, unit: 'kit', qty: 1 }
    ]
  }
};

// ── Real Gemini AI Scoping Engine ─────────────────────────────────────────────
async function generateScopeWithGemini(description, city) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const location = city || 'Mumbai, Maharashtra';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemInstruction = `You are GharSetu AI, India's leading civil engineering estimator and quantity surveyor.
You evaluate home renovation, interior repair, and civil construction requirements according to CPWD (Central Public Works Department) norms and Indian Standards (IS codes).
Context: Indian residential property in ${location}.
Your task: Take the natural language scope, estimate required Indian skilled trades, timeline, labor charges (INR), and generate an accurate Bill of Quantities (BoQ) with real Indian brand materials (e.g., Ambuja, UltraTech, Astral, Finolex, Asian Paints, Berger, Dr. Fixit, Polycab, Havells, Ebco).

Return ONLY valid JSON matching this schema exactly:
{
  "type": "string (Specific Category, e.g. 'Balcony Waterproofing & Tiling')",
  "trades": "string (e.g. '1 Master Plumber, 1 Tile Mason')",
  "duration": "string (e.g. '2-3 Days (16 hrs)')",
  "confidence": number (between 94.0 and 99.2),
  "laborCost": number (realistic labor cost in INR based on standard daily artisan rates),
  "technicalNotes": ["string (2-3 practical construction risks/recommendations)"],
  "boq": [
    {
      "name": "string (Specific Indian brand, grade, and size)",
      "qty": number,
      "unit": "string (e.g. bag, bucket, coil, sheet, piece, kit)",
      "price": number (realistic wholesale/depot price in INR per unit)
    }
  ]
}`;

  try {
    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: `Renovation Request: "${description}"` }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.15
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn('Gemini API call failed status:', response.status);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    if (!parsed.boq || !Array.isArray(parsed.boq) || parsed.boq.length === 0) return null;

    return parsed;
  } catch(err) {
    console.error('Gemini integration error:', err.message);
    return null;
  }
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GharSetu API Core',
    version: '4.0.0',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    db: supabase ? 'supabase' : 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// ── Auth Endpoints ────────────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, phone, city, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success:false, message:'Name, email and password required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success:false, message:'Password must be 6+ characters' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const c = { id: uuidv4(), name, email: email.toLowerCase(), phone: phone||'', city: city||'Mumbai', password_hash: hash, created_at: new Date().toISOString() };
    if (supabase) {
      const { data: ex } = await supabase.from('contractors').select('id').eq('email', c.email).single();
      if (ex) return res.status(409).json({ success:false, message:'Email already registered' });
      const { error } = await supabase.from('contractors').insert([c]);
      if (error) throw error;
    } else {
      if (_contractors.find(x => x.email === c.email)) return res.status(409).json({ success:false, message:'Email already registered' });
      _contractors.push(c);
    }
    const token = jwt.sign({ id: c.id, name: c.name, email: c.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success:true, message:'Registered on GharSetu successfully!', token, contractor:{ id: c.id, name: c.name, email: c.email, city: c.city } });
  } catch(e) {
    res.status(500).json({ success:false, message:'Registration failed', error: e.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success:false, message:'Email and password required' });
  try {
    let c;
    if (supabase) {
      const { data, error } = await supabase.from('contractors').select('*').eq('email', email.toLowerCase()).single();
      if (error || !data) return res.status(401).json({ success:false, message:'Invalid credentials' });
      c = data;
    } else {
      c = _contractors.find(x => x.email === email.toLowerCase());
      if (!c) return res.status(401).json({ success:false, message:'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, c.password_hash);
    if (!valid) return res.status(401).json({ success:false, message:'Invalid credentials' });
    const token = jwt.sign({ id: c.id, name: c.name, email: c.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success:true, message:'Welcome back to GharSetu!', token, contractor:{ id: c.id, name: c.name, email: c.email, city: c.city } });
  } catch(e) {
    res.status(500).json({ success:false, message:'Login failed', error: e.message });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => res.json({ success:true, contractor: req.contractor }));

// ── Products API ──────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  let p = [...PRODUCTS];
  const { category, search, sort } = req.query;
  if (category && category !== 'all') p = p.filter(x => x.category === category);
  if (search) {
    const q = search.toLowerCase();
    p = p.filter(x => x.name.toLowerCase().includes(q) || x.tags.some(t => t.includes(q)));
  }
  if (sort === 'price_asc') p.sort((a,b) => a.price - b.price);
  if (sort === 'price_desc') p.sort((a,b) => b.price - a.price);
  if (sort === 'discount') p.sort((a,b) => b.discount - a.discount);
  res.json({ success:true, count: p.length, products: p });
});

app.get('/api/products/meta/categories', (req, res) => {
  const cats = [...new Set(PRODUCTS.map(p => p.category))];
  const counts = {};
  cats.forEach(c => { counts[c] = PRODUCTS.filter(p => p.category === c).length; });
  res.json({ success:true, categories: cats, counts });
});

app.get('/api/products/:id', (req, res) => {
  const p = PRODUCTS.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ success:false, message:'Product not found' });
  res.json({ success:true, product: p });
});

// ── Scope & BoQ Generator ─────────────────────────────────────────────────────
app.post('/api/scope/generate', scopeLimiter, async (req, res) => {
  const { description, city } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ success:false, message:'Description required' });
  }

  const promptText = description.trim();
  const lower = promptText.toLowerCase();

  // Try real Gemini AI first
  let aiScope = await generateScopeWithGemini(promptText, city);
  let usedEngine = 'GharSetu Neural Engine (Gemini 2.5 Flash)';

  // Fallback to high-fidelity parametric rules if Gemini is offline
  if (!aiScope) {
    usedEngine = 'GharSetu Parametric Engine v4.0 (CPWD Benchmarks)';
    let matched = { type: 'general', ...EXPANDED_RULES.general };
    for (const [type, rule] of Object.entries(EXPANDED_RULES)) {
      if (type === 'general') continue;
      if (rule.keywords.some(kw => lower.includes(kw))) {
        matched = { type, ...rule };
        break;
      }
    }
    aiScope = matched;
  }

  const boqItems = aiScope.boq.map((item, i) => ({
    id: 'boq-' + (i + 1),
    name: item.name,
    qty: item.qty || 1,
    unit: item.unit || 'unit',
    price: Number(item.price) || 500,
    checked: true
  }));

  const materialTotal = boqItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const laborCost = Number(aiScope.laborCost) || 2500;
  const grandTotal = materialTotal + laborCost;

  res.json({
    success: true,
    input: promptText,
    city: city || 'Mumbai (West)',
    scope: {
      type: aiScope.type || 'Custom Renovation',
      trades: aiScope.trades || '1 General Contractor, 1 Artisan',
      duration: aiScope.duration || '2-3 Days',
      confidence: Number(aiScope.confidence) || 96.5,
      laborCost,
      materialCost: materialTotal,
      grandTotal,
      technicalNotes: aiScope.technicalNotes || [
        'Adhere to IS:456 concrete and masonry tolerances',
        'Verify moisture and plumbing line pressure before final seal'
      ],
      boq: boqItems,
      generatedAt: new Date().toISOString(),
      engine: usedEngine
    }
  });
});

// ── Orders API ────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  const { items, contactName, contactPhone, city, notes } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success:false, message:'Cart is empty' });
  }
  const total = items.reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
  const order = {
    id: 'GS-' + uuidv4().split('-')[0].toUpperCase(),
    status: 'depot_allocated',
    items,
    total,
    contact_name: contactName || 'Contractor / Homeowner',
    contact_phone: contactPhone || '9876543210',
    city: city || 'Mumbai',
    notes: notes || 'Dispatched via GharSetu Authorized Depot Hub',
    created_at: new Date().toISOString(),
    estimated_dispatch: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  };

  try {
    if (supabase) {
      const { error } = await supabase.from('orders').insert([order]);
      if (error) throw error;
    } else {
      _orders.push(order);
    }
    res.status(201).json({
      success: true,
      message: `Order ${order.id} allocated to nearest regional depot!`,
      order
    });
  } catch(e) {
    res.status(500).json({ success:false, message:'Order allocation failed', error: e.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success:true, count: data.length, orders: data });
    }
    res.json({ success:true, count: _orders.length, orders: _orders });
  } catch(e) {
    res.status(500).json({ success:false, message:'Failed to fetch orders' });
  }
});

// ── Fallback Route ────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  GharSetu Core Server v4.0`);
    console.log(`  Online at: http://localhost:${PORT}`);
    console.log(`  Gemini AI: ${process.env.GEMINI_API_KEY ? 'ENABLED' : 'OFFLINE (Fallback Active)'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
