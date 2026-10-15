// Presentation time only: never represents backend execution latency.
export const DEMO_STAGE_DURATIONS = [6000, 6000, 6000, 9000, 9000, 8000, Infinity] as const
export interface PlaybackClock {
  now: () => number
  setTimeout: (callback: () => void, milliseconds: number) => unknown
  clearTimeout: (timer: unknown) => void
}
export interface PlaybackState {
  stage: number
  playing: boolean
  direction: 'forward' | 'backward'
  speed: number
}
const browserClock: PlaybackClock = {
  now: () => performance.now(),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: timer => window.clearTimeout(timer as number)
}

/** One cancellable clock for the recorded result; it performs no network requests. */
export class DemoPlayback {
  state: PlaybackState = { stage: 0, playing: false, direction: 'forward', speed: 1 }
  private count = 0
  private timer: unknown
  private generation = 0
  private deadline = 0
  private remaining = 0
  private listeners = new Set<(state: PlaybackState) => void>()
  constructor(private clock: PlaybackClock = browserClock) {}
  subscribe = (listener: (state: PlaybackState) => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private emit() { this.listeners.forEach(listener => listener({ ...this.state })) }
  private duration() { return (DEMO_STAGE_DURATIONS[this.state.stage] ?? Infinity) / this.state.speed }
  private cancel() {
    this.generation++
    if (this.timer !== undefined) this.clock.clearTimeout(this.timer)
    this.timer = undefined
  }
  private schedule() {
    this.cancel()
    if (!this.state.playing || this.state.stage >= this.count - 1 || !Number.isFinite(this.remaining)) return
    const generation = this.generation
    this.deadline = this.clock.now() + this.remaining
    this.timer = this.clock.setTimeout(() => {
      if (generation !== this.generation) return
      this.state = { ...this.state, stage: this.state.stage + 1, direction: 'forward' }
      this.state.playing = this.state.stage < this.count - 1
      this.remaining = this.duration()
      this.schedule()
      this.emit()
    }, this.remaining)
  }
  start(count: number, autoplay = true) {
    this.cancel()
    this.count = count
    this.state = { ...this.state, stage: 0, playing: autoplay && count > 1, direction: 'forward' }
    this.remaining = this.duration()
    this.schedule()
    this.emit()
  }
  pause() {
    if (this.state.playing) this.remaining = Math.max(0, this.deadline - this.clock.now())
    this.cancel()
    this.state = { ...this.state, playing: false }
    this.emit()
  }
  resume() {
    if (!this.count || this.state.playing || this.state.stage >= this.count - 1) return
    this.state = { ...this.state, playing: true, direction: 'forward' }
    this.schedule()
    this.emit()
  }
  goTo(stage: number) {
    if (!this.count) return
    this.cancel() // Synchronous invalidation also rejects an already queued old callback.
    const next = Math.max(0, Math.min(this.count - 1, stage))
    this.state = { ...this.state, stage: next, playing: false, direction: next < this.state.stage ? 'backward' : 'forward' }
    this.remaining = this.duration()
    this.emit()
  }
  setSpeed(speed: number) {
    if (![0.75, 1, 1.5].includes(speed)) return
    const remaining = this.state.playing ? Math.max(0, this.deadline - this.clock.now()) : this.remaining
    this.remaining = remaining * this.state.speed / speed
    this.state = { ...this.state, speed }
    this.schedule()
    this.emit()
  }
  replay() { if (this.count) this.start(this.count) }
  stop() {
    this.cancel()
    this.count = 0
    this.state = { ...this.state, stage: 0, playing: false }
    this.emit()
  }
  dispose = () => { this.cancel() }
}
