export function Mark({ animated = false }: { animated?: boolean }) {
  return <svg className={`split-h-mark ${animated ? 'split-h-mark-active' : ''}`} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path fill="currentColor" d="M10 8h10v48H10zm34 0h10v48H44zM20 25h11v10H20zm16 4h8v10h-8z"/><path fill="var(--silver, #BFC3C7)" opacity=".85" d="M31 27h5v10h-5z"/></svg>
}

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><Mark /></span>{!compact && <span>HYPERION<small>SECURITY ARCHITECTURE</small></span>}</span>
}
