import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function LoginPage() {
  return (
    <PageShell title="User Login" eyebrow="Customer account access">
      <AuthForm mode="login" portal="user" />
      <p className="mt-5 text-center text-sm text-slate-400">
        New here? <Link className="text-rail-amber" href="/register">Create an account</Link>
      </p>
    </PageShell>
  );
}
