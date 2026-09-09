import { useMemo, useRef, useState } from 'react'
import { SkinPreview } from './SkinPreview'
import { ColorList } from './ColorList'
import {
  MAX_SKIN_FILE_BYTES,
  SkinParseError,
  parseMoonshineIni,
} from '../lib/skin-format/parser'
import { enabledSummary } from '../lib/skin-format/serializer'
import { normaliseTags, validateSkinName } from '../lib/validation'
import { formatBytes } from '../utils/format'
import type { ParsedSkinCandidate, SkinData, SkinRecord } from '../types/skin'
import type { SkinInput } from '../lib/skins'

interface SkinFormProps {
  initial?: SkinRecord
  submitLabel: string
  onSubmit: (input: SkinInput, colorsChanged: boolean) => Promise<void>
}

const ACCEPTED_EXTENSIONS = ['.ini', '.txt']

export function SkinForm({ initial, submitLabel, onSubmit }: SkinFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [tagText, setTagText] = useState(initial?.tags.join(', ') ?? '')
  const [modVersion, setModVersion] = useState(initial?.mod_version ?? '')

  const [colors, setColors] = useState<SkinData | null>(initial?.colors ?? null)
  const [candidates, setCandidates] = useState<ParsedSkinCandidate[]>([])
  const [chosenSection, setChosenSection] = useState<string>('')
  const [originalFilename, setOriginalFilename] = useState<string | null>(
    initial?.original_filename ?? null,
  )
  const [fileWarnings, setFileWarnings] = useState<string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [colorsChanged, setColorsChanged] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => normaliseTags(tagText), [tagText])

  async function handleFile(file: File | undefined) {
    setFileError(null)
    setFileWarnings([])
    if (!file) return

    const lower = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setFileError('Upload the susamune.ini settings file (.ini), or a skin .txt from this site.')
      return
    }
    if (file.size > MAX_SKIN_FILE_BYTES) {
      setFileError(`That file is ${formatBytes(file.size)}. The limit is 50 KB.`)
      return
    }
    if (file.size === 0) {
      setFileError('That file is empty.')
      return
    }

    try {
      const text = await file.text()
      const result = parseMoonshineIni(text)
      setCandidates(result.candidates)
      setChosenSection(result.candidates[0].section)
      setColors(result.candidates[0].data)
      setColorsChanged(true)
      setFileWarnings(result.warnings)
      setOriginalFilename(file.name)
      if (!name) setName(suggestName(file.name))
    } catch (error) {
      setColors(initial?.colors ?? null)
      setCandidates([])
      setFileError(
        error instanceof SkinParseError
          ? error.message
          : 'That file could not be read. Make sure it is the plain-text settings file.',
      )
    }
  }

  function pickCandidate(section: string) {
    const candidate = candidates.find((c) => c.section === section)
    if (!candidate) return
    setChosenSection(section)
    setColors(candidate.data)
    setColorsChanged(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const nameError = validateSkinName(name)
    if (nameError) {
      setFormError(nameError)
      return
    }
    if (!colors) {
      setFormError('Add a skin file first — the colours come from it.')
      return
    }
    if (description.length > 1000) {
      setFormError('Descriptions are limited to 1000 characters.')
      return
    }

    setBusy(true)
    setProgress(colorsChanged ? 'Uploading skin file…' : 'Saving changes…')
    try {
      await onSubmit(
        {
          name: name.trim(),
          description: description.trim(),
          tags,
          modVersion: modVersion.trim(),
          colors,
          originalFilename,
        },
        colorsChanged,
      )
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That did not save. Try again.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_400px]" onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">
        <div className="surface p-5">
          <h2 className="mb-4 text-xl">Skin file</h2>

          <label className="label" htmlFor="skin-file">
            {initial ? 'Replace the colours (optional)' : 'Your susamune.ini'}
          </label>
          <input
            ref={fileInput}
            id="skin-file"
            type="file"
            accept=".ini,.txt,text/plain"
            className="field file:mr-3 file:rounded-full file:border-0 file:bg-lagoon file:px-4 file:py-1.5 file:font-display file:font-bold file:text-white"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <p className="hint">
            Only the Mario and FLUDD colour values are read. Your ISO paths, binds and timer
            settings are dropped in the browser and never uploaded. 50 KB limit.
          </p>

          {fileError && (
            <p className="mt-3 rounded-xl border-2 border-coral/50 bg-coral/10 px-3 py-2 text-sm">
              {fileError}
            </p>
          )}

          {fileWarnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-inkSoft">
              {fileWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          {candidates.length > 1 && (
            <fieldset className="mt-4">
              <legend className="label">Which region&apos;s colours?</legend>
              <div className="flex flex-wrap gap-2">
                {candidates.map((candidate) => (
                  <label
                    key={candidate.section}
                    className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold ${
                      chosenSection === candidate.section
                        ? 'border-lagoonDeep bg-lagoon/15'
                        : 'border-sandDeep'
                    }`}
                  >
                    <input
                      type="radio"
                      name="section"
                      className="sr-only"
                      checked={chosenSection === candidate.section}
                      onChange={() => pickCandidate(candidate.section)}
                    />
                    {candidate.regionLabel} · {candidate.customisedCount} custom
                  </label>
                ))}
              </div>
              <p className="hint">
                Your settings file holds one set per region. Pick the one you actually play.
              </p>
            </fieldset>
          )}
        </div>

        <div className="surface space-y-4 p-5">
          <h2 className="text-xl">Details</h2>

          <div>
            <label className="label" htmlFor="skin-name">
              Name
            </label>
            <input
              id="skin-name"
              className="field"
              value={name}
              maxLength={60}
              required
              onChange={(event) => setName(event.target.value)}
              placeholder="Sunset Mario"
            />
          </div>

          <div>
            <label className="label" htmlFor="skin-description">
              Description
            </label>
            <textarea
              id="skin-description"
              className="field min-h-[110px]"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What you were going for, and anything worth knowing."
            />
            <p className="hint">{description.length}/1000</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="skin-version">
                Moonshine version
              </label>
              <input
                id="skin-version"
                className="field"
                value={modVersion}
                maxLength={32}
                onChange={(event) => setModVersion(event.target.value)}
                placeholder="e.g. 1.4 JP"
              />
            </div>
            <div>
              <label className="label" htmlFor="skin-tags">
                Tags
              </label>
              <input
                id="skin-tags"
                className="field"
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                placeholder="dark, high contrast, ils"
              />
              <p className="hint">Comma separated, up to 8.</p>
            </div>
          </div>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border-2 border-coral/50 bg-coral/10 px-4 py-3 font-medium"
          >
            {formError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy || !colors}>
            {busy ? 'Working…' : submitLabel}
          </button>
          {progress && <span className="text-sm text-inkSoft">{progress}</span>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="surface overflow-hidden p-2">
          {colors ? (
            <SkinPreview skin={colors} height={320} />
          ) : (
            <div className="flex h-[320px] items-center justify-center px-6 text-center text-inkSoft">
              Pick a file and your colours appear here before anything is uploaded.
            </div>
          )}
        </div>
        {colors && (
          <>
            <p className="text-sm text-inkSoft">{enabledSummary(colors)}</p>
            <ColorList skin={colors} />
          </>
        )}
      </aside>
    </form>
  )
}

function suggestName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!base || base.toLowerCase() === 'susamune') return ''
  return base.slice(0, 60)
}
