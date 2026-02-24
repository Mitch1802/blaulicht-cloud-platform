# Workflow ab BlaulichtCloud V1.0.0

Schritt 1: Herunterladen des Install/Update Skriptes

```bash
curl -sSL -o app_manager.sh "https://raw.githubusercontent.com/Mitch1802/BlaulichtCloud/main/install/app_manager.sh"
```

Schritt2: Schreibrechte vergeben

```bash
chmod +x app_manager.sh
```

Schritt3 Var1: Installationskript ausführen mit übergebenen Version, Domain, Port

```bash
./app_manager.sh install 1.0.0 blaulichtcloud.michael-web.at
```

Optional (für lokale Frontend-Entwicklung gegen Domain-API):

```bash
./app_manager.sh install 1.0.0 blaulichtcloud.michael-web.at 2432 true
```

Schritt3 Var2: Updateskript ausführen mit übergebenen Version

```bash
./app_manager.sh update 1.0.0 
```

Optional CORS-Liste beim Update explizit auf Dev-Modus umstellen:

```bash
./app_manager.sh update 1.0.0 "" "" true
```

Hinweis:

- Das Skript pflegt automatisch diese Security-Variablen in `.envs/.django`:
  - `DJANGO_ALLOWED_HOSTS`
  - `DJANGO_CORS_ALLOWED_ORIGINS`
  - `DJANGO_CSRF_TRUSTED_ORIGINS`
  - `DJANGO_SECURE_SSL_REDIRECT`
- Beim `update` werden fehlende Env-Dateien/Keys automatisch erstellt (`.env` und `.envs/.django`).
- Beim `update` werden bestehende Werte standardmäßig **nicht** überschrieben; überschrieben wird nur,
  wenn neue Parameter übergeben werden (z. B. `DOMAIN`/`HOST_PORT`).
- `DEV_CORS` (5. Parameter, `true|false`) steuert, ob `localhost:4200` in CORS/CSRF eingetragen wird.
- Standard für `DJANGO_SECURE_SSL_REDIRECT` ist `False` (Login/Redirect-Probleme hinter Proxy vermeiden);
  bei sauberem HTTPS-Setup kann der Wert manuell auf `True` gesetzt werden.
