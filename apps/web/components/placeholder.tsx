export default function PlaceholderPage({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <main className="page">
      <p className="kicker">{phase}</p>
      <h1>{title}</h1>
      <p className="lede">
        Route reserved. Schema exists; this UI is intentionally empty until the
        matching build-order step.
      </p>
      <p>
        <a href="/">Back</a>
      </p>
    </main>
  );
}
