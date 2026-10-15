import { AnchorHTMLAttributes, MouseEvent, useEffect, useState } from 'react'

export function navigate(to: string) {
  window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname + window.location.search)
  useEffect(() => {
    const update = () => setPath(window.location.pathname + window.location.search)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return path
}

export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !href.startsWith('#')) {
      event.preventDefault()
      navigate(href)
    }
  }} />
}
