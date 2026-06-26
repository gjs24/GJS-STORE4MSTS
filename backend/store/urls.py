from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AssetViewSet,
    CategoryViewSet,
    DownloadListView,
    GoogleLoginView,
    LoginView,
    OrderCreateView,
    PaymentVerifyView,
    PurchaseListView,
    RegisterView,
    ReviewCreateView,
    WishlistView,
    AdminAssetViewSet,
    AdminCategoryViewSet,
    AdminOrderViewSet,
    AdminReviewViewSet,
    AdminUserViewSet,
    AdminActivityLogView,
    AdminDownloadHistoryView,
    AdminNotifyRequestView,
    admin_settings,
    admin_stats,
    asset_download_by_id,
    current_user,
    order_invoice,
    site_settings,
)

router = DefaultRouter()
router.register("assets", AssetViewSet, basename="asset")
router.register("categories", CategoryViewSet, basename="category")
router.register("admin/assets", AdminAssetViewSet, basename="admin-asset")
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")
router.register("admin/users", AdminUserViewSet, basename="admin-user")
router.register("admin/reviews", AdminReviewViewSet, basename="admin-review")

urlpatterns = [
    path("assets/<int:pk>/download/", asset_download_by_id, name="asset-download-by-id"),
    path("site-settings/", site_settings, name="site-settings"),
    path("", include(router.urls)),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/google/", GoogleLoginView.as_view(), name="google-login"),
    path("auth/me/", current_user, name="current-user"),
    path("create-order/", OrderCreateView.as_view(), name="cashfree-create-order"),
    path("orders/create/", OrderCreateView.as_view(), name="order-create"),
    path("verify-payment/", PaymentVerifyView.as_view(), name="cashfree-verify-payment"),
    path("payments/verify/", PaymentVerifyView.as_view(), name="payment-verify"),
    path("orders/<int:pk>/invoice/", order_invoice, name="order-invoice"),
    path("user/purchases/", PurchaseListView.as_view(), name="purchases"),
    path("user/downloads/", DownloadListView.as_view(), name="downloads"),
    path("reviews/", ReviewCreateView.as_view(), name="review-create"),
    path("wishlist/", WishlistView.as_view(), name="wishlist"),
    path("admin/stats/", admin_stats, name="admin-stats"),
    path("admin/settings/", admin_settings, name="admin-settings"),
    path("admin/notify-requests/", AdminNotifyRequestView.as_view(), name="admin-notify-requests"),
    path("admin/download-history/", AdminDownloadHistoryView.as_view(), name="admin-download-history"),
    path("admin/activity-logs/", AdminActivityLogView.as_view(), name="admin-activity-logs"),
]
