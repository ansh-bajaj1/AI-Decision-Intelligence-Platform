# AI Decision Intelligence Platform

AI Decision Intelligence Platform is a high-fidelity, production-ready full-stack analytics application designed to help business users understand sales data, forecast future metrics, audit transactions for anomalies, and receive LLM-powered strategic suggestions.

---

## Architecture Diagram

```mermaid
graph TD
    User[Business User UI] <--> ReactApp[React 19 SPA Frontend]
    ReactApp <-->|JWT Auth & REST API| FastAPI[FastAPI Backend Server]
    
    subgraph Analytics & Intelligence Engine
        FastAPI <--> Pandas[Pandas & NumPy Data Aggregator]
        FastAPI <--> Prophet[Meta Prophet Forecasting Model]
        FastAPI <--> Forest[Isolation Forest Anomaly Detector]
        FastAPI <--> Gemini[Google Gemini AI Integration]
    end

    FastAPI <-->|SQLAlchemy ORM| Postgres[(PostgreSQL Database)]
```

---

## Features

1. **Enterprise SaaS Dashboard**: Light/Dark theme switching, high-performance Recharts visualizations, and interactive date-range, regional, category, and sales rep filters.
2. **Predictive Sales Forecasting**: Generates 30, 60, and 90-day time-series projections with 95% confidence corridor bands utilizing Meta Prophet (or advanced rolling statistical model fallbacks).
3. **Machine Learning Anomaly Detection**: Employs scikit-learn's `Isolation Forest` outlier algorithm to automatically audit transactions and flag discount leakage or data-entry errors.
4. **AI Decision Intelligence**: Communicates summaries of current database performance metrics directly to Google Gemini API to return structured business recommendations and action items.
5. **Interactive AI Chat Assistant**: Supports a persistent, context-aware Q&A chat interface with session histories where users can ask conversational data queries.
6. **Executive Reporting Exporter**: Instantly generates downloadable summary PDFs (via ReportLab), multi-sheet spreadsheets (via openpyxl), or database CSV logs of filtered datasets.

---

## Folder Structure

```
c:\Users\HP\Desktop\Analytics Project/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, dashboard, analytics, forecast, reports, ai, search)
│   │   ├── core/         # Config, security, DB session, AI client
│   │   ├── models/       # SQLAlchemy models (User, Order, SavedFilter, ActivityLog, ChatSession)
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Analytics, forecasting (Prophet), anomaly detection (Isolation Forest), AI service
│   │   └── main.py       # FastAPI entrypoint
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (KPI cards, Sidebar, Charts, Navbar, LoadingSkeletons)
│   │   ├── pages/        # Dashboard, Analytics, Forecasting, AI Insights, AI Chat, Reports, Profile, Login/Register
│   │   ├── context/      # ThemeContext, AuthContext
│   │   ├── services/     # API services (Axios)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── database/
│   ├── __init__.py
│   └── seed.py           # Database schema initialization and 15,000+ records generator
├── docker-compose.yml
├── .env                  # Environment variables file
└── README.md
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insightiq

# Authentication Secrets
JWT_SECRET=8f95c4a4dae6a9829bdf533b66d4000305886d9a930bb397223b2024db57e2bb
SECRET_KEY=94d7bfa5db2f4a43b2f56f4e69b0fa8ad7743d7890b0ee5744a7bb2e66487e91

# AI Configuration (Gemini API Key)
GEMINI_API_KEY=your-gemini-api-key
```

---

## Installation & Startup

### Option 1: Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose installed.
2. In the project root, run:
   ```bash
   docker-compose up --build
   ```
3. The database will start, compile schemas, and automatically seed **15,500+** retail order entries (applying anomaly filters).
4. Access the frontend dashboard at `http://localhost`.
5. Access the API health check at `http://localhost:8000`.

### Option 2: Local Manual Startup

#### 1. Setup Backend
1. Create a Python virtual environment (Python 3.10+):
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate  # on Windows
   ```
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Seed Database & Create tables:
   ```bash
   python ../database/seed.py
   ```
4. Start FastAPI server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

#### 2. Setup Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```
2. Start Vite server:
   ```bash
   npm run dev
   ```
3. Access at `http://localhost:5173`.

*Demo account credentials:*
- **Username**: `admin`
- **Password**: `password123`

---

## API Documentation

FastAPI provides automatic interactive Swagger docs:
- URL: `http://localhost:8000/docs`

Key Endpoint Categories:
- `/api/auth`: User credentials, token handling, activity log audits, and favorites.
- `/api/dashboard`: Aggregated KPIs, Recharts charts formats, and recent order listings.
- `/api/analytics`: Advanced moving averages, growth rate tables, and category profit margins.
- `/api/forecast`: Prophet forecasting model results (30/60/90 days horizontal projection).
- `/api/reports`: Report exporters (PDF briefing, multi-sheet Excel workbook, raw CSV).
- `/api/ai`: AI-generated recommendations and persistent conversational chatbot.
- `/api/search`: Global multi-keyword transaction search engine.
- `/api/orders`: Standard CRUD operations (triggers dynamic anomaly checks on new items).

---

## Future Improvements

- **Real-Time Data Pipeline**: Integrate Kafka/RabbitMQ stream listeners to ingest live sales transactions.
- **Enhanced ML Architectures**: Introduce XGBoost or LSTM networks to compare against Prophet forecasting.
- **Role-Based Access Control (RBAC)**: Fine-tune dashboard permissions for Managers vs Viewers.

---

## License

MIT License. Copyright (c) 2026 InsightIQ Team.
