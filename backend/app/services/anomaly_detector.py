import pandas as pd
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    @staticmethod
    def detect(df: pd.DataFrame, contamination: float = 0.025) -> pd.Series:
        """
        Fits an Isolation Forest model to flag anomalous sales orders in the dataframe.
        Expects columns: 'sales', 'profit', 'quantity', 'discount'.
        Returns a boolean pandas Series where True indicates an anomaly.
        """
        required_cols = ["sales", "profit", "quantity", "discount"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Dataframe is missing required column: {col}")
        
        # If dataset is too small, skip ML fitting and return False
        if len(df) < 10:
            return pd.Series([False] * len(df), index=df.index)
            
        features = df[required_cols].copy()
        
        # Fit Isolation Forest
        clf = IsolationForest(
            n_estimators=100, 
            contamination=contamination, 
            random_state=42
        )
        
        # Predict: -1 for anomalies, 1 for normal
        preds = clf.fit_predict(features)
        
        return pd.Series(preds == -1, index=df.index)

    @staticmethod
    def detect_single(sales: float, profit: float, quantity: int, discount: float, history_df: pd.DataFrame) -> bool:
        """
        Evaluates a single order for anomaly relative to historical dataset.
        """
        if len(history_df) < 50:
            # Fallback to a simple heuristic if history is too small
            return discount > 0.5 or (profit < -200 and sales > 500)
            
        # Append new point to history
        new_row = pd.DataFrame([{
            "sales": sales, 
            "profit": profit, 
            "quantity": quantity, 
            "discount": discount
        }])
        
        combined = pd.concat([history_df[["sales", "profit", "quantity", "discount"]], new_row], ignore_index=True)
        anomalies = AnomalyDetector.detect(combined)
        
        # Return the classification of the last item
        return bool(anomalies.iloc[-1])
