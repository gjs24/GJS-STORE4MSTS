from decimal import Decimal
from django.utils import timezone
from .models import Order
from .special_access import user_has_special_access


def calculate_early_access_status(asset, user):
    """
    Computes early access eligibility and dynamic pricing for a given asset and user,
    factoring in VIP early access start/end schedules.
    """
    try:
        required_assets = list(asset.early_access_required_assets.all())
    except Exception:
        required_assets = []
    required_ids = [a.id for a in required_assets]
    required_titles = [a.title for a in required_assets]

    now = timezone.now()
    starts_at = getattr(asset, "early_access_starts_at", None)
    ends_at = getattr(asset, "early_access_ends_at", None)

    is_early_access_active = True
    is_early_access_pending = False

    if getattr(asset, "early_access_enabled", False):
        if starts_at and now < starts_at:
            is_early_access_active = False
            is_early_access_pending = True
        if ends_at and now > ends_at:
            is_early_access_active = False
    else:
        is_early_access_active = False

    base_price = asset.price
    is_prebooking = bool(getattr(asset, "prebooking_enabled", False))
    prebooking_price = getattr(asset, "prebooking_price", None)
    if is_prebooking and prebooking_price is not None and prebooking_price > Decimal("0.00"):
        base_price = prebooking_price

    default_result = {
        "is_eligible": False,
        "can_access_early": False,
        "has_early_discount": False,
        "is_early_access_active": is_early_access_active,
        "is_early_access_pending": is_early_access_pending,
        "effective_price": base_price,
        "discount_percent": round(float((asset.price - base_price) / asset.price) * 100) if (asset.price > Decimal("0.00") and asset.price > base_price) else 0,
        "savings_amount": f"{max(Decimal('0.00'), asset.price - base_price):.2f}",
        "is_prebooking": is_prebooking,
        "required_asset_ids": required_ids,
        "required_asset_titles": required_titles,
    }

    if not user or not getattr(user, "is_authenticated", False):
        return default_result

    if user_has_special_access(user, asset):
        return {
            "is_eligible": True,
            "can_access_early": True,
            "has_early_discount": False,
            "is_early_access_active": True,
            "is_early_access_pending": False,
            "effective_price": Decimal("0.00"),
            "discount_percent": 100,
            "savings_amount": f"{asset.price:.2f}",
            "is_prebooking": is_prebooking,
            "required_asset_ids": required_ids,
            "required_asset_titles": required_titles,
        }

    if not getattr(asset, "early_access_enabled", False):
        return default_result

    # Check eligibility:
    # If specific prerequisite assets are selected, user must have bought ANY of them with PAID or APPROVED status.
    if required_assets:
        is_eligible = Order.objects.filter(
            user=user,
            asset_id__in=required_ids,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
        ).exists()
    else:
        # If no specific required asset is set, any prior paid order qualifies
        is_eligible = Order.objects.filter(
            user=user,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
        ).exists()

    if not is_eligible:
        return default_result

    # User is eligible!
    can_access_early = bool(getattr(asset, "early_access_has_access", False)) and is_early_access_active
    has_early_discount = bool(getattr(asset, "early_access_has_discount", False)) and is_early_access_active

    effective_price = base_price
    discount_percent = 0

    if has_early_discount and not asset.is_free:
        early_price = getattr(asset, "early_access_price", None)
        discount_pct = getattr(asset, "early_access_discount_percent", 0) or 0
        if early_price is not None and early_price > Decimal("0.00") and early_price < base_price:
            effective_price = early_price
            if asset.price > Decimal("0.00") and asset.price > effective_price:
                discount_percent = round(float((asset.price - effective_price) / asset.price) * 100)
            else:
                discount_percent = 0
        elif discount_pct > 0:
            discount_percent = int(discount_pct)
            multiplier = (Decimal("100") - Decimal(discount_percent)) / Decimal("100")
            effective_price = round(base_price * multiplier, 2)
            # Recalculate total discount percent relative to standard asset.price
            if asset.price > Decimal("0.00") and asset.price > effective_price:
                discount_percent = round(float((asset.price - effective_price) / asset.price) * 100)

    effective_price = max(Decimal("0.00"), effective_price)
    savings = max(Decimal("0.00"), asset.price - effective_price)

    return {
        "is_eligible": True,
        "can_access_early": can_access_early,
        "has_early_discount": has_early_discount,
        "is_early_access_active": is_early_access_active,
        "is_early_access_pending": is_early_access_pending,
        "effective_price": effective_price,
        "discount_percent": discount_percent,
        "savings_amount": f"{savings:.2f}",
        "is_prebooking": is_prebooking,
        "required_asset_ids": required_ids,
        "required_asset_titles": required_titles,
    }


def get_cached_early_access_status(asset, request):
    user = getattr(request, "user", None) if request else None
    user_id = getattr(user, "id", None) if getattr(user, "is_authenticated", False) else "anon"
    user_key = f"_ea_status_{user_id}"
    if not hasattr(asset, user_key):
        setattr(asset, user_key, calculate_early_access_status(asset, user))
    return getattr(asset, user_key)
