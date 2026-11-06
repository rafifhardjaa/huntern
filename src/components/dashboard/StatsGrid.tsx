import type { JobApplication } from "@/types/database";

interface StatDef {
  label: string;
  value: number;
  accent?: string;
}

export function StatsGrid({ applications }: { applications: JobApplication[] }) {
  const count = (status: string) => applications.filter((a) => a.status === status).length;

  const stats: StatDef[] = [
    { label: "Total applications", value: applications.length },
    { label: "Applied", value: count("applied") },
    { label: "Interviews", value: count("interview") },
    { label: "Offers", value: count("offered") },
  ];

  return (
    <section aria-label="Application statistics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
         <article
           key={stat.label}
           className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 ease-in-out cursor-default"
         >
          <p className="text-xs font-medium text-slate-500">{stat.label}</p>
          <p className="tnum text-3xl font-bold text-slate-900 leading-none mt-2">
            {stat.value}
          </p>
        </article>
      ))}
    </section>
  );
}
