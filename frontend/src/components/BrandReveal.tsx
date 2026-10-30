import { HyperionLoaderReveal } from './HyperionLogo';
import './brand-introduction.css';

export default function BrandReveal({ onComplete }: { onComplete: () => void }) {
  return <HyperionLoaderReveal onComplete={onComplete} />;
}
