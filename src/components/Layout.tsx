import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { startCloudAutoSync } from '../lib/cloudAutoSync'
import { BrandLogo } from './BrandLogo'

function LogoutIcon() {
  return (
    <svg
      className="iconButtonIcon"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function Layout() {
  const { email, cloudAuthEnabled, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const stop = startCloudAutoSync()
    return () => stop()
  }, [])

  async function onSignOut() {
    if (cloudAuthEnabled) {
      await signOut()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarInner">
          <BrandLogo />
          {cloudAuthEnabled && email ? (
            <div className="topBarAccount">
              <span className="hint mono" title={email}>
                {email}
              </span>
              <button
                type="button"
                className="iconButton"
                onClick={() => void onSignOut()}
                aria-label="ログアウト"
                title="ログアウト"
              >
                <LogoutIcon />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabBar" aria-label="メインメニュー">
        <NavLink to="/register" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          登録
        </NavLink>
        <NavLink to="/translate" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          翻訳
        </NavLink>
        <NavLink to="/wordbook" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          単語帳
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          設定
        </NavLink>
      </nav>
    </div>
  )
}
