import sys
import os
import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from passlib.hash import bcrypt
from sklearn.ensemble import IsolationForest

# Add the parent directory to the path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Order, ActivityLog

# Product catalog by category with base prices and costs
PRODUCT_CATALOG = {
    "Technology": [
        {"name": "iPhone 15 Pro", "price": 999.0, "cost": 650.0},
        {"name": "MacBook Pro M3", "price": 1999.0, "cost": 1300.0},
        {"name": "Dell UltraSharp 27 Monitor", "price": 349.0, "cost": 220.0},
        {"name": "Logitech MX Master 3S Mouse", "price": 99.0, "cost": 50.0},
        {"name": "Bose QuietComfort Headphones", "price": 329.0, "cost": 180.0},
        {"name": "iPad Air", "price": 599.0, "cost": 400.0},
        {"name": "Anker USB-C Hub", "price": 49.0, "cost": 20.0},
    ],
    "Office Supplies": [
        {"name": "Premium Paper Ream (500 sheets)", "price": 12.0, "cost": 4.0},
        {"name": "Bic Round Stic Pens (12-pack)", "price": 4.5, "cost": 1.2},
        {"name": "Heavy Duty Stapler", "price": 25.0, "cost": 10.0},
        {"name": "3M Post-it Notes Cube", "price": 8.0, "cost": 2.5},
        {"name": "Wilson Jones 3-Ring Binder", "price": 6.5, "cost": 2.0},
        {"name": "Fiskars Scissors", "price": 14.0, "cost": 5.0},
        {"name": "Dry Erase Whiteboard Markers", "price": 15.0, "cost": 5.5},
    ],
    "Furniture": [
        {"name": "Ergonomic Mesh Office Chair", "price": 299.0, "cost": 180.0},
        {"name": "Electric Standing Desk (55x28)", "price": 449.0, "cost": 280.0},
        {"name": "5-Shelf Wooden Bookshelf", "price": 120.0, "cost": 70.0},
        {"name": "Modern LED Table Lamp", "price": 45.0, "cost": 20.0},
        {"name": "Mobile 3-Drawer File Cabinet", "price": 159.0, "cost": 95.0},
        {"name": "L-Shaped Corner Computer Desk", "price": 249.0, "cost": 150.0},
        {"name": "Fabric Accent Reception Chair", "price": 199.0, "cost": 120.0},
    ]
}

REGIONS = {
    "West": {
        "cities": ["Seattle", "Los Angeles", "San Francisco", "Denver", "Phoenix"],
        "reps": ["Sarah Connor", "Abigail Williams"]
    },
    "East": {
        "cities": ["New York", "Boston", "Philadelphia", "Washington", "Miami"],
        "reps": ["John Doe", "Emily Stone"]
    },
    "Central": {
        "cities": ["Chicago", "Houston", "Dallas", "Minneapolis", "Detroit"],
        "reps": ["Robert Miller", "Jessica Davis"]
    },
    "South": {
        "cities": ["Atlanta", "Nashville", "Charlotte", "Orlando", "New Orleans"],
        "reps": ["Michael Smith", "David Taylor"]
    }
}

SEGMENTS = ["Consumer", "Corporate", "Home Office"]

def generate_sales_data(num_records=15500):
    print(f"Generating {num_records} synthetic retail sales records...")
    
    start_date = datetime.now() - timedelta(days=3 * 365) # 3 years ago
    
    records = []
    
    for i in range(num_records):
        # Progress logging
        if (i + 1) % 5000 == 0:
            print(f"Generated {i + 1} orders...")
            
        # Determine Date with trend and seasonality
        # Basic upward trend over time
        days_offset = random.randint(0, 3 * 365)
        order_date = start_date + timedelta(days=days_offset)
        
        # Seasonality: higher sales in Nov & Dec (holiday season), lower in Jan & Feb
        # Weekly seasonality: lower sales on Saturday and Sunday
        month = order_date.month
        weekday = order_date.weekday()
        
        # Check if we should duplicate or drop based on seasonality
        # Holiday seasonality multiplier
        season_mult = 1.3 if month in [11, 12] else (0.8 if month in [1, 2] else 1.0)
        # Weekend multiplier
        weekend_mult = 0.5 if weekday in [5, 6] else 1.0
        
        # Skip generation randomly to match seasonality patterns
        if random.random() > (season_mult * weekend_mult / 1.3):
            # Try once more with a new random day offset
            days_offset = random.randint(0, 3 * 365)
            order_date = start_date + timedelta(days=days_offset)
            month = order_date.month
            weekday = order_date.weekday()

        # Categories & Products
        category = random.choices(
            list(PRODUCT_CATALOG.keys()), 
            weights=[0.35, 0.40, 0.25], 
            k=1
        )[0]
        product_info = random.choice(PRODUCT_CATALOG[category])
        product_name = product_info["name"]
        
        # Base pricing
        base_price = product_info["price"]
        base_cost = product_info["cost"]
        
        # Quantity (normally small, occasionally large)
        quantity = random.choices(
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20], 
            weights=[30, 25, 15, 10, 8, 5, 3, 2, 1, 0.5, 0.3, 0.2], 
            k=1
        )[0]
        
        # Discount logic (mostly none, occasionally small, rarely large)
        discount = random.choices(
            [0.0, 0.1, 0.15, 0.2, 0.3, 0.5], 
            weights=[60, 15, 10, 8, 5, 2], 
            k=1
        )[0]
        
        # Region, City, Sales Rep
        region = random.choice(list(REGIONS.keys()))
        city = random.choice(REGIONS[region]["cities"])
        sales_rep = random.choice(REGIONS[region]["reps"])
        
        # Customer Segment
        segment = random.choices(SEGMENTS, weights=[0.50, 0.30, 0.20], k=1)[0]
        
        # Sales Calculation
        sales = quantity * base_price * (1.0 - discount)
        # Cost is Quantity * Base Cost. Profit = Sales - Cost
        cost = quantity * base_cost
        profit = sales - cost
        
        # Inject deliberate anomalies (about 1.5% of records)
        is_manual_anomaly = False
        if random.random() < 0.015:
            anomaly_type = random.choice(["high_discount", "pricing_error", "huge_quantity", "negative_profit"])
            if anomaly_type == "high_discount":
                # 80-90% discount on high value items
                discount = random.choice([0.8, 0.9])
                sales = quantity * base_price * (1.0 - discount)
                profit = sales - cost # High negative profit
            elif anomaly_type == "pricing_error":
                # Product price entered way too low (e.g. 10% of actual)
                sales = quantity * (base_price * 0.1) * (1.0 - discount)
                profit = sales - cost
            elif anomaly_type == "huge_quantity":
                # Unusual wholesale order quantity (e.g. 100-150 units)
                quantity = random.randint(100, 150)
                sales = quantity * base_price * (1.0 - discount)
                cost = quantity * base_cost
                profit = sales - cost
            elif anomaly_type == "negative_profit":
                # Unreasonably high cost (e.g. high shipping fee) resulting in massive loss
                sales = quantity * base_price * (1.0 - discount)
                cost = quantity * base_cost * 3.0 # Cost tripled
                profit = sales - cost
            is_manual_anomaly = True

        order_id_str = f"IQ-{order_date.strftime('%Y')}-{100000 + i}"
        
        records.append({
            "order_id": order_id_str,
            "date": order_date.date(),
            "region": region,
            "city": city,
            "product": product_name,
            "category": category,
            "quantity": quantity,
            "price": base_price,
            "discount": discount,
            "sales": round(sales, 2),
            "profit": round(profit, 2),
            "customer_segment": segment,
            "sales_rep": sales_rep
        })
        
    return pd.DataFrame(records)

def detect_anomalies(df):
    print("Running Isolation Forest for statistical anomaly detection...")
    
    # We will use Sales, Profit, Quantity, and Discount as features for the Isolation Forest
    features = df[["sales", "profit", "quantity", "discount"]].copy()
    
    # Standardize the features
    # Since Isolation Forest handles variables of different scales well, we can feed them directly
    # but Contamination is set to ~2.5% to capture both injected anomalies and extreme statistical outliers
    clf = IsolationForest(
        n_estimators=100, 
        contamination=0.025, 
        random_state=42
    )
    
    # Fit & Predict (-1 for outlier/anomaly, 1 for normal)
    preds = clf.fit_predict(features)
    
    df["is_anomaly"] = (preds == -1)
    
    anomaly_count = df["is_anomaly"].sum()
    print(f"Isolation Forest flagged {anomaly_count} orders as anomalies ({anomaly_count / len(df) * 100:.2f}% of data).")
    
    return df

def seed_database():
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Admin User if not exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Seeding default administrator account...")
            hashed_password = bcrypt.hash("password123")
            admin_user = User(
                username="admin",
                email="admin@insightiq.ai",
                hashed_password=hashed_password,
                role="Admin"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            # Log admin creation
            log = ActivityLog(
                user_id=admin_user.id,
                action="USER_REGISTER",
                details="Admin user seeded automatically during database setup."
            )
            db.add(log)
            db.commit()
            print("Admin user created (username: admin, password: password123)")
        else:
            print("Admin user already exists, skipping user seed.")
            
        # 2. Seed Orders if empty
        order_count = db.query(Order).count()
        if order_count == 0:
            df = generate_sales_data(15500)
            df = detect_anomalies(df)
            
            print("Inserting records into the PostgreSQL database...")
            # Convert dataframe to dict list for bulk insert
            order_objects = []
            
            for index, row in df.iterrows():
                order = Order(
                    order_id=row["order_id"],
                    date=row["date"],
                    region=row["region"],
                    city=row["city"],
                    product=row["product"],
                    category=row["category"],
                    quantity=row["quantity"],
                    price=row["price"],
                    discount=row["discount"],
                    sales=row["sales"],
                    profit=row["profit"],
                    customer_segment=row["customer_segment"],
                    sales_rep=row["sales_rep"],
                    is_anomaly=bool(row["is_anomaly"])
                )
                order_objects.append(order)
            
            # Chunk insertions to prevent memory issues or connection timeouts
            chunk_size = 2000
            for k in range(0, len(order_objects), chunk_size):
                db.bulk_save_objects(order_objects[k : k + chunk_size])
                db.commit()
                print(f"Inserted orders {k} to {min(k + chunk_size, len(order_objects))}...")
                
            print(f"Successfully seeded {len(order_objects)} sales records!")
        else:
            print(f"Database already contains {order_count} orders. Skipping orders seed.")
            
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting InsightIQ database migration & seeding process...")
    seed_database()
    print("Database seeding completed successfully.")
