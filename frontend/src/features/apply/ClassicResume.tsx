import type { ClassicResumeView } from "../../domain/classicDocument.ts"

export function ClassicResume({ view }: { view: ClassicResumeView }) {
  return (
    <article className="sheet sheet-classic">
      <p className="classic-name">{view.name}</p>
      {view.headline ? <p className="classic-headline">{view.headline}</p> : null}
      {view.contact ? <p className="classic-contact">{view.contact}</p> : null}
      {view.availability || view.links.length > 0 ? (
        <p className="classic-contact">
          {view.availability ? <span>{view.availability}</span> : null}
          {view.links.map((link, index) => (
            <span key={link.href}>
              {view.availability || index > 0 ? " | " : null}
              <a href={link.href}>{link.url}</a>
            </span>
          ))}
        </p>
      ) : null}
      {view.summary ? (
        <section>
          <h3>Summary</h3>
          <p className="classic-copy">{view.summary}</p>
        </section>
      ) : null}
      {view.skills.length > 0 ? (
        <section>
          <h3>Skills</h3>
          <ul className="classic-skills">
            {view.skills.map((group) => (
              <li key={group.group}>
                <strong>{group.group}: </strong>
                {group.items}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {view.experience.length > 0 ? (
        <section>
          <h3>Professional Experience</h3>
          {view.experience.map((role) => (
            <div key={`${role.company}-${role.title}-${role.dates}`} className="classic-block">
              <p className="classic-role">
                <strong>{role.company}</strong>
                {role.dates ? <strong className="classic-dates">{role.dates}</strong> : null}
              </p>
              {role.title || role.location ? (
                <p className="classic-role">
                  <span>{role.title}</span>
                  {role.location ? <span className="classic-meta">{role.location}</span> : null}
                </p>
              ) : null}
              {role.highlights.length > 0 ? (
                <ul>
                  {role.highlights.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {view.education.length > 0 ? (
        <section>
          <h3>Education</h3>
          {view.education.map((school) => (
            <div key={`${school.school}-${school.degree}`} className="classic-block">
              <p className="classic-role">
                <strong>{school.school}</strong>
                {school.dates ? <strong className="classic-dates">{school.dates}</strong> : null}
              </p>
              {school.degree ? <p className="classic-copy">{school.degree}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </article>
  )
}

