"""
GharSetu (घर सेतु) - SQLite Database Engine & Data Access Layer
Persistent storage for Products, Orders, BoQ Estimates, and Contractors.
"""

import sqlite3
import json
import hashlib
import hmac
import secrets
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("DATABASE_PATH", "gharsetu.db")


def get_db_connection():
    """Create and return a SQLite database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables and seed realistic demo data if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        meta TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL NOT NULL,
        discount INTEGER NOT NULL,
        category TEXT NOT NULL,
        stock INTEGER NOT NULL,
        unit TEXT NOT NULL,
        specs TEXT NOT NULL,
        tags TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Orders & Depot Dispatches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        city TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        timeline TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Active BoQ Estimates Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        project_desc TEXT NOT NULL,
        city TEXT NOT NULL,
        trades TEXT NOT NULL,
        duration TEXT NOT NULL,
        items TEXT NOT NULL,
        material_subtotal REAL NOT NULL,
        labor_subtotal REAL NOT NULL,
        grand_total REAL NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 4. Contractors Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contractors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        city TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()

    # Check if products need seeding
    cursor.execute("SELECT COUNT(*) as count FROM products")
    if cursor.fetchone()["count"] == 0:
        seed_data(cursor)
        conn.commit()

    conn.close()


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash, supporting PBKDF2 and legacy SHA-256."""
    if not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2:sha256:"):
        try:
            parts = stored_hash.split("$")
            if len(parts) == 3:
                header, salt, key_hex = parts
                iterations = int(header.split(":")[-1])
                calc_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
                return hmac.compare_digest(calc_key.hex(), key_hex)
        except Exception:
            return False
    # Backward compatibility fallback for legacy unsalted SHA-256
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)


def seed_data(cursor):
    """Seed realistic Indian construction materials, verified contractor, and initial dispatches."""
    now = datetime.now().isoformat()

    # Seed 10 Realistic Products
    initial_products = [
        (
            "prod-001",
            "Ambuja Portland Cement",
            "50kg Bag • Grade 53 • Verified Depot",
            380.0,
            450.0,
            15,
            "cement",
            240,
            "bag",
            "IS:12269 certified. High early strength formulation engineered for RCC slabs, structural beams, columns, and high-durability plastering.",
            json.dumps(["cement", "grade53", "portland", "ambuja"]),
            now,
        ),
        (
            "prod-002",
            "Astral CPVC Pipes (Heavy Duty)",
            "3m Length • 1-inch • Plumbing Grade",
            420.0,
            510.0,
            18,
            "plumbing",
            180,
            "piece",
            "SDR 11 certified up to 93°C hot/cold potable water distribution. 100% lead-free formulation with NSF international approval.",
            json.dumps(["cpvc", "pipe", "plumbing", "astral"]),
            now,
        ),
        (
            "prod-003",
            "Asian Paints Tractor Emulsion",
            "20L Bucket • Matte White Finish",
            2850.0,
            3240.0,
            12,
            "paint",
            90,
            "bucket",
            "Smooth plastic emulsion finish offering superior coverage (260-300 sq.ft/L for 1 coat) with anti-fungal shield and washability.",
            json.dumps(["paint", "emulsion", "asian paints"]),
            now,
        ),
        (
            "prod-004",
            "Polycab FR Wire 1.5 sq mm",
            "90m Coil • Fire Retardant • ISI Marked",
            1580.0,
            1750.0,
            10,
            "electrical",
            120,
            "coil",
            "IS:694 certified copper conductor. 100% electrolytic grade with oxygen-index >29% flame-retardant virgin PVC sheath.",
            json.dumps(["wire", "electrical", "fr", "polycab"]),
            now,
        ),
        (
            "prod-005",
            "Tata Tiscon 550D TMT Rebar (12mm)",
            "12m Bar • Fe-550D Super Ductile Grade",
            690.0,
            780.0,
            12,
            "steel",
            310,
            "piece",
            "IS:1786 Fe-550D compliant. High earthquake-resistant ductility with superior corrosion resistance and rib design.",
            json.dumps(["tmt", "steel", "rebar", "tata"]),
            now,
        ),
        (
            "prod-006",
            "Kajaria Vitrified Floor Tiles (60x60 cm)",
            "Box of 4 Tiles (15.5 sq.ft) • Polished Glaze",
            920.0,
            1080.0,
            15,
            "tiles",
            85,
            "box",
            "Nano-polished double charge vitrified porcelain body with water absorption <0.05% and scratch resistance Mohs 7.",
            json.dumps(["tiles", "vitrified", "flooring", "kajaria"]),
            now,
        ),
        (
            "prod-007",
            "Dr. Fixit 101 LW+ Waterproofing Admixture",
            "5L Can • Integral Concrete Waterproofer",
            640.0,
            720.0,
            11,
            "waterproofing",
            140,
            "can",
            "IS:2645 compliant integral liquid waterproofing compound for concrete and mortar. Prevents dampness and salt efflorescence.",
            json.dumps(["waterproofing", "dr fixit", "admixture"]),
            now,
        ),
        (
            "prod-008",
            "Schneider Electric Easy9 MCB (16A Single Pole)",
            "C-Curve • 10kA Breaking Capacity",
            185.0,
            220.0,
            16,
            "electrical",
            250,
            "piece",
            "IS/IEC 60898-1 certified. Complete bi-connect terminal protection with rapid arc quenching chamber.",
            json.dumps(["mcb", "schneider", "electrical", "breaker"]),
            now,
        ),
        (
            "prod-009",
            "Birla White Wall Seal Putty",
            "40kg Bag • White Polymer Plaster",
            820.0,
            940.0,
            13,
            "paint",
            110,
            "bag",
            "White Portland cement-based putty with re-dispersible polymer additives for water-resistant silky smooth drywall surfaces.",
            json.dumps(["putty", "birla white", "wall putty"]),
            now,
        ),
        (
            "prod-010",
            "Godrej Brass Mortise Door Lock",
            "Double Cylinder • 6 Lever Heavy Duty",
            1450.0,
            1720.0,
            16,
            "hardware",
            75,
            "set",
            "Solid brass forged bolt with manganese-hardened drill-resistant striker plate and 3 computer-cut brass keys.",
            json.dumps(["lock", "door lock", "godrej", "hardware"]),
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO products (id, name, meta, price, original_price, discount, category, stock, unit, specs, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        initial_products,
    )

    # Seed Default Contractor
    cursor.execute(
        """
        INSERT INTO contractors (id, name, email, password_hash, phone, city, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            "c-001",
            "Rahul Mehta",
            "rahul@gharsetu.in",
            hash_password("password123"),
            "+91 98200 12345",
            "Mumbai",
            now,
        ),
    )

    # Seed Initial Active Depot Dispatches
    initial_orders = [
        (
            "ORD-MUM-8921",
            "Rahul Mehta",
            "rahul@gharsetu.in",
            "Mumbai",
            json.dumps([
                {"name": "Ambuja Portland Cement (50kg)", "qty": 10, "unit": "bag", "price": 380},
                {"name": "Asian Paints Tractor Emulsion (20L)", "qty": 2, "unit": "bucket", "price": 2850},
                {"name": "Birla White Wall Putty (40kg)", "qty": 4, "unit": "bag", "price": 820},
            ]),
            12780.0,
            2300.4,
            15080.4,
            "Depot Dispatched",
            json.dumps([
                {"step": "Order Received", "time": "10:15 AM", "status": "completed"},
                {"step": "Depot Stock Allocated", "time": "10:45 AM", "status": "completed"},
                {"step": "Dispatched via GharSetu Logistics", "time": "11:30 AM", "status": "active"},
                {"step": "Site Delivery", "time": "Est. 3:00 PM", "status": "pending"},
            ]),
            now,
        ),
        (
            "ORD-DEL-4102",
            "Pooja Sharma",
            "pooja@example.com",
            "Delhi-NCR",
            json.dumps([
                {"name": "Polycab FR Wire 1.5 sq mm", "qty": 4, "unit": "coil", "price": 1580},
                {"name": "Schneider Electric Easy9 MCB (16A)", "qty": 8, "unit": "piece", "price": 185},
            ]),
            7800.0,
            1404.0,
            9204.0,
            "Quality Checked",
            json.dumps([
                {"step": "Order Received", "time": "08:30 AM", "status": "completed"},
                {"step": "Quality Verified", "time": "09:15 AM", "status": "completed"},
                {"step": "Depot Packing", "time": "10:00 AM", "status": "active"},
            ]),
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO orders (id, customer_name, customer_email, city, items, subtotal, gst, total, status, timeline, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        initial_orders,
    )


# ═════════════════════════════════════════════════════════════════════
# DATA ACCESS FUNCTIONS
# ═════════════════════════════════════════════════════════════════════

def get_products(category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve products with optional category and keyword search filtering."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if category and category.lower() != "all":
        query += " AND LOWER(category) = ?"
        params.append(category.lower())

    if search:
        search_term = f"%{search.lower()}%"
        query += " AND (LOWER(name) LIKE ? OR LOWER(meta) LIKE ? OR LOWER(tags) LIKE ?)"
        params.extend([search_term, search_term, search_term])

    query += " ORDER BY name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    products = []
    for row in rows:
        p = dict(row)
        p["tags"] = json.loads(p["tags"])
        p["originalPrice"] = p["original_price"]
        del p["original_price"]
        products.append(p)
    return products


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single product by its unique ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    p = dict(row)
    p["tags"] = json.loads(p["tags"])
    p["originalPrice"] = p["original_price"]
    del p["original_price"]
    return p


def create_product(product_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new product into the catalog."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    product_id = product_data.get("id") or f"prod-{int(datetime.now().timestamp() * 1000)}"

    cursor.execute("""
        INSERT INTO products (id, name, meta, price, original_price, discount, category, stock, unit, specs, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        product_id,
        product_data["name"],
        product_data.get("meta", "Standard Grade • Verified Depot"),
        float(product_data["price"]),
        float(product_data.get("originalPrice", product_data.get("original_price", product_data["price"] * 1.15))),
        int(product_data.get("discount", 10)),
        product_data.get("category", "general"),
        int(product_data.get("stock", 100)),
        product_data.get("unit", "unit"),
        product_data.get("specs", "Standard IS compliant construction material."),
        json.dumps(product_data.get("tags", [product_data.get("category", "general")])),
        now
    ))
    conn.commit()
    conn.close()
    return get_product_by_id(product_id)


def get_orders() -> List[Dict[str, Any]]:
    """Retrieve all orders from the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    orders = []
    for row in rows:
        o = dict(row)
        o["items"] = json.loads(o["items"])
        o["timeline"] = json.loads(o["timeline"])
        orders.append(o)
    return orders


def create_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new customer order / depot dispatch allocation."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    order_id = order_data.get("id") or f"ORD-{order_data.get('city', 'MUM')[:3].upper()}-{int(datetime.now().timestamp()) % 10000:04d}"

    timeline = [
        {"step": "Order Received", "time": datetime.now().strftime("%I:%M %p"), "status": "completed"},
        {"step": "Depot Stock Allocated", "time": datetime.now().strftime("%I:%M %p"), "status": "active"},
        {"step": "Dispatched via GharSetu Logistics", "time": "Pending", "status": "pending"},
        {"step": "Site Delivery", "time": "Estimated Next Day", "status": "pending"}
    ]

    cursor.execute("""
        INSERT INTO orders (id, customer_name, customer_email, city, items, subtotal, gst, total, status, timeline, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id,
        order_data.get("customer_name", "Valued Contractor"),
        order_data.get("customer_email", "orders@gharsetu.in"),
        order_data.get("city", "Mumbai"),
        json.dumps(order_data.get("items", [])),
        float(order_data.get("subtotal", 0)),
        float(order_data.get("gst", 0)),
        float(order_data.get("total", 0)),
        "Depot Stock Allocated",
        json.dumps(timeline),
        now
    ))
    conn.commit()
    conn.close()
    
    return {
        "id": order_id,
        "customer_name": order_data.get("customer_name", "Valued Contractor"),
        "customer_email": order_data.get("customer_email", "orders@gharsetu.in"),
        "city": order_data.get("city", "Mumbai"),
        "items": order_data.get("items", []),
        "subtotal": order_data.get("subtotal", 0),
        "gst": order_data.get("gst", 0),
        "total": order_data.get("total", 0),
        "status": "Depot Stock Allocated",
        "timeline": timeline,
        "created_at": now
    }


def save_estimate(estimate_data: Dict[str, Any]) -> Dict[str, Any]:
    """Persist an AI-generated BoQ estimate."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    est_id = estimate_data.get("id") or f"EST-GS-{int(datetime.now().timestamp()) % 10000:04d}"

    cursor.execute("""
        INSERT INTO estimates (id, project_desc, city, trades, duration, items, material_subtotal, labor_subtotal, grand_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        est_id,
        estimate_data.get("project_desc", "Renovation Project"),
        estimate_data.get("city", "Mumbai"),
        ", ".join(estimate_data.get("trades", ["General"])),
        estimate_data.get("duration", "3-5 Days"),
        json.dumps(estimate_data.get("items", [])),
        float(estimate_data.get("material_subtotal", 0)),
        float(estimate_data.get("labor_subtotal", 0)),
        float(estimate_data.get("grand_total", 0)),
        now
    ))
    conn.commit()
    conn.close()
    return {"id": est_id, **estimate_data, "created_at": now}


def get_estimates() -> List[Dict[str, Any]]:
    """Retrieve saved estimates from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM estimates ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    estimates = []
    for row in rows:
        e = dict(row)
        e["items"] = json.loads(e["items"])
        e["trades"] = [t.strip() for t in e["trades"].split(",") if t.strip()]
        estimates.append(e)
    return estimates


def register_contractor(contractor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Register a new contractor in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cid = f"c-{int(datetime.now().timestamp() * 1000)}"

    try:
        cursor.execute("""
            INSERT INTO contractors (id, name, email, password_hash, phone, city, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            cid,
            contractor_data["name"],
            contractor_data["email"].lower().strip(),
            hash_password(contractor_data["password"]),
            contractor_data.get("phone", ""),
            contractor_data.get("city", "Mumbai"),
            now
        ))
        conn.commit()
        conn.close()
        return {
            "id": cid,
            "name": contractor_data["name"],
            "email": contractor_data["email"].lower().strip(),
            "phone": contractor_data.get("phone", ""),
            "city": contractor_data.get("city", "Mumbai"),
            "created_at": now
        }
    except sqlite3.IntegrityError:
        conn.close()
        return None


def authenticate_contractor(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Verify contractor email and password against stored PBKDF2 hash."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contractors WHERE email = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    if verify_password(password, row["password_hash"]):
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "phone": row["phone"],
            "city": row["city"]
        }
    return None
