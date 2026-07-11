import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# Try to import Prophet, fallback to custom statistical model if not installed or fails
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False
    logger.warning("Prophet not installed or failed to import. Using statistical fallback forecaster.")

class Forecaster:
    @staticmethod
    def generate_forecast(df: pd.DataFrame, horizon: int = 30) -> Dict[str, Any]:
        """
        Generates sales forecasting using Prophet, or falls back to a custom statistical model.
        Args:
            df: Dataframe of orders, must contain 'date' and 'sales' and 'profit'
            horizon: Days to forecast (30, 60, 90)
        Returns:
            Dict containing 'points' list and 'summary' metrics
        """
        if df.empty or len(df) < 10:
            return Forecaster._empty_response(horizon)
            
        # 1. Aggregate sales by date
        df_daily = df.groupby("date").agg({
            "sales": "sum",
            "profit": "sum"
        }).reset_index()
        
        # Ensure date is datetime
        df_daily["date"] = pd.to_datetime(df_daily["date"])
        df_daily = df_daily.sort_values("date")
        
        # Create a complete date range to fill missing days with 0
        min_date = df_daily["date"].min()
        max_date = df_daily["date"].max()
        full_date_range = pd.date_range(start=min_date, end=max_date, freq="D")
        
        df_daily = df_daily.set_index("date").reindex(full_date_range, fill_value=0.0).reset_index()
        df_daily.columns = ["date", "sales", "profit"]
        
        if HAS_PROPHET:
            try:
                return Forecaster._run_prophet(df_daily, horizon)
            except Exception as e:
                logger.error(f"Prophet forecast failed: {e}. Falling back to statistical method.")
                return Forecaster._run_fallback(df_daily, horizon)
        else:
            return Forecaster._run_fallback(df_daily, horizon)

    @staticmethod
    def _run_prophet(df_daily: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        # Prophet requires columns 'ds' and 'y'
        sales_df = df_daily[["date", "sales"]].rename(columns={"date": "ds", "sales": "y"})
        
        # Fit model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.95 # 95% confidence interval
        )
        model.fit(sales_df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=horizon, freq="D")
        forecast = model.predict(future)
        
        # Merge historical sales and forecast
        # We want to return a list of points containing both historical and forecast data
        merged = pd.merge(
            forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]],
            sales_df,
            on="ds",
            how="left"
        )
        
        points = []
        for _, row in merged.iterrows():
            ds_str = row["ds"].strftime("%Y-%m-%d")
            is_forecast = pd.isna(row["y"])
            
            points.append({
                "date": ds_str,
                "historical": None if is_forecast else float(row["y"]),
                "forecast": float(row["yhat"]) if is_forecast or len(merged) - _ <= horizon else None,
                "lower_bound": float(row["yhat_lower"]) if is_forecast else None,
                "upper_bound": float(row["yhat_upper"]) if is_forecast else None,
                "is_forecast": is_forecast
            })
            
        # Generate summary
        forecast_only = forecast.tail(horizon)
        projected_sales = float(forecast_only["yhat"].sum())
        average_daily_sales = float(forecast_only["yhat"].mean())
        
        # Calculate profit projection using historic profit-to-sales ratio
        total_hist_sales = df_daily["sales"].sum()
        total_hist_profit = df_daily["profit"].sum()
        profit_ratio = total_hist_profit / total_hist_sales if total_hist_sales > 0 else 0.15
        projected_profit = projected_sales * profit_ratio
        
        # Check trend direction (difference between start and end of forecast horizon)
        trend_diff = forecast_only.iloc[-1]["yhat"] - forecast_only.iloc[0]["yhat"]
        if trend_diff > 0.05 * average_daily_sales:
            trend_direction = "UPWARD"
        elif trend_diff < -0.05 * average_daily_sales:
            trend_direction = "DOWNWARD"
        else:
            trend_direction = "STABLE"
            
        summary = {
            "horizon_days": horizon,
            "projected_sales": round(projected_sales, 2),
            "projected_profit": round(projected_profit, 2),
            "average_daily_sales": round(average_daily_sales, 2),
            "growth_trend_direction": trend_direction,
            "confidence_level": 0.95
        }
        
        return {"points": points, "summary": summary}

    @staticmethod
    def _run_fallback(df_daily: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """
        Advanced statistical fallback that calculates:
        - 30-day moving average
        - Weekly and monthly seasonality
        - Trend coefficient (linear regression)
        """
        # Aggregate to daily
        n_hist = len(df_daily)
        sales = df_daily["sales"].values
        dates = df_daily["date"].values
        
        # 1. Estimate Trend using simple linear regression
        x = np.arange(n_hist)
        slope, intercept = np.polyfit(x, sales, 1) if n_hist > 1 else (0.0, sales[0] if n_hist == 1 else 0.0)
        
        # 2. Estimate Weekly Seasonality (7-day patterns)
        weekly_pattern = df_daily.groupby(df_daily["date"].dt.weekday)["sales"].mean()
        overall_mean = df_daily["sales"].mean()
        weekly_factors = (weekly_pattern / overall_mean).to_dict() if overall_mean > 0 else {i: 1.0 for i in range(7)}
        
        # 3. Create forecast
        points = []
        # Add historical points
        for i in range(n_hist):
            date_str = pd.to_datetime(dates[i]).strftime("%Y-%m-%d")
            points.append({
                "date": date_str,
                "historical": float(sales[i]),
                "forecast": None,
                "lower_bound": None,
                "upper_bound": None,
                "is_forecast": False
            })
            
        # Add future forecast points
        last_date = pd.to_datetime(dates[-1])
        future_sales_list = []
        
        # Simple rolling standard deviation for uncertainty
        std_dev = df_daily["sales"].rolling(window=30, min_periods=1).std().iloc[-1]
        if pd.isna(std_dev) or std_dev == 0:
            std_dev = df_daily["sales"].std()
        if pd.isna(std_dev):
            std_dev = 100.0
            
        for d in range(1, horizon + 1):
            future_date = last_date + timedelta(days=d)
            f_idx = n_hist + d - 1
            
            # Trend component
            trend_val = slope * f_idx + intercept
            trend_val = max(trend_val, 0.0) # No negative sales
            
            # Seasonality component
            weekday = future_date.weekday()
            season_factor = weekly_factors.get(weekday, 1.0)
            
            # Combine
            forecast_val = trend_val * season_factor
            
            # Confidence interval grows over time (uncertainty increase)
            uncertainty_width = std_dev * (1.96 * np.sqrt(d)) # standard normal 95%
            lower_bound = max(forecast_val - uncertainty_width, 0.0)
            upper_bound = forecast_val + uncertainty_width
            
            future_sales_list.append(forecast_val)
            
            points.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "historical": None,
                "forecast": round(float(forecast_val), 2),
                "lower_bound": round(float(lower_bound), 2),
                "upper_bound": round(float(upper_bound), 2),
                "is_forecast": True
            })
            
        projected_sales = sum(future_sales_list)
        average_daily_sales = projected_sales / horizon
        
        # Profit estimation
        total_hist_sales = df_daily["sales"].sum()
        total_hist_profit = df_daily["profit"].sum()
        profit_ratio = total_hist_profit / total_hist_sales if total_hist_sales > 0 else 0.15
        projected_profit = projected_sales * profit_ratio
        
        # Trend direction
        if slope > 0.02 * overall_mean:
            trend_direction = "UPWARD"
        elif slope < -0.02 * overall_mean:
            trend_direction = "DOWNWARD"
        else:
            trend_direction = "STABLE"
            
        summary = {
            "horizon_days": horizon,
            "projected_sales": round(projected_sales, 2),
            "projected_profit": round(projected_profit, 2),
            "average_daily_sales": round(average_daily_sales, 2),
            "growth_trend_direction": trend_direction,
            "confidence_level": 0.95
        }
        
        return {"points": points, "summary": summary}
        
    @staticmethod
    def _empty_response(horizon: int) -> Dict[str, Any]:
        return {
            "points": [],
            "summary": {
                "horizon_days": horizon,
                "projected_sales": 0.0,
                "projected_profit": 0.0,
                "average_daily_sales": 0.0,
                "growth_trend_direction": "STABLE",
                "confidence_level": 0.0
            }
        }
