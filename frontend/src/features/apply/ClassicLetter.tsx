import type { ClassicLetterView } from "../../domain/classicDocument.ts"

export function ClassicLetter({ view, template = "classic" }: { view: ClassicLetterView; template?: string }) {
  const plain = template === "plain"
  const sheet =
    template === "compact"
      ? "sheet sheet-classic sheet-letter sheet-compact"
      : plain
        ? "sheet sheet-classic sheet-letter sheet-plain"
        : "sheet sheet-classic sheet-letter"
  return (
    <article className={sheet}>
      <p className="classic-name">{view.name}</p>
      {plain
        ? view.contact.map((line) => (
            <p key={line} className="classic-contact">
              {line}
            </p>
          ))
        : view.contact.length > 0
          ? <p className="classic-contact">{view.contact.join(template === "compact" ? " | " : "  ·  ")}</p>
          : null}
      {view.date ? <p className="classic-date">{view.date}</p> : null}
      {view.salutation ? <p className="classic-copy">{view.salutation}</p> : null}
      {view.paragraphs.map((paragraph) => (
        <p key={paragraph} className="classic-copy">
          {paragraph}
        </p>
      ))}
      {view.bullets.length > 0 ? (
        <ul className="classic-letter-points">
          {view.bullets.map((bullet) => (
            <li key={`${bullet.label}-${bullet.text}`}>
              {bullet.label ? <strong>{bullet.label.endsWith(":") ? bullet.label : `${bullet.label}:`} </strong> : null}
              {bullet.text}
            </li>
          ))}
        </ul>
      ) : null}
      {view.closingLine ? <p className="classic-close">{view.closingLine}</p> : null}
    </article>
  )
}
