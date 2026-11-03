import { useEffect, useState } from "react"
import { Link, Outlet, useParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import type { Profile } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"

export interface ProfileOutlet {
  profile: Profile
}

export function ProfileLayout() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    let live = true
    setProfile(null)
    setError(null)
    api.getProfile(profileId).then(
      (next) => {
        if (live) setProfile(next)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "That profile could not be loaded."))
      },
    )
    return () => {
      live = false
    }
  }, [profileId])

  if (error) {
    return (
      <section className="page">
        <Banner>{error}</Banner>
        <p>
          <Link to="/">Back to profiles</Link>
        </p>
      </section>
    )
  }
  if (!profile) return <p className="loading">Loading profile…</p>
  return <Outlet context={{ profile } satisfies ProfileOutlet} />
}
