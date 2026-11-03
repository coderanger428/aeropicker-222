import type { ClassicResumeView, ResumeNode } from "../../domain/classicDocument.ts"

export function ClassicResume({ view, template = "classic" }: { view: ClassicResumeView; template?: string }) {
  const plain = template === "plain"
  const sheet = template === "compact" ? "sheet sheet-classic sheet-compact" : plain ? "sheet sheet-classic sheet-plain" : "sheet sheet-classic"
  return (
    <article className={sheet}>
      <p className="classic-name">{view.name}</p>
      {view.headline ? <p className="classic-headline">{view.headline}</p> : null}
      {plain ? (
        view.contactLines.map((line) => (
          <p key={line} className="classic-contact">
            {line}
          </p>
        ))
      ) : view.contact ? (
        <p className="classic-contact">{view.contact}</p>
      ) : null}
      {!plain && (view.availability || view.links.length > 0) ? (
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
      {plain && view.availability ? <p className="classic-contact">{view.availability}</p> : null}
      {plain
        ? view.links.map((link) => (
            <p key={link.href} className="classic-contact">
              <a href={link.href}>{link.url}</a>
            </p>
          ))
        : null}
      {view.nodes.length > 0 ? <ResumeNodes nodes={view.nodes} /> : null}
      {view.nodes.length === 0 && view.summary ? (
        <section>
          <h3>Summary</h3>
          <p className="classic-copy">{view.summary}</p>
        </section>
      ) : null}
      {view.nodes.length === 0 && view.skills.length > 0 ? (
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
      {view.nodes.length === 0 && view.experience.length > 0 ? (
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
      {view.nodes.length === 0 && view.education.length > 0 ? (
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
      {view.nodes.length === 0
        ? view.sections.map((section) => (
        <section key={section.heading || section.lines[0]}>
          {section.heading ? <h3>{section.heading}</h3> : null}
          {section.lines.map((line) => (
            <p key={line} className="classic-copy">
              {line}
            </p>
          ))}
        </section>
      ))
        : null}
    </article>
  )
}

function ResumeNodes({ nodes }: { nodes: ResumeNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <ResumeNodeView key={nodeKey(node, index)} node={node} />
      ))}
    </>
  )
}

function ResumeNodeView({ node }: { node: ResumeNode }) {
  if (node.type === "section") {
    return (
      <section>
        {node.heading ? <h3 className="as-written">{node.heading}</h3> : null}
        <ResumeNodes nodes={node.children} />
      </section>
    )
  }
  if (node.type === "entry") {
    return (
      <div className="classic-block">
        <ResumeNodes nodes={node.children} />
      </div>
    )
  }
  if (node.type === "bullets") {
    return (
      <ul>
        {node.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  if (node.type === "field") {
    return (
      <p className="classic-copy">
        <strong>{node.label}: </strong>
        {node.value}
      </p>
    )
  }
  return <p className="classic-copy">{node.text}</p>
}

function nodeKey(node: ResumeNode, index: number): string {
  if (node.type === "section") return `section-${node.heading}-${index}`
  if (node.type === "field") return `field-${node.label}-${index}`
  if (node.type === "text") return `text-${index}`
  if (node.type === "bullets") return `bullets-${index}`
  return `entry-${index}`
}

