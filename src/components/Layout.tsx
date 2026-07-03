import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { startCloudAutoSync } from '../lib/cloudAutoSync'
import { BrandLogo } from './BrandLogo'

const mainMenuItems = [
  { to: '/wordbook', label: '単語帳', visible: true },
  { to: '/register', label: '登録', visible: true },
  { to: '/translate', label: '翻訳', visible: false },
  { to: '/settings', label: '設定', visible: true },
]

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
  const { cloudAuthEnabled, isAuthenticated, signOut } = useAuth()
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
          {cloudAuthEnabled && isAuthenticated ? (
            <button
              type="button"
              className="iconButton"
              onClick={() => void onSignOut()}
              aria-label="ログアウト"
              title="ログアウト"
            >
              <LogoutIcon />
            </button>
          ) : null}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabBar" aria-label="メインメニュー">
        {mainMenuItems
          .filter((item) => item.visible)
          .map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              {item.label}
            </NavLink>
          ))}
      </nav>
    </div>
  )
}
