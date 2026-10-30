import { useEffect, useState } from 'react'
// Optional session persistence: no request data, tokens or credentials are stored.
export function useSessionValue(key: string, fallback: string) {
  const [value,setValue] = useState(()=>{try {return sessionStorage.getItem(`hyperion-view:${key}`) ?? fallback} catch {return fallback}})
  useEffect(()=>{try {sessionStorage.setItem(`hyperion-view:${key}`,value)} catch { /* optional */ }},[key,value])
  return [value,setValue] as const
}
