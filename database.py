"""
GharSetu (घर सेतु) - SQLite Database Engine & Data Access Layer
Persistent storage for Products, Quote Requests, Preliminary Scopes, and Trade Providers.
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

    # 1. Products Table (Standard Service & Material Benchmarks)
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

    # 2. Homeowner Quote Requests Table
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
        created_at TEXT NOT NULL,
        matched_quotes TEXT
    );
    """)

    # 3. Active Preliminary Scopes Table
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

    # 4. Pro Partners / Trade Contractors Table
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

    # 5. Trade Providers Table (for Provider Matching & Live Quoting)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trade_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trade TEXT NOT NULL,
        city TEXT NOT NULL,
        rating REAL NOT NULL,
        review_count INTEGER NOT NULL,
        experience_years INTEGER NOT NULL,
        hourly_rate REAL NOT NULL,
        avatar_color TEXT NOT NULL,
        specialties TEXT NOT NULL,
        badge TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Column migrations
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN image_url TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN matched_quotes TEXT")
    except Exception:
        pass

    conn.commit()

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
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)


def seed_data(cursor):
    """Seed benchmark materials across 5 services, registered trade providers, and initial quote requests."""
    now = datetime.now().isoformat()

    # 1. 13 Service & Material Benchmarks across 5 Focus Trades
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

    # 2. Seed Trade Providers (for Provider Matching & Live Quoting)
    trade_providers = [
        # Mumbai Providers
        ("pro-001", "Apex PlumbTech Solutions", "Plumbing", "Mumbai", 4.9, 58, 11, 450.0, "linear-gradient(135deg,#0284C7,#0369A1)", json.dumps(["CPVC leak fix", "Tap replacement", "Hydrostatic testing"]), "Top Rated Plumber", "+91 98201 11223", now),
        ("pro-002", "Metro Master Plumbers", "Plumbing", "Mumbai", 4.8, 34, 8, 420.0, "linear-gradient(135deg,#0EA5E9,#0284C7)", json.dumps(["Bathroom fixtures", "Drainage repairs"]), "Fastest Availability", "+91 98202 22334", now),
        ("pro-003", "Shree Ganesh Electricals", "Electrical", "Mumbai", 4.9, 64, 14, 480.0, "linear-gradient(135deg,#F59E0B,#D97706)", json.dumps(["MCB distribution", "Modular switchboards", "Wiring check"]), "Licensed Master Electrician", "+91 98203 33445", now),
        ("pro-004", "VoltCraft Electric Crew", "Electrical", "Mumbai", 4.8, 29, 7, 400.0, "linear-gradient(135deg,#EAB308,#CA8A04)", json.dumps(["Apartment rewiring", "Short circuit diagnosis"]), "Same-Day Inspection", "+91 98204 44556", now),
        ("pro-005", "Colors of India Master Painters", "Painting", "Mumbai", 4.9, 82, 12, 380.0, "linear-gradient(135deg,#E25822,#C24513)", json.dumps(["Interior acrylic emulsion", "Polymer putty", "Primer sealing"]), "Top Rated Paint Crew", "+91 98205 55667", now),
        ("pro-006", "Perfect Finish Decorators", "Painting", "Mumbai", 4.8, 41, 9, 360.0, "linear-gradient(135deg,#EA580C,#C2410C)", json.dumps(["Drywall surface prep", "Roller & spray finish"]), "Dustless Sanding Included", "+91 98206 66778", now),
        ("pro-007", "HydroShield Waterproofing Pros", "Waterproofing", "Mumbai", 4.9, 73, 15, 550.0, "linear-gradient(135deg,#0D9488,#0F766E)", json.dumps(["Balcony seepage", "Elastomeric membranes", "Ponding tests"]), "Structural Waterproofing Expert", "+91 98207 77889", now),
        ("pro-008", "AquaBlock Moisture Solutions", "Waterproofing", "Mumbai", 4.8, 38, 10, 500.0, "linear-gradient(135deg,#14B8A6,#0D9488)", json.dumps(["Damp wall treatment", "Polymer mortar injection"]), "Pinhole Leak Detection", "+91 98208 88990", now),
        ("pro-009", "Vakharia Woodcraft & Modular", "Carpentry", "Mumbai", 4.9, 53, 13, 480.0, "linear-gradient(135deg,#854D0E,#713F12)", json.dumps(["Hydraulic soft-close hinges", "Plywood wardrobes", "Mortise locks"]), "Master Cabinetmaker", "+91 98209 99001", now),
        ("pro-010", "Urban Carpenter Collective", "Carpentry", "Mumbai", 4.8, 27, 6, 420.0, "linear-gradient(135deg,#A16207,#854D0E)", json.dumps(["Sagging cabinet doors", "Lock replacement"]), "Rapid Hardware Fix", "+91 98210 00112", now),
        # Bengaluru Providers
        ("pro-011", "Silicon City PlumbWorks", "Plumbing", "Bengaluru", 4.9, 45, 9, 460.0, "linear-gradient(135deg,#0284C7,#0369A1)", json.dumps(["Sanitary fixtures", "CPVC lines"]), "Verified Local Pro", "+91 98450 11223", now),
        ("pro-012", "Precision Electricals Bangalore", "Electrical", "Bengaluru", 4.9, 51, 11, 490.0, "linear-gradient(135deg,#F59E0B,#D97706)", json.dumps(["Distribution boards", "Wiring"]), "Certified Contractor", "+91 98450 22334", now),
        ("pro-013", "Bengaluru Home Paint Studio", "Painting", "Bengaluru", 4.8, 39, 8, 390.0, "linear-gradient(135deg,#E25822,#C24513)", json.dumps(["Wall putty", "Emulsion"]), "Top Rated", "+91 98450 33445", now),
        ("pro-014", "Southern DampProofers", "Waterproofing", "Bengaluru", 4.9, 47, 12, 540.0, "linear-gradient(135deg,#0D9488,#0F766E)", json.dumps(["Balconies", "Wet areas"]), "Moisture Specialist", "+91 98450 44556", now),
        ("pro-015", "Garden City Modular Carpentry", "Carpentry", "Bengaluru", 4.9, 42, 10, 480.0, "linear-gradient(135deg,#854D0E,#713F12)", json.dumps(["Kitchen cabinets", "Hinges"]), "Artisan Team", "+91 98450 55667", now),
    ]

    cursor.executemany(
        """
        INSERT OR IGNORE INTO trade_providers (id, name, trade, city, rating, review_count, experience_years, hourly_rate, avatar_color, specialties, badge, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        trade_providers,
    )

    # 3. Seed Default Trade Partner
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

    # 4. Seed Initial Active Homeowner Quote Requests (Demo Data with Matched Quotes)
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
            json.dumps([
                {
                    "quote_id": "Q-001-921",
                    "provider_id": "pro-001",
                    "provider_name": "Apex PlumbTech Solutions",
                    "trade": "Plumbing",
                    "rating": 4.9,
                    "review_count": 58,
                    "experience_years": 11,
                    "badge": "Top Rated Plumber",
                    "phone": "+91 98201 11223",
                    "avatar_color": "linear-gradient(135deg,#0284C7,#0369A1)",
                    "city": "Mumbai",
                    "labor_quote": 1550,
                    "material_quote": 2300,
                    "total_quote": 3850,
                    "earliest_slot": "Tomorrow, 10:00 AM",
                    "notes": "Includes 30-day workmanship assurance and CPVC pressure check.",
                    "status": "Available"
                },
                {
                    "quote_id": "Q-002-921",
                    "provider_id": "pro-002",
                    "provider_name": "Metro Master Plumbers",
                    "trade": "Plumbing",
                    "rating": 4.8,
                    "review_count": 34,
                    "experience_years": 8,
                    "badge": "Fastest Availability",
                    "phone": "+91 98202 22334",
                    "avatar_color": "linear-gradient(135deg,#0EA5E9,#0284C7)",
                    "city": "Mumbai",
                    "labor_quote": 1800,
                    "material_quote": 2300,
                    "total_quote": 4100,
                    "earliest_slot": "Tomorrow, 02:30 PM",
                    "notes": "Same-day site visit slot available with certified plumber team.",
                    "status": "Available"
                }
            ])
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
            "Inspection Scheduled with Silicon City Electricals",
            json.dumps([
                {"step": "Scope Created", "time": "12 Nov 08:30 AM", "status": "completed"},
                {"step": "Matched with Silicon City Electricals", "time": "13 Nov 04:15 PM", "status": "completed"},
                {"step": "Quote Accepted: ₹4,850", "time": "13 Nov 05:00 PM", "status": "completed"},
                {"step": "On-Site Verification Visit", "time": "Tomorrow 10:00 AM", "status": "active"},
            ]),
            now,
            json.dumps([
                {
                    "quote_id": "Q-012-102",
                    "provider_id": "pro-012",
                    "provider_name": "Precision Electricals Bangalore",
                    "trade": "Electrical",
                    "rating": 4.9,
                    "review_count": 51,
                    "experience_years": 11,
                    "badge": "Certified Contractor",
                    "phone": "+91 98450 22334",
                    "avatar_color": "linear-gradient(135deg,#F59E0B,#D97706)",
                    "city": "Bengaluru",
                    "labor_quote": 1850,
                    "material_quote": 3000,
                    "total_quote": 4850,
                    "earliest_slot": "Tomorrow 10:00 AM",
                    "notes": "IS:732 certified insulation & earthing loop check included.",
                    "status": "Accepted"
                }
            ])
        ),
    ]

    cursor.executemany(
        """
        INSERT OR IGNORE INTO orders (id, customer_name, customer_email, city, items, subtotal, gst, total, status, timeline, created_at, matched_quotes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        p["originalPrice"] = p.pop("original_price")
        p["tags"] = json.loads(p["tags"])
        products.append(p)
    return products


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single product by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    p = dict(row)
    p["originalPrice"] = p.pop("original_price")
    p["tags"] = json.loads(p["tags"])
    return p


def create_product(product_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new benchmark product."""
    conn = get_db_connection()
    cursor = conn.cursor()
    pid = product_data.get("id") or f"prod-{int(datetime.now().timestamp() * 1000)}"
    now = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO products (id, name, meta, price, original_price, discount, category, stock, unit, specs, tags, created_at, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pid,
        product_data["name"],
        product_data.get("meta", "Standard Quality Benchmark (Demo Data)"),
        float(product_data["price"]),
        float(product_data.get("originalPrice", product_data["price"] * 1.15)),
        int(product_data.get("discount", 10)),
        product_data["category"].lower(),
        int(product_data.get("stock", 100)),
        product_data.get("unit", "piece"),
        product_data.get("specs", "Standard Benchmark Specification"),
        json.dumps(product_data.get("tags", [])),
        now,
        product_data.get("image_url", "")
    ))
    conn.commit()
    conn.close()
    return {**product_data, "id": pid, "created_at": now}


def match_trade_providers(city: str, trades: List[str], base_labor: float, base_materials: float, items: Optional[List[Dict]] = None) -> List[Dict[str, Any]]:
    """
    Match registered trade providers in the requested city and generate live itemized quotes.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    city_pattern = f"%{city.lower()}%"
    trade_terms = [t.lower().replace("work", "").replace("and", "").strip() for t in trades]

    # Query providers in requested city
    cursor.execute("SELECT * FROM trade_providers WHERE LOWER(city) LIKE ?", (city_pattern,))
    rows = cursor.fetchall()

    matched_rows = []
    for r in rows:
        r_trade = r["trade"].lower()
        if any(term in r_trade or r_trade in term for term in trade_terms):
            matched_rows.append(dict(r))

    # Fallback to other top providers if no exact city/trade combination
    if not matched_rows:
        cursor.execute("SELECT * FROM trade_providers")
        all_rows = cursor.fetchall()
        for r in all_rows:
            r_trade = r["trade"].lower()
            if any(term in r_trade or r_trade in term for term in trade_terms):
                matched_rows.append(dict(r))
                if len(matched_rows) >= 3:
                    break

    if not matched_rows:
        cursor.execute("SELECT * FROM trade_providers LIMIT 3")
        matched_rows = [dict(r) for r in cursor.fetchall()]

    conn.close()

    # Rate variance multipliers for realistic competition:
    # 1: Value pro (-6% labor), 2: Top rated (+2%), 3: Rapid response (+7%)
    variances = [0.94, 1.02, 1.07]
    slots = ["Tomorrow, 10:00 AM", "Tomorrow, 02:30 PM", "Thursday, 11:00 AM"]
    notes_list = [
        "Includes 30-day workmanship assurance and complimentary cleanup.",
        "Rapid site inspection slot with licensed senior artisans.",
        "Master trade crew with comprehensive post-job warranty check."
    ]

    quotes = []
    for idx, p in enumerate(matched_rows[:3]):
        var = variances[idx % len(variances)]
        labor_quote = round(base_labor * var)
        mat_quote = round(base_materials)
        total_quote = labor_quote + mat_quote
        quotes.append({
            "quote_id": f"Q-{p['id'][-3:]}-{int(datetime.now().timestamp()) % 1000}",
            "provider_id": p["id"],
            "provider_name": p["name"],
            "trade": p["trade"],
            "rating": p["rating"],
            "review_count": p["review_count"],
            "experience_years": p["experience_years"],
            "badge": p["badge"],
            "phone": p["phone"],
            "avatar_color": p["avatar_color"],
            "city": city,
            "labor_quote": labor_quote,
            "material_quote": mat_quote,
            "total_quote": total_quote,
            "earliest_slot": slots[idx % len(slots)],
            "earliest_inspection": slots[idx % len(slots)],
            "notes": notes_list[idx % len(notes_list)],
            "status": "Quote Available"
        })

    return quotes


def get_orders() -> List[Dict[str, Any]]:
    """Retrieve all active homeowner quote requests with matched provider quotes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    orders = []
    for row in rows:
        o = dict(row)
        o["items"] = json.loads(o["items"]) if isinstance(o["items"], str) else o["items"]
        o["timeline"] = json.loads(o["timeline"]) if isinstance(o["timeline"], str) else o["timeline"]
        if "matched_quotes" in o and o["matched_quotes"]:
            try:
                o["matched_quotes"] = json.loads(o["matched_quotes"])
            except Exception:
                o["matched_quotes"] = []
        else:
            o["matched_quotes"] = []
        orders.append(o)
    return orders


def create_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new homeowner quote request, run trade matching, and attach live provider quotes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    city = order_data.get("city", "Mumbai")
    order_id = order_data.get("id") or f"REQ-{city[:3].upper()}-{secrets.randbelow(9000) + 1000}"

    items = order_data.get("items", [])
    subtotal = float(order_data.get("subtotal", 0))
    gst = float(order_data.get("gst", 0))
    total = float(order_data.get("total", subtotal + gst))

    # Detect trades from items or payload
    trades = order_data.get("trades", [])
    if not trades and items:
        detected_trades = set()
        for item in items:
            name = (item.get("name") or "").lower()
            if any(k in name for k in ["pipe", "tap", "plumb", "leak", "valve"]):
                detected_trades.add("Plumbing")
            elif any(k in name for k in ["wire", "mcb", "switch", "electr"]):
                detected_trades.add("Electrical")
            elif any(k in name for k in ["paint", "putty", "primer", "emulsion"]):
                detected_trades.add("Painting")
            elif any(k in name for k in ["waterproof", "membrane", "mesh", "admixture"]):
                detected_trades.add("Waterproofing")
            elif any(k in name for k in ["plywood", "hinge", "lock", "cabinet", "wood"]):
                detected_trades.add("Carpentry")
        trades = list(detected_trades) or ["Home Repairs"]

    labor_est = subtotal * 0.45 if subtotal > 0 else 2400
    mat_est = subtotal * 0.55 if subtotal > 0 else 2200

    # Execute dynamic provider matching
    matched_quotes = match_trade_providers(city, trades, labor_est, mat_est, items)

    timeline = [
        {"step": "Scope Submitted by Homeowner", "time": datetime.now().strftime("%I:%M %p"), "status": "completed"},
        {"step": f"Matched with {len(matched_quotes)} Local Trade Pros in {city}", "time": datetime.now().strftime("%I:%M %p"), "status": "completed"},
        {"step": "Quotes Under Review by Homeowner", "time": "Awaiting Selection", "status": "active"},
        {"step": "On-Site Inspection Scheduled", "time": "Pending", "status": "pending"},
    ]
    status_label = f"{len(matched_quotes)} Quotes Received (Demo)" if matched_quotes else "Quotes Requested (Demo)"

    cursor.execute("""
        INSERT INTO orders (id, customer_name, customer_email, city, items, subtotal, gst, total, status, timeline, created_at, matched_quotes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id,
        order_data.get("customer_name", "Homeowner"),
        order_data.get("customer_email", "homeowner@example.com"),
        city,
        json.dumps(items),
        subtotal,
        gst,
        total,
        status_label,
        json.dumps(timeline),
        now,
        json.dumps(matched_quotes)
    ))
    conn.commit()
    conn.close()

    return {
        "id": order_id,
        "customer_name": order_data.get("customer_name", "Homeowner"),
        "customer_email": order_data.get("customer_email", "homeowner@example.com"),
        "city": city,
        "items": items,
        "subtotal": subtotal,
        "gst": gst,
        "total": total,
        "status": status_label,
        "timeline": timeline,
        "matched_quotes": matched_quotes,
        "created_at": now
    }


def accept_provider_quote(request_id: str, quote_id: str, provider_name: str, slot: str) -> Optional[Dict[str, Any]]:
    """Record acceptance of a provider's quote and advance milestone to scheduled inspection."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ?", (request_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    order = dict(row)
    timeline = json.loads(order["timeline"]) if isinstance(order["timeline"], str) else order["timeline"]
    matched = json.loads(order["matched_quotes"]) if order.get("matched_quotes") else []

    # Update quote status
    for q in matched:
        if q.get("quote_id") == quote_id or q.get("provider_name") == provider_name:
            q["status"] = "Accepted"
        else:
            q["status"] = "Declined"

    # Update timeline
    timeline[2] = {"step": f"Quote Accepted: {provider_name}", "time": datetime.now().strftime("%I:%M %p"), "status": "completed"}
    if len(timeline) > 3:
        timeline[3] = {"step": f"On-Site Inspection Scheduled ({slot})", "time": slot, "status": "active"}
    else:
        timeline.append({"step": f"On-Site Inspection Scheduled ({slot})", "time": slot, "status": "active"})

    new_status = f"Inspection Scheduled with {provider_name}"

    cursor.execute("""
        UPDATE orders SET status = ?, timeline = ?, matched_quotes = ? WHERE id = ?
    """, (new_status, json.dumps(timeline), json.dumps(matched), request_id))
    conn.commit()
    conn.close()

    order["status"] = new_status
    order["timeline"] = timeline
    order["matched_quotes"] = matched
    order["items"] = json.loads(order["items"]) if isinstance(order["items"], str) else order["items"]
    return order


def save_estimate(estimate_data: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a preliminary scope estimate."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    est_id = estimate_data.get("id") or f"SCOPE-{int(datetime.now().timestamp()) % 10000:04d}"

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
    """Retrieve saved preliminary scopes from the database."""
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
    """Register a new trade partner profile in the database."""
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
    """Verify trade partner email and password against stored PBKDF2 hash."""
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
