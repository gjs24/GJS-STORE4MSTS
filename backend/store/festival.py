from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone

from .models import FestivalSchedule, SiteSetting


def _serialize_dt(value):
    return value.isoformat() if value else None


def get_live_festival_data(now=None, request=None):
    """
    Resolve the currently active festival configuration.
    Priority:
      1. Active FestivalSchedule matching starts_at <= now < ends_at (highest priority first).
      2. Global SiteSetting quick festival banner/discount if enabled (and inside its window when scheduled).
    Results can be memoized on `request` for the duration of a single HTTP request.
    """
    if request is not None and hasattr(request, "_cached_live_festival_data"):
        return request._cached_live_festival_data

    now = now or timezone.now()
    schedule = (
        FestivalSchedule.objects.filter(
            is_active=True,
            starts_at__lte=now,
            ends_at__gt=now,
        )
        .prefetch_related("asset_prices")
        .order_by("-priority", "starts_at", "-id")
        .first()
    )

    data = None
    if schedule is not None:
        asset_prices = {
            ap.asset_id: (ap.festival_price, ap.is_included)
            for ap in schedule.asset_prices.all()
        }
        data = {
            "source": "schedule",
            "schedule_id": schedule.id,
            "name": schedule.name,
            "theme_type": schedule.theme_type or "diwali",
            "title": schedule.title,
            "subtitle": schedule.subtitle,
            "badge": schedule.badge or "FESTIVAL SPECIAL",
            "button_text": schedule.button_text or "Explore Store",
            "button_url": schedule.button_url or "/store",
            "effect": schedule.effect or "none",
            "banner_image": schedule.banner_image or "",
            "discount_percent": int(schedule.discount_percent or 0),
            "apply_discount_to_prices": bool(schedule.apply_discount_to_prices),
            "announcement_bar": bool(schedule.announcement_bar),
            "popup_card": bool(schedule.popup_card),
            "schedule_enabled": True,
            "starts_at": schedule.starts_at,
            "ends_at": schedule.ends_at,
            "asset_prices": asset_prices,
        }
    else:
        site = SiteSetting.load()
        if site.festival_theme_enabled:
            schedule_active = True
            if site.festival_schedule_enabled:
                if site.festival_starts_at and now < site.festival_starts_at:
                    schedule_active = False
                if site.festival_ends_at and now >= site.festival_ends_at:
                    schedule_active = False
            if schedule_active:
                data = {
                    "source": "site_setting",
                    "schedule_id": None,
                    "name": site.festival_title or site.festival_badge or "Festival Offer",
                    "theme_type": site.festival_theme_type or "diwali",
                    "title": site.festival_title,
                    "subtitle": site.festival_subtitle,
                    "badge": site.festival_badge or "FESTIVAL SPECIAL",
                    "button_text": site.festival_button_text or "Explore Store",
                    "button_url": site.festival_button_url or "/store",
                    "effect": site.festival_effect or "none",
                    "banner_image": site.festival_banner_image or "",
                    "discount_percent": int(site.festival_discount_percent or 0),
                    "apply_discount_to_prices": bool(getattr(site, "festival_apply_discount_to_prices", True)),
                    "announcement_bar": bool(site.festival_announcement_bar),
                    "popup_card": bool(site.festival_popup_card),
                    "schedule_enabled": bool(site.festival_schedule_enabled),
                    "starts_at": site.festival_starts_at,
                    "ends_at": site.festival_ends_at,
                    "asset_prices": {},
                }

    if request is not None:
        setattr(request, "_cached_live_festival_data", data)
    return data


def get_upcoming_festival_data(now=None):
    """Return the next upcoming scheduled festival (if any), for countdown previews or admin visibility."""
    now = now or timezone.now()
    candidates = []

    next_sched = (
        FestivalSchedule.objects.filter(is_active=True, starts_at__gt=now)
        .order_by("starts_at", "-priority", "-id")
        .first()
    )
    if next_sched and next_sched.ends_at > next_sched.starts_at:
        candidates.append(
            {
                "schedule_id": next_sched.id,
                "name": next_sched.name,
                "title": next_sched.title or next_sched.name,
                "badge": next_sched.badge or "FESTIVAL SPECIAL",
                "theme_type": next_sched.theme_type,
                "discount_percent": int(next_sched.discount_percent or 0),
                "starts_at": next_sched.starts_at,
                "ends_at": next_sched.ends_at,
            }
        )

    site = SiteSetting.load()
    if (
        site.festival_theme_enabled
        and site.festival_schedule_enabled
        and site.festival_starts_at
        and now < site.festival_starts_at
        and (not site.festival_ends_at or site.festival_ends_at > site.festival_starts_at)
    ):
        candidates.append(
            {
                "schedule_id": None,
                "name": site.festival_title or "Scheduled Festival",
                "title": site.festival_title or site.festival_badge or "Scheduled Festival",
                "badge": site.festival_badge or "FESTIVAL SPECIAL",
                "theme_type": site.festival_theme_type,
                "discount_percent": int(site.festival_discount_percent or 0),
                "starts_at": site.festival_starts_at,
                "ends_at": site.festival_ends_at,
            }
        )

    if not candidates:
        return None
    candidates.sort(key=lambda item: item["starts_at"])
    chosen = candidates[0]
    chosen["starts_at"] = _serialize_dt(chosen["starts_at"])
    chosen["ends_at"] = _serialize_dt(chosen["ends_at"])
    return chosen


def get_resolved_site_settings_dict(site_setting, base_data, now=None):
    """Overlay the live festival state onto serialized SiteSetting data for public API responses."""
    now = now or timezone.now()
    data = dict(base_data)
    live = get_live_festival_data(now=now)
    upcoming = get_upcoming_festival_data(now=now)

    if live:
        data.update(
            {
                "festival_theme_enabled": True,
                "festival_theme_type": live["theme_type"],
                "festival_title": live["title"],
                "festival_subtitle": live["subtitle"],
                "festival_badge": live["badge"],
                "festival_button_text": live["button_text"],
                "festival_button_url": live["button_url"],
                "festival_effect": live["effect"],
                "festival_banner_image": live["banner_image"],
                "festival_discount_percent": live["discount_percent"],
                "festival_announcement_bar": live["announcement_bar"],
                "festival_popup_card": live["popup_card"],
                "festival_schedule_enabled": live["schedule_enabled"],
                "festival_starts_at": _serialize_dt(live["starts_at"]),
                "festival_ends_at": _serialize_dt(live["ends_at"]),
                "festival_apply_discount_to_prices": live["apply_discount_to_prices"],
                "active_festival_schedule_id": live["schedule_id"],
                "active_festival_name": live["name"],
            }
        )
    else:
        data.update(
            {
                "festival_theme_enabled": False,
                "active_festival_schedule_id": None,
                "active_festival_name": None,
            }
        )

    data["upcoming_festival"] = upcoming
    data["server_time"] = _serialize_dt(now)
    return data


def calculate_festival_asset_price(asset, regular_public_price, live_festival):
    """
    Compute the effective selling price for `asset` during an active festival.
    Returns `(price, is_festival_offer, meta_dict)`:
      1. If the live schedule explicitly excludes this product (`is_included=False`), no festival discount applies.
      2. If the live schedule defines an explicit per-product `FestivalAssetPrice.festival_price`, use it.
      3. Otherwise if `asset.festival_price` is pre-defined on the asset, use it.
      4. Otherwise if `live_festival["discount_percent"] > 0`, apply percentage discount.
    Festival pricing never raises a product's price above `regular_public_price` or above zero on free assets.
    """
    regular_price = max(Decimal("0.00"), Decimal(regular_public_price or "0.00"))
    if not live_festival or regular_price <= Decimal("0.00"):
        return regular_price, False, None

    if not live_festival.get("apply_discount_to_prices", True):
        return regular_price, False, None

    asset_prices = live_festival.get("asset_prices") or {}
    candidate_price = None

    if asset.id in asset_prices:
        sched_price, is_included = asset_prices[asset.id]
        if not is_included:
            return regular_price, False, None
        if sched_price is not None:
            candidate_price = Decimal(sched_price)

    if candidate_price is None:
        asset_fp = getattr(asset, "festival_price", None)
        if asset_fp is not None:
            candidate_price = Decimal(asset_fp)

    if candidate_price is None:
        pct = int(live_festival.get("discount_percent") or 0)
        if 0 < pct <= 95:
            multiplier = (Decimal("100") - Decimal(pct)) / Decimal("100")
            candidate_price = (regular_price * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if candidate_price is None:
        return regular_price, False, None

    candidate_price = max(Decimal("0.00"), candidate_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if candidate_price > regular_price:
        return regular_price, False, None

    meta = {
        "festival_badge": live_festival.get("badge") or "FESTIVAL SPECIAL",
        "festival_name": live_festival.get("name") or live_festival.get("title") or "Festival Offer",
        "festival_ends_at": _serialize_dt(live_festival.get("ends_at")),
        "festival_discount_percent": int(live_festival.get("discount_percent") or 0),
        "festival_schedule_id": live_festival.get("schedule_id"),
    }
    is_offer = candidate_price < regular_price
    return candidate_price, bool(is_offer), meta if is_offer else None
