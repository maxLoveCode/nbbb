export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="section-title">
      {eyebrow ? <p className="eyebrow section-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
