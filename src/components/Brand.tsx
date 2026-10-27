interface BrandProps {
  href: string;
  label: string;
}

/** Wordmark with a simple pitch glyph: touchline frame, halfway line, centre circle. */
export function Brand({ href, label }: BrandProps) {
  return (
    <a className="brand" href={href} aria-label={label}>
      <svg className="brand-mark" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="22" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M13 4v18" stroke="currentColor" strokeWidth="2" />
        <circle cx="13" cy="13" r="3.5" fill="currentColor" />
      </svg>
      <span>Matchwork</span>
    </a>
  );
}
