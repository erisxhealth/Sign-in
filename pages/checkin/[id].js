import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import styles from './checkin.module.css'

export default function CheckIn() {
  const router = useRouter()
  const { id } = router.query

  const [member, setMember] = useState(null)
  const [phase,  setPhase]  = useState('loading')
  const [count,  setCount]  = useState(0)
  const [time,   setTime]   = useState('')

  useEffect(() => {
    if (!id) return
    async function fetchMember() {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) { setPhase('unknown'); return }
      setMember(data)
      setPhase('ready')
    }
    fetchMember()
  }, [id])

  async function handleCheckIn() {
    setPhase('submitting')
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('checkins')
      .select('id')
      .eq('member_id', id)
      .gte('checked_in_at', thirtyMinAgo)
      .limit(1)

    const { count: total } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', id)

    if (recent && recent.length > 0) {
      setCount(total || 0)
      setPhase('already')
      return
    }

    await supabase.from('checkins').insert({ member_id: id })
    setCount((total || 0) + 1)
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setPhase('done')
  }

  const beltClass = member ? `belt-${member.belt}` : ''

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.gym}>Ahlert Jiu-Jitsu · Hazlet NJ</div>

        {phase === 'loading' && <div className={styles.loading}>Loading…</div>}

        {(phase === 'ready' || phase === 'submitting') && member && (<>
          <div className={styles.name}>{member.name}</div>
          <span className={`${styles.belt} ${styles[beltClass]}`}>{member.belt}</span>
          <button className={styles.submit} onClick={handleCheckIn} disabled={phase === 'submitting'}>
            {phase === 'submitting' ? 'Checking in…' : 'Check In'}
          </button>
        </>)}

        {phase === 'done' && member && (<>
          <span className={styles.icon}>🥋</span>
          <div className={styles.name}>{member.name}</div>
          <span className={`${styles.belt} ${styles[beltClass]}`}>{member.belt}</span>
          <div className={styles.countBox}>
            <div className={styles.countNum}>{count}</div>
            <div className={styles.countLabel}>{count === 1 ? 'Class Attended' : 'Classes Attended'}</div>
          </div>
          <div className={styles.note}>Checked in at {time}. See you on the mat!</div>
        </>)}

        {phase === 'already' && member && (<>
          <span className={styles.icon}>👊</span>
          <div className={styles.name}>{member.name}</div>
          <span className={`${styles.belt} ${styles[beltClass]}`}>{member.belt}</span>
          <div className={styles.countBox}>
            <div className={styles.countNum}>{count}</div>
            <div className={styles.countLabel}>{count === 1 ? 'Class Attended' : 'Classes Attended'}</div>
          </div>
          <div className={styles.note}>Already checked in for this session.</div>
        </>)}

        {phase === 'unknown' && (<>
          <span className={styles.icon}>❓</span>
          <div className={styles.name} style={{ fontSize: 28 }}>Not Found</div>
          <div className={styles.note} style={{ marginTop: 12 }}>
            This QR code isn't registered. Ask your coach for a new card.
          </div>
        </>)}
      </div>
    </div>
  )
          }
