export function Mark() {
  return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M5 5h7v10h12V5h7v26h-7V21H12v10H5z" fill="currentColor"/><path d="m15 8 6-4v7l-6 4zm0 17 6-4v7l-6 4z" fill="currentColor" opacity=".4"/></svg>
}

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><Mark /></span>{!compact && <span>HYPERION<small>API SECURITY SYSTEMS</small></span>}</span>
}
