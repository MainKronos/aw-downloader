import DownloadQueueCard from "@/components/download-queue-card";
import { LogsCard } from "@/components/logs-card";

export default function DashboardPage() {
  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Benvenuto nella dashboard. Monitora i download e le statistiche.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <DownloadQueueCard />
        <LogsCard />
      </div>

    </div>
  );
}
