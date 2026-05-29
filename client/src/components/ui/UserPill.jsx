import { Link } from 'react-router-dom';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vaq-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vaq-bg-page)]';

const VARIANT = {
  default: {
    container: 'shadow-sm',
    avatar: 'h-8 w-8',
    name: 'max-w-[10rem] truncate',
  },
  expand: {
    container: 'min-w-0 flex-1',
    avatar: 'h-9 w-9',
    name: 'truncate',
  },
};

export default function UserPill({ name, initial, expand = false, to = '/perfil' }) {
  const v = expand ? VARIANT.expand : VARIANT.default;
  return (
    <Link
      to={to}
      title={name || 'Usuario'}
      className={`flex items-center gap-2 rounded-full border border-[var(--vaq-nav-border)] bg-[var(--vaq-surface-elevated)] py-1 pl-1 pr-3 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${FOCUS} ${v.container}`}
    >
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--vaq-badge-bg)] text-sm font-bold text-[var(--vaq-badge-fg)] ${v.avatar}`}
      >
        {initial}
      </span>
      <span className={`text-sm font-semibold text-[var(--vaq-ink)] ${v.name}`}>
        {name || 'Cuenta'}
      </span>
    </Link>
  );
}
