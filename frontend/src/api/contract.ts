import type {
  ApplicationDetail,
  ApplicationRecord,
  JobAnalysis,
  JobDraft,
  MasterResume,
  Profile,
  ProfileDetails,
  QaPair,
  Session,
  TailorInput,
  TrackerFilters,
  UploadResumeInput,
  User,
} from "../domain/types.ts"
import type { DocumentTemplate } from "../domain/templates.ts"

export interface UserApi {
  login(input: { email: string; password: string }): Promise<Session>
  signup(input: { name: string; email: string; password: string }): Promise<Session>
  logout(): Promise<void>
  me(): Promise<User | null>

  listProfiles(): Promise<Profile[]>
  createProfile(details: ProfileDetails): Promise<Profile>
  updateProfile(profileId: string, details: ProfileDetails): Promise<Profile>
  getProfile(profileId: string): Promise<Profile>

  listResumes(profileId: string): Promise<MasterResume[]>
  uploadResume(profileId: string, input: UploadResumeInput): Promise<MasterResume>
  analyzeResume(profileId: string, resumeId: string): Promise<MasterResume>
  downloadResume(profileId: string, resumeId: string): Promise<Blob>
  removeResume(profileId: string, resumeId: string): Promise<void>

  getDraft(profileId: string): Promise<JobDraft | null>
  tailor(profileId: string, input: TailorInput): Promise<JobAnalysis>
  getApplication(applicationId: string): Promise<ApplicationDetail>
  listTemplates(): Promise<DocumentTemplate[]>
  setTemplate(applicationId: string, templateId: string): Promise<ApplicationDetail>
  downloadDocument(applicationId: string, kind: "resume" | "cover-letter"): Promise<Blob>
  exportApplication(applicationId: string): Promise<ApplicationDetail>
  askQa(applicationId: string, questions: string[]): Promise<QaPair[]>
  saveQa(applicationId: string, pairs: QaPair[]): Promise<QaPair[]>
  finishApplication(applicationId: string): Promise<void>
  quitApplication(applicationId: string): Promise<void>

  listApplications(filters: TrackerFilters): Promise<ApplicationRecord[]>
}
