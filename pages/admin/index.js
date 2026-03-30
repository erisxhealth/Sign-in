import { useState } from 'react'
import { useRouter } from 'next/router'
import styles from './admin.module.css'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(false)
  const router = useRouter()

  function handleLogin(e) {
    e.preventDefault()
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', '1')
      router.push('/admin/dashboard')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>AHLERT <em>BJJ</em></div>
        <h1 className={styles.title}>Admin Access</h1>
        <form onSubmit={handleLogin}>
          <input
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            autoFocus
          />
          {error && <div className={styles.error}>Incorrect password</div>}
          <button className={styles.btn} type="submit">Enter</button>
        </form>
      </div>
    </div>
  )
}
