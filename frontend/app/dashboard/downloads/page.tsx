import { AccountList } from "@/components/account-list";
import { PageShell } from "@/components/page-shell";

export default function DownloadsPage() {
  return (
    <PageShell title="Download History" eyebrow="Protected file logs">
      <AccountList type="downloads" />
    </PageShell>
  );
}
