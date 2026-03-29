@echo off
cd /d "%~dp0"
echo Listening on all interfaces — use http://YOUR-PC-NAME:8000 or http://YOUR-LAN-IP:8000
python manage.py runserver 0.0.0.0:8000
