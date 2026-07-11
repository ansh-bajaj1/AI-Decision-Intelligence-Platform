from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import Order, User
from backend.app.schemas.schemas import OrderOut

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=List[OrderOut])
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Performs global case-insensitive search across:
    Product name, Region, City, Sales Representative, and Customer Segment.
    """
    search_pattern = f"%{q}%"
    results = db.query(Order).filter(
        or_(
            Order.product.ilike(search_pattern),
            Order.region.ilike(search_pattern),
            Order.city.ilike(search_pattern),
            Order.sales_rep.ilike(search_pattern),
            Order.customer_segment.ilike(search_pattern)
        )
    ).order_by(Order.date.desc()).limit(limit).all()
    
    return results
