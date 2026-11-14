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

    # Ensure image_url column exists in products table
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN image_url TEXT")
    except Exception:
        pass

    # Seed initial data idempotently (INSERT OR IGNORE)
    seed_data(cursor)

    # Populate image URLs for standard catalog products if missing
    image_map = {
        "prod-001": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
        "prod-002": "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80",
        "prod-003": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
        "prod-004": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
        "prod-005": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
        "prod-006": "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=600&q=80",
        "prod-007": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
        "prod-008": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
        "prod-009": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        "prod-010": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        "prod-011": "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80",
        "prod-012": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80",
        "prod-013": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
    }
    for pid, img in image_map.items():
        cursor.execute("UPDATE products SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')", (img, pid))

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
            "Astral CPVC Heavy Duty Pipe (1-inch)",
            "3m Length • SDR 11 • Plumbing Benchmark (Demo Data)",
            420.0,
            490.0,
            14,
            "plumbing",
            120,
            "piece",
            "SDR 11 certified up to 93°C hot/cold potable water. Indicative demo material benchmark for home plumbing repairs.",
            json.dumps(["cpvc", "pipe", "plumbing", "astral", "leak"]),
            now,
        ),
        (
            "prod-002",
            "Jaquar Cast Brass Bib Cock Tap",
            "Quarter Turn Ceramic Cartridge • Chrome Plated (Demo Data)",
            1150.0,
            1350.0,
            15,
            "plumbing",
            60,
            "piece",
            "Standard chrome-finished brass bib tap. Reference benchmark for bathroom & kitchen sanitary fittings. (Demo Data)",
            json.dumps(["tap", "faucet", "plumbing", "jaquar", "bathroom"]),
            now,
        ),
        (
            "prod-003",
            "Polycab FR Wire 1.5 sq mm",
            "90m Coil • Fire Retardant Copper (Demo Data)",
            1580.0,
            1750.0,
            10,
            "electrical",
            80,
            "coil",
            "IS:694 certified flame retardant copper wiring coil. Indicative reference rate for apartment rewiring. (Demo Data)",
            json.dumps(["wire", "electrical", "fr", "polycab", "wiring"]),
            now,
        ),
        (
            "prod-004",
            "Schneider Electric Easy9 MCB (16A Single Pole)",
            "C-Curve • 10kA Breaking Capacity (Demo Data)",
            185.0,
            220.0,
            16,
            "electrical",
            150,
            "piece",
            "Miniature circuit breaker for household distribution boards. Standard benchmark component for electrical safety. (Demo Data)",
            json.dumps(["mcb", "schneider", "electrical", "breaker", "switch"]),
            now,
        ),
        (
            "prod-005",
            "Asian Paints Tractor Emulsion (Matte White)",
            "20L Bucket • Interior Acrylic Grade (Demo Data)",
            2850.0,
            3240.0,
            12,
            "painting",
            50,
            "bucket",
            "Smooth interior acrylic emulsion offering 260-300 sq.ft/L coverage. Benchmark rate for residential wall painting. (Demo Data)",
            json.dumps(["paint", "emulsion", "asian paints", "painting", "wall"]),
            now,
        ),
        (
            "prod-006",
            "Birla White Polymer Wall Putty",
            "40kg Bag • Drywall Surface Prep (Demo Data)",
            820.0,
            940.0,
            13,
            "painting",
            75,
            "bag",
            "White polymer plaster for smoothing interior walls prior to primer and paint application. (Demo Data)",
            json.dumps(["putty", "birla white", "wall putty", "painting"]),
            now,
        ),
        (
            "prod-007",
            "Dr. Fixit 101 LW+ Integral Waterproofing",
            "5L Can • Plaster & Concrete Admixture (Demo Data)",
            640.0,
            720.0,
            11,
            "waterproofing",
            90,
            "can",
            "IS:2645 compliant liquid waterproofing admixture for damp wall and mortar repairs. (Demo Data)",
            json.dumps(["waterproofing", "dr fixit", "admixture", "damp", "leakage"]),
            now,
        ),
        (
            "prod-008",
            "Dr. Fixit Fastflex Acrylic Polymer Membrane",
            "12kg Pack • 2-Part Flexible Coating (Demo Data)",
            2650.0,
            2950.0,
            10,
            "waterproofing",
            40,
            "pack",
            "Elastomeric waterproofing coating for balconies, sunken slabs, and bathroom wet areas. (Demo Data)",
            json.dumps(["waterproofing", "fastflex", "coating", "balcony", "seepage"]),
            now,
        ),
        (
            "prod-009",
            "CenturyPly MR Grade Commercial Plywood (19mm)",
            "8ft x 4ft Sheet • Moisture Resistant (Demo Data)",
            2450.0,
            2800.0,
            12,
            "carpentry",
            65,
            "sheet",
            "IS:303 moisture-resistant plywood for wardrobes, kitchen cabinetry, and shelving repairs. (Demo Data)",
            json.dumps(["plywood", "centuryply", "carpentry", "wood", "cabinet"]),
            now,
        ),
        (
            "prod-010",
            "Godrej Nav-Tal Brass Mortise Door Lock",
            "Double Cylinder • 6-Lever Mechanism (Demo Data)",
            1450.0,
            1720.0,
            16,
            "carpentry",
            45,
            "set",
            "Heavy-duty solid brass door lock with computer-cut keys. Standard rate benchmark for wooden door hardware. (Demo Data)",
            json.dumps(["lock", "door lock", "godrej", "carpentry", "hardware"]),
            now,
        ),
        (
            "prod-011",
            "Ebco Soft-Close Concealed Cabinet Hinges",
            "Pack of 4 Pairs • Hydraulic Damper (Demo Data)",
            960.0,
            1200.0,
            20,
            "carpentry",
            110,
            "pack",
            "Nickel-plated steel hinges with zero-creak hydraulic dampers. Benchmark repair hardware for kitchen cabinets. (Demo Data)",
            json.dumps(["hinge", "cabinet", "carpentry", "hardware", "ebco"]),
            now,
        ),
        (
            "prod-012",
            "Finolex CPVC Ball Valve",
            "1-inch • Heavy Duty Brass Core (Demo Data)",
            280.0,
            340.0,
            18,
            "plumbing",
            200,
            "piece",
            "Full-port design for zero friction pressure drop. Leak-proof PTFE seats with ergonomic high-torque quarter-turn lever. (Demo Data)",
            json.dumps(["valve", "cpvc", "finolex", "plumbing"]),
            now,
        ),
        (
            "prod-013",
            "Ebco Soft-Close Cabinet Hinges",
            "Pack of 4 Pairs • Concealed Mount (Demo Data)",
            960.0,
            1200.0,
            20,
            "carpentry",
            300,
            "pack",
            "Nickel-plated cold-rolled steel with integrated hydraulic soft-close damper. 105° opening angle tested for 50,000 motion cycles. (Demo Data)",
            json.dumps(["hinge", "cabinet", "carpentry", "ebco"]),
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT OR IGNORE INTO products (id, name, meta, price, original_price, discount, category, stock, unit, specs, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        initial_products,
    )

    # Seed Default Contractor
    cursor.execute(
        """
        INSERT OR IGNORE INTO contractors (id, name, email, password_hash, phone, city, created_at)
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

    # Seed Initial Active Homeowner Quote Requests (Demo Data)
    initial_orders = [
        (
            "REQ-MUM-8921",
            "Ananya Sen (Homeowner)",
            "ananya.sen@example.com",
            "Mumbai",
            json.dumps([
                {"name": "Bathroom CPVC Pipe Leak Repair", "qty": 1, "unit": "job", "price": 1680},
                {"name": "Jaquar Brass Bib Cock Tap Replacement", "qty": 2, "unit": "pieces", "price": 2300},
            ]),
            3980.0,
            0.0,
            3980.0,
            "3 Quotes Received (Demo)",
            json.dumps([
                {"step": "Scope Submitted by Homeowner", "time": "Yesterday 10:15 AM", "status": "completed"},
                {"step": "Standardized Scope Distributed to Local Pros", "time": "Yesterday 11:30 AM", "status": "completed"},
                {"step": "Quotes Submitted by 3 Local Trade Pros (Demo)", "time": "Today 09:45 AM", "status": "completed"},
                {"step": "Homeowner Review & Selection", "time": "Awaiting Selection", "status": "active"},
            ]),
            now,
        ),
        (
            "REQ-BLR-4102",
            "Rohan Iyer (Homeowner)",
            "rohan.iyer@example.com",
            "Bengaluru",
            json.dumps([
                {"name": "Polycab 1.5 sq mm Circuit Rewiring", "qty": 2, "unit": "coils", "price": 3160},
                {"name": "Schneider MCB & Distribution Board Check", "qty": 1, "unit": "service", "price": 1850},
            ]),
            5010.0,
            0.0,
            5010.0,
            "Pro Visit Scheduled (Demo)",
            json.dumps([
                {"step": "Scope Created", "time": "12 Nov 08:30 AM", "status": "completed"},
                {"step": "Quote Accepted from Apex Electricals", "time": "13 Nov 04:15 PM", "status": "completed"},
                {"step": "On-Site Verification Visit", "time": "Tomorrow 10:00 AM", "status": "active"},
            ]),
            now,
        ),
    ]

    cursor.executemany(
        """
        INSERT OR IGNORE INTO orders (id, customer_name, customer_email, city, items, subtotal, gst, total, status, timeline, created_at)
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
