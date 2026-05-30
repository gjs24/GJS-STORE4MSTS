import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function RegisterPage() {
  return (
    <PageShell title="Register" eyebrow="Join the GJS depot">
      <AuthForm mode="register" />
      <p className="mt-5 text-center text-sm text-slate-400">Already registered? <Link className="text-rail-amber" href="/login">Login</Link></p>
    </PageShell>
  );
}
