from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    ai,
    auth,
    budgets,
    categories,
    chat,
    dashboard,
    debts,
    expenses,
    goals,
    incomes,
    notifications,
    reports,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(expenses.router)
api_router.include_router(incomes.router)
api_router.include_router(budgets.router)
api_router.include_router(goals.router)
api_router.include_router(debts.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(ai.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
