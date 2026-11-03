import type { ResumeDocument } from "../../domain/types.ts"

export function ResumeSheet({
  resume,
  company,
  jobTitle,
}: {
  resume: ResumeDocument
  company: string
  jobTitle: string
}) {
  return (
    <article className="sheet">
      <p className="sheet-kicker">Resume</p>
      <h2>{resume.candidateName}</h2>
      <p className="sheet-role">{resume.roleLine}</p>
      <div className="sheet-rule" />
      <p className="sheet-for">
        For {jobTitle} at {company}
      </p>
      <h3>Summary</h3>
      <p>{resume.summary}</p>
      <h3>Skills</h3>
      <ul className="skill-row">
        {resume.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <h3>Experience</h3>
      {resume.experience.map((block) => (
        <section key={`${block.title}-${block.org}`}>
          <h4>{block.title}</h4>
          <p className="sheet-org">{block.org}</p>
          <ul>
            {block.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
