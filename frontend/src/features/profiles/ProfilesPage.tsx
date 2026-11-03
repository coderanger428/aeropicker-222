import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ArrowRightIcon } from "../../components/ui/icons.tsx"
import type { Profile } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function ProfilesPage() {
  usePageTitle("Profiles")
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api.listProfiles().then(
      (list) => {
        if (live) setProfiles(list)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load profiles."))
      },
    )
    return () => {
      live = false
    }
  }, [])

  function begin(profile: Profile) {
    setStartingId(profile.id)
    navigate(profile.hasRequiredResume ? `/profiles/${profile.id}/apply` : `/profiles/${profile.id}/resumes`)
  }

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your desk</p>
          <h1>Profiles</h1>
        </div>
        <div className="page-actions">
          <Link className="btn" to="/profiles/new">
            + Add Profile
          </Link>
        </div>
      </header>
      {error ? <p className="field-error">{error}</p> : null}
      {profiles === null && !error ? <p className="loading">Loading profiles…</p> : null}
      {profiles && profiles.length === 0 ? (
        <div className="empty">
          <h2>No profiles yet</h2>
          <p>Create a profile, then upload the Full Stack Engineer resume.</p>
          <Link className="btn" to="/profiles/new">
            + Add Profile
          </Link>
        </div>
      ) : null}
      {profiles && profiles.length > 0 ? (
        <div className="table-scroll">
          <table className="data data-profiles">
            <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th>Master Resumes</th>
                <th>Total Applications</th>
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile, index) => (
                <tr key={profile.id}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="profile-name">
                      {profile.name}
                      {profile.resumeCount === 0 ? <span className="badge badge-new">New</span> : null}
                    </span>
                  </td>
                  <td>
                    <Link className="count-link" to={`/profiles/${profile.id}/resumes`}>
                      {profile.resumeCount} Roles
                    </Link>
                  </td>
                  <td>
                    <Link className="count-link" to={`/tracker?profileId=${encodeURIComponent(profile.id)}`}>
                      {profile.applicationCount}
                    </Link>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button variant="secondary" onClick={() => navigate(`/profiles/${profile.id}/edit`)}>
                        Edit
                      </Button>
                      <Button onClick={() => begin(profile)} disabled={startingId === profile.id}>
                        <ArrowRightIcon />
                        Apply
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
