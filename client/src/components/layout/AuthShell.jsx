import ThemeToggle from '../ui/ThemeToggle';

export default function AuthShell({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--vaq-bg-page)] px-4 py-12 text-[var(--vaq-ink)]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
