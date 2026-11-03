import type { ApplicationRecord } from "../../domain/types.ts"
import { STATUS_LABEL, formatDate, formatDateTime } from "../../domain/format.ts"

export function TrackerTable({ rows }: { rows: ApplicationRecord[] }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Id</th>
            <th scope="col">Date</th>
            <th scope="col">Profile</th>
            <th scope="col">Company</th>
            <th scope="col">Role</th>
            <th scope="col">Job Link</th>
            <th scope="col">Resume</th>
            <th scope="col">Has Cover Letter</th>
            <th scope="col">Application Status</th>
            <th scope="col">Last Update</th>
            <th scope="col">Handler</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="empty-cell">
                No applications match these filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{formatDate(row.date)}</td>
                <td>{row.profileName}</td>
                <td>{row.company}</td>
                <td>{row.role}</td>
                <td className="link-cell">
                  {row.jobLink ? (
                    <a href={row.jobLink} target="_blank" rel="noreferrer">
                      {row.jobLink}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{row.resume}</td>
                <td>{row.hasCoverLetter ? "Yes" : "No"}</td>
                <td>
                  <span className={`pill pill-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                </td>
                <td>{formatDateTime(row.lastUpdate)}</td>
                <td>{row.handler}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
