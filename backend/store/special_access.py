from django.utils import timezone


def user_has_special_access(user, asset=None):
    """
    Checks if a user has active complimentary/friend special free download permissions.
    - If user is admin/staff: True
    - If user has UserSpecialAccess with is_all_access_free and not expired: True
    - If asset is provided and user has asset in granted_assets and not expired: True
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False

    # Store staff administrators always have download capability
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True

    try:
        special_access = getattr(user, 'special_access', None)
        if not special_access:
            return False

        if not special_access.is_active():
            return False

        if special_access.is_all_access_free:
            return True

        if asset and special_access.granted_assets.filter(id=asset.id).exists():
            return True

    except Exception:
        return False

    return False
