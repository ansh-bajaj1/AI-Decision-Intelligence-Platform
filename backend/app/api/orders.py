from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import Order, User, ActivityLog
from backend.app.schemas.schemas import OrderOut, OrderCreate
from backend.app.services.anomaly_detector import AnomalyDetector
from backend.app.api.dashboard import apply_filters

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("", response_model=List[OrderOut])
def get_orders_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    region: Optional[str] = None,
    category: Optional[str] = None,
    sales_rep: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * page_size
    query = db.query(Order)
    query = apply_filters(query, None, None, region, category, sales_rep)
    orders = query.order_by(Order.date.desc()).offset(offset).limit(page_size).all()
    return orders

@router.get("/{order_id_val}", response_model=OrderOut)
def get_order_by_id(
    order_id_val: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.order_id == order_id_val).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if order_id already exists
    existing = db.query(Order).filter(Order.order_id == order_in.order_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Order with ID {order_in.order_id} already exists."
        )
        
    # Check for anomaly dynamically relative to history
    # Load recent 100 orders to serve as baseline history
    history_orders = db.query(Order).order_by(Order.date.desc()).limit(100).all()
    history_df = pd.DataFrame([{
        "sales": h.sales,
        "profit": h.profit,
        "quantity": h.quantity,
        "discount": h.discount
    } for h in history_orders])
    
    # Calculate anomaly flag
    is_anom = AnomalyDetector.detect_single(
        sales=order_in.sales,
        profit=order_in.profit,
        quantity=order_in.quantity,
        discount=order_in.discount,
        history_df=history_df
    )
    
    db_order = Order(
        order_id=order_in.order_id,
        date=order_in.date,
        region=order_in.region,
        city=order_in.city,
        product=order_in.product,
        category=order_in.category,
        quantity=order_in.quantity,
        price=order_in.price,
        discount=order_in.discount,
        sales=order_in.sales,
        profit=order_in.profit,
        customer_segment=order_in.customer_segment,
        sales_rep=order_in.sales_rep,
        is_anomaly=is_anom
    )
    
    db.add(db_order)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="CREATE_ORDER",
        details=f"Created order {db_order.order_id}. Flagged anomaly={is_anom}."
    )
    db.add(log)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.put("/{id}", response_model=OrderOut)
def update_order(
    id: int,
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_order = db.query(Order).filter(Order.id == id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Recalculate anomaly
    history_orders = db.query(Order).order_by(Order.date.desc()).limit(100).all()
    history_df = pd.DataFrame([{
        "sales": h.sales,
        "profit": h.profit,
        "quantity": h.quantity,
        "discount": h.discount
    } for h in history_orders])
    
    is_anom = AnomalyDetector.detect_single(
        sales=order_in.sales,
        profit=order_in.profit,
        quantity=order_in.quantity,
        discount=order_in.discount,
        history_df=history_df
    )
    
    # Update fields
    for field, value in order_in.model_dump().items():
        setattr(db_order, field, value)
    db_order.is_anomaly = is_anom
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="UPDATE_ORDER",
        details=f"Updated order {db_order.order_id}."
    )
    db.add(log)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_order = db.query(Order).filter(Order.id == id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db.delete(db_order)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="DELETE_ORDER",
        details=f"Deleted order record with database ID {id}."
    )
    db.add(log)
    db.commit()
    return None
