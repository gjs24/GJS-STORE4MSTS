import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export default function ForgotPasswordPage() {
  return (
    <PageShell title="Reset Password" eyebrow="Account Recovery">
      <AuthForm mode="forgot_password" portal="user" />
      <div className="mt-5 space-y-2 text-center text-sm">
        <p className="text-slate-400">
          Remembered your password?{" "}
          <Link className="text-rail-amber hover:underline" href="/login">
            Back to Sign In
          </Link>
        </p>
        <p className="text-xs text-slate-500">
          Don&apos;t have an account yet?{" "}
          <Link className="text-rail-amber hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

