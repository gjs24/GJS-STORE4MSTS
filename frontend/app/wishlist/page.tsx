import { AccountList } from "@/components/account-list";
import { PageShell } from "@/components/page-shell";

export default function WishlistPage() {
  return (
    <PageShell title="Wishlist" eyebrow="Saved releases">
      <AccountList type="wishlist" />
    </PageShell>
  );
}
