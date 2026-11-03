export function CompletenessMeter({ percent }: { percent: number }) {
  return (
    <div className="completeness">
      <div className="completeness-label">
        <span>Profile completeness</span>
        <strong>{percent}%</strong>
      </div>
      <div className="completeness-track" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
        <div className="completeness-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
