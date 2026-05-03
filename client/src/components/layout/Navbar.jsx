import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fmtName } from '../../utils/format';
import ThemeToggle from '../ui/ThemeToggle';

function userInitial(name) {
  if (!name || !name.trim()) return '?';
  return name.trim()[0].toUpperCase();
}

const linkFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vaq-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vaq-bg-page)]';

function navLinkClass({ isActive, isPending }) {
  const base = [
    'block rounded-lg px-3 py-2 text-sm font-semibold tracking-wide transition-colors duration-200',
    linkFocus,
  ];
  if (isPending) {
    return [...base, 'text-[var(--vaq-muted)] opacity-70'].join(' ');
  }
  if (isActive) {
    return [
      ...base,
      'bg-[var(--vaq-forest)]/12 text-[var(--vaq-forest)] shadow-[inset_0_-2px_0_0_var(--vaq-forest)]',
    ].join(' ');
  }
  return [
    ...base,
    'text-[var(--vaq-muted)] hover:bg-black/[0.04] hover:text-[var(--vaq-ink)] dark:hover:bg-white/[0.06]',
  ].join(' ');
}

const NAV_ITEMS = [
  { to: '/fondos', end: true, label: 'Mis fondos' },
  { to: '/directorio', end: true, label: 'Directorio público' },
];

function brandLink(className) {
  return (
    <Link
      to="/fondos"
      className={`vaq-nav-brand group flex items-center gap-2.5 rounded-lg py-1 pr-2 ${linkFocus} ${className}`}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--vaq-badge-bg)] text-lg font-bold text-[var(--vaq-badge-fg)] shadow-md ring-2 ring-[var(--vaq-badge-bg)]/30 transition-transform duration-200 group-hover:scale-[1.03]"
        aria-hidden
      >
        V
      </span>
      <span
        className="font-semibold text-[length:1.15rem] leading-tight tracking-tight text-[var(--vaq-forest)]"
        style={{ fontFamily: 'var(--font-nav-display)' }}
      >
        VaquitaApp
      </span>
    </Link>
  );
}

/** Estado local se reinicia al cambiar la ruta (`key` en el padre). */
function NavbarMobileBlock({ renderNavLinks, displayName, initial, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:hidden">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2">
        {brandLink('min-w-0')}
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--vaq-nav-border)] bg-[var(--vaq-surface-muted)] text-[var(--vaq-forest)] ${linkFocus}`}
            aria-expanded={menuOpen}
            aria-controls="navbar-mobile-panel"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="navbar-mobile-panel"
        className={
          menuOpen
            ? 'flex flex-col gap-1 border-t border-[var(--vaq-nav-border)] pb-4 pt-2'
            : 'hidden'
        }
        style={{ fontFamily: 'var(--font-nav-sans)' }}
      >
        <div className="flex flex-col gap-0.5">{renderNavLinks()}</div>
        <div className="vaq-nav-item mt-3 flex items-center gap-3 border-t border-[var(--vaq-nav-border)] pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--vaq-nav-border)] bg-[var(--vaq-surface-elevated)] py-1 pl-1 pr-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--vaq-badge-bg)] text-sm font-bold text-[var(--vaq-badge-fg)]"
              aria-hidden
            >
              {initial}
            </span>
            <span className="truncate text-sm font-semibold text-[var(--vaq-ink)]">
              {displayName || 'Cuenta'}
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className={`shrink-0 rounded-lg border border-[var(--vaq-danger)]/25 bg-[var(--vaq-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--vaq-danger)] ${linkFocus}`}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = fmtName(user?.name);
  const initial = userInitial(user?.name || user?.email);
  const profileLabel = displayName || 'Perfil';

  const renderNavLinks = () => [
    ...NAV_ITEMS.map(({ to, end, label }) => (
      <span key={to} className="vaq-nav-item block">
        <NavLink to={to} end={end} className={navLinkClass}>
          {label}
        </NavLink>
      </span>
    )),
    <span key="/perfil" className="vaq-nav-item block">
      <NavLink to="/perfil" end className={navLinkClass}>
        {profileLabel}
      </NavLink>
    </span>,
  ];

  return (
    <nav
      aria-label="Principal"
      className="vaq-nav sticky top-0 z-50 border-b border-[var(--vaq-nav-border)] bg-[var(--vaq-nav-bg)] shadow-[0_1px_0_rgb(0_0_0_/0.03)] backdrop-blur-md backdrop-saturate-150 dark:shadow-[0_1px_0_rgb(255_255_255_/0.04)]"
    >
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[var(--vaq-noise-opacity)] dark:mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col px-4 md:flex-row md:items-center md:justify-between md:gap-6 md:py-0 md:h-16">
        <NavbarMobileBlock
          key={location.pathname}
          renderNavLinks={renderNavLinks}
          displayName={displayName}
          initial={initial}
          onLogout={handleLogout}
        />

        <div className="hidden shrink-0 md:flex">{brandLink('')}</div>

        <div
          className="hidden items-center gap-1 md:flex md:flex-1 md:justify-end"
          style={{ fontFamily: 'var(--font-nav-sans)' }}
        >
          <div className="flex items-center gap-0.5 pr-2">{renderNavLinks()}</div>
          <div className="mx-2 hidden h-8 w-px bg-[var(--vaq-nav-border)] sm:block" aria-hidden />
          <div className="flex items-center gap-2 pl-1 md:gap-3">
            <div
              className="flex items-center gap-2 rounded-full border border-[var(--vaq-nav-border)] bg-[var(--vaq-surface-elevated)] py-1 pl-1 pr-3 shadow-sm"
              title={displayName || 'Usuario'}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--vaq-badge-bg)] text-sm font-bold text-[var(--vaq-badge-fg)]"
                aria-hidden
              >
                {initial}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-semibold text-[var(--vaq-ink)]">
                {displayName || 'Cuenta'}
              </span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className={`rounded-lg border border-[var(--vaq-danger)]/25 bg-[var(--vaq-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--vaq-danger)] transition-colors hover:bg-[var(--vaq-danger)]/15 dark:hover:bg-[var(--vaq-danger)]/25 ${linkFocus}`}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
