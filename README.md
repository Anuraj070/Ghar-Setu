# GharSetu (घर सेतु)

> **AI-Driven Renovation Scoping & B2B Wholesale Material Procurement Platform for India**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-success?style=flat-square&logo=render)](https://gharsetu-5vze.onrender.com)
[![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-blue?style=flat-square&logo=python)](https://fastapi.tiangolo.com)
[![Database](https://img.shields.io/badge/Storage-SQLite3-lightgrey?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20Tailwind%20CSS-orange?style=flat-square)](https://tailwindcss.com)

---

## 📌 Overview

India's residential renovation and repair sector exceeds **₹5.2 Trillion ($63B USD)** annually, yet over **85%** of the industry operates informally without standardized estimates or transparent material rates:
- **Estimation Lag:** Homeowners and small contractors take 2–4 days to draft basic Bill of Quantities (BoQ) spreadsheets.
- **Price Opacity:** Retail material markups consistently exceed regional wholesale depot rates by **18% to 35%**.
- **Execution Mistrust:** Lack of trade demarcation (masonry, plumbing, waterproofing) leads to frequent cost overruns and disputes.

**GharSetu** addresses this gap by combining an **AI Renovation Scoper** with a **Verified B2B Material Price Index**. Users type what needs work in conversational language; GharSetu parses the spatial scope, generates a CPWD-benchmarked BoQ, verifies depot wholesale prices, and prepares dispatch orders for verified trades.

---

## 🌐 Live Application

- **Production URL:** [https://gharsetu-5vze.onrender.com](https://gharsetu-5vze.onrender.com)
- **GitHub Repository:** [https://github.com/Anuraj070/Ghar-Setu](https://github.com/Anuraj070/Ghar-Setu)

---

## ✨ Key Features

### 1. Conversational AI Renovation Scoper
- Converts natural language descriptions (e.g., *"Repaint 10x12 bedroom with primer and repair kitchen sink"*) into an itemized Bill of Quantities (BoQ).
- Incorporates spatial estimation logic, CPWD labor benchmark ratios, and regional city multiplier indices (Mumbai, Delhi-NCR, Bengaluru, Pune, Hyderabad, Kolkata, Chennai).
- Offline-resilient fallback engine guarantees instant scoping even if external LLM gateways are unavailable.

### 2. Verified B2B Material Price Index
- Real-time catalog across 8 primary Indian building categories:
  - 🧱 **Cement:** Grade 53 OPC/PPC (Ambuja, UltraTech)
  - 🚰 **Plumbing:** SDR 11 CPVC pipes and heavy-duty brass ball valves (Astral, Finolex)
  - 🎨 **Paints & Wall Prep:** Tractor acrylic emulsion & polymer white putty (Asian Paints, Birla White)
  - ⚡ **Electrical:** Fire-retardant multi-strand copper wire & C-curve industrial MCBs (Polycab, Schneider)
  - 🔩 **Hardware:** Heavy-duty mortise door locks & soft-close cabinet hinges (Godrej, Ebco)
  - 🏗️ **Steel:** Fe-550D earthquake-resistant TMT rebar (Tata Tiscon)
  - 📐 **Tiles:** Double charge vitrified porcelain floor tiles (Kajaria)
  - 💧 **Waterproofing:** Integral concrete elastomeric admixtures (Dr. Fixit)
- Smooth single-row horizontal scrolling category navigation and dynamic real-time filtering.

### 3. Integrated Job Cart & Logistics Dispatch Hub
- Stepper-based direct procurement with instant tax and GST breakdown.
- Visual dispatch status tracking with sequential milestones (Stock Allocated, Quality Verified, In Transit, Site Delivery).

### 4. Hardened Security & Data Integrity
- **Password Hashing:** Salted PBKDF2-HMAC-SHA256 with 100,000 iterations.
- **Session Tokens:** Cryptographic HMAC-SHA256 signed session tokens protecting contractor routes.
- **Rate Limiting:** Sliding-window in-memory rate limiter mitigating automated abuse.
- **Defense in Depth:** XSS sanitization, CSP/CORS security headers, and parameterized SQL queries across all database operations.

---

## 🏗️ Architecture

```
                      ┌─────────────────────────────────────────┐
                      │          Client Browser (Web UI)        │
                      │  Vanilla HTML5 + Modern CSS + JS Canvas │
                      └────────────────────┬────────────────────┘
                                           │ HTTP / JSON
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          FastAPI Application (app.py)   │
                      │  - CORS & Rate Limiting Middleware      │
                      │  - Signed Session Validation (HMAC)     │
                      │  - CPWD Benchmarking Scoper Engine       │
                      └─────────────┬─────────────────────┬─────┘
                                    │                     │
                    SQLite Engine   ▼                     ▼  Google GenAI (Optional)
        ┌───────────────────────────────────┐    ┌──────────────────────────────┐
        │       database.py (SQLite3)       │    │      Gemini 1.5 / 2.0 API    │
        │ - Products Catalog (13+ Items)    │    │ (Deep spatial reasoning &    │
        │ - Contractors (Salted PBKDF2)     │    │  custom trade entity parsing)│
        │ - Orders & Dispatches Timeline    │    └──────────────────────────────┘
        │ - Scoped Project BoQ Estimates    │
        └───────────────────────────────────┘
```

---

## 🔌 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and version | No |
| `GET` | `/api/products` | Retrieve catalog with optional `category` and `search` query filters | No |
| `GET` | `/api/products/{id}` | Technical specs, compliance, and stock count for a single product | No |
| `POST` | `/api/scope` | Generate spatial scope and BoQ from a project description and city | No |
| `GET` | `/api/estimates` | Retrieve persistent estimate history | No |
| `GET` | `/api/orders` | Retrieve active depot orders and delivery timelines | No |
| `POST` | `/api/orders` | Place a new procurement order from cart items | No |
| `POST` | `/api/auth/register` | Register a new verified contractor | No |
| `POST` | `/api/auth/login` | Authenticate contractor and receive a signed HMAC token | No |
| `GET` | `/api/contractor/profile`| Retrieve authenticated contractor workspace data | Yes (`Authorization: Bearer <token>`) |

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.9+ (or Node.js 18+ if running alternative express server)
- pip

### 1. Clone the Repository
```bash
git clone https://github.com/Anuraj070/Ghar-Setu.git
cd Ghar-Setu
```

### 2. Set Up Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```
*(Optional)* Add your `GEMINI_API_KEY` in `.env` to enable live generative scoping. If omitted, GharSetu automatically uses its built-in CPWD deterministic scoper.

### 4. Run the Development Server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser at **http://localhost:8000** to explore the platform.

---

## ☁️ Deployment

### Deploying to Render
GharSetu includes a pre-configured `render.yaml` specification for immediate deployment:
1. Push your code to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Web Service**.
3. Select your repository `Ghar-Setu`.
4. Configure:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.

---

## 📁 Repository Structure

```
Ghar-Setu/
├── app.py                # FastAPI backend with REST endpoints, security, and scoping logic
├── database.py           # SQLite database schema, salted password hashing, and seed catalog
├── requirements.txt      # Python dependencies (FastAPI, Uvicorn, Pydantic, Requests)
├── render.yaml           # Infrastructure-as-code deployment specification for Render
├── vercel.json           # Optional Vercel deployment routes
├── package.json          # Node.js compatibility package specification
├── server.js             # Alternative Express.js server
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore specification
├── public/
│   ├── index.html        # Responsive frontend markup, hero canvas, and B2B marketplace
│   └── script.js         # Reactive client-side logic, calculations, and local persistence
└── README.md             # Project documentation
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Anuraj070/Ghar-Setu/issues).

---

## 📄 License

This project is licensed under the open-source MIT License.
