from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta, datetime
from typing import List, Optional, Dict, Any

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import Order, User
from backend.app.schemas.schemas import (
    DashboardKPIs, KPICard, DashboardCharts, MonthlySalesPoint, 
    RegionalSalesPoint, CategoryDistributionPoint, ProfitMarginPoint, 
    TopProductPoint, TopCustomerPoint, OrderOut
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def apply_filters(
    query,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None
):
    if start_date:
        query = query.filter(Order.date >= start_date)
    if end_date:
        query = query.filter(Order.date <= end_date)
    if region and region != "All":
        query = query.filter(Order.region == region)
    if category and category != "All":
        query = query.filter(Order.category == category)
    if sales_rep and sales_rep != "All":
        query = query.filter(Order.sales_rep == sales_rep)
    return query

@router.get("/kpis", response_model=DashboardKPIs)
def get_kpis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Default date range: past 12 months if not specified
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=365)
        
    # Calculate duration of the current period to compute prior period for comparison
    delta = end_date - start_date
    prior_end_date = start_date - timedelta(days=1)
    prior_start_date = prior_end_date - delta
    
    # 1. Query Current Period Metrics
    curr_query = db.query(
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit"),
        func.count(Order.id).label("count"),
        func.avg(Order.sales).label("aov")
    )
    curr_query = apply_filters(curr_query, start_date, end_date, region, category, sales_rep)
    curr_res = curr_query.first()
    
    curr_sales = float(curr_res.sales or 0)
    curr_profit = float(curr_res.profit or 0)
    curr_orders = int(curr_res.count or 0)
    curr_aov = float(curr_res.aov or 0)
    
    # 2. Query Prior Period Metrics
    prior_query = db.query(
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit"),
        func.count(Order.id).label("count"),
        func.avg(Order.sales).label("aov")
    )
    prior_query = apply_filters(prior_query, prior_start_date, prior_end_date, region, category, sales_rep)
    prior_res = prior_query.first()
    
    prior_sales = float(prior_res.sales or 0)
    prior_profit = float(prior_res.profit or 0)
    prior_orders = int(prior_res.count or 0)
    prior_aov = float(prior_res.aov or 0)
    
    # 3. Helper to calculate percentage change
    def calc_pct_change(curr, prior):
        if prior == 0:
            return 100.0 if curr > 0 else 0.0
        return round(((curr - prior) / prior) * 100, 2)
        
    sales_change = calc_pct_change(curr_sales, prior_sales)
    profit_change = calc_pct_change(curr_profit, prior_profit)
    orders_change = calc_pct_change(curr_orders, prior_orders)
    aov_change = calc_pct_change(curr_aov, prior_aov)
    
    return DashboardKPIs(
        total_sales=KPICard(value=round(curr_sales, 2), change_pct=sales_change, label="Total Sales"),
        total_profit=KPICard(value=round(curr_profit, 2), change_pct=profit_change, label="Total Profit"),
        orders_count=KPICard(value=curr_orders, change_pct=orders_change, label="Total Orders"),
        average_order_value=KPICard(value=round(curr_aov, 2), change_pct=aov_change, label="Average Order Value")
    )

@router.get("/charts", response_model=DashboardCharts)
def get_charts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=365)
        
    # 1. Monthly Sales Trend
    # Group by year-month
    # PostgreSQL specific or generic extraction
    # Since we need to support standard SQL or PostgreSQL, we'll extract using SQLAlchemy func
    # Note: postgres uses to_char(date, 'YYYY-MM')
    monthly_query = db.query(
        func.to_char(Order.date, "YYYY-MM").label("month"),
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit"),
        func.sum(func.cast(Order.is_anomaly, Integer)).label("anomalies")
    )
    monthly_query = apply_filters(monthly_query, start_date, end_date, region, category, sales_rep)
    monthly_res = monthly_query.group_by("month").order_by("month").all()
    
    monthly_points = [
        MonthlySalesPoint(
            month=m.month,
            sales=round(float(m.sales or 0), 2),
            profit=round(float(m.profit or 0), 2),
            anomaly_count=int(m.anomalies or 0)
        )
        for m in monthly_res
    ]
    
    # 2. Revenue by Region
    region_query = db.query(
        Order.region,
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit")
    )
    region_query = apply_filters(region_query, start_date, end_date, region, category, sales_rep)
    region_res = region_query.group_by(Order.region).all()
    
    regional_points = [
        RegionalSalesPoint(
            region=r.region,
            sales=round(float(r.sales or 0), 2),
            profit=round(float(r.profit or 0), 2)
        )
        for r in region_res
    ]
    
    # 3. Category Distribution & Profit Margin
    cat_query = db.query(
        Order.category,
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit")
    )
    cat_query = apply_filters(cat_query, start_date, end_date, region, category, sales_rep)
    cat_res = cat_query.group_by(Order.category).all()
    
    total_sales_sum = sum(float(c.sales or 0) for c in cat_res) or 1.0
    
    category_points = []
    margin_points = []
    
    for c in cat_res:
        sales_val = float(c.sales or 0)
        profit_val = float(c.profit or 0)
        margin_val = (profit_val / sales_val * 100) if sales_val > 0 else 0.0
        
        category_points.append(
            CategoryDistributionPoint(
                category=c.category,
                sales=round(sales_val, 2),
                profit=round(profit_val, 2),
                percentage=round((sales_val / total_sales_sum) * 100, 2)
            )
        )
        
        margin_points.append(
            ProfitMarginPoint(
                category=c.category,
                margin=round(margin_val, 2)
            )
        )
        
    # 4. Top Products (Limit 5)
    prod_query = db.query(
        Order.product,
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit"),
        func.sum(Order.quantity).label("quantity")
    )
    prod_query = apply_filters(prod_query, start_date, end_date, region, category, sales_rep)
    prod_res = prod_query.group_by(Order.product).order_by(func.sum(Order.sales).desc()).limit(5).all()
    
    top_products = [
        TopProductPoint(
            product=p.product,
            sales=round(float(p.sales or 0), 2),
            profit=round(float(p.profit or 0), 2),
            quantity=int(p.quantity or 0)
        )
        for p in prod_res
    ]
    
    # 5. Top Customer Segments (used as Top Customers in distributions)
    cust_query = db.query(
        Order.customer_segment,
        func.sum(Order.sales).label("sales"),
        func.sum(Order.profit).label("profit")
    )
    cust_query = apply_filters(cust_query, start_date, end_date, region, category, sales_rep)
    cust_res = cust_query.group_by(Order.customer_segment).order_by(func.sum(Order.sales).desc()).all()
    
    top_customers = [
        TopCustomerPoint(
            customer=c.customer_segment,
            sales=round(float(c.sales or 0), 2),
            profit=round(float(c.profit or 0), 2)
        )
        for c in cust_res
    ]
    
    return DashboardCharts(
        monthly_sales=monthly_points,
        regional_sales=regional_points,
        category_distribution=category_points,
        profit_margins=margin_points,
        top_products=top_products,
        top_customers=top_customers
    )

@router.get("/recent-orders", response_model=List[OrderOut])
def get_recent_orders(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order)
    query = apply_filters(query, start_date, end_date, region, category, sales_rep)
    orders = query.order_by(Order.date.desc(), Order.id.desc()).limit(limit).all()
    return orders

@router.get("/filter-options")
def get_filter_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns lists of unique options for dashboard filters
    """
    regions = db.query(Order.region).distinct().all()
    categories = db.query(Order.category).distinct().all()
    sales_reps = db.query(Order.sales_rep).distinct().all()
    
    return {
        "regions": ["All"] + [r[0] for r in regions],
        "categories": ["All"] + [c[0] for c in categories],
        "sales_reps": ["All"] + [s[0] for s in sales_reps]
    }
