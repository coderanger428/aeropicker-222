import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { coerceDetails, emptyDetails, normalizeProfileDetails, profileCompleteness, validateProfileDetails } from "../../domain/profileForm.ts"
import type { ProfileDetails } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { CertificateList } from "./detail/CertificateList.tsx"
import { CompletenessMeter } from "./detail/CompletenessMeter.tsx"
import { EducationList } from "./detail/EducationList.tsx"
import { ExperienceList } from "./detail/ExperienceList.tsx"
import { LanguageList } from "./detail/LanguageList.tsx"
import { PersonalFields } from "./detail/PersonalFields.tsx"

export function ProfileDetailPage() {
  const { profileId } = useParams()
  const isNew = !profileId
  const navigate = useNavigate()
  usePageTitle(isNew ? "Add profile" : "Edit profile")
  const [details, setDetails] = useState<ProfileDetails>(() => emptyDetails())
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(isNew)

  useEffect(() => {
    if (!profileId) return
    let live = true
    api.getProfile(profileId).then(
      (profile) => {
        if (!live) return
        setDetails(coerceDetails(profile.details, profile.name))
        setReady(true)
      },
      (err: unknown) => {
        if (!live) return
        setError(errorMessage(err, "That profile could not be loaded."))
        setReady(true)
      },
    )
    return () => {
      live = false
    }
  }, [profileId])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "start" })
  }, [error])

  function patch(next: Partial<ProfileDetails>) {
    setDetails((current) => ({ ...current, ...next }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const prepared = normalizeProfileDetails(details)
    setDetails(prepared)
    const problem = validateProfileDetails(prepared)
    if (problem) {
      setError(problem)
      return
    }
    setPending(true)
    setError(null)
    try {
      if (profileId) await api.updateProfile(profileId, prepared)
      else await api.createProfile(prepared)
      navigate("/")
    } catch (err) {
      setError(errorMessage(err, "Could not save the profile."))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{isNew ? "New profile" : "Profile"}</p>
          <h1>{isNew ? "Add profile" : details.fullName || "Edit profile"}</h1>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" to="/">
            Back to profiles
          </Link>
        </div>
      </header>
      {ready ? <CompletenessMeter percent={profileCompleteness(details)} /> : null}
      {!ready && !error ? <p className="loading">Loading profile…</p> : null}
      {error ? (
        <div ref={errorRef}>
          <Banner>{error}</Banner>
        </div>
      ) : null}
      {ready ? (
        <form className="stack" noValidate onSubmit={(event) => void onSubmit(event)}>
          <PersonalFields details={details} onChange={patch} />
          <ExperienceList items={details.experience} onChange={(experience) => patch({ experience })} />
          <EducationList items={details.education} onChange={(education) => patch({ education })} />
          <CertificateList items={details.certificates} onChange={(certificates) => patch({ certificates })} />
          <LanguageList items={details.languages} onChange={(languages) => patch({ languages })} />
          <div className="page-actions">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
