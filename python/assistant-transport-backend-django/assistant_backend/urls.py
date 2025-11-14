from django.urls import path
from api import views

urlpatterns = [
    path("assistant", views.assistant_endpoint, name="assistant"),
    path("health", views.health_check, name="health"),
]
