from app.services.intelligence import IntelligenceService  # type: ignore


def get_intelligence_service() -> IntelligenceService:
    return IntelligenceService()

# Add database session dependencies here when ready
# def get_db() -> Generator:
#     try:
#         db = SessionLocal()
#         yield db
#     finally:
#         db.close()
