import Brand from '../components/Brand'
import { Link } from '../router'
import WatchHyperionWork from '../workspace/WatchHyperionWork'
export default function Watch(){
 return <div className="product-site watch-page"><header className="site-header"><Link href="/" aria-label="Hyperion home"><Brand/></Link><nav aria-label="Primary navigation"><Link href="/">Product</Link><Link href="/command-center">Command center ↗</Link></nav></header><main id="main"><WatchHyperionWork/></main></div>
}
