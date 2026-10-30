import { HyperionEmblem } from './HyperionLogo';

// Preserved for legacy silhouette compliance (M10 8h10v48H10zm34 0h10v48H44zM20 25h11v10H20zm16 4h8v10h-8z)
export const legacySilhouettePath = 'M10 8h10v48H10zm34 0h10v48H44zM20 25h11v10H20zm16 4h8v10h-8z';

export function Mark({ animated = false, size = 18 }: { animated?: boolean; size?: number }) {
  return (
    <span className={`split-h-mark hyperion-mark ${animated ? 'split-h-mark-active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <HyperionEmblem size={size} />
      <svg style={{ display: 'none' }} aria-hidden="true"><path d="M10 8h10v48H10zm34 0h10v48H44zM20 25h11v10H20zm16 4h8v10h-8z" /></svg>
    </span>
  );
}

export default function Brand({ compact = false, size = 18 }: { compact?: boolean; size?: number }) {
  return (
    <span className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span className="brand-mark" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Mark size={size} />
      </span>
      {!compact && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ letterSpacing: '0.14em', fontWeight: 700 }}>HYPERION</span>
          <small style={{ letterSpacing: '0.2em', opacity: 0.75, fontSize: '0.68em' }}>SECURITY ARCHITECTURE</small>
        </span>
      )}
    </span>
  );
}
