from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import pandas as pd
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import Order, User
from backend.app.api.dashboard import apply_filters

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/trends")
def get_trends(
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
        # Fetch past 18 months for detailed trend analysis
        start_date = end_date - timedelta(days=540)
        
    query = db.query(
        Order.date,
        Order.sales,
        Order.profit
    )
    query = apply_filters(query, start_date, end_date, region, category, sales_rep)
    orders = query.all()
    
    if not orders:
        return {"daily_trends": [], "monthly_growth": []}
        
    # Load into Pandas for analytical computations
    df = pd.DataFrame([{"date": o.date, "sales": o.sales, "profit": o.profit} for o in orders])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    
    # 1. Daily Aggregation & Rolling Averages
    df_daily = df.groupby("date").agg({"sales": "sum", "profit": "sum"}).reset_index()
    
    # Ensure continuous date sequence
    idx = pd.date_range(df_daily["date"].min(), df_daily["date"].max(), freq="D")
    df_daily = df_daily.set_index("date").reindex(idx, fill_value=0.0).reset_index()
    df_daily.columns = ["date", "sales", "profit"]
    
    # Compute 7-day and 30-day moving averages
    df_daily["moving_avg_7"] = df_daily["sales"].rolling(window=7, min_periods=1).mean()
    df_daily["moving_avg_30"] = df_daily["sales"].rolling(window=30, min_periods=1).mean()
    
    # 2. Monthly Growth Rates
    df["month"] = df["date"].dt.to_period("M")
    df_monthly = df.groupby("month").agg({"sales": "sum", "profit": "sum"}).reset_index()
    df_monthly["month"] = df_monthly["month"].astype(str)
    
    df_monthly["sales_mom_growth"] = df_monthly["sales"].pct_change() * 100
    df_monthly["profit_mom_growth"] = df_monthly["profit"].pct_change() * 100
    
    # Replace NaN with 0
    df_monthly = df_monthly.fillna(0.0)
    
    # 3. Quarterly Growth Rates
    df["quarter"] = df["date"].dt.to_period("Q")
    df_quarterly = df.groupby("quarter").agg({"sales": "sum", "profit": "sum"}).reset_index()
    df_quarterly["quarter"] = df_quarterly["quarter"].astype(str)
    df_quarterly["sales_qoq_growth"] = df_quarterly["sales"].pct_change() * 100
    df_quarterly = df_quarterly.fillna(0.0)
    
    # Format responses for Recharts
    daily_trends = []
    for _, row in df_daily.iterrows():
        daily_trends.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "sales": round(float(row["sales"]), 2),
            "profit": round(float(row["profit"]), 2),
            "moving_avg_7": round(float(row["moving_avg_7"]), 2),
            "moving_avg_30": round(float(row["moving_avg_30"]), 2),
        })
        
    monthly_growth = []
    for _, row in df_monthly.iterrows():
        monthly_growth.append({
            "month": row["month"],
            "sales": round(float(row["sales"]), 2),
            "profit": round(float(row["profit"]), 2),
            "sales_growth": round(float(row["sales_mom_growth"]), 2),
            "profit_growth": round(float(row["profit_mom_growth"]), 2)
        })
        
    quarterly_growth = []
    for _, row in df_quarterly.iterrows():
        quarterly_growth.append({
            "quarter": row["quarter"],
            "sales": round(float(row["sales"]), 2),
            "profit": round(float(row["profit"]), 2),
            "sales_growth": round(float(row["sales_qoq_growth"]), 2)
        })

    return {
        "daily_trends": daily_trends[-180:], # Return last 180 days to keep chart snappy
        "monthly_growth": monthly_growth,
        "quarterly_growth": quarterly_growth
    }

@router.get("/products")
def get_products_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        Order.product,
        Order.category,
        Order.sales,
        Order.profit,
        Order.quantity
    )
    query = apply_filters(query, start_date, end_date, region, category, sales_rep)
    orders = query.all()
    
    if not orders:
        return {"top_performing": [], "worst_performing": []}
        
    df = pd.DataFrame([{
        "product": o.product, 
        "category": o.category, 
        "sales": o.sales, 
        "profit": o.profit, 
        "quantity": o.quantity
    } for o in orders])
    
    # Aggregate product statistics
    df_prod = df.groupby(["product", "category"]).agg({
        "sales": "sum",
        "profit": "sum",
        "quantity": "sum"
    }).reset_index()
    
    df_prod["margin"] = (df_prod["profit"] / df_prod["sales"] * 100).fillna(0.0)
    
    # Sort for best and worst performing
    top_performing = df_prod.sort_values("sales", ascending=False).head(10).to_dict(orient="records")
    worst_performing = df_prod.sort_values("profit", ascending=True).head(10).to_dict(orient="records")
    
    # Format float values
    for item in top_performing + worst_performing:
        item["sales"] = round(item["sales"], 2)
        item["profit"] = round(item["profit"], 2)
        item["margin"] = round(item["margin"], 2)
        
    return {
        "top_performing": top_performing,
        "worst_performing": worst_performing
    }

@router.get("/segments")
def get_segments_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns profitability breakdown by customer segment and region comparison
    """
    query = db.query(
        Order.customer_segment,
        Order.region,
        Order.sales,
        Order.profit,
        Order.discount
    )
    query = apply_filters(query, start_date, end_date, region, category, sales_rep)
    orders = query.all()
    
    if not orders:
        return {"segments": [], "regions": []}
        
    df = pd.DataFrame([{
        "segment": o.customer_segment, 
        "region": o.region, 
        "sales": o.sales, 
        "profit": o.profit,
        "discount": o.discount
    } for o in orders])
    
    # Segment aggregation
    df_seg = df.groupby("segment").agg({
        "sales": "sum",
        "profit": "sum",
        "discount": "mean"
    }).reset_index()
    df_seg["margin"] = (df_seg["profit"] / df_seg["sales"] * 100).fillna(0.0)
    
    # Region aggregation
    df_reg = df.groupby("region").agg({
        "sales": "sum",
        "profit": "sum",
        "discount": "mean"
    }).reset_index()
    df_reg["margin"] = (df_reg["profit"] / df_reg["sales"] * 100).fillna(0.0)
    
    segments = df_seg.to_dict(orient="records")
    regions = df_reg.to_dict(orient="records")
    
    for item in segments + regions:
        item["sales"] = round(item["sales"], 2)
        item["profit"] = round(item["profit"], 2)
        item["discount"] = round(item["discount"] * 100, 2) # convert to %
        item["margin"] = round(item["margin"], 2)
        
    return {
        "segments": segments,
        "regions": regions
    }
