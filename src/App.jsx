import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'reminderapp.reminders.v1'

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function loadReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveReminders(reminders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
}

function normalizeReminder(r) {
  return {
    id: r.id ?? newId(),
    title: String(r.title ?? ''),
    note: r.note == null ? '' : String(r.note),
    done: Boolean(r.done),
    // recurrence
    cadence: r.cadence ?? 'yearly', // yearly | monthly | weekly
    startDate: r.startDate ?? new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    nextDue: r.nextDue ?? r.startDate ?? new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    lastNotifiedAt: r.lastNotifiedAt ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
  }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseISODate(iso) {
  // interpret as local date (not UTC)
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(iso))
  if (!m) return null
  const [y, mo, da] = iso.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null
  return new Date(y, mo - 1, da)
}

function addMonths(baseDate, monthsToAdd) {
  // keep day-of-month if possible, otherwise clamp to last day of target month
  const y = baseDate.getFullYear()
  const m = baseDate.getMonth()
  const d = baseDate.getDate()

  const target = new Date(y, m + monthsToAdd, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  return target
}

function computeNextDue({ fromDate, cadence }) {
  if (!(fromDate instanceof Date) || Number.isNaN(fromDate.getTime())) return null
  if (cadence === 'weekly') {
    const d = new Date(fromDate)
    d.setDate(d.getDate() + 7)
    return d
  }
  if (cadence === 'monthly') return addMonths(fromDate, 1)
  // default yearly
  return addMonths(fromDate, 12)
}

function isDateDue(isoDate, todayIso) {
  if (!isoDate) return false
  // YYYY-MM-DD lexical compare works
  return String(isoDate) <= String(todayIso)
}

function App() {
  const [reminders, setReminders] = useState(() => loadReminders().map(normalizeReminder))
  const [filter, setFilter] = useState('open') // all | open | done
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [cadence, setCadence] = useState('yearly')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const titleRef = useRef(null)

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })

  useEffect(() => {
    saveReminders(reminders)
  }, [reminders])

  // On load: sanity-fix normalized nextDue if missing
  useEffect(() => {
    setReminders((prev) => prev.map((r) => normalizeReminder(r)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check due reminders and show notifications (if permitted).
  useEffect(() => {
    const tick = () => {
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return

      const todayIso = new Date().toISOString().slice(0, 10)
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      const due = reminders.filter((r) => !r.done && isDateDue(r.nextDue, todayIso))
      if (due.length === 0) return

      // Avoid spamming: notify each reminder at most once per hour.
      const toNotify = due.filter((r) => {
        if (!r.lastNotifiedAt) return true
        return now - new Date(r.lastNotifiedAt).getTime() > oneHour
      })

      if (toNotify.length === 0) return

      for (const r of toNotify) {
        // eslint-disable-next-line no-new
        new Notification('Reminder fällig', {
          body: `${r.title}${r.note ? ` — ${r.note}` : ''}`,
        })
      }

      setReminders((prev) =>
        prev.map((r) =>
          toNotify.some((x) => x.id === r.id)
            ? { ...r, lastNotifiedAt: new Date().toISOString() }
            : r,
        ),
      )
    }

    tick()
    const id = window.setInterval(tick, 60 * 1000)
    return () => window.clearInterval(id)
  }, [reminders])

  const filteredReminders = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => {
      // newest first
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })

    if (filter === 'open') return sorted.filter((r) => !r.done)
    if (filter === 'done') return sorted.filter((r) => r.done)
    return sorted
  }, [reminders, filter])

  const counts = useMemo(() => {
    const open = reminders.reduce((acc, r) => acc + (r.done ? 0 : 1), 0)
    const done = reminders.length - open
    return { all: reminders.length, open, done }
  }, [reminders])

  function addReminder(e) {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Titel ist Pflicht.')
      titleRef.current?.focus()
      return
    }

     const start = parseISODate(startDate)
     if (!start) {
       setError('Startdatum ist ungültig.')
       return
     }

    const reminder = normalizeReminder({
      title: cleanTitle,
      note: note.trim(),
      done: false,
      cadence,
      startDate,
      nextDue: startDate,
      lastNotifiedAt: null,
    })
    setReminders((prev) => [reminder, ...prev])
    setTitle('')
    setNote('')
    setCadence('yearly')
    setStartDate(new Date().toISOString().slice(0, 10))
    setError('')
    titleRef.current?.focus()
  }

  function toggleDone(id) {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)))
  }

  function markDoneAndScheduleNext(id) {
    setReminders((prev) => {
      const todayIso = new Date().toISOString().slice(0, 10)
      return prev.map((r) => {
        if (r.id !== id) return r

        const dueFrom = parseISODate(r.nextDue || todayIso) ?? new Date()
        const next = computeNextDue({ fromDate: dueFrom, cadence: r.cadence })

        return {
          ...r,
          done: false,
          // schedule next occurrence
          nextDue: next ? toISODate(next) : r.nextDue,
          lastNotifiedAt: null,
        }
      })
    })
  }

  function removeReminder(id) {
    const r = reminders.find((x) => x.id === id)
    const label = r?.title ? `„${r.title}“` : 'diesen Reminder'
    if (!window.confirm(`Willst du ${label} wirklich löschen?`)) return
    setReminders((prev) => prev.filter((x) => x.id !== id))
  }

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }
    try {
      const p = await Notification.requestPermission()
      setNotificationPermission(p)
    } catch {
      setNotificationPermission(Notification.permission)
    }
  }

  return (
    <main className="app">
      <header className="appHeader">
        <h1>Reminder App</h1>
        <p className="subtitle">Wiederkehrende Reminders + Browser Notifications</p>
      </header>

      <section className="card" aria-label="Benachrichtigungen">
        <h2>Benachrichtigungen</h2>
        {notificationPermission === 'unsupported' ? (
          <p className="empty">
            Dein Browser unterstützt Notifications nicht (oder es läuft nicht im Browser).
          </p>
        ) : (
          <div className="actions">
            <p className="empty" style={{ flex: '1 1 260px' }}>
              Status: <strong>{notificationPermission}</strong>
              <br />
              Hinweis: Notifications funktionieren nur, wenn die Seite geöffnet ist.
            </p>
            <button type="button" onClick={requestNotificationPermission}>
              Notifications erlauben
            </button>
          </div>
        )}
      </section>

      <section className="card" aria-label="Reminder hinzufügen">
        <h2>Neuer Reminder</h2>
        <form onSubmit={addReminder} className="form">
          <div className="field">
            <label htmlFor="title">Titel *</label>
            <input
              id="title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Hausaufgaben abgeben"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="note">Notiz</label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="cadence">Intervall</label>
            <select
              id="cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
            >
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="startDate">Erstes Fälligkeitsdatum</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="actions">
            <button type="submit">Hinzufügen</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setTitle('')
                setNote('')
                setCadence('yearly')
                setStartDate(new Date().toISOString().slice(0, 10))
                setError('')
                titleRef.current?.focus()
              }}
            >
              Leeren
            </button>
          </div>
        </form>
      </section>

      <section className="card" aria-label="Filter">
        <h2>Filter</h2>
        <div className="filters" role="tablist" aria-label="Reminder-Filter">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Alle ({counts.all})
          </button>
          <button
            type="button"
            className={filter === 'open' ? 'active' : ''}
            onClick={() => setFilter('open')}
          >
            Offen ({counts.open})
          </button>
          <button
            type="button"
            className={filter === 'done' ? 'active' : ''}
            onClick={() => setFilter('done')}
          >
            Erledigt ({counts.done})
          </button>
        </div>
      </section>

      <section className="card" aria-label="Reminder-Liste">
        <h2>Reminders</h2>

        {filteredReminders.length === 0 ? (
          <p className="empty">
            {reminders.length === 0
              ? 'Noch keine Reminders. Erstelle oben deinen ersten.'
              : 'Für diesen Filter gibt es keine Einträge.'}
          </p>
        ) : (
          <ul className="list">
            {filteredReminders.map((r) => (
              <li key={r.id} className={r.done ? 'item done' : 'item'}>
                <label className="itemMain">
                  <input
                    type="checkbox"
                    checked={r.done}
                    onChange={() => toggleDone(r.id)}
                    aria-label={`Reminder ${r.title} erledigt umschalten`}
                  />
                  <span className="itemText">
                    <span className="itemTitle">{r.title}</span>
                    {r.note ? <span className="itemNote">{r.note}</span> : null}
                    <span className="itemNote">
                      Fällig: <strong>{r.nextDue}</strong> · Intervall: {r.cadence}
                    </span>
                  </span>
                </label>

                <div className="itemButtons">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => markDoneAndScheduleNext(r.id)}
                    title="Erledigt + nächster Termin"
                  >
                    Erledigt
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeReminder(r.id)}
                    aria-label={`Reminder ${r.title} löschen`}
                    title="Löschen"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
