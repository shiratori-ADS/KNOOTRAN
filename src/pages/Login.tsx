import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BrandLogo } from '../components/BrandLogo'

const POST_LOGIN_PATH = '/wordbook'

type Mode = 'login' | 'signup'

export function Login() {
  const { loading, isAuthenticated, cloudAuthEnabled, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (cloudAuthEnabled) document.title = 'ログイン | KNOOTRAN'
  }, [cloudAuthEnabled])

  if (loading) {
    return (
      <div className="loginShell authGate">
        <p className="subtle">読み込み中…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={POST_LOGIN_PATH} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!email.trim() || !password) {
      setMessage('メールアドレスとパスワードを入力してください。')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setMessage('パスワードは6文字以上にしてください。')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      setPassword('')
      navigate(POST_LOGIN_PATH, { replace: true })
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!cloudAuthEnabled) {
    return (
      <div className="loginShell">
        <div className="loginCard card">
          <h1 className="loginTitle">
            <BrandLogo variant="login" />
          </h1>
          <p className="help">
            クラウドログインは未設定です（<code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>）。
            開発中はローカル保存のみで利用できます。
          </p>
          <button type="button" className="primary loginSubmit" onClick={() => navigate(POST_LOGIN_PATH, { replace: true })}>
            単語帳へ（ローカルモード）
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="loginShell">
      <div className="loginCard card">
        <h1 className="loginTitle">
          <BrandLogo variant="login" />
        </h1>
        <div className="loginTabs" role="tablist" aria-label="ログインまたは新規登録">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'loginTab active' : 'loginTab'}
            onClick={() => {
              setMode('login')
              setMessage('')
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'loginTab active' : 'loginTab'}
            onClick={() => {
              setMode('signup')
              setMessage('')
            }}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)}>
          <label className="field">
            <span className="label">メールアドレス</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="field">
            <span className="label">パスワード</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              minLength={mode === 'signup' ? 6 : undefined}
            />
          </label>
          {mode === 'signup' ? (
            <p className="help">6文字以上。確認メールが有効な場合はリンクを開いてからログインしてください。</p>
          ) : null}
          <button type="submit" className="primary loginSubmit" disabled={busy}>
            {busy ? '処理中…' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>

        {message ? (
          <div className="loginError" role="alert">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  )
}
