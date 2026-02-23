try:
    from allauth.account.adapter import DefaultAccountAdapter
except ModuleNotFoundError:  # pragma: no cover
    class DefaultAccountAdapter:
        def save_user(self, request, user, form, commit=False):
            return user


class UserAdapter(DefaultAccountAdapter):

    def save_user(self, request, user, form, commit=False):
        user = super().save_user(request, user, form, commit)
        user.save()
        return user
