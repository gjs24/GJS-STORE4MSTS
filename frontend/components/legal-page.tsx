import { PageShell } from "@/components/page-shell";

export type LegalSection = {
  title: string;
  body?: string;
  items?: string[];
};

export function LegalPage({
  title,
  eyebrow,
  intro,
  sections
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <PageShell title={title} eyebrow={eyebrow}>
      <article className="cinematic-panel rounded-lg p-5 text-slate-300 md:p-8">
        <p className="border-b border-white/10 pb-5 leading-7">{intro}</p>
        <div className="space-y-7 pt-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              {section.body ? <p className="mt-3 leading-7">{section.body}</p> : null}
              {section.items ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </PageShell>
  );
}
