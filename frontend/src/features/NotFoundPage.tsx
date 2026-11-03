import { Link } from "react-router-dom"
import { usePageTitle } from "../lib/usePageTitle.ts"

export function NotFoundPage() {
  usePageTitle("Not found")
  return (
    <section className="page">
      <h1>That page is not on this desk.</h1>
      <p>
        <Link to="/">Back to profiles</Link>
      </p>
    </section>
  )
}
