# core/urls.py
from django.contrib import admin
from django.urls import path, include # Adicione 'include' aqui

urlpatterns = [
    path('admin/', admin.site.urls),
    # Adicione esta linha:
    # Ela diz ao Django para verificar o arquivo urls.py da nossa app
    # para qualquer URL que comece com 'api/'.
    path('api/', include('solver_api.urls')),
]