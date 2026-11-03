import { createBrowserRouter } from "react-router-dom"
import { AdminGuestOnly, RequireAdmin } from "./admin-guards.tsx"
import { GuestOnly, RequireAuth } from "./guards.tsx"
import { AdminShell } from "../components/layout/AdminShell.tsx"
import { AppShell } from "../components/layout/AppShell.tsx"
import { AdminLoginPage } from "../features/admin/AdminLoginPage.tsx"
import { AdminTrackerPage } from "../features/admin/AdminTrackerPage.tsx"
import { AiPage } from "../features/admin/AiPage.tsx"
import { SearchPage } from "../features/admin/SearchPage.tsx"
import { StatisticsPage } from "../features/admin/StatisticsPage.tsx"
import { UserEditPage } from "../features/admin/UserEditPage.tsx"
import { UsersPage } from "../features/admin/UsersPage.tsx"
import { LoginPage } from "../features/auth/LoginPage.tsx"
import { SignupPage } from "../features/auth/SignupPage.tsx"
import { NotFoundPage } from "../features/NotFoundPage.tsx"
import { JobPage } from "../features/apply/JobPage.tsx"
import { PreviewPage } from "../features/apply/PreviewPage.tsx"
import { QaPage } from "../features/apply/QaPage.tsx"
import { MasterResumesPage } from "../features/master-resumes/MasterResumesPage.tsx"
import { ResumeDetailPage } from "../features/master-resumes/ResumeDetailPage.tsx"
import { ProfileIndex } from "../features/profiles/profileContext.tsx"
import { ProfileLayout } from "../features/profiles/ProfileLayout.tsx"
import { ProfilesPage } from "../features/profiles/ProfilesPage.tsx"
import { ProfileDetailPage } from "../features/profiles/ProfileDetailPage.tsx"
import { TrackerPage } from "../features/tracker/TrackerPage.tsx"

export const router = createBrowserRouter([
  {
    path: "/admin/login",
    element: (
      <AdminGuestOnly>
        <AdminLoginPage />
      </AdminGuestOnly>
    ),
  },
  {
    path: "/admin",
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <UsersPage /> },
          { path: "users/:userId", element: <UserEditPage /> },
          { path: "search", element: <SearchPage /> },
          { path: "statistics", element: <StatisticsPage /> },
          { path: "tracker", element: <AdminTrackerPage /> },
          { path: "ai", element: <AiPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: "/signup",
    element: (
      <GuestOnly>
        <SignupPage />
      </GuestOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <ProfilesPage /> },
          { path: "tracker", element: <TrackerPage /> },
          { path: "profiles/new", element: <ProfileDetailPage /> },
          { path: "profiles/:profileId/edit", element: <ProfileDetailPage /> },
          {
            path: "profiles/:profileId",
            element: <ProfileLayout />,
            children: [
              { index: true, element: <ProfileIndex /> },
              { path: "resumes", element: <MasterResumesPage /> },
              { path: "resumes/:resumeId", element: <ResumeDetailPage /> },
              { path: "apply", element: <JobPage /> },
              { path: "apply/:applicationId/preview", element: <PreviewPage /> },
              { path: "apply/:applicationId/qa", element: <QaPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
