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
const JWT_SECRET = process.env.JWT_SECRET || 'buildiq-dev-secret';

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
const globalLimiter = rateLimit({ windowMs:15*60*1000, max:200, standardHeaders:true, legacyHeaders:false });
const scopeLimiter  = rateLimit({ windowMs:60*1000, max:20 });
const authLimiter   = rateLimit({ windowMs:15*60*1000, max:10 });
app.use(globalLimiter);

// Auth middleware
function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'Authentication required' });
  try { req.contractor = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch(e) { return res.status(401).json({ success:false, message:'Invalid or expired token' }); }
}

// Products
const PRODUCTS = [
  { id:'prod-001', name:'Ambuja Portland Cement', meta:'50kg Bag - Grade 53', price:380, originalPrice:450, discount:15, category:'cement', stock:240, unit:'bag', tags:['cement','grade53','portland'] },
  { id:'prod-002', name:'Astral CPVC Pipes (Heavy Duty)', meta:'3m Length - 1-inch', price:420, originalPrice:510, discount:18, category:'plumbing', stock:180, unit:'piece', tags:['cpvc','pipe','plumbing'] },
  { id:'prod-003', name:'Asian Paints Tractor Emulsion', meta:'20L Bucket - Matte White', price:2850, originalPrice:3240, discount:12, category:'paint', stock:90, unit:'bucket', tags:['paint','emulsion'] },
  { id:'prod-004', name:'Polycab FR Wire 1.5 sq mm', meta:'90m Coil - Fire Retardant', price:1580, originalPrice:1750, discount:10, category:'electrical', stock:120, unit:'coil', tags:['wire','electrical','fr'] },
  { id:'prod-005', name:'Ebco Soft-Close Cabinet Hinges', meta:'Pack of 4 Pairs', price:960, originalPrice:1200, discount:20, category:'hardware', stock:300, unit:'pack', tags:['hinge','cabinet'] },
  { id:'prod-006', name:'Birla White Wall Seal Primer', meta:'1 Bag 30kg', price:755, originalPrice:820, discount:8, category:'paint', stock:150, unit:'bag', tags:['primer','paint','wall'] },
  { id:'prod-007', name:'UltraTech PPC Cement', meta:'50kg Bag - Grade 43', price:365, originalPrice:420, discount:13, category:'cement', stock:320, unit:'bag', tags:['cement','ppc'] },
  { id:'prod-008', name:'Finolex CPVC Ball Valve', meta:'1-inch - ISI Marked', price:280, originalPrice:340, discount:18, category:'plumbing', stock:200, unit:'piece', tags:['valve','cpvc'] }
];

const SCOPE_RULES = {
  plumbing:   { keywords:['leak','pipe','tap','plumb','cpvc','drain','sink','toilet','bathroom'], trades:'1 Master Plumber', duration:'1 Day (3-5 hrs)', laborCost:1200, confidence:96.4, boq:[{name:'Astral CPVC Pipe (1-inch, 2x3m)',price:840,unit:'set'},{name:'Brass Stop Cock Valve',price:650,unit:'piece'},{name:'Teflon Tape + Solvent Cement',price:180,unit:'kit'},{name:'Chrome Basin Mixer Tap',price:1150,unit:'piece'}] },
  electrical: { keywords:['wire','electr','switch','mcb','circuit','board','socket','wiring'], trades:'2 Certified Electricians', duration:'2 Days', laborCost:3500, confidence:97.8, boq:[{name:'Polycab 1.5 sq mm FR Wire (2 Coils)',price:3200,unit:'coil'},{name:'Modular Switch Plates (4 Units)',price:1800,unit:'set'},{name:'Schneider 16A MCB',price:650,unit:'piece'},{name:'PVC Conduit Pipes',price:950,unit:'set'}] },
  painting:   { keywords:['paint','primer','repaint','wall','colour','color','emulsion'], trades:'1-2 Painters', duration:'1-2 Days', laborCost:3200, confidence:98.1, boq:[{name:'Asian Paints Royale Emulsion (10L)',price:3850,unit:'bucket'},{name:'Birla White Primer (1 Bag)',price:820,unit:'bag'},{name:'Putty + Sandpaper Set',price:420,unit:'kit'},{name:'Masking Tape + Roller Kit',price:280,unit:'kit'}] },
  carpentry:  { keywords:['cabinet','door','wood','ply','carpenter','shelf','cupboard','hinge'], trades:'1 Carpenter', duration:'1-2 Days', laborCost:2400, confidence:95.2, boq:[{name:'Marine Ply (19mm)',price:1100,unit:'sheet'},{name:'Ebco Soft-Close Hinges (2 Pairs)',price:480,unit:'pack'},{name:'Wood Screws + Anchor Kit',price:180,unit:'kit'},{name:'PU Wood Primer + Hardener',price:650,unit:'set'}] },
  general:    { keywords:[], trades:'1 Painter, 1 Carpenter', duration:'2-3 Days', laborCost:5500, confidence:92.0, boq:[{name:'Asian Paints Royale Emulsion (10L)',price:3850,unit:'bucket'},{name:'Birla White Primer (1 Bag)',price:820,unit:'bag'},{name:'Marine Ply (19mm)',price:1100,unit:'sheet'},{name:'Ebco Cabinet Hinges (2 Pairs)',price:480,unit:'pack'}] }
};

// Health
app.get('/api/health', (req,res) => res.json({ status:'ok', service:'Build-IQ API', version:'3.0.0', db:supabase?'supabase':'in-memory', timestamp:new Date().toISOString() }));

// Auth
app.post('/api/auth/register', authLimiter, async (req,res) => {
  const { name, email, phone, city, password } = req.body;
  if (!name||!email||!password) return res.status(400).json({ success:false, message:'Name, email and password required' });
  if (password.length < 6) return res.status(400).json({ success:false, message:'Password must be 6+ characters' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const c = { id:uuidv4(), name, email:email.toLowerCase(), phone:phone||'', city:city||'', password_hash:hash, created_at:new Date().toISOString() };
    if (supabase) {
      const {data:ex} = await supabase.from('contractors').select('id').eq('email',c.email).single();
      if (ex) return res.status(409).json({ success:false, message:'Email already registered' });
      const {error} = await supabase.from('contractors').insert([c]);
      if (error) throw error;
    } else {
      if (_contractors.find(x=>x.email===c.email)) return res.status(409).json({ success:false, message:'Email already registered' });
      _contractors.push(c);
    }
    const token = jwt.sign({ id:c.id, name:c.name, email:c.email }, JWT_SECRET, { expiresIn:'7d' });
    res.status(201).json({ success:true, message:'Registered successfully!', token, contractor:{ id:c.id, name:c.name, email:c.email, city:c.city }});
  } catch(e) { res.status(500).json({ success:false, message:'Registration failed', error:e.message }); }
});

app.post('/api/auth/login', authLimiter, async (req,res) => {
  const { email, password } = req.body;
  if (!email||!password) return res.status(400).json({ success:false, message:'Email and password required' });
  try {
    let c;
    if (supabase) {
      const {data,error} = await supabase.from('contractors').select('*').eq('email',email.toLowerCase()).single();
      if (error||!data) return res.status(401).json({ success:false, message:'Invalid credentials' });
      c = data;
    } else {
      c = _contractors.find(x=>x.email===email.toLowerCase());
      if (!c) return res.status(401).json({ success:false, message:'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, c.password_hash);
    if (!valid) return res.status(401).json({ success:false, message:'Invalid credentials' });
    const token = jwt.sign({ id:c.id, name:c.name, email:c.email }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ success:true, message:'Login successful!', token, contractor:{ id:c.id, name:c.name, email:c.email, city:c.city }});
  } catch(e) { res.status(500).json({ success:false, message:'Login failed', error:e.message }); }
});

app.get('/api/auth/me', authRequired, (req,res) => res.json({ success:true, contractor:req.contractor }));

// Products
app.get('/api/products', (req,res) => {
  let p = [...PRODUCTS];
  const { category, search, sort } = req.query;
  if (category && category!=='all') p=p.filter(x=>x.category===category);
  if (search) { const q=search.toLowerCase(); p=p.filter(x=>x.name.toLowerCase().includes(q)||x.tags.some(t=>t.includes(q))); }
  if (sort==='price_asc') p.sort((a,b)=>a.price-b.price);
  if (sort==='price_desc') p.sort((a,b)=>b.price-a.price);
  if (sort==='discount') p.sort((a,b)=>b.discount-a.discount);
  res.json({ success:true, count:p.length, products:p });
});
app.get('/api/products/meta/categories', (req,res) => {
  const cats=[...new Set(PRODUCTS.map(p=>p.category))];
  const counts={}; cats.forEach(c=>{counts[c]=PRODUCTS.filter(p=>p.category===c).length;});
  res.json({ success:true, categories:cats, counts });
});
app.get('/api/products/:id', (req,res) => {
  const p=PRODUCTS.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, product:p });
});

// Scope
app.post('/api/scope/generate', scopeLimiter, (req,res) => {
  const { description } = req.body;
  if (!description||!description.trim()) return res.status(400).json({ success:false, message:'Description required' });
  const lower=description.toLowerCase();
  let scope={ type:'general', ...SCOPE_RULES.general };
  for (const [type,rule] of Object.entries(SCOPE_RULES)) {
    if (type==='general') continue;
    if (rule.keywords.some(kw=>lower.includes(kw))) { scope={type,...rule}; break; }
  }
  const mat=scope.boq.reduce((s,i)=>s+i.price,0);
  res.json({ success:true, input:description, scope:{ type:scope.type, trades:scope.trades, duration:scope.duration, confidence:scope.confidence, laborCost:scope.laborCost, materialCost:mat, grandTotal:scope.laborCost+mat, boq:scope.boq.map((item,i)=>({id:'boq-'+(i+1),...item,checked:true})), generatedAt:new Date().toISOString(), engine:'Build-IQ AI Engine v3.0' }});
});

// Orders
app.post('/api/orders', async (req,res) => {
  const { items, contactName, contactPhone, city, notes } = req.body;
  if (!items||!Array.isArray(items)||items.length===0) return res.status(400).json({ success:false, message:'Cart is empty' });
  const total=items.reduce((s,i)=>s+(i.price*(i.qty||1)),0);
  const order={ id:'ORD-'+uuidv4().split('-')[0].toUpperCase(), status:'confirmed', items, total, contact_name:contactName||'Anonymous', contact_phone:contactPhone||'', city:city||'Not specified', notes:notes||'', created_at:new Date().toISOString(), estimated_dispatch:new Date(Date.now()+2*24*60*60*1000).toISOString() };
  try {
    if (supabase) { const {error}=await supabase.from('orders').insert([order]); if(error) throw error; }
    else { _orders.push(order); }
    res.status(201).json({ success:true, message:'Order '+order.id+' confirmed!', order });
  } catch(e) { res.status(500).json({ success:false, message:'Order failed', error:e.message }); }
});
app.get('/api/orders', async (req,res) => {
  try {
    if (supabase) { const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false}); if(error) throw error; return res.json({success:true,count:data.length,orders:data}); }
    res.json({ success:true, count:_orders.length, orders:_orders });
  } catch(e) { res.status(500).json({ success:false, message:'Failed' }); }
});

// Frontend
app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log('Build-IQ running at http://localhost:' + PORT));
}

module.exports = app;
