import { useEffect, useState, type FormEvent } from "react"
import { adminApi } from "../../api/admin/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { Dialog } from "../../components/ui/Dialog.tsx"
import { SelectField } from "../../components/ui/SelectField.tsx"
import { TextArea } from "../../components/ui/TextArea.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { AI_PROVIDERS, aiKeyDetail, validateNewAiKey, type AiKey, type AiPrompt, type AiUsageEvent } from "../../domain/admin.ts"
import { formatDateTime } from "../../domain/format.ts"
import { formatTokens } from "../../lib/formatTokens.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function AiPage() {
  usePageTitle("AI")
  const [keys, setKeys] = useState<AiKey[] | null>(null)
  const [usage, setUsage] = useState<AiUsageEvent[]>([])
  const [usageKeyId, setUsageKeyId] = useState("")
  const [prompts, setPrompts] = useState<AiPrompt[] | null>(null)
  const [provider, setProvider] = useState("")
  const [name, setName] = useState("")
  const [secret, setSecret] = useState("")
  const [projectName, setProjectName] = useState("")
  const [projectNumber, setProjectNumber] = useState("")
  const [organizationId, setOrganizationId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [testKey, setTestKey] = useState<AiKey | null>(null)
  const [chat, setChat] = useState<{ id: string; role: "user" | "model"; text: string; model?: string }[]>([])
  const [chatDraft, setChatDraft] = useState("")
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatting, setChatting] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([adminApi.listAiKeys(), adminApi.listPrompts(), adminApi.listAiUsage()]).then(
      ([nextKeys, nextPrompts, nextUsage]) => {
        if (!live) return
        setKeys(nextKeys)
        setPrompts(nextPrompts)
        setUsage(nextUsage)
        setUsageKeyId((current) => current || nextKeys.find((key) => key.provider === "Google")?.id || nextKeys[0]?.id || "")
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load AI settings."))
      },
    )
    return () => {
      live = false
    }
  }, [])

  const tokensIn = keys?.reduce((sum, key) => sum + key.tokensIn, 0) ?? 0
  const tokensOut = keys?.reduce((sum, key) => sum + key.tokensOut, 0) ?? 0
  const watched = keys?.find((key) => key.id === usageKeyId) ?? null
  const watchedUsage = usage.filter((event) => event.keyId === usageKeyId)
  const promptTotal = watchedUsage.reduce((sum, event) => sum + event.promptTokens, 0)
  const outputTotal = watchedUsage.reduce((sum, event) => sum + event.outputTokens, 0)
  const thoughtTotal = watchedUsage.reduce((sum, event) => sum + event.thoughtTokens, 0)

  function openTest(key: AiKey) {
    setTestKey(key)
    setChat([])
    setChatDraft("")
    setChatError(null)
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault()
    if (!testKey) return
    const text = chatDraft.trim()
    if (!text) {
      setChatError("Enter a message.")
      return
    }
    setChatting(true)
    setChatError(null)
    setChatDraft("")
    setChat((current) => [...current, { id: `user-${current.length}`, role: "user", text }])
    try {
      const result = await adminApi.testAiKey(testKey.id, text)
      setChat((current) => [
        ...current,
        { id: `model-${current.length}`, role: "model", text: result.reply, model: result.model },
      ])
      const [nextKeys, nextUsage] = await Promise.all([adminApi.listAiKeys(), adminApi.listAiUsage()])
      setKeys(nextKeys)
      setUsage(nextUsage)
    } catch (err) {
      setChatError(errorMessage(err, "The API key test failed."))
    } finally {
      setChatting(false)
    }
  }

  async function addKey(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const input = { name, provider, secret, projectName, projectNumber, organizationId, projectId }
      const problem = validateNewAiKey(input)
      if (problem) {
        setError(problem)
        return
      }
      const created = await adminApi.createAiKey(input)
      setKeys((current) => [created, ...(current ?? [])])
      setUsageKeyId((current) => current || created.id)
      setName("")
      setSecret("")
      setProjectName("")
      setProjectNumber("")
      setOrganizationId("")
      setProjectId("")
      setNotice("API key saved. The full key is not shown again.")
    } catch (err) {
      setError(errorMessage(err, "Could not save the API key."))
    } finally {
      setPending(false)
    }
  }

  function editPrompt(promptId: string, body: string) {
    setPrompts((current) => current?.map((prompt) => (prompt.id === promptId ? { ...prompt, body } : prompt)) ?? null)
  }

  async function savePrompt(prompt: AiPrompt) {
    setError(null)
    setNotice(null)
    try {
      const saved = await adminApi.updatePrompt(prompt.id, prompt.body)
      setPrompts((current) => current?.map((item) => (item.id === saved.id ? saved : item)) ?? null)
      setNotice(`${saved.name} saved.`)
    } catch (err) {
      setError(errorMessage(err, "Could not save the prompt."))
    }
  }

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>AI</h1>
        </div>
      </header>
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="info">{notice}</Banner> : null}
      {!keys || !prompts ? <p className="loading">Loading AI settings…</p> : null}
      {keys && prompts ? (
        <div className="stack">
          <h2>API keys and token usage</h2>
          <p className="profile-stat">
            {formatTokens(tokensIn)} tokens in · {formatTokens(tokensOut)} tokens out
          </p>
          <div className="table-scroll">
            <table className="data data-profiles">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Provider</th>
                  <th>Key</th>
                  <th>Tokens in</th>
                  <th>Tokens out</th>
                  <th>Operation</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      {key.name}
                      {aiKeyDetail(key) ? <div className="profile-stat">{aiKeyDetail(key)}</div> : null}
                    </td>
                    <td>{key.provider}</td>
                    <td className="mono">••••{key.lastFour}</td>
                    <td>{formatTokens(key.tokensIn)}</td>
                    <td>{formatTokens(key.tokensOut)}</td>
                    <td>
                      <Button variant="secondary" onClick={() => openTest(key)} disabled={Boolean(key.revokedAt)}>
                        Test API
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="detail-section">
            <h2>Token usage</h2>
            {keys.length > 0 ? (
              <SelectField
                label="Key"
                value={usageKeyId}
                onChange={(event) => setUsageKeyId(event.target.value)}
                options={keys.map((key) => ({ value: key.id, label: `${key.name} (••••${key.lastFour})` }))}
              />
            ) : null}
            {watched ? (
              <p className="profile-stat">
                {watched.name}: {formatTokens(promptTotal)} prompt · {formatTokens(outputTotal)} output · {formatTokens(thoughtTotal)} thought ·{" "}
                {formatTokens(promptTotal + outputTotal + thoughtTotal)} total · {watchedUsage.length}{" "}
                {watchedUsage.length === 1 ? "call" : "calls"}
              </p>
            ) : null}
            <div className="table-scroll">
              <table className="data data-profiles">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Model</th>
                    <th>Purpose</th>
                    <th>Prompt</th>
                    <th>Output</th>
                    <th>Thought</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {watchedUsage.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        No calls recorded for this key yet.
                      </td>
                    </tr>
                  ) : (
                    watchedUsage.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.at)}</td>
                        <td>{event.model}</td>
                        <td>{event.purpose}</td>
                        <td>{formatTokens(event.promptTokens)}</td>
                        <td>{formatTokens(event.outputTokens)}</td>
                        <td>{formatTokens(event.thoughtTokens)}</td>
                        <td>{formatTokens(event.totalTokens)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <form className="stack detail-section" noValidate onSubmit={(event) => void addKey(event)}>
            <h2>Add API key</h2>
            <SelectField
              label="Provider"
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value)
                setError(null)
                setNotice(null)
                setProjectName("")
                setProjectNumber("")
                setOrganizationId("")
                setProjectId("")
              }}
              options={[{ value: "", label: "Select a provider" }, ...AI_PROVIDERS.map((item) => ({ value: item, label: item }))]}
            />
            {provider === "Google" ? (
              <div className="field-grid">
                <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                <TextField label="API key" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" />
                <TextField label="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                <TextField label="Project number" value={projectNumber} onChange={(event) => setProjectNumber(event.target.value)} />
              </div>
            ) : null}
            {provider === "OpenAI" ? (
              <div className="field-grid">
                <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                <TextField label="API key" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" />
                <TextField label="Organization ID" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />
                <TextField label="Project ID" value={projectId} onChange={(event) => setProjectId(event.target.value)} />
              </div>
            ) : null}
            {provider === "Anthropic" ? (
              <div className="field-grid">
                <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                <TextField label="API key" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" />
              </div>
            ) : null}
            {provider ? (
              <div className="page-actions">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save key"}
                </Button>
              </div>
            ) : null}
          </form>
          <h2>Prompts</h2>
          {prompts.map((prompt) => (
            <section className="detail-section" key={prompt.id}>
              <h3>{prompt.name}</h3>
              <TextArea
                label="Prompt"
                value={prompt.body}
                hint={`${prompt.body.length.toLocaleString()} characters`}
                onChange={(event) => editPrompt(prompt.id, event.target.value)}
              />
              <div className="page-actions">
                <Button onClick={() => void savePrompt(prompt)}>Save prompt</Button>
                <span className="profile-stat">Updated {formatDateTime(prompt.updatedAt)}</span>
              </div>
            </section>
          ))}
        </div>
      ) : null}
      <Dialog
        className="dialog-chat"
        open={testKey !== null}
        title={testKey ? `Test ${testKey.name}` : "Test API"}
        onClose={() => {
          if (!chatting) setTestKey(null)
        }}
      >
        <div className="chat-log" aria-live="polite">
          {chat.map((line) => (
            <p key={line.id} className={line.role === "user" ? "chat-line is-user" : "chat-line is-model"}>
              {line.text}
              {line.model ? <span className="chat-model">{line.model}</span> : null}
            </p>
          ))}
        </div>
        {chatError ? <Banner>{chatError}</Banner> : null}
        <form className="chat-compose" noValidate onSubmit={(event) => void sendChat(event)}>
          <TextField label="Message" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} />
          <Button type="submit" disabled={chatting}>
            {chatting ? "Sending…" : "Send"}
          </Button>
        </form>
      </Dialog>
    </section>
  )
}
