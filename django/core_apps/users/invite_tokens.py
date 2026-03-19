from django.conf import settings
from django.core import signing

from .models import User


INVITE_TOKEN_SALT = "users.invite.v1"


def _invite_token_max_age_seconds() -> int:
    try:
        ttl_hours = int(getattr(settings, "USER_INVITE_TOKEN_TTL_HOURS", 48))
    except (TypeError, ValueError):
        ttl_hours = 48

    if ttl_hours < 1:
        ttl_hours = 1

    return ttl_hours * 3600


def make_invite_token(user: User) -> str:
    payload = {
        "uid": str(user.id),
        "pwd": str(user.password or ""),
    }
    return signing.dumps(payload, salt=INVITE_TOKEN_SALT)


def resolve_invite_token(token: str) -> User | None:
    try:
        payload = signing.loads(
            token,
            salt=INVITE_TOKEN_SALT,
            max_age=_invite_token_max_age_seconds(),
        )
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return None

    user_id = str(payload.get("uid", "")).strip()
    password_hash = str(payload.get("pwd", ""))

    if not user_id or not password_hash:
        return None

    user = User.objects.filter(id=user_id, is_active=True).first()
    if user is None:
        return None

    # Token wird nach Passwortänderung automatisch ungültig.
    if str(user.password or "") != password_hash:
        return None

    return user
