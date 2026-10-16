import type { DemoPlayback } from './demoPlayback'

interface Props {
  stage: number
  stageCount: number
  playing: boolean
  controller: Pick<DemoPlayback, 'goTo' | 'pause' | 'resume' | 'replay'>
}

export default function DemoPlaybackControls({stage,stageCount,playing,controller}:Props) {
  return <div className="demo-playback-controls" role="group" aria-label="Demo playback">
    <button type="button" disabled={stage===0} onClick={()=>controller.goTo(stage-1)}>Previous</button>
    <button type="button" disabled={stage===stageCount-1} aria-pressed={playing}
      title={playing?'Pause auto-play':'Start auto-play'} onClick={()=>playing?controller.pause():controller.resume()}>
      {playing?'Pause':'Play'}
    </button>
    <button type="button" disabled={stage===stageCount-1} onClick={()=>controller.goTo(stage+1)}>Next</button>
    <button type="button" onClick={()=>controller.replay()}>Replay</button>
  </div>
}
