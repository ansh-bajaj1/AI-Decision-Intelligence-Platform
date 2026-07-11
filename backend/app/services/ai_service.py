import os
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import google.generativeai as genai

from backend.app.core.config import settings
from backend.app.models.models import Order, ChatMessage
from backend.app.schemas.schemas import AIInsightCard, AIInsightsResponse

logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Verify model availability
        # We use gemini-1.5-flash as the standard fast reasoning model
        _model = genai.GenerativeModel("gemini-1.5-flash")
        HAS_GEMINI = True
        logger.info("Gemini API initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        HAS_GEMINI = False
else:
    HAS_GEMINI = False
    logger.warning("GEMINI_API_KEY not configured. Running in Mock AI mode.")

class AIService:
    @staticmethod
    def get_database_summary(db: Session) -> Dict[str, Any]:
        """
        Retrieves aggregated sales data to feed into the LLM context.
        """
        # Overall Metrics
        total_sales, total_profit, total_orders = db.query(
            func.sum(Order.sales),
            func.sum(Order.profit),
            func.count(Order.id)
        ).first()
        
        # Region Aggregates
        region_stats = db.query(
            Order.region,
            func.sum(Order.sales).label("sales"),
            func.sum(Order.profit).label("profit")
        ).group_by(Order.region).all()
        
        # Category Aggregates
        category_stats = db.query(
            Order.category,
            func.sum(Order.sales).label("sales"),
            func.sum(Order.profit).label("profit")
        ).group_by(Order.category).all()
        
        # Anomaly Counts
        anomaly_count = db.query(func.count(Order.id)).filter(Order.is_anomaly == True).scalar()
        
        return {
            "overall": {
                "total_sales": float(total_sales or 0),
                "total_profit": float(total_profit or 0),
                "total_orders": int(total_orders or 0),
                "anomaly_count": int(anomaly_count or 0),
                "profit_margin": float((total_profit or 0) / (total_sales or 1) * 100)
            },
            "regions": [
                {"region": r.region, "sales": float(r.sales), "profit": float(r.profit), "margin": float(r.profit / r.sales * 100)}
                for r in region_stats
            ],
            "categories": [
                {"category": c.category, "sales": float(c.sales), "profit": float(c.profit), "margin": float(c.profit / c.sales * 100)}
                for c in category_stats
            ]
        }

    @staticmethod
    def generate_insights(db: Session) -> AIInsightsResponse:
        """
        Generates automated business recommendations based on database aggregates.
        """
        summary_data = AIService.get_database_summary(db)
        
        # Prepare context prompt
        context_prompt = f"""
        Analyze this business retail performance data and generate 4-5 key insights and recommendations.
        
        Overall Metrics:
        - Total Sales: ${summary_data['overall']['total_sales']:,.2f}
        - Total Profit: ${summary_data['overall']['total_profit']:,.2f}
        - Profit Margin: {summary_data['overall']['profit_margin']:.2f}%
        - Total Orders: {summary_data['overall']['total_orders']:,}
        - Anomalies Detected: {summary_data['overall']['anomaly_count']} orders (Isolation Forest outliers)
        
        Regional Metrics:
        {json.dumps(summary_data['regions'], indent=2)}
        
        Category Metrics:
        {json.dumps(summary_data['categories'], indent=2)}
        
        Provide your output as a JSON object with this structure:
        {{
            "summary": "An executive summary of findings (2-3 sentences)",
            "insights": [
                {{
                    "title": "A short descriptive title",
                    "metric": "Key supporting metric (e.g. Sales increased 12%)",
                    "description": "Elaborate on what happened and why.",
                    "type": "one of: success, warning, info, danger",
                    "recommendation": "Actionable business recommendation"
                }}
            ]
        }}
        
        Return ONLY valid JSON. No markdown wrappers.
        """
        
        if HAS_GEMINI:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(
                    context_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                data = json.loads(response.text.strip())
                
                # Format to schema
                cards = [AIInsightCard(**c) for c in data.get("insights", [])]
                return AIInsightsResponse(insights=cards, summary=data.get("summary", ""))
            except Exception as e:
                logger.error(f"Gemini insights generation failed: {e}. Falling back to template insights.")
        
        # Mock/Template Fallback
        return AIService._get_fallback_insights(summary_data)

    @staticmethod
    def answer_chat(db: Session, question: str, history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Handles QA chatbot queries using Gemini API or dynamic matching heuristics.
        """
        summary_data = AIService.get_database_summary(db)
        
        # Construct chat history context
        chat_context = ""
        for msg in history[-5:]: # Keep last 5 messages for context
            chat_context += f"{msg.role.upper()}: {msg.content}\n"
            
        system_prompt = f"""
        You are 'InsightIQ AI Assistant', a professional data analyst and strategic advisor for a major retail business.
        You have direct access to the aggregated sales statistics of the company database.
        
        Database Summary:
        - Total Sales: ${summary_data['overall']['total_sales']:,.2f}
        - Total Profit: ${summary_data['overall']['total_profit']:,.2f}
        - Margin: {summary_data['overall']['profit_margin']:.2f}%
        - Orders: {summary_data['overall']['total_orders']:,}
        - Anomalies Detected: {summary_data['overall']['anomaly_count']}
        
        Performance by Region:
        {json.dumps(summary_data['regions'], indent=2)}
        
        Performance by Category:
        {json.dumps(summary_data['categories'], indent=2)}
        
        Chat History:
        {chat_context}
        
        User Question: {question}
        
        Respond with an insightful, professional, and clear answer.
        Use bullet points and Markdown formatting where appropriate.
        Limit your answer to 3 paragraphs max. Be extremely direct and action-oriented.
        """
        
        suggested_questions = [
            "Why did profit decrease?",
            "Which region performs best?",
            "Which category should receive more investment?",
            "Summarize last month's performance."
        ]
        
        if HAS_GEMINI:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(system_prompt)
                return {
                    "response": response.text.strip(),
                    "suggested_questions": suggested_questions
                }
            except Exception as e:
                logger.error(f"Gemini chat failed: {e}. Falling back to statistical matching.")
                
        return {
            "response": AIService._get_fallback_chat_response(question, summary_data),
            "suggested_questions": suggested_questions
        }

    @staticmethod
    def _get_fallback_insights(summary: Dict[str, Any]) -> AIInsightsResponse:
        # Sort regions and categories to make recommendations dynamically accurate
        sorted_regions = sorted(summary["regions"], key=lambda x: x["sales"], reverse=True)
        sorted_categories = sorted(summary["categories"], key=lambda x: x["margin"], reverse=True)
        
        best_region = sorted_regions[0]
        worst_region = sorted_regions[-1]
        
        best_category = sorted_categories[0]
        worst_category = sorted_categories[-1]
        
        insights = [
            AIInsightCard(
                title=f"{best_region['region']} Region Dominance",
                metric=f"Sales: ${best_region['sales']:,.2f} (Margin: {best_region['margin']:.1f}%)",
                description=f"The {best_region['region']} region leads the company in sales, showing strong operational execution and high customer demand.",
                type="success",
                recommendation=f"Replicate the sales tactics and regional promotion campaigns of the {best_region['region']} region across other areas."
            ),
            AIInsightCard(
                title=f"Category Margin Optimization: {best_category['category']}",
                metric=f"Profit Margin: {best_category['margin']:.1f}%",
                description=f"{best_category['category']} represents our most lucrative product vertical, returning the highest profit dollar-for-dollar.",
                type="info",
                recommendation=f"Allocate higher inventory space and marketing investments to {best_category['category']} to maximize bottom-line profit."
            ),
            AIInsightCard(
                title=f"Discount Pressure on Profits",
                metric=f"Anomalies: {summary['overall']['anomaly_count']} detected",
                description=f"Isolation Forest flagged {summary['overall']['anomaly_count']} transactions with unusual discounts and margins, indicating pricing leakage.",
                type="warning",
                recommendation="Enforce discount authorization limits in sales portals. Audit order records marked as anomalies to review pricing rules."
            ),
            AIInsightCard(
                title=f"Underperforming Category: {worst_category['category']}",
                metric=f"Profit Margin: {worst_category['margin']:.1f}%",
                description=f"The {worst_category['category']} category is yielding poor returns, possibly due to aggressive discounting or high manufacturing costs.",
                type="danger",
                recommendation=f"Review the supply chain and pricing structure for {worst_category['category']}. Stop matching competitor discounts blindly."
            )
        ]
        
        exec_summary = f"Overall performance is solid with a {summary['overall']['profit_margin']:.1f}% profit margin on ${summary['overall']['total_sales']:,.2f} sales. " \
                       f"The {best_region['region']} region is leading sales, while the {best_category['category']} category is our key profitability driver. " \
                       f"Discount audits are recommended to address the {summary['overall']['anomaly_count']} identified order anomalies."
                       
        return AIInsightsResponse(insights=insights, summary=exec_summary)

    @staticmethod
    def _get_fallback_chat_response(question: str, summary: Dict[str, Any]) -> str:
        q = question.lower()
        
        sorted_regions = sorted(summary["regions"], key=lambda x: x["sales"], reverse=True)
        sorted_categories = sorted(summary["categories"], key=lambda x: x["margin"], reverse=True)
        
        best_region = sorted_regions[0]
        best_category = sorted_categories[0]
        worst_category = sorted_categories[-1]
        
        if "profit" in q and ("decrease" in q or "drop" in q or "low" in q):
            return f"""
### Profit Margin Analysis
Our overall profit margin stands at **{summary['overall']['profit_margin']:.2f}%**. Profits have experienced downward pressure due to:
* **Aggressive Discounting**: Multiple transactions in our database show discount levels exceeding 30%, which wipes out unit profits.
* **Underperforming Categories**: The *{worst_category['category']}* category is performing poorly, returning a net margin of only *{worst_category['margin']:.1f}%*.
* **Shipping/Operational Costs**: High costs associated with bulk orders are eroding profits.

**Recommendations:**
1. Enforce strict discount controls, limiting standard rep discounts to 15%.
2. Audit the {summary['overall']['anomaly_count']} transactions flagged as anomalies.
3. Review supplier costs for the *{worst_category['category']}* line.
"""
        elif "region" in q and ("best" in q or "perform" in q or "top" in q):
            return f"""
### Regional Performance Review
The **{best_region['region']} region** is our top-performing territory.
* **Total Sales**: ${best_region['sales']:,.2f}
* **Total Profit**: ${best_region['profit']:,.2f}
* **Profit Margin**: {best_region['margin']:.2f}%

Other regions in comparison:
{chr(10).join([f'* **{r["region"]}**: ${r["sales"]:,.2f} sales, {r["margin"]:.1f}% margin' for r in summary["regions"] if r["region"] != best_region["region"]])}

**Key Takeaway**: The *{best_region['region']}* region's success is driven by high sales representative productivity. We should host cross-regional training sessions.
"""
        elif "category" in q and ("investment" in q or "invest" in q or "promote" in q or "prioritize" in q):
            return f"""
### Strategic Product Investment
Based on sales volume and net margins, we should prioritize investment in **{best_category['category']}**.

* **Why Invest?**: It delivers a **{best_category['margin']:.1f}% profit margin**, generating **${best_category['profit']:,.2f}** in net income.
* **Action Plan**:
  * Direct 40% of Q3 digital marketing spend to products in this segment.
  * Increase warehouse stock limits by 15% to avoid stockouts on top-selling items.
  * Train representatives in other categories to cross-sell into this catalog.
"""
        elif "summarize" in q or "performance" in q or "summary" in q:
            return f"""
### Executive Performance Summary
Here is the high-level business status derived directly from our analytics engine:

* **Sales & Profitability**: Total sales are **${summary['overall']['total_sales']:,.2f}** with a net profit of **${summary['overall']['total_profit']:,.2f}**, yielding a **{summary['overall']['profit_margin']:.1f}%** net margin.
* **Top Verticals**: The *{best_region['region']}* region leads regional sales, while the *{best_category['category']}* category maintains the highest margin.
* **Risks & Anomalies**: **{summary['overall']['anomaly_count']}** transactions have been flagged as pricing/discounting anomalies by the Isolation Forest engine, requiring auditing.

Let me know if you would like me to drill down into any specific metric or write a forecast!
"""
        else:
            return f"""
Hello! I am your **InsightIQ AI Decision Assistant**. 

I have analyzed our database of **{summary['overall']['total_orders']:,}** orders. Here are quick statistics to guide your questions:
* **Total Revenue**: ${summary['overall']['total_sales']:,.2f}
* **Net Profit**: ${summary['overall']['total_profit']:,.2f}
* **Healthy Margin**: {summary['overall']['profit_margin']:.2f}%
* **Flagged Outliers**: {summary['overall']['anomaly_count']} (Pricing/Discount anomalies)

Feel free to ask me questions like:
1. *Why did profit decrease?*
2. *Which region performs best?*
3. *Which category should receive more investment?*
4. *Summarize last month's performance.*
"""
