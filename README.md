# GharSetu (घर सेतु)

> **Homeowner Repair & Renovation Coordination Platform (Prototype Demo)**

[![Live Prototype](https://img.shields.io/badge/Live%20Prototype-Render-success?style=flat-square&logo=render)](https://gharsetu-5vze.onrender.com)
[![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-blue?style=flat-square&logo=python)](https://fastapi.tiangolo.com)
[![Database](https://img.shields.io/badge/Storage-SQLite3-lightgrey?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20Tailwind%20CSS-orange?style=flat-square)](https://tailwindcss.com)

---

## 📌 Product Concept

**GharSetu** helps homeowners plan and coordinate home repair and renovation work in one place. 

Homeowners usually struggle with vague scopes, repeated contractor site visits, and opaque pricing. With GharSetu:
1. **Describe Once:** The homeowner explains the issue in plain language (e.g., bathroom pipe leak, bedroom repainting, or tripping MCB).
2. **Customizable Preliminary Scope:** GharSetu breaks the job into an itemized preliminary work scope with standard material and labor cost benchmarks.
3. **Request Local Quotes:** Homeowners share the standardized, customizable scope with relevant local professionals in our future pilot network to receive transparent, comparable quotes.
4. **Coordinate & Track:** Compare quotes, schedule visits, and track repair milestones in a single unified dashboard.

### Initial 5 Focus Services:
- 🚰 **Plumbing:** Pipe leaks, tap replacements, sanitary fitting repairs, and valve replacements.
- ⚡ **Electrical Work:** Circuit rewiring, modular switchboard installation, and MCB distribution board safety checks.
- 🎨 **Painting:** Interior drywall preparation, acrylic emulsion coating, primer application, and wall putty finishing.
- 💧 **Waterproofing:** Balcony seepage treatment, damp wall repairs, and elastomeric polymer barrier coatings.
- 🪵 **Carpentry:** Cabinet hinge repairs, wooden door lock replacements, shelving, and plywood woodwork.

---

## ⚠️ Prototype Status & Pitch Scope

> **Important Notice:** This application is an interactive prototype prepared for a startup pitch demonstration.
> - **Planning & Standardisation Layer:** The current prototype solves the planning and standardisation layer. Provider matching, verified onboarding, and live quote comparison are the next pilot phase.
> - **Workflow Demonstration:** The platform demonstrates how that workflow will work; it does not connect homeowners to live contractors in this prototype phase.
> - **Demo Data:** All seeded professionals, prices, quotes, and project statuses are clearly marked as illustrative prototype demo data.
> - **Customizable Preliminary Scopes:** Cost estimates are indicative reference benchmarks based on standard CPWD schedules and market rates, not guaranteed contractor prices.
> - **No False Claims:** This prototype does not claim live warehouse inventory, automatic dispatch, nationwide coverage, or real-time payments.

---

## 🌐 Live Application

- **Production Prototype:** [https://gharsetu-5vze.onrender.com](https://gharsetu-5vze.onrender.com)

---

## ✨ Prototype Features

### 1. Conversational Repair Scoper
- Converts natural language homeowner requests into an itemized, customizable preliminary scope.
- Auto-detects required trade categories and typical execution duration across the 5 focus trades.
- Offline-resilient civil estimation core ensures deterministic preliminary scopes even when external AI APIs are offline.

### 2. Standard Service & Material Benchmark Guide
- Reference cost benchmarks for homeowners to evaluate contractor quotes fairly across Plumbing, Electrical, Painting, Waterproofing, and Carpentry.
- Clean category filtering and instant keyword search.

### 3. Homeowner Repair Plan & Quote Request Drawer
- Homeowners customize scope items and submit unified quote requests without repeating requirements to each trade professional.

### 4. Project & Quote Tracker
- Live tracker showing active repair quote requests, status milestones, and simulated incoming local trade quotes.

### 5. Professional Partner Portal
- Onboarding and login interface for independent trade specialists (plumbers, electricians, painters, carpenters, waterproofers).

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
                      │  - Preliminary Scoping Engine           │
                      └─────────────┬─────────────────────┬─────┘
                                    │                     │
                    SQLite Engine   ▼                     ▼  Google GenAI (Optional)
        ┌───────────────────────────────────┐    ┌──────────────────────────────┐
        │       database.py (SQLite3)       │    │      Gemini Flash API        │
        │ - Service Benchmark Catalog       │    │ (Entity & spatial trade      │
        │ - Trade Partner Profiles          │    │  scoping parsing)            │
        │ - Homeowner Quote Requests        │    └──────────────────────────────┘
        │ - Preliminary Scope Records       │
        └───────────────────────────────────┘
```

---

## 🔌 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and version | No |
| `GET` | `/api/products` | Retrieve service and material benchmarks with optional `category` and `search` filters | No |
| `GET` | `/api/products/{id}` | Technical specs and benchmark details for a single item | No |
| `POST` | `/api/scope/generate` | Generate preliminary scope from natural language description | No |
| `GET` | `/api/estimates` | Retrieve persistent preliminary scope history | No |
| `GET` | `/api/orders` | Retrieve active homeowner quote requests | No |
| `POST` | `/api/orders` | Submit a new quote request from repair plan items | No |
| `POST` | `/api/auth/register` | Register a new trade partner profile (Demo) | No |
| `POST` | `/api/auth/login` | Authenticate trade partner and receive signed HMAC session token | No |

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.9+
- pip

### 1. Clone the Project
```bash
git clone <repository-url>
cd Ghar-Setu
```

### 2. Set Up Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the FastAPI Server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser at **http://localhost:8000** to explore the prototype.

---

## 📄 License

This project is licensed under the open-source MIT License.
