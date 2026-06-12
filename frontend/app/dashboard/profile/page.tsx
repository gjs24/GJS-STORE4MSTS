import { PageShell } from "@/components/page-shell";
import { ProfileEditForm } from "@/components/profile-edit-form";

export default function ProfilePage() {
  return (
    <PageShell title="Edit Profile" eyebrow="Account name and contact">
      <ProfileEditForm />
    </PageShell>
  );
}
