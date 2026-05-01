import Link from "next/link";

export function HomeSplitFeature({ panels = [] }) {
  if (!panels.length) return null;

  return (
    <section className="home-split-feature">
      {panels.slice(0, 2).map((panel) => (
        <article key={panel.title} className="home-split-panel">
          {panel.image ? (
            <img src={panel.image} alt={panel.title} />
          ) : (
            <div className="home-split-placeholder">NBBB</div>
          )}
          <Link href={panel.href || "/collections"} className="home-split-button">
            {panel.buttonText || panel.title}
          </Link>
        </article>
      ))}
    </section>
  );
}
