import os
from dotenv import load_dotenv

# Load env variables from root directory if it exists, or local directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))
load_dotenv()

class Settings:
    PROJECT_NAME: str = "InsightIQ AI Decision Intelligence Platform"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/insightiq"
    )
    
    # Auth configuration
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", 
        "8f95c4a4dae6a9829bdf533b66d4000305886d9a930bb397223b2024db57e2bb"
    )
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "94d7bfa5db2f4a43b2f56f4e69b0fa8ad7743d7890b0ee5744a7bb2e66487e91"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv(
        "GEMINI_API_KEY", 
        ""
    )

settings = Settings()
