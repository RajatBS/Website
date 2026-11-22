from django.urls import path

from core import views

urlpatterns = [
    path("", views.home, name="home"),
    path("robots.txt", views.robots, name="robots"),
    path("favicon.ico", views.favicon, name="favicon"),
]
