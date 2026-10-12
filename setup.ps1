# ============================================
# Salon Trac -- setup.ps1
# Potpuni reset i inicijalizacija aplikacije
# Pokretanje: .\setup.ps1
# ============================================

Write-Host "Salon Trac -- pokretanje setup-a..." -ForegroundColor Magenta

# 1. Pokreni Docker kontejnere
Write-Host ""
Write-Host "Pokretanje Docker kontejnera..." -ForegroundColor Cyan
docker compose up -d

# 2. Sacekaj da baze budu spremne
Write-Host "Cekam da baze budu spremne (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 3. Reset salon-db (ukljucujuci rezervacije)
Write-Host ""
Write-Host "Brisanje svih podataka iz salon-db..." -ForegroundColor Cyan
docker exec salon-db psql -U salon -d salon_db -c "TRUNCATE public.reservations, public.services, public.categories, public.settings, public.salon_hours, public.allowed_currencies RESTART IDENTITY CASCADE;" 2>$null

# 4. docker cp -- jedini siguran nacin za UTF-8 na Windowsu
Write-Host ""
Write-Host "Kopiranje init.sql u kontejner (docker cp)..." -ForegroundColor Cyan
docker cp .\apps\init.sql salon-db:/tmp/init.sql

Write-Host "Inicijalizacija salon-db..." -ForegroundColor Cyan
docker exec salon-db psql -U salon -d salon_db -f /tmp/init.sql

# 5. Reset portal-db
Write-Host ""
Write-Host "Brisanje podataka iz portal-db..." -ForegroundColor Cyan
docker exec portal-db psql -U portal -d portal_db -c "TRUNCATE portal_reservation_items, portal_reservations RESTART IDENTITY CASCADE;" 2>$null

# 6. Obrisi Redis kas
Write-Host ""
Write-Host "Brisanje Redis kesa..." -ForegroundColor Cyan
docker exec redis redis-cli DEL catalog:v1 | Out-Null
docker exec redis redis-cli DEL settings:v1 | Out-Null

# 7. Provera kategorija
Write-Host ""
Write-Host "Provera kategorija (srpska slova):" -ForegroundColor Green
docker exec salon-db psql -U salon -d salon_db -c "SELECT id, name FROM public.categories ORDER BY id;"

# 8. Provera usluga
Write-Host ""
Write-Host "Provera usluga:" -ForegroundColor Green
docker exec salon-db psql -U salon -d salon_db -c "SELECT id, name, max_clients FROM public.services ORDER BY id;"

Write-Host ""
Write-Host "Setup zavrsen! Aplikacija je dostupna na:" -ForegroundColor Magenta
Write-Host "   http://localhost:5173       -- Glavna aplikacija" -ForegroundColor White
Write-Host "   http://localhost:5173/admin -- Admin panel (admin/admin123)" -ForegroundColor White
Write-Host "   http://localhost:5174       -- Reporting portal" -ForegroundColor White
