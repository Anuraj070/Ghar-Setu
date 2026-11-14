"""
GharSetu (घर सेतु) - FastAPI Full-Stack Application Engine
v4.0 AI Renovation Scoping & B2B Construction Procurement Platform
"""

import os
import json
import logging
import requests
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, status
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
    title="GharSetu API Core",
    description="AI Renovation Scoping, CPWD Schedule of Rates (DSR), and B2B Material Procurement Hub",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (Allows frontend interactions from any host)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regional Material Pricing Multipliers (Calibrated to Wholesale Mandi / Depot Indices)
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
    prompt: str = Field(..., min_length=2, description="Project scope or renovation description")
    city: Optional[str] = Field("Mumbai", description="Target region for depot material pricing")
    trades: Optional[List[str]] = Field(default=[], description="Selected primary trade filters")


class ProductCreate(BaseModel):
    id: Optional[str] = None
    name: str
    meta: Optional[str] = "Standard Grade • Verified Depot"
    price: float
    originalPrice: Optional[float] = None
    discount: Optional[int] = 12
    category: str
    stock: Optional[int] = 100
    unit: Optional[str] = "unit"
    specs: Optional[str] = "BIS / IS Standard certified."
    tags: Optional[List[str]] = []


class OrderCreate(BaseModel):
    customer_name: Optional[str] = "Valued Contractor"
    customer_email: Optional[str] = "contractor@gharsetu.in"
    city: Optional[str] = "Mumbai"
    items: List[Dict[str, Any]]
    subtotal: float
    gst: float
    total: float


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
# ESTIMATION ENGINE (CPWD / IS:456 / IS:732 SPECIFICATIONS)
# ═════════════════════════════════════════════════════════════════════

def run_parametric_civil_engine(prompt: str, city: str, trades: List[str]) -> Dict[str, Any]:
    """
    Deterministic Indian Civil Estimation Engine aligned with CPWD Schedule of Rates (DSR).
    Calculates material quantities, wholesale depot rates, and skilled artisan labor.
    """
    city_mult = REGIONAL_MULTIPLIERS.get(city, 1.00)
    lower = prompt.lower()
    items: List[Dict[str, Any]] = []
    trade_list = list(trades) if trades else []
    duration = "3-5 Days"
    area_sqft = 220
    notes = []

    # Domain 1: Painting & Drywall
    if any(k in lower for k in ["paint", "color", "whitewash", "distemper", "wall", "putty", "primer"]):
        if "Painting" not in trade_list:
            trade_list.append("Painting")
        items.extend([
            {
                "material": "Birla White Polymer Wall Putty",
                "spec": "IS:15489 Certified • 40kg Bag",
                "qty": 3,
                "unit": "bags",
                "rate": round(820 * city_mult),
                "total": round(820 * 3 * city_mult)
            },
            {
                "material": "Asian Paints Tractor Emulsion (White)",
                "spec": "Interior Acrylic Grade • 20L Bucket",
                "qty": 1,
                "unit": "bucket",
                "rate": round(2850 * city_mult),
                "total": round(2850 * city_mult)
            },
            {
                "material": "Asian Paints Decoprime Water Thinnable Primer",
                "spec": "Deep Penetrating Alkali Shield • 10L",
                "qty": 1,
                "unit": "can",
                "rate": round(1420 * city_mult),
                "total": round(1420 * city_mult)
            },
            {
                "material": "Consumables (Sandpaper, Masking Tape, 9in Roller)",
                "spec": "GharSetu Depot Painter Kit",
                "qty": 1,
                "unit": "kit",
                "rate": round(650 * city_mult),
                "total": round(650 * city_mult)
            }
        ])
        duration = "3-4 Days"
        notes.append("Surface moisture test recommended prior to primer coat application (max allowable moisture: 12%).")

    # Domain 2: Plumbing & Sanitary
    if any(k in lower for k in ["plumb", "leak", "pipe", "tap", "faucet", "drain", "cpvc", "pvc", "sewage"]):
        if "Plumbing" not in trade_list:
            trade_list.append("Plumbing")
        items.extend([
            {
                "material": "Astral CPVC Heavy Duty Pipe (1 inch, SDR 11)",
                "spec": "IS:15778 Certified up to 93°C • 3m Length",
                "qty": 4,
                "unit": "pieces",
                "rate": round(420 * city_mult),
                "total": round(420 * 4 * city_mult)
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
        duration = "2-3 Days"
        notes.append("CPWD Hydrostatic pressure test at 10 kg/cm² mandatory after joint solvent curing.")

    # Domain 3: Electrical & Wiring
    if any(k in lower for k in ["electric", "wire", "switch", "mcb", "light", "fan", "rewir", "short"]):
        if "Electrical" not in trade_list:
            trade_list.append("Electrical")
        items.extend([
            {
                "material": "Polycab FR Flame Retardant Wire (1.5 sq mm)",
                "spec": "IS:694 Certified • 90m Coil (Red/Black)",
                "qty": 2,
                "unit": "coils",
                "rate": round(1580 * city_mult),
                "total": round(1580 * 2 * city_mult)
            },
            {
                "material": "Schneider Electric Easy9 Single Pole MCB (16A)",
                "spec": "IS/IEC 60898-1 Certified • 10kA Breaking Capacity",
                "qty": 4,
                "unit": "pieces",
                "rate": round(185 * city_mult),
                "total": round(185 * 4 * city_mult)
            },
            {
                "material": "Anchor Roma Modular Switchboard & Sockets",
                "spec": "Polycarbonate Flame Retardant • 8-Module Set",
                "qty": 2,
                "unit": "sets",
                "rate": round(890 * city_mult),
                "total": round(890 * 2 * city_mult)
            }
        ])
        duration = "2-4 Days"
        notes.append("IS:732 Earthing verification required; loop impedance should not exceed 1.0 Ohm.")

    # Domain 4: Waterproofing & Dampness
    if any(k in lower for k in ["waterproof", "damp", "seep", "terrace", "roof", "crack", "leakage"]):
        if "Waterproofing" not in trade_list:
            trade_list.append("Waterproofing")
        items.extend([
            {
                "material": "Dr. Fixit 101 LW+ Integral Waterproofing Admixture",
                "spec": "IS:2645 Compliant • 5L Can",
                "qty": 2,
                "unit": "cans",
                "rate": round(640 * city_mult),
                "total": round(640 * 2 * city_mult)
            },
            {
                "material": "Dr. Fixit Fastflex Acrylic Polymer Waterproof Coating",
                "spec": "2-Part Flexible Membrane (12kg Pack)",
                "qty": 1,
                "unit": "pack",
                "rate": round(2650 * city_mult),
                "total": round(2650 * city_mult)
            },
            {
                "material": "Glass Fiber Reinforcing Mesh (45 GSM)",
                "spec": "50m Roll • Alkali Resistant",
                "qty": 1,
                "unit": "roll",
                "rate": round(1100 * city_mult),
                "total": round(1100 * city_mult)
            }
        ])
        duration = "4-6 Days"
        notes.append("Allow minimum 48 hours ponding water test before laying top protection screed.")

    # Default Fallback if nothing matched
    if not items:
        trade_list = ["Masonry", "General Finishing"]
        items.extend([
            {
                "material": "Ambuja Portland Pozzolana Cement (PPC)",
                "spec": "IS:1489 Certified • 50kg Bag",
                "qty": 6,
                "unit": "bags",
                "rate": round(380 * city_mult),
                "total": round(380 * 6 * city_mult)
            },
            {
                "material": "Coarse River Sand / M-Sand (Zone II)",
                "spec": "Washed Plaster Grade Silt < 3%",
                "qty": 25,
                "unit": "cu.ft",
                "rate": round(55 * city_mult),
                "total": round(55 * 25 * city_mult)
            },
            {
                "material": "Consumables & Surface Binding Polymer",
                "spec": "SBR Latex Bonding Agent • 2L",
                "qty": 1,
                "unit": "can",
                "rate": round(780 * city_mult),
                "total": round(780 * city_mult)
            }
        ])
        duration = "3-5 Days"
        notes.append("Curing of cement plastering must be maintained wet for a minimum of 7 consecutive days.")

    mat_subtotal = sum(i["total"] for i in items)
    # Skilled Artisan Labor indexed to CPWD Minimum Wage DSR Schedule
    labor_rate_per_day = round(1650 * city_mult)
    est_days = 4
    labor_total = labor_rate_per_day * est_days
    grand_total = mat_subtotal + labor_total

    return {
        "engine": "GharSetu Parametric Civil Core v4.0 (CPWD/DSR)",
        "project": prompt,
        "city": city,
        "region_multiplier": city_mult,
        "estimated_duration": duration,
        "estimated_area_sqft": area_sqft,
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
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            return parsed
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
async def generate_scope(payload: ScopeRequest):
    """Generate an itemized BoQ and civil estimation for a given project description."""
    if not payload.prompt or len(payload.prompt.strip()) < 2:
        raise HTTPException(status_code=400, detail="Please provide a valid project description")

    city = payload.city or "Mumbai"
    trades = payload.trades or []

    # 1. Try Gemini AI Scoper if key is set
    scope_data = call_gemini_scoper(payload.prompt, city, trades)

    # 2. Resilient fallback to deterministic CPWD parametric engine
    if not scope_data:
        scope_data = run_parametric_civil_engine(payload.prompt, city, trades)

    # 3. Persist estimate to SQLite
    database.save_estimate({
        "project_desc": scope_data.get("project", payload.prompt),
        "city": city,
        "trades": scope_data.get("trades", []),
        "duration": scope_data.get("estimated_duration", "3-5 Days"),
        "items": scope_data.get("materials", []),
        "material_subtotal": scope_data.get("material_subtotal", 0),
        "labor_subtotal": scope_data.get("labor_subtotal", 0),
        "grand_total": scope_data.get("grand_total", 0)
    })

    return {"success": True, "scope": scope_data}


@app.get("/api/estimates")
async def list_estimates():
    """Retrieve all saved BoQ estimates."""
    return {"success": True, "estimates": database.get_estimates()}


@app.get("/api/orders")
async def list_orders():
    """Retrieve all active orders and depot dispatches."""
    items = database.get_orders()
    return {"success": True, "count": len(items), "orders": items}


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
async def place_order(payload: OrderCreate):
    """Place a new wholesale material order / allocate depot dispatch."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = database.create_order(payload.dict())
    return {
        "success": True,
        "message": f"Order {order['id']} allocated to regional logistics depot",
        "order": order
    }


@app.post("/api/auth/register")
async def register(payload: ContractorRegister):
    """Register a new contractor profile."""
    contractor = database.register_contractor(payload.dict())
    if not contractor:
        raise HTTPException(status_code=400, detail="Email is already registered")

    token = f"gs-jwt-{contractor['id']}"
    return {
        "success": True,
        "message": "Account created successfully",
        "token": token,
        "contractor": contractor
    }


@app.post("/api/auth/login")
async def login(payload: ContractorLogin):
    """Authenticate contractor credentials."""
    contractor = database.authenticate_contractor(payload.email, payload.password)
    if not contractor:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = f"gs-jwt-{contractor['id']}"
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
