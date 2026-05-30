"use client";

import { PremiumAdminLayout } from "@/components/admin/premium-admin-layout";

export function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return <PremiumAdminLayout title={title}>{children}</PremiumAdminLayout>;
}
