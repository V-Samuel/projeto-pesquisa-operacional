# solver_api/urls.py
from django.urls import path
from .views import solve_problem

urlpatterns = [
    # Quando alguém acessar '.../api/solve/', a função solve_problem será chamada.
    path('solve/', solve_problem, name='solve_problem'),
]