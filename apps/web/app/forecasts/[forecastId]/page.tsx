import { ForecastDetailView } from "./forecast-detail";

export default async function ForecastPage({
  params,
}: {
  params: Promise<{ forecastId: string }>;
}) {
  const { forecastId } = await params;
  return (
    <main className="page page-wide">
      <ForecastDetailView forecastId={forecastId.toUpperCase()} />
    </main>
  );
}
