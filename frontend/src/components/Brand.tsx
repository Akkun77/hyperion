import { loopEmblemPath } from '../graphics/loop'

const loopPath = loopEmblemPath()
export function Mark({ animated = false }: { animated?: boolean }) {
  return <svg className={`loop-emblem ${animated ? 'loop-emblem-animated' : ''}`} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path className="loop-centerline" d={loopPath}/><path className="loop-signal" d={loopPath} pathLength="100"/></svg>
}

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><Mark /></span>{!compact && <span>HYPERION<small>API SECURITY SYSTEMS</small></span>}</span>
}
