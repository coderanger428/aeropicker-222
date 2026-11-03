import { Navigate, useOutletContext } from "react-router-dom"
import type { ProfileOutlet } from "./ProfileLayout.tsx"

export function useProfileOutlet(): ProfileOutlet {
  return useOutletContext<ProfileOutlet>()
}

export function ProfileIndex() {
  const { profile } = useProfileOutlet()
  return <Navigate to={profile.hasRequiredResume ? "apply" : "resumes"} replace />
}
