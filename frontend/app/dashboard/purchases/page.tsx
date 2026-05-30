import { AccountList } from "@/components/account-list";
import { PageShell } from "@/components/page-shell";

export default function PurchasesPage() {
  return (
    <PageShell title="My Purchases" eyebrow="Paid asset access">
      <AccountList type="purchases" />
    </PageShell>
  );
}
