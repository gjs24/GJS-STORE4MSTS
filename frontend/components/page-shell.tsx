export function PageShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rail-grid min-h-screen px-4 py-10">
      <div className="mx-auto max-w-7xl">
        {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase text-rail-amber">{eyebrow}</p> : null}
        <h1 className="mb-8 text-3xl font-bold text-white md:text-5xl">{title}</h1>
        {children}
      </div>
    </section>
  );
}
