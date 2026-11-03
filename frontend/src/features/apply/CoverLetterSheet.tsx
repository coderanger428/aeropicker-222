import type { CoverLetterDocument } from "../../domain/types.ts"
import { formatDate } from "../../domain/format.ts"

export function CoverLetterSheet({ letter, date }: { letter: CoverLetterDocument; date: string }) {
  return (
    <article className="sheet">
      <p className="sheet-kicker">Cover letter</p>
      <p className="sheet-meta">{formatDate(date)}</p>
      <p className="sheet-role">{letter.signature}</p>
      <p className="sheet-for">Re: {letter.subject}</p>
      <div className="sheet-rule" />
      <p>{letter.salutation}</p>
      {letter.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="letter-close">
        {letter.closing}
        <br />
        {letter.signature}
      </p>
    </article>
  )
}
