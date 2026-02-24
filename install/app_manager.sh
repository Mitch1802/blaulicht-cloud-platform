#!/usr/bin/env bash
set -euo pipefail

#############################################
# FESTE VARIABLEN
#############################################
INSTALL_PATH="/srv/blaulichtcloud"
DOCKER_USER="mitch122"
API_VERSION="api/v1/"
SOFTWARE_NAME="blaulichtcloud"
NETWORK_NAME="blaulichtcloud_nw"
DEBUG=False
SECURE_SSL_REDIRECT_DEFAULT=False

ACTION=${1:-""}
VERSION=${2:-"1.0.0"}
DOMAIN=${3:-"blaulichtcloud.michael-web.at"}
PORT=${4:-"2432"}
DEV_CORS=$(echo "${5:-false}" | tr '[:upper:]' '[:lower:]')

DOMAIN_PROVIDED=false
PORT_PROVIDED=false
DEV_CORS_PROVIDED=false
if [ $# -ge 3 ] && [ -n "${3:-}" ]; then
    DOMAIN_PROVIDED=true
fi
if [ $# -ge 4 ] && [ -n "${4:-}" ]; then
    PORT_PROVIDED=true
fi
if [ $# -ge 5 ] && [ -n "${5:-}" ]; then
    DEV_CORS_PROVIDED=true
fi

if [ "$ACTION" != "install" ] && [ "$ACTION" != "update" ]; then
    echo "Usage: app_manager.sh [install|update] [VERSION] [DOMAIN] [PORT] [DEV_CORS]"
    echo "Beispiel für Update einer neuen Version: ./app_manager.sh update 1.0.0"
    exit 1
fi

if [ "$DEV_CORS" != "true" ] && [ "$DEV_CORS" != "false" ]; then
    echo "Fehler: DEV_CORS muss 'true' oder 'false' sein."
    echo "Beispiel: ./app_manager.sh install 1.0.0 example.com 2432 true"
    exit 1
fi

function upsert_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"

    if grep -q "^${key}=" "$file"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

function ensure_file_exists() {
    local file="$1"
    local dir
    dir="$(dirname "$file")"
    mkdir -p "$dir"
    touch "$file"
}

function set_env_var_if_missing() {
    local file="$1"
    local key="$2"
    local value="$3"

    if ! grep -q "^${key}=" "$file"; then
        echo "${key}=${value}" >> "$file"
    fi
}

#############################################
# FUNKTION: Installation
#############################################
function do_install() {
    echo "----------------------------------------"
    echo "INSTALLATION WIRD GESTARTET (Version: $VERSION)"
    echo "----------------------------------------"

    # Ordner anlegen
    if [ ! -d "$INSTALL_PATH" ]; then
        mkdir -p "$INSTALL_PATH"
        echo "Ordner $INSTALL_PATH wurde angelegt."
    fi

    # Env-Dateien generieren
    DJANGO_SECRET_KEY=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    mkdir -p "$INSTALL_PATH/.envs"

    cat <<EOF > "$INSTALL_PATH/.env"
DOMAIN=$DOMAIN
NAME=$SOFTWARE_NAME
VERSION=$VERSION
HOST_PORT=$PORT
EOF

    # Zusätzliche Hilfsvariable, die ggf. '-demo' entfernt:
    VERSION_CLEAN=${VERSION/-demo/}
    APP_ORIGIN="https://$DOMAIN"
    CORS_ORIGINS="$APP_ORIGIN"
    CSRF_TRUSTED_ORIGINS="$APP_ORIGIN"

    if [ "$DEV_CORS" = "true" ]; then
        CORS_ORIGINS="http://localhost:4200,http://127.0.0.1:4200,$APP_ORIGIN"
        CSRF_TRUSTED_ORIGINS="http://localhost:4200,http://127.0.0.1:4200,$APP_ORIGIN"
    fi

    cat <<EOF > "$INSTALL_PATH/.envs/.django"
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
DJANGO_DEBUG=$DEBUG
DJANGO_API_URL=$API_VERSION
VERSION=$VERSION_CLEAN
PUBLIC_FAHRZEUG_PIN=2432
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$DOMAIN
DJANGO_CORS_ALLOWED_ORIGINS=$CORS_ORIGINS
DJANGO_CSRF_TRUSTED_ORIGINS=$CSRF_TRUSTED_ORIGINS
DJANGO_SECURE_SSL_REDIRECT=$SECURE_SSL_REDIRECT_DEFAULT
EOF

    DB_URL="postgres://sh17vFE9ttPIuk1:$POSTGRES_PASSWORD@postgres:5432/app-live"

    cat <<EOF > "$INSTALL_PATH/.envs/.postgres"
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=app-live
POSTGRES_USER=sh17vFE9ttPIuk1
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=$DB_URL
EOF

    echo "ENV-Dateien erstellt unter $INSTALL_PATH."

    # Docker Compose File holen
    echo "Lade docker-compose.yml ..."
    curl -sSL -o "$INSTALL_PATH/docker-compose.yml" \
        "https://raw.githubusercontent.com/Mitch1802/blaulicht-cloud-platform/main/install/docker-compose.yml" || {
        echo "Fehler beim Herunterladen der docker-compose.yml"
        exit 1
    }
    echo "docker-compose.yml wurde heruntergeladen."

    # Netzwerk erstellen (falls nicht vorhanden)
    if [ -z "$(docker network ls --filter name=^$NETWORK_NAME$ --format='{{ .Name }}')" ]; then
        docker network create "$NETWORK_NAME"
        echo "Netzwerk $NETWORK_NAME erstellt."
    else
        echo "Netzwerk $NETWORK_NAME existiert bereits."
    fi

    cd "$INSTALL_PATH"
    echo "Ziehe Docker Images (pull) ..."
    docker compose pull

    # Container neu starten
    docker compose up -d

    echo "Warte 30 Sekunden, damit alles initialisiert ..."
    sleep 30

    # Django Superuser: Passwort generieren und setzen
    SUPERUSER_PASSWORD=$(openssl rand -hex 4)
    echo "Erstelle Django-Superuser (zufälliges Passwort wird gesetzt)"

    docker compose exec api python manage.py shell -c "\
from django.contrib.auth import get_user_model; \
from core_apps.users.models import Role; \
User = get_user_model(); \
# Superuser anlegen/aktualisieren
u, _ = User.objects.get_or_create(username='admin', defaults={'first_name': 'Created', 'last_name': 'Superuser'}); \
u.is_superuser = True; \
u.is_staff = True; \
u.set_password('$SUPERUSER_PASSWORD'); \
u.save(); \
# Rollen anlegen, falls nicht vorhanden
r_admin, _ = Role.objects.get_or_create(key='ADMIN', defaults={'verbose_name': 'ADMIN'}); \
r_member, _ = Role.objects.get_or_create(key='MITGLIED', defaults={'verbose_name': 'MITGLIED'}); \
# Nur ADMIN-Rolle zuweisen
u.roles.set([r_admin]); \
u.save(); \
print('Admin-Passwort gesetzt: $SUPERUSER_PASSWORD'); \
print('Rollen zugewiesen:', [r.key for r in u.roles.all()])"

    echo "----------------------------------------"
    echo "INSTALLATION ABGESCHLOSSEN."
    echo "----------------------------------------"
}

#############################################
# FUNKTION: Update
#############################################
function do_update() {
    echo "----------------------------------------"
    echo "UPDATE WIRD GESTARTET (Version: $VERSION)"
    echo "----------------------------------------"

    if [ ! -d "$INSTALL_PATH" ]; then
        echo "Fehler: Installationspfad $INSTALL_PATH existiert nicht."
        echo "Bitte zuerst install ausführen, oder Pfad anpassen."
        exit 1
    fi
    cd "$INSTALL_PATH"

    ensure_file_exists ".env"
    ensure_file_exists ".envs/.django"

    # Container stoppen
    docker compose down

    # Docker-Compose neu herunterladen
    echo "Aktualisiere docker-compose.yml aus GitHub ..."
    curl -sSL -o "docker-compose.yml" \
        "https://raw.githubusercontent.com/Mitch1802/blaulicht-cloud-platform/main/install/docker-compose.yml" || {
        echo "Fehler beim Herunterladen der docker-compose.yml"
        exit 1
    }

    # Versions-Eintrag in Env-Files aktualisieren
    echo "Aktualisiere Versionseintrag auf $VERSION in Env-Files ..."
    upsert_env_var ".env" "VERSION" "$VERSION"
    set_env_var_if_missing ".env" "NAME" "$SOFTWARE_NAME"

    if [ "$PORT_PROVIDED" = true ]; then
        upsert_env_var ".env" "HOST_PORT" "$PORT"
    else
        set_env_var_if_missing ".env" "HOST_PORT" "$PORT"
    fi

    # Security-/Host-Variablen in .envs/.django ergänzen/aktualisieren
    DOMAIN_CURRENT=$(grep -E '^DOMAIN=' .env | cut -d'=' -f2- || true)
    if [ -z "$DOMAIN_CURRENT" ]; then
        DOMAIN_CURRENT="$DOMAIN"
    fi

    if [ "$DOMAIN_PROVIDED" = true ]; then
        upsert_env_var ".env" "DOMAIN" "$DOMAIN"
        DOMAIN_CURRENT="$DOMAIN"
    else
        set_env_var_if_missing ".env" "DOMAIN" "$DOMAIN_CURRENT"
    fi

    # Core-Variablen in .envs/.django ergänzen/aktualisieren
    set_env_var_if_missing ".envs/.django" "DJANGO_DEBUG" "$DEBUG"
    set_env_var_if_missing ".envs/.django" "DJANGO_API_URL" "$API_VERSION"
    upsert_env_var ".envs/.django" "VERSION" "${VERSION/-demo/}"
    set_env_var_if_missing ".envs/.django" "PUBLIC_FAHRZEUG_PIN" "2432"

    APP_ORIGIN="https://$DOMAIN_CURRENT"
    CORS_ORIGINS="$APP_ORIGIN"
    CSRF_TRUSTED_ORIGINS="$APP_ORIGIN"

    if [ "$DEV_CORS" = "true" ]; then
        CORS_ORIGINS="http://localhost:4200,http://127.0.0.1:4200,$APP_ORIGIN"
        CSRF_TRUSTED_ORIGINS="http://localhost:4200,http://127.0.0.1:4200,$APP_ORIGIN"
    fi

    if [ "$DOMAIN_PROVIDED" = true ]; then
        upsert_env_var ".envs/.django" "DJANGO_ALLOWED_HOSTS" "$DOMAIN_CURRENT,localhost,127.0.0.1"
        upsert_env_var ".envs/.django" "DJANGO_CORS_ALLOWED_ORIGINS" "$CORS_ORIGINS"
        upsert_env_var ".envs/.django" "DJANGO_CSRF_TRUSTED_ORIGINS" "$CSRF_TRUSTED_ORIGINS"
    elif [ "$DEV_CORS_PROVIDED" = true ]; then
        upsert_env_var ".envs/.django" "DJANGO_CORS_ALLOWED_ORIGINS" "$CORS_ORIGINS"
        upsert_env_var ".envs/.django" "DJANGO_CSRF_TRUSTED_ORIGINS" "$CSRF_TRUSTED_ORIGINS"
    else
        set_env_var_if_missing ".envs/.django" "DJANGO_ALLOWED_HOSTS" "$DOMAIN_CURRENT,localhost,127.0.0.1"
        set_env_var_if_missing ".envs/.django" "DJANGO_CORS_ALLOWED_ORIGINS" "$CORS_ORIGINS"
        set_env_var_if_missing ".envs/.django" "DJANGO_CSRF_TRUSTED_ORIGINS" "$CSRF_TRUSTED_ORIGINS"
    fi

    set_env_var_if_missing ".envs/.django" "DJANGO_SECURE_SSL_REDIRECT" "$SECURE_SSL_REDIRECT_DEFAULT"

    # Neue Images holen
    echo "Ziehe neue Images (docker compose pull) ..."
    docker compose pull

    # Container neu starten
    docker compose up -d

    # Ungenutzte Volumes entfernen
    docker volume prune -f

    echo "----------------------------------------"
    echo "UPDATE ABGESCHLOSSEN."
    echo "----------------------------------------"
}

# Hauptablauf
case "$ACTION" in
    install)
        do_install
        ;;
    update)
        do_update
        ;;
    *)
        echo "Falscher Parameter. Usage: $0 [install|update] [VERSION]"
        exit 1
        ;;
esac
