from django.contrib import admin

from .models import Asset, AssetFile, AssetImage, Category, DownloadLog, Order, Payment, Review, UpdateLog, Wishlist


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
    list_display = ("title", "category", "simulator_type", "original_price", "price", "is_free", "is_published", "is_featured", "is_upcoming", "download_count")
    list_filter = ("category", "simulator_type", "is_free", "is_published", "is_featured", "is_upcoming")
    search_fields = ("title", "short_description", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [AssetImageInline, AssetFileInline, UpdateLogInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "asset", "amount", "currency", "status", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("user__username", "asset__title", "provider_order_id")


admin.site.register(Payment)
admin.site.register(DownloadLog)
admin.site.register(Review)
admin.site.register(Wishlist)
admin.site.register(UpdateLog)
