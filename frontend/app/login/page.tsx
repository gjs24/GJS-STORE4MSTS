import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function LoginPage() {
  return (
    <PageShell title="User Login" eyebrow="Customer account access">
      <AuthForm mode="login" portal="user" />
      <div className="mt-5 space-y-2 text-center text-sm">
        <p className="text-slate-400">
          New here? <Link className="text-rail-amber hover:underline" href="/register">Create an account</Link>
        </p>
        <p className="text-xs text-slate-500">
          Forgot your password?{" "}
          <Link className="text-rail-amber hover:underline" href="/forgot-password">
            Reset it here
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
