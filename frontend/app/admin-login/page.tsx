import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function AdminLoginPage() {
  return (
    <PageShell title="Admin Login" eyebrow="Staff access only">
      <AuthForm mode="login" portal="admin" />
      <p className="mt-5 text-center text-sm text-slate-400">
        Customer account? <Link className="text-rail-amber" href="/login">Open user login</Link>
      </p>
    </PageShell>
  );
}
