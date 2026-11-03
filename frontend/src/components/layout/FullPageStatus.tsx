export function FullPageStatus({ label = "Loading AeroPicker…" }: { label?: string }) {
  return (
    <div className="full-status">
      <p>{label}</p>
    </div>
  )
}
