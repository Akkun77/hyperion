import { useEffect, useState } from 'react'
import { DemoPlayback } from './demoPlayback'

export function useDemoPlayback() {
  const [controller] = useState(() => new DemoPlayback())
  const [state, setState] = useState(controller.state)
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState)
    return () => { unsubscribe(); controller.dispose() }
  }, [controller])
  return { ...state, controller }
}
