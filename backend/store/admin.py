from django.contrib import admin

from .models import AdminActivityLog, Asset, AssetFile, AssetImage, Category, DownloadLog, NotifyRequest, Order, Payment, Review, SiteSetting, UpdateLog, UserSpecialAccess, Wishlist
from .models import (
    AdminActivityLog,
    Asset,
    AssetFile,
    AssetImage,
    BoardTemplate,
    Category,
    DownloadLog,
    NotifyRequest,
    Order,
    Payment,
    Review,
    SiteSetting,
    UpdateLog,
    UserBoardUnlock,
    UserCustomBoard,
    UserSpecialAccess,
    Wishlist,
)


class UserCustomBoardInline(admin.TabularInline):
    model = UserCustomBoard
    extra = 0
    readonly_fields = ("user", "title", "saved_at")
    can_delete = True


class UserBoardUnlockInline(admin.TabularInline):
    model = UserBoardUnlock
    extra = 0
    readonly_fields = ("user", "order", "unlocked_at")


@admin.register(BoardTemplate)
class BoardTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "is_paid", "price", "published", "created_at")
    list_filter = ("is_paid", "published", "category")
    search_fields = ("id", "name", "category", "description")
    inlines = [UserCustomBoardInline, UserBoardUnlockInline]


@admin.register(UserCustomBoard)
class UserCustomBoardAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "template", "saved_at")
    list_filter = ("template", "saved_at")
    search_fields = ("title", "user__username", "user__email", "template__name")
    readonly_fields = ("saved_at", "created_at")


@admin.register(UserBoardUnlock)
class UserBoardUnlockAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "template", "order", "unlocked_at")
    list_filter = ("template",)
    search_fields = ("user__username", "template__name")


class AssetImageInline(admin.TabularInline):
    model = AssetImage
    extra = 1


class AssetFileInline(admin.TabularInline):
    model = AssetFile
    extra = 1


class UpdateLogInline(admin.TabularInline):
    model = UpdateLog
    extra = 0


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "simulator_type", "original_price", "price", "deal_is_open", "is_free", "is_published", "is_featured", "is_upcoming", "early_access_enabled", "prebooking_enabled", "download_count")
    list_filter = ("category", "simulator_type", "deal_is_open", "is_free", "is_published", "is_featured", "is_upcoming", "early_access_enabled", "prebooking_enabled", "early_access_has_access", "early_access_has_discount")
    search_fields = ("title", "short_description", "description")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("early_access_required_assets",)
    inlines = [AssetImageInline, AssetFileInline, UpdateLogInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "asset", "amount", "currency", "status", "created_at")
    list_display = ("id", "user", "asset", "board_template", "amount", "currency", "status", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("user__username", "asset__title", "provider_order_id")
    search_fields = ("user__username", "asset__title", "board_template__name", "provider_order_id")


admin.site.register(Payment)
admin.site.register(DownloadLog)
admin.site.register(Review)
admin.site.register(Wishlist)
admin.site.register(UpdateLog)
admin.site.register(SiteSetting)
admin.site.register(NotifyRequest)
admin.site.register(AdminActivityLog)
admin.site.register(UserSpecialAccess)
