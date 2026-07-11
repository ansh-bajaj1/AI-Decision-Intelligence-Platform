from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from backend.app.models.models import User, ActivityLog, FavoriteDashboard
from backend.app.schemas.schemas import (
    UserCreate, UserLogin, UserOut, Token, ActivityLogOut, FavoriteDashboardOut, FavoriteDashboardCreate
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username exists
    user_exists = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    # Hash password and save
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        role="User"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log registration activity
    log = ActivityLog(
        user_id=db_user.id,
        action="USER_REGISTER",
        details=f"User {db_user.username} registered successfully."
    )
    db.add(log)
    db.commit()
    
    return db_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token = create_access_token(subject=user.id)
    
    # Log login activity
    log = ActivityLog(
        user_id=user.id,
        action="USER_LOGIN",
        details=f"User {user.username} logged in."
    )
    db.add(log)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Log logout activity
    log = ActivityLog(
        user_id=current_user.id,
        action="USER_LOGOUT",
        details=f"User {current_user.username} logged out."
    )
    db.add(log)
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/activity-logs", response_model=List[ActivityLogOut])
def get_activity_logs(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id
    ).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return logs

@router.get("/favorites", response_model=List[FavoriteDashboardOut])
def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favs = db.query(FavoriteDashboard).filter(
        FavoriteDashboard.user_id == current_user.id
    ).all()
    return favs

@router.post("/favorites", response_model=FavoriteDashboardOut)
def add_favorite(
    fav_in: FavoriteDashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if already favorited
    existing = db.query(FavoriteDashboard).filter(
        FavoriteDashboard.user_id == current_user.id,
        FavoriteDashboard.dashboard_name == fav_in.dashboard_name
    ).first()
    if existing:
        return existing
        
    fav = FavoriteDashboard(
        user_id=current_user.id,
        dashboard_name=fav_in.dashboard_name
    )
    db.add(fav)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="ADD_FAVORITE",
        details=f"Dashboard '{fav_in.dashboard_name}' added to favorites."
    )
    db.add(log)
    db.commit()
    db.refresh(fav)
    return fav

@router.delete("/favorites/{id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fav = db.query(FavoriteDashboard).filter(
        FavoriteDashboard.id == id,
        FavoriteDashboard.user_id == current_user.id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
        
    db.delete(fav)
    
    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="REMOVE_FAVORITE",
        details=f"Favorite dashboard deleted."
    )
    db.add(log)
    db.commit()
    return None
