import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api";
import { MaintenanceScreen } from "@/components/maintenance-screen";

export const metadata: Metadata = {
  title: "Under Maintenance | MSTS-GJS Production Store",
  description: "MSTS-GJS Production Store is temporarily offline for scheduled system maintenance.",
  robots: {
    index: false,
    follow: false,
  },
};

type MaintenancePageProps = {
  searchParams?: Promise<{ preview?: string; bypass?: string }>;
};

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const isPreview = resolvedParams.preview === "true";
  const settings = await getSiteSettings();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-rail-black text-white">
      <MaintenanceScreen
        title={settings.maintenance_title || "System Under Scheduled Maintenance"}
        message={
          settings.maintenance_message ||
          "We are currently upgrading server systems and performing essential depot maintenance. We'll be back online shortly!"
        }
        estimatedEnd={settings.maintenance_estimated_end || "Expected to return shortly"}
        isPreview={isPreview}
      />
    </div>
  );
}
