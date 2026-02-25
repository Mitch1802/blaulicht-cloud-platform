# BlaulichtCloud
> [!IMPORTANT]
> interne Doku



### FEATURES / BUGS

***V2.0.0***
- Frontend: Neue 3 Layer Architektur

***V1.0.0***
- First Version 


## Github Action
Richtigen Secret Key in Production

## VERSION
Given a version number MAJOR.MINOR.PATCH, increment the:
MAJOR version when you make incompatible API changes
MINOR version when you add functionality in a backward compatible manner
PATCH version when you make backward compatible bug fixes

https://semver.org/

## Superuser
is_superuser==true dann nicht löschbar


## Homepage News
https://blaulichtcloud.at/api/v3/news/public/?typ=extern

## Tests (lokal)

Für lokale Django-Tests werden ein paar Environment-Variablen benötigt.

PowerShell (Beispiel):

```powershell
$env:DATABASE_URL='sqlite:///C:/Users/mr96/GitHub/blaulicht-cloud-platform/django/test_db.sqlite3'
$env:DJANGO_SECRET_KEY='test-secret-key'
$env:DJANGO_API_URL='api/v1/'
$env:PUBLIC_FAHRZEUG_PIN='1234'
$env:BLAULICHTSMS_API_URL='https://api.blaulichtsms.net/blaulicht'
$env:BLAULICHTSMS_API_USERNAME='myUser'
$env:BLAULICHTSMS_API_PASSWORD='mySuperSecretPwd'
$env:BLAULICHTSMS_API_CUSTOMER_IDS='100027,900027'
$env:VERSION='test'
C:/Users/mr96/GitHub/blaulicht-cloud-platform/.venv/Scripts/python.exe django/manage.py test
```

Nur Endpoint-Tests laufen lassen:

```powershell
C:/Users/mr96/GitHub/blaulicht-cloud-platform/.venv/Scripts/python.exe django/manage.py test core_apps.users.tests core_apps.fmd.tests core_apps.mitglieder.tests core_apps.modul_konfiguration.tests core_apps.konfiguration.tests core_apps.backup.tests core_apps.news.tests core_apps.inventar.tests core_apps.media.tests core_apps.atemschutz_masken.tests core_apps.atemschutz_geraete.tests core_apps.messgeraete.tests core_apps.pdf.tests core_apps.fahrzeuge.tests core_apps.verwaltung.tests
```