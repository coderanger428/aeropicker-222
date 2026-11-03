import { useEffect, useState } from "react"
import { adminApi } from "../../api/admin/index.ts"
import { Button } from "../../components/ui/Button.tsx"
import type { StatisticsReport } from "../../domain/admin.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function StatisticsPage() {
  usePageTitle("Statistics")
  const [period, setPeriod] = useState<"daily" | "weekly">("daily")
  const [report, setReport] = useState<StatisticsReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    adminApi.statistics(period).then(
      (next) => {
        if (!live) return
        setReport(next)
        setError(null)
      },
      (err: unknown) => {
        if (!live) return
        setError(errorMessage(err, "Could not load statistics."))
      },
    )
    return () => {
      live = false
    }
  }, [period])

  const totals = report?.columns.map((_, index) => report.rows.reduce((sum, row) => sum + row.counts[index], 0)) ?? []
  const peak = Math.max(1, ...totals)

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Statistics</h1>
        </div>
        <div className="page-actions">
          <Button variant={period === "daily" ? "primary" : "secondary"} onClick={() => setPeriod("daily")}>
            Daily
          </Button>
          <Button variant={period === "weekly" ? "primary" : "secondary"} onClick={() => setPeriod("weekly")}>
            Weekly
          </Button>
        </div>
      </header>
      {error ? <p className="field-error">{error}</p> : null}
      {!report && !error ? <p className="loading">Loading statistics…</p> : null}
      {report ? (
        <div className="stack">
          <h2>{period === "daily" ? "Applications per day" : "Applications per week"}</h2>
          <div className="stat-chart" aria-hidden="true">
            {report.columns.map((column, index) => (
              <div className="stat-col" key={column.key}>
                <span className="stat-count">{totals[index]}</span>
                <div className="stat-bar" style={{ height: `${Math.max(4, (totals[index] / peak) * 120)}px` }} />
                <span className="stat-label">{column.label.replace("Week of ", "")}</span>
              </div>
            ))}
          </div>
          <div className="table-scroll">
            <table className="data data-stats">
              <thead>
                <tr>
                  <th>User</th>
                  {report.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      {row.userName} {row.deleted ? <span className="mark">Deleted</span> : null}
                    </td>
                    {row.counts.map((count, index) => (
                      <td key={report.columns[index]?.key}>{count}</td>
                    ))}
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
