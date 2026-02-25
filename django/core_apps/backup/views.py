import os, datetime, subprocess, environ, zipfile, shutil, logging

from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse
from core_apps.common.permissions import HasAnyRolePermission

env = environ.Env()
logger = logging.getLogger(__name__)

backup_path = "/app/backups/"
uploaded_files_dir = "/app/mediafiles/"
version = env('VERSION')

# Tabelle, die nicht exportiert werden sollen
excluded_tables = [
    "account_emailaddress",
    "account_emailconfirmation",
    "auth_group",
    "auth_group_permissions",
    "auth_permission",
    "authtoken_token",
    "django_admin_log",
    "django_content_type",
    "django_migrations",
    "django_session",
    "socialaccount_socialaccount",
    "socialaccount_socialapp",
    "socialaccount_socialtoken"
]

class BackupGetPostView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN")]

    def get(self, request, *args, **kwargs):
        backups = os.listdir(backup_path)
        return Response({'backups': backups})

    def post(self, request, *args, **kwargs):
        try:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            sql_filename = f"backup_{version}_{timestamp}.sql"
            sql_path = os.path.join(backup_path, sql_filename)

            pg_dump_cmd = [
                "pg_dump",
                "--host", env("POSTGRES_HOST"),
                "--username", env("POSTGRES_USER"),
                "--dbname", env("POSTGRES_DB"),
                "--encoding=UTF8",
                "--data-only",        
                "--no-owner",           
                "--no-acl"              
            ]

            for table in excluded_tables:
                pg_dump_cmd.extend(["--exclude-table", f"public.{table}"])

            pg_dump_cmd.extend(["--file", sql_path])

            subprocess.run(pg_dump_cmd, check=True, env={"PGPASSWORD": env("POSTGRES_PASSWORD")})


            zip_filename = f"backup_{version}_{timestamp}.zip"
            zip_path = os.path.join(backup_path, zip_filename)

            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.write(sql_path, os.path.basename(sql_path))

                for root, _, files in os.walk(uploaded_files_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join("uploaded_files", os.path.relpath(file_path, uploaded_files_dir))
                        zipf.write(file_path, arcname)

            os.remove(sql_path)
            msg = f"Backup {zip_filename} wurde erfolgreich erstellt!"
        except subprocess.CalledProcessError as e:
            msg = f"Fehler beim Erstellen des Backups: {str(e)}"

        backups = os.listdir(backup_path)
        return Response({'msg': msg, 'backups': backups})


class RestorePostView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN")]

    def post(self, request, *args, **kwargs):
        version = env('VERSION')
        msg = ""
        backupname = request.data['backup']
        backups = os.listdir(backup_path)
        backup_tokens = backupname.split('_')
        backup_version = backup_tokens[1] if len(backup_tokens) > 1 else ""

        if backupname in backups and backupname.endswith('.zip') and backup_version == version:
            backup_zip_path = os.path.join(backup_path, backupname)
            try:
                for root, _, files in os.walk(uploaded_files_dir):
                    for f in files:
                        os.remove(os.path.join(root, f))

                with zipfile.ZipFile(backup_zip_path, 'r') as zipf:
                    extracted_items = zipf.namelist()
                    sql_filename = next((f for f in extracted_items if f.endswith('.sql')), None)
                    local_sql_path = None

                    if sql_filename:
                        local_sql_path = os.path.join(backup_path, os.path.basename(sql_filename))

                        with zipf.open(sql_filename, 'r') as source, open(local_sql_path, 'wb') as target:
                            shutil.copyfileobj(source, target)

                    if local_sql_path and os.path.exists(local_sql_path):
                        list_tables_cmd = [
                            "psql",
                            "--host", env("POSTGRES_HOST"),
                            "--username", env("POSTGRES_USER"),
                            "--dbname", env("POSTGRES_DB"),
                            "--no-align",
                            "--tuples-only",
                            "--command", "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
                        ]
                        list_result = subprocess.run(
                            list_tables_cmd,
                            capture_output=True,
                            text=True,
                            env={"PGPASSWORD": env("POSTGRES_PASSWORD")}
                        )
                        all_tables = list_result.stdout.strip().split("\n")
                        all_tables = [t.strip() for t in all_tables if t.strip()]
                        tables_to_truncate = [t for t in all_tables if t not in excluded_tables]

                        if tables_to_truncate:
                            truncate_sql = (
                                "TRUNCATE TABLE "
                                + ", ".join(f"\"public\".\"{t}\"" for t in tables_to_truncate)
                                + " RESTART IDENTITY CASCADE;"
                            )
                            subprocess.run([
                                "psql",
                                "--host", env("POSTGRES_HOST"),
                                "--username", env("POSTGRES_USER"),
                                "--dbname", env("POSTGRES_DB"),
                                "--command", truncate_sql
                            ],
                            check=True,
                            env={"PGPASSWORD": env("POSTGRES_PASSWORD")})

                        subprocess.run([
                            "psql",
                            "--host", env("POSTGRES_HOST"),
                            "--username", env("POSTGRES_USER"),
                            "--dbname", env("POSTGRES_DB"),
                            "--file", local_sql_path
                        ],
                        check=True,
                        env={"PGPASSWORD": env("POSTGRES_PASSWORD")})

                        os.remove(local_sql_path)

                    for member in zipf.infolist():
                        if member.filename.startswith("uploaded_files/"):
                            relative_path = member.filename[len("uploaded_files/"):]
                            if not relative_path:
                                continue

                            target_path = os.path.join(uploaded_files_dir, relative_path)

                            if member.is_dir():
                                os.makedirs(target_path, exist_ok=True)
                            else:
                                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                                with zipf.open(member, 'r') as source_file, open(target_path, 'wb') as target_file:
                                    shutil.copyfileobj(source_file, target_file)

                msg = f"Backup {backupname} wurde erfolgreich wiederhergestellt!"
            except subprocess.CalledProcessError as e:
                msg = f"Fehler beim Wiederherstellen des Backups: {str(e)}"
        else:
            raise ValidationError(f"Backup nicht gefunden oder ungültig: {backupname}")

        response =  Response({
            'msg': msg,
        })
        response.delete_cookie('sessionid')
        response.delete_cookie('app-access-token')
        return response


class BackupGetFileView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN")]

    def post(self, request, *args, **kwargs):
        filename = request.data['backup']
        if filename.endswith(".zip"):
            dateipfad = os.path.join(backup_path, filename)
        
            if os.path.isfile(dateipfad):
                logger.info(f'Vollständiger Pfad: {dateipfad}')
                file = open(os.path.join(backup_path, filename), 'rb')
                response = FileResponse(file, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:
                raise ValidationError("Die .zip-Datei existiert nicht im angegebenen Pfad.")
        else:
            raise ValidationError("Die angegebene Datei ist keine .zip-Datei.")
        


class BackupDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN")]

    def post(self, request, *args, **kwargs):
        backupname = request.data.get('backup', '')
        backups = os.listdir(backup_path)

        if backupname in backups:
            backup_path_to_delete = os.path.join(backup_path, backupname)
            try:
                os.remove(backup_path_to_delete)
                msg = f"Backup {backupname} wurde erfolgreich gelöscht!"
            except OSError as e:
                msg = f"Fehler beim Löschen des Backups: {str(e)}"
        else:
            raise ValidationError(f"Backup nicht gefunden: {backupname}")

        updated_backups = os.listdir(backup_path)
        return Response({'msg': msg, 'backups': updated_backups})
