'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Job Data', href: '/job-data' },
  { label: 'Employees', href: '/employees' },
  { label: 'Job Types', href: '/job-types' },
  { label: 'Curve Review', href: '/curves-review' },
  { label: 'Curves Explainer', href: '/curves-explainer' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="side">
        <a
          href="https://xzibit-apps.vercel.app"
          className="side-brand"
          aria-label="Xzibit apps home"
        >
          <div className="brand-mark">X</div>
          <div className="brand-word">Xzibit</div>
        </a>

        <div className="side-group-label">Planning</div>
        <nav className="side-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'nav-item is-active' : 'nav-item'}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="tag">imagination.captured</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <div className="h3">Capacity Planner</div>
          </div>
          <div className="topbar-actions">
            <BuildVersion />
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}

function BuildVersion() {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown';
  const ref = process.env.NEXT_PUBLIC_COMMIT_REF || 'local';
  const env = process.env.NEXT_PUBLIC_BUILD_ENV || 'local';
  const shortSha = sha === 'unknown' ? 'unknown' : sha.slice(0, 7);
  const commitUrl =
    sha === 'unknown'
      ? null
      : `https://github.com/jnebauer/xzibit-capacity-planner/commit/${sha}`;
  const envSuffix = env !== 'production' && env !== 'local' ? env : null;
  const title = `commit ${sha}\nbranch ${ref}\nenv ${env}`;

  const content = (
    <>
      <span className="build-pill-sha">{shortSha}</span>
      {envSuffix && (
        <>
          <span className="build-pill-sep">·</span>
          <span className="build-pill-time">{envSuffix}</span>
        </>
      )}
    </>
  );

  if (!commitUrl) {
    return (
      <span className="build-pill" title={title}>
        {content}
      </span>
    );
  }
  return (
    <a
      className="build-pill"
      href={commitUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
    >
      {content}
    </a>
  );
}
