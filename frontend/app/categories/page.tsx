import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getCategories } from "@/lib/api";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <PageShell title="Asset Categories" eyebrow="Browse the depot">
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.slug} href={`/assets?category=${category.slug}`} className="rounded border border-white/10 bg-white/[0.03] p-6 hover:border-rail-red">
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <p className="mt-2 text-slate-400">{category.description}</p>
            <p className="mt-4 text-sm text-rail-amber">{category.asset_count || 0} assets</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
