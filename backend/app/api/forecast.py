from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from datetime import date
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import Order, User, ActivityLog
from backend.app.schemas.schemas import ForecastResponse
from backend.app.services.forecaster import Forecaster
from backend.app.api.dashboard import apply_filters

router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.get("", response_model=ForecastResponse)
def get_forecast(
    horizon: int = Query(30, description="Forecast horizon in days (30, 60, 90)"),
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if horizon not in [30, 60, 90]:
        raise HTTPException(
            status_code=400,
            detail="Forecast horizon must be 30, 60, or 90 days."
        )
        
    # Get all matching orders
    query = db.query(
        Order.date,
        Order.sales,
        Order.profit
    )
    query = apply_filters(query, None, None, region, category, sales_rep)
    orders = query.all()
    
    if not orders or len(orders) < 10:
        raise HTTPException(
            status_code=404,
            detail="Insufficient historic data found to generate forecast. Need at least 10 orders."
        )
        
    # Load into DataFrame
    df = pd.DataFrame([{"date": o.date, "sales": o.sales, "profit": o.profit} for o in orders])
    df["date"] = pd.to_datetime(df["date"])
    
    # Run forecaster
    try:
        result = Forecaster.generate_forecast(df, horizon)
        
        # Log activity
        log = ActivityLog(
            user_id=current_user.id,
            action="GENERATE_FORECAST",
            details=f"Generated {horizon}-day sales forecast. Filters: region={region}, category={category}."
        )
        db.add(log)
        db.commit()
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating forecast: {str(e)}"
        )
