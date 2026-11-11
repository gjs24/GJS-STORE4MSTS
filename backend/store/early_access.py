from decimal import Decimal
from django.utils import timezone
from .festival import calculate_festival_asset_price, get_live_festival_data
from .models import Order
from .special_access import user_has_special_access


def calculate_early_access_status(asset, user, request=None):
    """
    Computes early access eligibility, festival pricing, and dynamic pricing for a given asset and user,
    factoring in VIP early access start/end schedules and active festival offers.
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
    update_price = getattr(asset, "update_price", None) or Decimal("0.00")
    if getattr(asset, "has_paid_update", False) and update_price > Decimal("0.00"):
        base_price = base_price + update_price

    is_prebooking_enabled = bool(getattr(asset, "prebooking_enabled", False))
    prebooking_starts_at = getattr(asset, "prebooking_starts_at", None)
    prebooking_ends_at = getattr(asset, "prebooking_ends_at", None)
    is_prebooking = is_prebooking_enabled
    if is_prebooking_enabled:
        if prebooking_starts_at and now < prebooking_starts_at:
            is_prebooking = False
        if prebooking_ends_at and now >= prebooking_ends_at:
            is_prebooking = False
    prebooking_price = getattr(asset, "prebooking_price", None)
    if is_prebooking and prebooking_price is not None and prebooking_price > Decimal("0.00"):
        base_price = prebooking_price
        if getattr(asset, "has_paid_update", False) and update_price > Decimal("0.00"):
            base_price = base_price + update_price

    regular_full_price = asset.price + (
        update_price if getattr(asset, "has_paid_update", False) and update_price > Decimal("0.00") else Decimal("0.00")
    )

    live_festival = get_live_festival_data(now=now, request=request)
    festival_effective_price, festival_offer_active, festival_meta = calculate_festival_asset_price(
        asset, base_price, live_festival
    )
    public_price = festival_effective_price if festival_offer_active else base_price

    compare_price = (
        asset.original_price
        if (asset.original_price and asset.original_price > public_price)
        else (regular_full_price if regular_full_price > public_price else base_price)
    )
    default_discount = (
        round(float((compare_price - public_price) / compare_price) * 100)
        if (compare_price and compare_price > public_price)
        else 0
    )

    default_result = {
        "is_eligible": False,
        "can_access_early": False,
        "has_early_discount": False,
        "is_early_access_active": is_early_access_active,
        "is_early_access_pending": is_early_access_pending,
        "effective_price": public_price,
        "discount_percent": default_discount,
        "savings_amount": f"{max(Decimal('0.00'), compare_price - public_price):.2f}",
        "is_prebooking": is_prebooking,
        "required_asset_ids": required_ids,
        "required_asset_titles": required_titles,
        "festival_offer_active": festival_offer_active,
        "festival_meta": festival_meta,
        "regular_price": regular_full_price,
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
            "savings_amount": f"{regular_full_price:.2f}",
            "is_prebooking": is_prebooking,
            "required_asset_ids": required_ids,
            "required_asset_titles": required_titles,
            "festival_offer_active": False,
            "festival_meta": None,
            "regular_price": regular_full_price,
        }

    if not getattr(asset, "early_access_enabled", False):
        return default_result

    if required_assets:
        is_eligible = Order.objects.filter(
            user=user,
            asset_id__in=required_ids,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
        ).exists()
    else:
        is_eligible = Order.objects.filter(
            user=user,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
        ).exists()

    if not is_eligible:
        return default_result

    can_access_early = bool(getattr(asset, "early_access_has_access", False)) and is_early_access_active
    has_early_discount = bool(getattr(asset, "early_access_has_discount", False)) and is_early_access_active

    ea_price = base_price
    if has_early_discount and not asset.is_free:
        early_price = getattr(asset, "early_access_price", None)
        discount_pct = getattr(asset, "early_access_discount_percent", 0) or 0
        if early_price is not None and early_price > Decimal("0.00") and early_price < base_price:
            ea_price = early_price
        elif discount_pct > 0:
            multiplier = (Decimal("100") - Decimal(int(discount_pct))) / Decimal("100")
            ea_price = round(base_price * multiplier, 2)

    effective_price = ea_price
    used_festival_price = False
    if festival_offer_active and festival_effective_price < ea_price:
        effective_price = festival_effective_price
        used_festival_price = True

    effective_price = max(Decimal("0.00"), effective_price)
    ea_compare = (
        asset.original_price
        if (asset.original_price and asset.original_price > effective_price)
        else (regular_full_price if regular_full_price > effective_price else effective_price)
    )
    if ea_compare > Decimal("0.00") and ea_compare > effective_price:
        discount_percent = round(float((ea_compare - effective_price) / ea_compare) * 100)
    else:
        discount_percent = 0
    savings = max(Decimal("0.00"), ea_compare - effective_price)

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
        "festival_offer_active": used_festival_price or (not has_early_discount and festival_offer_active),
        "festival_meta": festival_meta if (used_festival_price or (not has_early_discount and festival_offer_active)) else None,
        "regular_price": regular_full_price,
    }


def get_cached_early_access_status(asset, request):
    user = getattr(request, "user", None) if request else None
    user_id = getattr(user, "id", None) if getattr(user, "is_authenticated", False) else "anon"
    user_key = f"_ea_status_{user_id}"
    if not hasattr(asset, user_key):
        setattr(asset, user_key, calculate_early_access_status(asset, user, request=request))
    return getattr(asset, user_key)
