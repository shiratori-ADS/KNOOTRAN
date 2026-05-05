import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarInner">
          <div className="brand">KNOOTRAN</div>
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

