import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import styles from './admin.module.css'

const BELTS = ['white', 'blue', 'purple', 'brown', 'black']

const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtDate = ts => new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const fmtDateKey = ts => new Date(ts).toDateString()

function checkinUrl(id) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/checkin/${id}`
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? '✓ Copied' : 'Copy Link'}
    </button>
  )
}

function MemberModal({ existing, onSave, onClose }) {
  const [f, setF] = useState(existing || { name: '', belt: 'white', notes: '' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>{existing ? 'Edit Member' : 'Add Member'}</h2>
        <div className={styles.field}>
          <label>Name</label>
          <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="First Last" autoFocus />
        </div>
        <div className={styles.field}>
          <label>Belt</label>
          <select value={f.belt} onChange={e => set('belt', e.target.value)}>
            {BELTS.map(b => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Notes (optional)</label>
          <input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Mon/Wed/Fri" />
        </div>
        <div className={styles.modalActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnRed}`} onClick={() => f.name.trim() && onSave(f)}>
            {existing ? 'Save' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [authed,   setAuthed]   = useState(false)
  const [tab,      setTab]      = useState('attendance')
  const [members,  setMembers]  = useState([])
  const [checkins, setCheckins] = useState([])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') !== '1') {
      router.replace('/admin')
      return
    }
    setAuthed(true)
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('checkins').select('*, members(name, belt)').order('checked_in_at', { ascending: false })
    ])
    setMembers(m || [])
    setCheckins(c || [])
    setLoading(false)
  }

  async function addMember(f) {
    const { data } = await supabase.from('members').insert({ name: f.name, belt: f.belt, notes: f.notes }).select().single()
    if (data) setMembers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setAdding(false)
  }

  async function editMember(f) {
    await supabase.from('members').update({ name: f.name, belt: f.belt, notes: f.notes }).eq('id', editing.id)
    setMembers(prev => prev.map(m => m.id === editing.id ? { ...m, ...f } : m))
    setEditing(null)
  }

  async function deleteMember(id) {
    if (!confirm('Remove this member and all their check-ins?')) return
    await supabase.from('checkins').delete().eq('member_id', id)
    await supabase.from('members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
    setCheckins(prev => prev.filter(c => c.member_id !== id))
  }

  function logout() {
    sessionStorage.removeItem('admin_authed')
    router.push('/admin')
  }

  if (!authed) return null

  const today = new Date().toDateString()
  const todayCount = checkins.filter(c => new Date(c.checked_in_at).toDateString() === today).length
  const weekCount  = checkins.filter(c => Date.now() - new Date(c.checked_in_at) < 7 * 86400000).length
  const countFor   = id => checkins.filter(c => c.member_id === id).length

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  const filteredCheckins = checkins.filter(c => filter === 'all' || c.member_id === filter)
  const logRows = []
  let lastKey = null
  for (const c of filteredCheckins) {
    const key = fmtDateKey(c.checked_in_at)
    if (key !== lastKey) { logRows.push({ type: 'date', label: fmtDate(c.checked_in_at) }); lastKey = key }
    logRows.push({ type: 'log', c })
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>AHLERT <em>BJJ</em></div>
        <nav className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'attendance' ? styles.active : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
          <button className={`${styles.tab} ${tab === 'members'    ? styles.active : ''}`} onClick={() => setTab('members')}>Members</button>
        </nav>
        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={logout}>Log out</button>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : (
          <>
            {tab === 'attendance' && (
              <>
                <div className={styles.statsRow}>
                  <div className={styles.stat}><div className={styles.statN}>{todayCount}</div><div className={styles.statL}>Today</div></div>
                  <div className={styles.stat}><div className={styles.statN}>{weekCount}</div><div className={styles.statL}>This Week</div></div>
                  <div className={styles.stat}><div className={styles.statN}>{checkins.length}</div><div className={styles.statL}>All Time</div></div>
                </div>
                <div className={styles.toolbar}>
                  <select className={styles.filterSel} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Members</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                {logRows.length === 0
                  ? <div className={styles.empty}>No check-ins yet.</div>
                  : logRows.map((item, i) => {
                      if (item.type === 'date') return <div key={i} className={styles.dateLabel}>{item.label}</div>
                      const { c } = item
                      const m = c.members
                      const initials = m ? m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
                      const total = checkins.filter(x => x.member_id === c.member_id && new Date(x.checked_in_at) <= new Date(c.checked_in_at)).length
                      return (
                        <div key={c.id} className={styles.logRow}>
                          <div className={styles.avatar}>{initials}</div>
                          <div className={styles.logInfo}>
                            <div className={styles.logName}>{m ? m.name : 'Unknown'}</div>
                            <div className={styles.logSub}>
                              {m && <span className={`${styles.beltPill} ${styles['belt-' + m.belt]}`}>{m.belt}</span>}
                              <span>{total} total classes</span>
                            </div>
                          </div>
                          <div className={styles.logTime}>
                            <strong>{fmtTime(c.checked_in_at)}</strong>
                          </div>
                        </div>
                      )
                    })
                }
              </>
            )}

            {tab === 'members' && (
              <>
                <div className={styles.toolbar}>
                  <input className={styles.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                  <button className={`${styles.btn} ${styles.btnRed}`} onClick={() => setAdding(true)}>+ Add Member</button>
                </div>
                {filteredMembers.length === 0
                  ? <div className={styles.empty}>No members yet.</div>
                  : <div className={styles.tblWrap}>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th><th>Belt</th><th>Classes</th><th>Notes</th><th>QR Link</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMembers.map(m => (
                            <tr key={m.id}>
                              <td style={{ fontWeight: 500 }}>{m.name}</td>
                              <td><span className={`${styles.beltPill} ${styles['belt-' + m.belt]}`}>{m.belt}</span></td>
                              <td className={styles.countCell}>{countFor(m.id)}</td>
                              <td className={styles.mutedCell}>{m.notes || '—'}</td>
                              <td><CopyBtn text={checkinUrl(m.id)} /></td>
                              <td>
                                <div className={styles.actions}>
                                  <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setEditing(m)}>Edit</button>
                                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => deleteMember(m.id)}>✕</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                }
              </>
            )}
          </>
        )}
      </main>

      {adding  && <MemberModal onSave={addMember} onClose={() => setAdding(false)} />}
      {editing && <MemberModal existing={editing} onSave={editMember} onClose={() => setEditing(null)} />}
    </div>
  )
                       }
