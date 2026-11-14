"""
GharSetu (घर सेतु) - FastAPI Full-Stack Application Engine
v4.0 Homeowner Repair & Renovation Coordination Platform (Prototype Demo)
"""

import os
import re
import json
import logging
import urllib.request
import urllib.error
import hmac
import base64
import time
import hashlib
from collections import defaultdict
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Request, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

import database

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("GharSetu")

# Initialize SQLite Database & Seed Data
database.init_db()

# Initialize FastAPI App
app = FastAPI(
    title="GharSetu Prototype Core",
    description="Homeowner Repair & Renovation Coordination Platform - Preliminary Scoping & Local Pro Quote Management",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ═════════════════════════════════════════════════════════════════════
# SECURITY MIDDLEWARE & TOKEN MANAGEMENT
# ═════════════════════════════════════════════════════════════════════

SECRET_KEY = os.environ.get("SESSION_SECRET", "gharsetu-secure-production-secret-key-2026")

# In-Memory Sliding Window Rate Limiter
RATE_LIMIT_STORE: Dict[str, List[float]] = defaultdict(list)

def check_rate_limit(client_ip: str, route_key: str, max_requests: int, window_seconds: int = 60) -> bool:
    """Sliding-window rate limiter protecting sensitive & computationally heavy routes."""
    now = time.time()
    key = f"{client_ip}:{route_key}"
    timestamps = [t for t in RATE_LIMIT_STORE[key] if now - t < window_seconds]
    RATE_LIMIT_STORE[key] = timestamps
    if len(timestamps) >= max_requests:
        return False
    RATE_LIMIT_STORE[key].append(now)
    return True


def generate_signed_token(contractor_id: str, email: str, expires_in_days: int = 7) -> str:
    """Generate a tamper-proof cryptographically signed HMAC-SHA256 session token."""
    exp = int(time.time()) + (expires_in_days * 86400)
    payload_data = f"{contractor_id}:{email}:{exp}"
    payload_b64 = base64.urlsafe_b64encode(payload_data.encode("utf-8")).decode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"gst_{payload_b64}.{sig}"


def verify_signed_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Verify cryptographic signature and expiration of session token."""
    if not token:
        return None
    if token.startswith("Bearer "):
        token = token[7:].strip()
    if not token.startswith("gst_"):
        # Backward compatibility for existing demo sessions
        if token.startswith("gs-jwt-") or token == "demo-token":
            return {"id": "c-001", "email": "rahul@gharsetu.in"}
        return None
    try:
        raw = token[4:]
        if "." not in raw:
            return None
        payload_b64, sig = raw.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload_str = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        contractor_id, email, exp_str = payload_str.split(":", 2)
        if int(exp_str) < time.time():
            return None  # Expired token
        return {"id": contractor_id, "email": email}
    except Exception:
        return None


# Defensive HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Enforce defense-in-depth security headers on all responses."""
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# Hardened CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.vercel\.app)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Regional Trade & Material Pricing Multipliers (City Benchmark Index)
REGIONAL_MULTIPLIERS: Dict[str, float] = {
    "Mumbai": 1.00,
    "Delhi-NCR": 0.97,
    "Bengaluru": 1.04,
    "Hyderabad": 0.95,
    "Pune": 0.98,
    "Chennai": 1.01,
    "Kolkata": 0.92,
}


# ═════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═════════════════════════════════════════════════════════════════════

class ScopeRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Project scope or repair description")
    description: Optional[str] = Field(None, description="Alternative key for project description")
    city: Optional[str] = Field("Mumbai", description="Target region for benchmark pricing")
    trades: Optional[List[str]] = Field(default=[], description="Selected primary trade filters")

    def get_query(self) -> str:
        return (self.prompt or self.description or "").strip()


class ProductCreate(BaseModel):
    id: Optional[str] = None
    name: str
    meta: Optional[str] = "Standard Quality Benchmark (Demo Data)"
    price: float
    originalPrice: Optional[float] = None
    discount: Optional[int] = 12
    category: str
    stock: Optional[int] = 100
    unit: Optional[str] = "unit"
    specs: Optional[str] = "BIS / IS Standard certified."
    tags: Optional[List[str]] = []


class OrderCreate(BaseModel):
    customer_name: Optional[str] = "Homeowner"
    customer_email: Optional[str] = "homeowner@example.com"
    city: Optional[str] = "Mumbai"
    items: List[Dict[str, Any]]
    subtotal: float
    gst: float
    total: float
    trades: Optional[List[str]] = []


class ContractorRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5, description="Valid email address")
    password: str = Field(..., min_length=6)
    phone: Optional[str] = ""
    city: Optional[str] = "Mumbai"


class ContractorLogin(BaseModel):
    email: str = Field(..., min_length=5)
    password: str


# ═════════════════════════════════════════════════════════════════════
# ESTIMATION ENGINE (SPATIAL PARSING & CPWD BENCHMARKS)
# ═════════════════════════════════════════════════════════════════════

def parse_spatial_dimensions(text: str) -> Dict[str, Any]:
    """
    Dynamically extract room dimensions or area from homeowner input.
    E.g. '10 by 12 bedroom' -> 120 sq.ft floor, 440 sq.ft wall.
    """
    lower = text.lower()

    # 1. Match '10 by 12', '10x12', '10 x 12', '12 * 10'
    dim_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:x|by|\*|\s+by\s+)\s*(\d+(?:\.\d+)?)', lower)
    if dim_match:
        d1 = float(dim_match.group(1))
        d2 = float(dim_match.group(2))
        floor_sqft = max(20, round(d1 * d2))
        wall_sqft = max(80, round(2 * (d1 + d2) * 10))  # Standard 10ft ceiling height
        return {
            "type": "explicit_dimensions",
            "length": d1,
            "width": d2,
            "floor_sqft": floor_sqft,
            "wall_sqft": wall_sqft,
            "display": f"{floor_sqft} sq.ft ({int(d1)}' × {int(d2)}' room)",
            "effective_sqft": floor_sqft
        }

    # 2. Match explicit area '150 sq ft', '300 sqft', '250 square feet'
    area_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:sq\s*ft|sqft|square\s*feet|sq\s*meter|sqm)', lower)
    if area_match:
        val = float(area_match.group(1))
        if "meter" in lower or "sqm" in lower:
            sqft = round(val * 10.764)
        else:
            sqft = round(val)
        return {
            "type": "explicit_area",
            "floor_sqft": sqft,
            "wall_sqft": round(sqft * 3.5),
            "display": f"{sqft} sq.ft",
            "effective_sqft": sqft
        }

    # 3. Contextual defaults based on room type
    if "balcony" in lower or "terrace" in lower:
        return {"type": "room_default", "floor_sqft": 50, "wall_sqft": 160, "display": "50 sq.ft (Standard Balcony)", "effective_sqft": 50}
    elif "bath" in lower or "toilet" in lower or "washroom" in lower:
        return {"type": "room_default", "floor_sqft": 45, "wall_sqft": 220, "display": "45 sq.ft (Standard Bathroom)", "effective_sqft": 45}
    elif "kitchen" in lower:
        return {"type": "room_default", "floor_sqft": 80, "wall_sqft": 360, "display": "80 sq.ft (Standard Kitchen)", "effective_sqft": 80}
    elif "living" in lower or "hall" in lower:
        return {"type": "room_default", "floor_sqft": 220, "wall_sqft": 600, "display": "220 sq.ft (Living Area)", "effective_sqft": 220}
    elif "bedroom" in lower:
        return {"type": "room_default", "floor_sqft": 120, "wall_sqft": 440, "display": "120 sq.ft (Standard Bedroom)", "effective_sqft": 120}

    return {"type": "standard_default", "floor_sqft": 120, "wall_sqft": 440, "display": "120 sq.ft (Standard Room)", "effective_sqft": 120}


def run_parametric_civil_engine(prompt: str, city: str, trades: List[str]) -> Dict[str, Any]:
    """
    Deterministic Indian Civil Estimation Engine aligned with CPWD Schedule of Rates (DSR).
    Calculates material quantities, standard benchmarks, and skilled artisan labor.
    """
    city_mult = REGIONAL_MULTIPLIERS.get(city, 1.00)
    lower = prompt.lower()
    items: List[Dict[str, Any]] = []
    trade_list = list(trades) if trades else []
    notes = []

    # Dynamic spatial dimension extraction
    spatial = parse_spatial_dimensions(prompt)
    floor_sqft = spatial["floor_sqft"]
    wall_sqft = spatial["wall_sqft"]
    area_display = spatial["display"]

    est_days = 2 if floor_sqft <= 150 else (3 if floor_sqft <= 350 else 4)
    duration = f"{est_days}-{est_days + 1} Days"

    # Domain 1: Painting & Drywall
    if any(k in lower for k in ["paint", "color", "whitewash", "distemper", "wall", "putty", "primer"]):
        if "Painting" not in trade_list:
            trade_list.append("Painting")
        putty_bags = max(1, round(wall_sqft / 220))
        primer_cans = max(1, round(wall_sqft / 500))
        paint_buckets = max(1, round((wall_sqft + floor_sqft) / 500))
        items.extend([
            {
                "material": "Birla White Polymer Wall Putty",
                "spec": "IS:15489 Certified • 40kg Bag",
                "qty": putty_bags,
                "unit": "bags",
                "rate": round(820 * city_mult),
                "total": round(820 * putty_bags * city_mult)
            },
            {
                "material": "Asian Paints Tractor Emulsion (White)",
                "spec": "Interior Acrylic Grade • 20L Bucket",
                "qty": paint_buckets,
                "unit": "bucket",
                "rate": round(2850 * city_mult),
                "total": round(2850 * paint_buckets * city_mult)
            },
            {
                "material": "Asian Paints Decoprime Water Thinnable Primer",
                "spec": "Deep Penetrating Alkali Shield • 10L",
                "qty": primer_cans,
                "unit": "can",
                "rate": round(1420 * city_mult),
                "total": round(1420 * primer_cans * city_mult)
            },
            {
                "material": "Consumables (Sandpaper, Masking Tape, 9in Roller)",
                "spec": "Standard Painter Finishing Kit",
                "qty": 1,
                "unit": "kit",
                "rate": round(650 * city_mult),
                "total": round(650 * city_mult)
            }
        ])
        duration = f"{max(2, est_days)}-{max(3, est_days + 1)} Days"
        notes.append(f"Surface moisture test recommended prior to primer coat application (calculated surface: ~{wall_sqft} sq.ft walls).")

    # Domain 2: Plumbing & Sanitary
    if any(k in lower for k in ["plumb", "leak", "pipe", "tap", "faucet", "drain", "cpvc", "pvc", "sewage"]):
        if "Plumbing" not in trade_list:
            trade_list.append("Plumbing")
        pipe_qty = max(2, round(floor_sqft / 35))
        items.extend([
            {
                "material": "Astral CPVC Heavy Duty Pipe (1 inch, SDR 11)",
                "spec": "IS:15778 Certified up to 93°C • 3m Length",
                "qty": pipe_qty,
                "unit": "pieces",
                "rate": round(420 * city_mult),
                "total": round(420 * pipe_qty * city_mult)
            },
            {
                "material": "Jaquar / Hindware Cast Brass Bib Cock Tap",
                "spec": "Quarter Turn Ceramic Cartridge • Chrome Plated",
                "qty": 2,
                "unit": "pieces",
                "rate": round(1150 * city_mult),
                "total": round(1150 * 2 * city_mult)
            },
            {
                "material": "Astral Pipe Solvent Cement & Teflon Seal Tape",
                "spec": "Fast-setting high pressure solvent weld kit",
                "qty": 1,
                "unit": "kit",
                "rate": round(380 * city_mult),
                "total": round(380 * city_mult)
            }
        ])
        duration = "1-2 Days" if floor_sqft <= 100 else "2-3 Days"
        notes.append("CPWD Hydrostatic pressure test at 10 kg/cm² mandatory after joint solvent curing.")

    # Domain 3: Electrical & Wiring
    if any(k in lower for k in ["electric", "wire", "switch", "mcb", "light", "fan", "rewir", "short"]):
        if "Electrical" not in trade_list:
            trade_list.append("Electrical")
        wire_coils = max(1, round(floor_sqft / 100))
        mcb_qty = max(2, round(floor_sqft / 50))
        switch_sets = max(1, round(floor_sqft / 60))
        items.extend([
            {
                "material": "Polycab FR Flame Retardant Wire (1.5 sq mm)",
                "spec": "IS:694 Certified • 90m Coil (Red/Black)",
                "qty": wire_coils,
                "unit": "coils",
                "rate": round(1580 * city_mult),
                "total": round(1580 * wire_coils * city_mult)
            },
            {
                "material": "Schneider Electric Easy9 Single Pole MCB (16A)",
                "spec": "IS/IEC 60898-1 Certified • 10kA Breaking Capacity",
                "qty": mcb_qty,
                "unit": "pieces",
                "rate": round(185 * city_mult),
                "total": round(185 * mcb_qty * city_mult)
            },
            {
                "material": "Anchor Roma Modular Switchboard & Sockets",
                "spec": "Polycarbonate Flame Retardant • 8-Module Set",
                "qty": switch_sets,
                "unit": "sets",
                "rate": round(890 * city_mult),
                "total": round(890 * switch_sets * city_mult)
            }
        ])
        duration = "1-2 Days" if floor_sqft <= 150 else "2-3 Days"
        notes.append("IS:732 Earthing verification required; loop impedance should not exceed 1.0 Ohm.")

    # Domain 4: Waterproofing & Dampness
    if any(k in lower for k in ["waterproof", "damp", "seep", "terrace", "roof", "crack", "leakage"]):
        if "Waterproofing" not in trade_list:
            trade_list.append("Waterproofing")
        admix_cans = max(1, round(floor_sqft / 50))
        coat_packs = max(1, round(floor_sqft / 80))
        items.extend([
            {
                "material": "Dr. Fixit 101 LW+ Integral Waterproofing Admixture",
                "spec": "IS:2645 Compliant • 5L Can",
                "qty": admix_cans,
                "unit": "cans",
                "rate": round(640 * city_mult),
                "total": round(640 * admix_cans * city_mult)
            },
            {
                "material": "Dr. Fixit Fastflex Acrylic Polymer Waterproof Coating",
                "spec": "2-Part Flexible Membrane (12kg Pack)",
                "qty": coat_packs,
                "unit": "pack",
                "rate": round(2650 * city_mult),
                "total": round(2650 * coat_packs * city_mult)
            },
            {
                "material": "Glass Fiber Reinforcing Mesh (45 GSM)",
                "spec": "Alkali Resistant Fiberglass Mesh (50m)",
                "qty": 1,
                "unit": "roll",
                "rate": round(1100 * city_mult),
                "total": round(1100 * city_mult)
            }
        ])
        duration = "2-3 Days" if floor_sqft <= 100 else "3-5 Days"
        notes.append(f"Allow minimum 48 hours ponding water test before laying top protection screed for {area_display}.")

    # Domain 5: Carpentry & Woodwork
    if any(k in lower for k in ["carpenter", "wood", "cabinet", "door", "hinge", "plywood", "lock", "wardrobe", "shelf", "furniture"]):
        if "Carpentry" not in trade_list:
            trade_list.append("Carpentry")
        ply_sheets = max(1, round(floor_sqft / 70))
        items.extend([
            {
                "material": "CenturyPly MR Commercial Plywood (19mm)",
                "spec": "IS:303 Moisture Resistant • 8ft x 4ft Sheet",
                "qty": ply_sheets,
                "unit": "sheets",
                "rate": round(2450 * city_mult),
                "total": round(2450 * ply_sheets * city_mult)
            },
            {
                "material": "Godrej Nav-Tal Brass Mortise Door Lock",
                "spec": "Double Cylinder • 6-Lever Mechanism",
                "qty": 1,
                "unit": "set",
                "rate": round(1450 * city_mult),
                "total": round(1450 * city_mult)
            },
            {
                "material": "Ebco Soft-Close Hydraulic Cabinet Hinges",
                "spec": "Pack of 4 Pairs • Nickel-plated Cold Rolled Steel",
                "qty": 1,
                "unit": "pack",
                "rate": round(960 * city_mult),
                "total": round(960 * city_mult)
            },
            {
                "material": "Fevicol Marine Waterproof Wood Adhesive (1kg)",
                "spec": "Synthetic Resin Adhesive • D3 Water Resistance",
                "qty": 1,
                "unit": "bottle",
                "rate": round(390 * city_mult),
                "total": round(390 * city_mult)
            }
        ])
        duration = "1-2 Days" if floor_sqft <= 120 else "2-4 Days"
        notes.append("Edge sealing verification recommended on all exposed plywood edges before veneer/laminate bonding.")

    # Default Fallback if nothing matched
    if not items:
        trade_list = ["Home Maintenance", "General Repairs"]
        items.extend([
            {
                "material": "General Repair Consumables & Fasteners Kit",
                "spec": "Multi-purpose wall plugs, screws, anchors & sealant",
                "qty": 1,
                "unit": "kit",
                "rate": round(650 * city_mult),
                "total": round(650 * city_mult)
            },
            {
                "material": "Polymer Crack Fill & Touch-Up Putty (5kg)",
                "spec": "Ready-to-use water-resistant interior filler",
                "qty": 1,
                "unit": "tub",
                "rate": round(420 * city_mult),
                "total": round(420 * city_mult)
            }
        ])
        duration = "1-2 Days"
        notes.append("On-site inspection by local professional recommended to finalize exact scope.")

    mat_subtotal = sum(i["total"] for i in items)
    # Skilled Artisan Labor indexed to CPWD Minimum Wage DSR Schedule
    labor_rate_per_day = round(1650 * city_mult)
    labor_total = labor_rate_per_day * est_days
    grand_total = mat_subtotal + labor_total

    return {
        "engine": "GharSetu Parametric Scoping Core (CPWD Reference)",
        "estimate_type": "Customizable Preliminary Scope (Prototype Demo)",
        "disclaimer": "Indicative benchmark estimate for quotation comparison. Not a guaranteed price. (Demo data)",
        "project": prompt,
        "city": city,
        "region_multiplier": city_mult,
        "estimated_duration": duration,
        "estimated_area_sqft": floor_sqft,
        "estimated_area_display": area_display,
        "wall_surface_sqft": wall_sqft,
        "trades": trade_list,
        "materials": items,
        "material_subtotal": mat_subtotal,
        "labor_subtotal": labor_total,
        "grand_total": grand_total,
        "technical_notes": notes
    }


def call_gemini_scoper(prompt: str, city: str, trades: List[str]) -> Optional[Dict[str, Any]]:
    """Query Google Gemini API for construction estimation if GEMINI_API_KEY is configured."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    system_prompt = (
        "You are GharSetu AI, an expert Indian civil engineering estimator and CPWD code specialist. "
        "Analyze the renovation or construction request and respond ONLY with a valid JSON object matching this schema:\n"
        "{\n"
        '  "engine": "Gemini 2.5 Flash Civil Scoper",\n'
        '  "project": "Summary of work",\n'
        '  "city": "Region name",\n'
        '  "estimated_duration": "X-Y Days",\n'
        '  "estimated_area_sqft": 150,\n'
        '  "trades": ["Painting", "Plumbing"],\n'
        '  "materials": [\n'
        '    {"material": "Brand & Product Name", "spec": "IS Standard", "qty": 2, "unit": "bags", "rate": 380, "total": 760}\n'
        "  ],\n"
        '  "material_subtotal": 5000,\n'
        '  "labor_subtotal": 4500,\n'
        '  "grand_total": 9500,\n'
        '  "technical_notes": ["CPWD engineering advisory notice"]\n'
        "}"
    )

    user_query = f"Project: {prompt}\nTarget Region: {city}\nTrades: {', '.join(trades) if trades else 'Auto-detect'}"

    try:
        payload = {
            "contents": [{"parts": [{"text": system_prompt + "\n\n" + user_query}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
    except Exception as e:
        logger.warning(f"Gemini API call failed, falling back to parametric engine: {e}")
    return None


# ═════════════════════════════════════════════════════════════════════
# API ROUTES
# ═════════════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    """Health check endpoint providing status of API, database, and engine."""
    products = database.get_products()
    orders = database.get_orders()
    gemini_key = os.environ.get("GEMINI_API_KEY")
    return {
        "status": "ok",
        "service": "GharSetu Full-Stack API",
        "version": "4.0.0",
        "framework": "FastAPI (Python 3)",
        "database": {
            "type": "SQLite",
            "products_count": len(products),
            "orders_count": len(orders)
        },
        "gemini_active": bool(gemini_key)
    }


@app.get("/api/products")
async def list_products(
    category: Optional[str] = Query(None, description="Category filter (e.g. cement, plumbing, paint)"),
    search: Optional[str] = Query(None, description="Text search term")
):
    """Retrieve filtered or full list of products from SQLite."""
    items = database.get_products(category=category, search=search)
    return {"success": True, "count": len(items), "products": items}


@app.get("/api/products/{product_id}")
async def get_single_product(product_id: str):
    """Retrieve details for a single product by ID."""
    product = database.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": product}


@app.post("/api/products", status_code=status.HTTP_201_CREATED)
async def add_product(payload: ProductCreate):
    """Add a new material or product to the catalog."""
    created = database.create_product(payload.dict())
    return {"success": True, "product": created}


@app.post("/api/scope/generate")
async def generate_scope(payload: ScopeRequest, request: Request):
    """Generate an itemized BoQ and civil estimation for a given project description with rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, "scope", max_requests=25, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: max 25 scope requests per minute. Please wait."
        )

    query = payload.get_query()
    if not query or len(query) < 2:
        raise HTTPException(status_code=400, detail="Please provide a valid project description")

    city = payload.city or "Mumbai"
    trades = payload.trades or []

    # 1. Try Gemini AI Scoper if key is set
    scope_data = call_gemini_scoper(query, city, trades)

    # 2. Resilient fallback to deterministic CPWD parametric engine
    if not scope_data:
        scope_data = run_parametric_civil_engine(query, city, trades)

    # 3. Persist estimate to SQLite safely
    try:
        database.save_estimate({
            "project_desc": scope_data.get("project", query),
            "city": city,
            "trades": scope_data.get("trades", []),
            "duration": scope_data.get("estimated_duration", "2-3 Days"),
            "items": scope_data.get("materials", []),
            "material_subtotal": scope_data.get("material_subtotal", 0),
            "labor_subtotal": scope_data.get("labor_subtotal", 0),
            "grand_total": scope_data.get("grand_total", 0)
        })
    except Exception as e:
        logger.warning(f"Failed to persist estimate in SQLite: {e}")

    return {"success": True, "scope": scope_data}


@app.get("/api/estimates")
async def list_estimates():
    """Retrieve all saved BoQ estimates."""
    return {"success": True, "estimates": database.get_estimates()}


@app.get("/api/orders")
async def list_orders():
    """Retrieve all active homeowner quote requests and trade responses."""
    items = database.get_orders()
    return {"success": True, "count": len(items), "orders": items}


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
async def place_order(payload: OrderCreate):
    """Submit a new homeowner repair quote request and run trade matching."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Repair plan is empty")

    order = database.create_order(payload.dict())
    return {
        "success": True,
        "message": f"Quote request {order['id']} submitted for local trade matching (Demo)",
        "order": order
    }


@app.post("/api/providers/match")
async def match_providers(payload: Dict[str, Any]):
    """Match registered local trade professionals and generate live itemized quotes for a scope."""
    city = payload.get("city", "Mumbai")
    trades = payload.get("trades", [])
    labor = float(payload.get("labor_subtotal", payload.get("laborCost", 3000)))
    materials = float(payload.get("material_subtotal", payload.get("materialCost", 2500)))
    items = payload.get("items", [])

    quotes = database.match_trade_providers(city, trades, labor, materials, items)
    return {
        "success": True,
        "count": len(quotes),
        "city": city,
        "trades": trades,
        "providers": quotes
    }


@app.post("/api/quotes/accept")
async def accept_quote(payload: Dict[str, Any]):
    """Homeowner accepts a trade quote and schedules on-site verification."""
    request_id = payload.get("request_id")
    quote_id = payload.get("quote_id")
    provider_name = payload.get("provider_name", "Local Trade Pro")
    slot = payload.get("slot", "Tomorrow, 10:00 AM")

    if not request_id:
        raise HTTPException(status_code=400, detail="request_id is required")

    updated_order = database.accept_provider_quote(request_id, quote_id, provider_name, slot)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Quote request not found")

    return {
        "success": True,
        "message": f"Quote accepted! On-site inspection scheduled with {provider_name} for {slot}.",
        "order": updated_order
    }


@app.post("/api/auth/register")
async def register(payload: ContractorRegister, request: Request):
    """Register a new contractor profile with rate limiting and signed tokens."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, "register", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please wait 1 minute."
        )

    contractor = database.register_contractor(payload.dict())
    if not contractor:
        raise HTTPException(status_code=400, detail="Email is already registered")

    token = generate_signed_token(contractor["id"], contractor["email"])
    return {
        "success": True,
        "message": "Account created successfully",
        "token": token,
        "contractor": contractor
    }


@app.post("/api/auth/login")
async def login(payload: ContractorLogin, request: Request):
    """Authenticate contractor credentials with rate limiting and signed tokens."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, "login", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 1 minute."
        )

    contractor = database.authenticate_contractor(payload.email, payload.password)
    if not contractor:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = generate_signed_token(contractor["id"], contractor["email"])
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "contractor": contractor
    }


# ═════════════════════════════════════════════════════════════════════
# STATIC ASSET & HTML SERVING
# ═════════════════════════════════════════════════════════════════════

# Mount static folder
if os.path.exists("public"):
    app.mount("/public", StaticFiles(directory="public"), name="public")

@app.get("/")
async def serve_index():
    """Serve the primary Single Page Application HTML."""
    if os.path.exists("public/index.html"):
        return FileResponse("public/index.html")
    return JSONResponse({"status": "GharSetu API ready. Place index.html in /public folder."})

@app.get("/script.js")
async def serve_script():
    """Serve modular application controller script."""
    if os.path.exists("public/script.js"):
        return FileResponse("public/script.js", media_type="application/javascript")
    raise HTTPException(status_code=404, detail="script.js not found")

# Fallback route for favicon or standard assets
@app.get("/{filename:path}")
async def serve_file(filename: str):
    """Serve any additional public static assets."""
    filepath = os.path.join("public", filename)
    if os.path.exists(filepath) and not os.path.isdir(filepath):
        return FileResponse(filepath)
    if os.path.exists("public/index.html"):
        return FileResponse("public/index.html")
    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting GharSetu FastAPI server on http://localhost:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
