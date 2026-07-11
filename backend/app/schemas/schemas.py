from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import List, Dict, Any, Optional

# --- User & Token Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    username: Optional[str] = None


# --- Order Schemas ---
class OrderCreate(BaseModel):
    order_id: str
    date: date
    region: str
    city: str
    product: str
    category: str
    quantity: int
    price: float
    discount: float = 0.0
    sales: float
    profit: float
    customer_segment: str
    sales_rep: str

class OrderOut(BaseModel):
    id: int
    order_id: str
    date: date
    region: str
    city: str
    product: str
    category: str
    quantity: int
    price: float
    discount: float
    sales: float
    profit: float
    customer_segment: str
    sales_rep: str
    is_anomaly: bool

    class Config:
        from_attributes = True


# --- Saved Filter Schemas ---
class SavedFilterCreate(BaseModel):
    name: str
    filters: Dict[str, Any]

class SavedFilterOut(BaseModel):
    id: str
    name: str
    filters: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Favorite Dashboard Schemas ---
class FavoriteDashboardCreate(BaseModel):
    dashboard_name: str

class FavoriteDashboardOut(BaseModel):
    id: str
    dashboard_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Activity Log Schemas ---
class ActivityLogOut(BaseModel):
    id: str
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: str

class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True


# --- Dashboard KPI and Chart Schemas ---
class KPICard(BaseModel):
    value: float
    change_pct: float
    label: str

class DashboardKPIs(BaseModel):
    total_sales: KPICard
    total_profit: KPICard
    orders_count: KPICard
    average_order_value: KPICard

class MonthlySalesPoint(BaseModel):
    month: str
    sales: float
    profit: float
    anomaly_count: int

class RegionalSalesPoint(BaseModel):
    region: str
    sales: float
    profit: float

class CategoryDistributionPoint(BaseModel):
    category: str
    sales: float
    profit: float
    percentage: float

class ProfitMarginPoint(BaseModel):
    category: str
    margin: float

class TopProductPoint(BaseModel):
    product: str
    sales: float
    profit: float
    quantity: int

class TopCustomerPoint(BaseModel):
    customer: str
    sales: float
    profit: float

class DashboardCharts(BaseModel):
    monthly_sales: List[MonthlySalesPoint]
    regional_sales: List[RegionalSalesPoint]
    category_distribution: List[CategoryDistributionPoint]
    profit_margins: List[ProfitMarginPoint]
    top_products: List[TopProductPoint]
    top_customers: List[TopCustomerPoint]


# --- Forecasting Schemas ---
class ForecastPoint(BaseModel):
    date: str
    historical: Optional[float] = None
    forecast: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    is_forecast: bool

class ForecastSummary(BaseModel):
    horizon_days: int
    projected_sales: float
    projected_profit: float
    average_daily_sales: float
    growth_trend_direction: str  # "UPWARD", "DOWNWARD", "STABLE"
    confidence_level: float

class ForecastResponse(BaseModel):
    points: List[ForecastPoint]
    summary: ForecastSummary


# --- AI Chat and Insights Schemas ---
class AIInsightCard(BaseModel):
    title: str
    metric: str
    description: str
    type: str  # "success", "warning", "info", "danger"
    recommendation: str

class AIInsightsResponse(BaseModel):
    insights: List[AIInsightCard]
    summary: str

class AIChatResponse(BaseModel):
    response: str
    session_id: str
    suggested_questions: List[str]
