// Development-only browser-clock audit. Does not clear session storage or call a backend scenario.
import React from 'react'
import {createRoot} from 'react-dom/client'
import App from '../src/App'
import '../src/index.css'
const root=document.querySelector('#root')!, output=document.querySelector('#intro-observation')!
let entered=0, completed=false
root.addEventListener('animationstart',event=>{
 if((event as AnimationEvent).animationName==='brand-text-in')output.textContent='Wordmark revealing — existing loop introduction'
})
root.addEventListener('animationend',event=>{
 if((event as AnimationEvent).animationName==='brand-text-in')output.textContent='Wordmark fully visible — existing loop introduction'
})
new MutationObserver(()=>{
 const overlay=root.querySelector('.hyperion-opening')
 if(overlay&&!entered){entered=performance.now();output.textContent=`Introduction visible at ${entered.toFixed(1)}ms`}
 if(!overlay&&entered&&!completed){completed=true;output.textContent=`Introduction completed after ${(performance.now()-entered).toFixed(1)}ms`}
}).observe(root,{childList:true,subtree:true})
document.querySelector('#start-intro')!.addEventListener('click',()=>{
 const button=document.querySelector('#start-intro') as HTMLButtonElement
 button.disabled=true
 const reduced=document.querySelector('#reduced-fixture') as HTMLInputElement
 reduced.disabled=true
 if(reduced.checked){
  const original=window.matchMedia.bind(window)
  window.matchMedia=query=>new Proxy(original(query),{get(target,key){
   if(key==='matches'&&query.includes('prefers-reduced-motion'))return true
   const value=Reflect.get(target,key,target)
   return typeof value==='function'?value.bind(target):value
  }})
 }
 window.history.replaceState(null,'','/')
 createRoot(root).render(<React.StrictMode><App/></React.StrictMode>)
})
