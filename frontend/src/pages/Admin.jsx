import { useState } from 'react'

const API_KEY_STORAGE = 'draw_odds_admin_key'

export default function Admin() {
  const [apiKey, setApiKey] = useState(localStorage.getItem(API_KEY_STORAGE) || '')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  // State creation form
  const [stateForm, setStateForm] = useState({
    code: '', name: '', points_system: 'preference', notes: '', data_source_url: ''
  })

  const saveKey = () => {
    localStorage.setItem(API_KEY_STORAGE, apiKey)
    setStatus({ type: 'success', msg: 'API key saved locally.' })
  }

  const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' }

  const createState = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/states', {
        method: 'POST', headers, body: JSON.stringify(stateForm)
      })
      const data = await r.json()
      if (r.ok) {
        setStatus({ type: 'success', msg: `State ${data.code} created successfully!` })
        setStateForm({ code: '', name: '', points_system: 'preference', notes: '', data_source_url: '' })
      } else {
        setStatus({ type: 'error', msg: data.detail || 'Failed to create state.' })
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setLoading(false)
    }
  }

  const loadSeedData = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/import/seed', { method: 'POST', headers })
      const data = await r.json()
      if (r.ok) {
        setStatus({
          type: 'success',
          msg: `Imported ${data.hunts_created} hunts, ${data.draw_results_created} draw results.`
               + (data.errors?.length ? ` Errors: ${data.errors.join(', ')}` : ''),
        })
      } else {
        setStatus({ type: 'error', msg: data.detail || 'Seed import failed.' })
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setLoading(false)
    }
  }

  const uploadJson = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const r = await fetch('/api/admin/import/json', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: formData,
      })
      const data = await r.json()
      if (r.ok) {
        setStatus({
          type: 'success',
          msg: `Imported ${data.hunts_created} new hunts, updated ${data.hunts_updated}, ` +
               `${data.draw_results_created} draw results.` +
               (data.errors?.length ? ` Errors: ${data.errors.join('; ')}` : ''),
        })
      } else {
        setStatus({ type: 'error', msg: data.detail || 'Import failed.' })
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-stone-800">Admin Panel</h1>

      {/* Status banner */}
      {status && (
        <div className={`rounded-lg p-3 text-sm font-medium ${
          status.type === 'success' ? 'bg-forest-100 text-forest-800' : 'bg-red-100 text-red-800'
        }`}>
          {status.msg}
          <button onClick={() => setStatus(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* API key */}
      <div className="card space-y-3">
        <h2 className="font-bold text-stone-700">API Key</h2>
        <p className="text-xs text-stone-500">
          Set in backend via <code className="bg-stone-100 px-1 rounded">ADMIN_API_KEY</code> env var.
          Default in dev: <code className="bg-stone-100 px-1 rounded">dev-secret-change-me</code>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="Enter admin API key…"
          />
          <button onClick={saveKey} className="btn-secondary text-sm">Save</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card space-y-3">
        <h2 className="font-bold text-stone-700">Quick Actions</h2>

        <div className="space-y-2">
          <button
            onClick={loadSeedData}
            disabled={loading || !apiKey}
            className="btn-primary w-full"
          >
            {loading ? '⏳ Loading…' : '🌱 Load Colorado Seed Data'}
          </button>
          <p className="text-xs text-stone-400">
            Loads bundled CO elk, deer, and antelope sample data into the database.
            Run this first to get started. Make sure you've created the CO state first.
          </p>
        </div>

        <hr className="border-stone-100" />

        <div className="space-y-2">
          <label className="btn-secondary w-full flex items-center justify-center cursor-pointer">
            📂 Upload JSON Import File
            <input type="file" accept=".json" onChange={uploadJson} className="hidden" disabled={!apiKey} />
          </label>
          <p className="text-xs text-stone-400">
            Upload a JSON file in the standard import format. See{' '}
            <code className="bg-stone-100 px-1 rounded">backend/seed_data/colorado_seed.json</code>{' '}
            as an example.
          </p>
        </div>
      </div>

      {/* Add state */}
      <div className="card space-y-3">
        <h2 className="font-bold text-stone-700">Add State</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">State Code *</label>
            <input
              value={stateForm.code}
              onChange={e => setStateForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="CO"
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">State Name *</label>
            <input
              value={stateForm.name}
              onChange={e => setStateForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              placeholder="Colorado"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">Points System</label>
          <select
            value={stateForm.points_system}
            onChange={e => setStateForm(f => ({ ...f, points_system: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="preference">Preference (highest points draw first)</option>
            <option value="bonus">Bonus (weighted random lottery)</option>
            <option value="random">Random (pure lottery)</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">Data Source URL</label>
          <input
            value={stateForm.data_source_url}
            onChange={e => setStateForm(f => ({ ...f, data_source_url: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            placeholder="https://cpw.state.co.us/…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 block mb-1">Notes</label>
          <textarea
            value={stateForm.notes}
            onChange={e => setStateForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            rows={2}
            placeholder="Any quirks about this state's draw system…"
          />
        </div>
        <button
          onClick={createState}
          disabled={loading || !apiKey || !stateForm.code || !stateForm.name}
          className="btn-primary w-full"
        >
          {loading ? '⏳ Creating…' : 'Create State'}
        </button>
      </div>

      {/* Setup checklist */}
      <div className="card space-y-2">
        <h2 className="font-bold text-stone-700">Setup Checklist</h2>
        <div className="space-y-1 text-sm text-stone-600">
          {[
            '1. Enter your admin API key above',
            '2. Create the CO state (code: CO, name: Colorado)',
            '3. Click "Load Colorado Seed Data"',
            '4. Navigate to Hunts to verify data loaded',
            '5. To add more data, use the scraper or upload a JSON file',
          ].map(step => (
            <p key={step} className="flex gap-2">
              <span className="text-stone-400 flex-shrink-0">→</span>
              {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
