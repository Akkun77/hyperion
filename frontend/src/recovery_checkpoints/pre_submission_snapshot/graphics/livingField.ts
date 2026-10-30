import * as THREE from 'three'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

function rng(seed: number) {
  let n = seed >>> 0
  return () => {
    n = (1664525 * n + 1013904223) >>> 0
    return n / 4294967296
  }
}

function gauss(random: () => number) {
  return clamp((random() + random() + random() + random() - 2) * 0.95, -1, 1)
}

function sheetPoint(u: number, v: number, layer: number, random: () => number = () => 0.5): [number, number, number] {
  // u in [-1, 1], v in [-1, 1]
  // Asymmetric shaping: taper left edge smoothly to preserve clean negative space on the left
  const taper = Math.pow(Math.max(0.04, 1 - u * u), 0.52)
  const leftThin = u < -0.2 ? Math.pow(Math.max(0.02, 1.0 + u * 0.95), 0.72) : 1.0
  const baseX = 3.6 + 3.6 * u
  if (layer === 0) {
    let vv = v
    if (u > -0.38 && u < 0.42 && Math.abs(vv) < 0.22) {
      vv = (vv < 0 ? -1 : 1) * (0.22 + Math.abs(vv) * 0.32)
    }
    return [
      baseX + 0.2 * Math.sin(3.8 * u + 1.8 * vv) * leftThin,
      0.32 + 1.45 * Math.sin(2.1 * u - 0.25) + vv * (2.45 * taper * leftThin + 0.14) + 0.22 * Math.sin(5.8 * u + 2 * vv),
      0.18 + 1.15 * Math.cos(2.65 * u + vv) + 0.8 * Math.sin(3.6 * vv + u) + (random() - 0.5) * 0.55,
    ]
  }
  if (layer === 1) {
    // Internal cavity / under-layer
    return [
      baseX - 0.12 + 0.15 * u,
      -1.65 + 0.88 * Math.sin(2.6 * u + 0.32) + v * (1.02 * taper * leftThin + 0.1),
      -1.45 + 0.65 * Math.sin(2.9 * u - v) + (random() - 0.5) * 0.42,
    ]
  }
  // Upper crystalline crest / crown
  return [
    baseX + 0.12 + 0.12 * u,
    1.52 + 1.08 * Math.sin(2.5 * u - 0.28) + v * (0.55 * taper * leftThin + 0.08),
    1.78 + 0.68 * Math.cos(2.5 * u + v) + (random() - 0.5) * 0.42,
  ]
}

function calcNormal(u: number, v: number, layer: number): [number, number, number] {
  const du = 0.02
  const dv = 0.02
  const p0 = sheetPoint(u, v, layer, () => 0.5)
  const pu = sheetPoint(Math.min(0.99, u + du), v, layer, () => 0.5)
  const pv = sheetPoint(u, Math.min(0.99, v + dv), layer, () => 0.5)
  const tx = pu[0] - p0[0], ty = pu[1] - p0[1], tz = pu[2] - p0[2]
  const bx = pv[0] - p0[0], by = pv[1] - p0[1], bz = pv[2] - p0[2]
  let nx = ty * bz - tz * by
  let ny = tz * bx - tx * bz
  let nz = tx * by - ty * bx
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

function morphTargets(x: number, y: number, z: number, u: number) {
  const split = y - (0.25 + 1.1 * Math.sin(2.1 * u - 0.25))
  const side = split >= 0 ? 1 : -1
  const mid: [number, number, number] = [
    x + 0.18 * Math.sin(y * 1.1),
    y + side * (1.25 + 0.22 * Math.cos(u * 2.8)),
    z + side * 0.52,
  ]
  const group = u < -0.26 ? 0 : u < 0.38 ? 1 : 2
  const centers: [number, number, number][] = [
    [1.05, -1.15, 0.8],
    [4.0, 1.15, -0.55],
    [6.85, -0.65, 1.15],
  ]
  const c = centers[group]
  const localX = x - (3.6 + 3.6 * (group === 0 ? -0.65 : group === 1 ? 0.05 : 0.7))
  const end: [number, number, number] = [
    c[0] + localX * 0.52 + (y * 0.12),
    c[1] + (y - (group === 0 ? -0.7 : group === 1 ? 0.7 : 0.25)) * 0.56,
    c[2] + z * 0.45,
  ]
  return { mid, end, group }
}

export interface LivingFieldStats {
  fps: number
  particles: number
  drawCalls: number
}

export interface LivingFieldOptions {
  host: HTMLElement
  progress?: number
  quality?: 'full' | 'light' | 'still'
  interactive?: boolean
  reducedMotion?: boolean
  onStats?: (stats: LivingFieldStats) => void
}

/**
 * LivingField: Reusable cinematic particle and field engine.
 * Extracted from Hyperion-Living-Field-Lab and refined for Living Intelligence.
 */
export class LivingField {
  host: HTMLElement
  progress: number
  targetProgress: number
  quality: 'full' | 'light' | 'still'
  interactive: boolean
  reducedMotion: boolean
  onStats: (stats: LivingFieldStats) => void
  visible: boolean
  running: boolean
  disposed: boolean
  lastPointer: { x: number; y: number; t: number } | null
  time: number
  lastFrame: number
  frameCount: number
  frameTime: number
  width: number
  height: number
  pointerInfluence: number
  fallback: boolean

  renderer!: THREE.WebGLRenderer
  scene!: THREE.Scene
  camera!: THREE.PerspectiveCamera
  key!: THREE.DirectionalLight
  rim!: THREE.DirectionalLight
  points!: THREE.Points
  minerals: { mesh: THREE.InstancedMesh; specs: { index: number; scale: number; rotation: number[] }[] }[] = []
  filaments: { line: THREE.Line; a: Float32Array; b: Float32Array; c: Float32Array; current: Float32Array }[] = []
  dummy!: THREE.Object3D
  count = 0
  data!: {
    starts: Float32Array
    mids: Float32Array
    ends: Float32Array
    positions: Float32Array
    normals: Float32Array
    sizes: Float32Array
    lums: Float32Array
    facets: Float32Array
    cavities: Float32Array
    phases: Float32Array
    displacement: Float32Array
    velocity: Float32Array
    groups: Uint8Array
    us: Float32Array
  }

  fallbackCanvas: HTMLCanvasElement | null = null
  fallbackPoints: [number, number, number][] = []
  resizeObserver: ResizeObserver | null = null
  pointerHandler!: (e: PointerEvent) => void
  leaveHandler!: () => void
  visibilityHandler!: () => void
  pageHideHandler!: () => void
  raf: number | null = null

  constructor({
    host,
    progress = 0,
    quality = 'full',
    interactive = true,
    reducedMotion = false,
    onStats = () => {},
  }: LivingFieldOptions) {
    this.host = host
    this.progress = clamp(progress, 0, 1)
    this.targetProgress = this.progress
    this.quality = quality
    this.interactive = interactive
    this.reducedMotion = reducedMotion
    this.onStats = onStats
    this.visible = typeof document !== 'undefined' ? !document.hidden : true
    this.running = false
    this.disposed = false
    this.lastPointer = null
    this.time = 0
    this.lastFrame = 0
    this.frameCount = 0
    this.frameTime = 0
    this.width = 1
    this.height = 1
    this.pointerInfluence = 0
    this.fallback = false
    this.init()
  }

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: this.quality !== 'light',
        powerPreference: 'high-performance',
        alpha: false,
      })
      this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, this.quality === 'light' ? 1 : 1.65))
      this.renderer.setClearColor(0x060807, 1)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 1.15
      this.host.appendChild(this.renderer.domElement)

      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x060807)
      this.scene.fog = new THREE.FogExp2(0x060807, 0.016)

      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      this.key = new THREE.DirectionalLight(0xf1f4ee, 3.0)
      this.key.position.set(-3, 7, 9)
      this.scene.add(this.key)

      this.rim = new THREE.DirectionalLight(0xb4c4c1, 1.8)
      this.rim.position.set(7, -2, -5)
      this.scene.add(this.rim)

      this.scene.add(new THREE.AmbientLight(0x566260, 0.55))
      this.build()
    } catch {
      this.fallback = true
      this.buildFallback()
    }

    this.resize()
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.host)
    }

    this.pointerHandler = (e: PointerEvent) => this.pointerMove(e)
    this.leaveHandler = () => {
      this.lastPointer = null
    }
    this.host.addEventListener('pointermove', this.pointerHandler, { passive: true })
    this.host.addEventListener('pointerleave', this.leaveHandler, { passive: true })

    this.visibilityHandler = () => {
      this.visible = !document.hidden
      if (this.visible) this.start()
      else this.stop()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler)
    }

    this.pageHideHandler = () => this.dispose()
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.pageHideHandler, { once: true })
    }

    this.start()
  }

  build() {
    this.disposeSceneObjects()
    const count = this.quality === 'full' ? 18000 : 6000
    this.count = count
    const random = rng(47382026)
    const starts = new Float32Array(count * 3)
    const mids = new Float32Array(count * 3)
    const ends = new Float32Array(count * 3)
    const positions = new Float32Array(count * 3)
    const normals = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const lums = new Float32Array(count)
    const facets = new Float32Array(count)
    const cavities = new Float32Array(count)
    const phases = new Float32Array(count)
    const displacement = new Float32Array(count * 3)
    const velocity = new Float32Array(count * 3)
    const groups = new Uint8Array(count)
    const us = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const rr = random()
      const layer = rr < 0.68 ? 0 : rr < 0.88 ? 1 : 2
      const u = random() * 2 - 1
      const v = gauss(random)
      const point = sheetPoint(u, v, layer, random)
      const target = morphTargets(point[0], point[1], point[2], u)
      const normal = calcNormal(u, v, layer)
      const k = i * 3
      starts.set(point, k)
      mids.set(target.mid, k)
      ends.set(target.end, k)
      positions.set(point, k)
      normals.set(normal, k)
      groups[i] = target.group
      us[i] = u

      // Cavity factor: internal folds recede into shadow (0.22); outer crests exposed (1.0)
      const cavity = layer === 1 ? 0.22 : layer === 0 ? clamp(0.35 + Math.abs(v) * 0.75, 0.2, 1.0) : 0.95
      cavities[i] = cavity

      // Facet: selective crystalline highlights for ~2.6% along high outer crests
      const isPeak = (layer === 0 && Math.abs(v) > 0.52) || (layer === 2 && Math.abs(v) > 0.3)
      const facet = isPeak && random() < 0.038 ? 1.0 : 0.0
      facets[i] = facet

      // Continuous spatial luminance: brighter along the central flow spine, darker in deep folds
      const spine = Math.exp(-v * v * 2.2)
      const baseLum = 0.52 + 0.38 * spine + (layer === 1 ? -0.18 : 0.08)
      lums[i] = clamp(baseLum * (0.85 + random() * 0.25), 0.2, 1.0)

      // Size: facets are prominent gems; standard particles are delicate
      const depthScale = layer === 2 ? 1.15 : layer === 1 ? 0.8 : 1.0
      sizes[i] = (facet > 0.5 ? 2.4 : random() < 0.08 ? 1.6 : 1.05) * depthScale * (0.8 + random() * 0.35)
      phases[i] = random() * Math.PI * 2
    }

    this.data = { starts, mids, ends, positions, normals, sizes, lums, facets, cavities, phases, displacement, velocity, groups, us }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aLum', new THREE.BufferAttribute(lums, 1))
    geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('aFacet', new THREE.BufferAttribute(facets, 1))
    geometry.setAttribute('aCavity', new THREE.BufferAttribute(cavities, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aSize;
        attribute float aLum;
        attribute vec3 aNormal;
        attribute float aFacet;
        attribute float aCavity;

        varying float vLum;
        varying float vDepth;
        varying float vFacet;
        varying float vLight;

        uniform float uPixelRatio;

        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;

          float size = aSize * (1.0 + aFacet * 0.65);
          gl_PointSize = clamp(size * uPixelRatio * (18.0 / -mv.z), 0.75, 8.5);

          // Eye-space normal for chiaroscuro lighting
          vec3 eyeNormal = normalize(normalMatrix * aNormal);
          
          // Directional key light from upper-left-front
          vec3 keyDir = normalize(vec3(-0.35, 0.75, 0.55));
          float NdotL = max(0.0, dot(eyeNormal, keyDir));
          
          // Soft rim light from lower-back-right
          vec3 rimDir = normalize(vec3(0.65, -0.25, -0.65));
          float rim = max(0.0, dot(eyeNormal, rimDir));
          
          // Cavity ambient occlusion
          float ambient = mix(0.14, 0.36, aCavity);
          float light = ambient + NdotL * 0.72 + rim * 0.26;

          vLight = light;
          vLum = aLum;
          vFacet = aFacet;
          vDepth = clamp((26.0 + mv.z) / 14.0, 0.12, 1.0);
        }`,
      fragmentShader: `
        varying float vLum;
        varying float vDepth;
        varying float vFacet;
        varying float vLight;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float d = length(coord);
          
          float a = vFacet > 0.5 ? (1.0 - smoothstep(0.16, 0.48, d)) : (1.0 - smoothstep(0.30, 0.50, d));
          if (a < 0.02) discard;

          // Chiaroscuro body palette: velvety dark graphite in cavities to lit titanium
          vec3 darkCavity = vec3(0.08, 0.11, 0.11);
          vec3 litTitanium = vec3(0.60, 0.70, 0.68);
          vec3 bodyColor = mix(darkCavity, litTitanium, clamp(vLight * vLum, 0.0, 1.0));
          
          // Crystalline highlight: brilliant platinum with subtle diamond gleam
          vec3 crystalColor = vec3(0.97, 1.0, 0.98);
          vec3 finalColor = mix(bodyColor, crystalColor, vFacet * 0.95);
          
          float alpha = a * mix(clamp(vLight * 0.88, 0.22, 0.86), 0.96, vFacet) * vDepth;
          gl_FragColor = vec4(finalColor, alpha);
        }`,
      uniforms: {
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    this.buildMinerals(random)
    this.buildFilaments(random)
    this.updateGeometry(0)
  }

  buildMinerals(random: () => number) {
    const count = this.quality === 'full' ? 176 : 76
    const make = (geometry: THREE.BufferGeometry, n: number, isCrystal: boolean) => {
      const mat = isCrystal
        ? new THREE.MeshStandardMaterial({
            color: 0xdae6e2,
            roughness: 0.16,
            metalness: 0.65,
            flatShading: true,
            side: THREE.DoubleSide,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x222c2b,
            roughness: 0.32,
            metalness: 0.82,
            flatShading: true,
            side: THREE.DoubleSide,
          })
      const mesh = new THREE.InstancedMesh(geometry, mat, n)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      const specs: { index: number; scale: number; rotation: number[] }[] = []
      for (let j = 0; j < n; j++) {
        const index = Math.floor(random() * this.count)
        const large = j < 6 && !isCrystal
        const scale = large ? 0.32 + random() * 0.35 : 0.05 + Math.pow(random(), 3) * 0.20
        const rotation = [random() * 6.28, random() * 6.28, random() * 6.28]
        specs.push({ index, scale, rotation })
        const tone = isCrystal ? 0.85 + random() * 0.15 : 0.45 + random() * 0.35
        mesh.setColorAt(j, new THREE.Color().setRGB(tone, tone * 1.02, tone * 1.01))
      }
      this.scene.add(mesh)
      return { mesh, specs }
    }
    this.minerals = [
      make(new THREE.IcosahedronGeometry(1, 0), Math.floor(count * 0.54), false),
      make(new THREE.TetrahedronGeometry(1, 0), Math.ceil(count * 0.46), true),
    ]
    this.dummy = new THREE.Object3D()
  }

  buildFilaments(_random?: () => number) {
    this.filaments = []
    const total = this.quality === 'full' ? 18 : 8
    for (let l = 0; l < total; l++) {
      const layer = l % 5 === 0 ? 1 : l % 6 === 0 ? 2 : 0
      const v = -0.9 + (l / (total - 1)) * 1.8
      const steps = 88
      const a = new Float32Array(steps * 3)
      const b = new Float32Array(steps * 3)
      const c = new Float32Array(steps * 3)
      const current = new Float32Array(steps * 3)
      for (let i = 0; i < steps; i++) {
        const u = -0.98 + (1.96 * i) / (steps - 1)
        const p = sheetPoint(u, v, layer, () => 0.5)
        const targets = morphTargets(...p, u)
        const k = i * 3
        a.set(p, k)
        b.set(targets.mid, k)
        c.set(targets.end, k)
        current.set(p, k)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(current, 3).setUsage(THREE.DynamicDrawUsage))
      const material = new THREE.LineBasicMaterial({
        color: l % 4 === 0 ? 0xd5e5e2 : 0x8a9996,
        transparent: true,
        opacity: l % 4 === 0 ? 0.18 : 0.075,
        depthWrite: false,
      })
      const line = new THREE.Line(geometry, material)
      line.frustumCulled = false
      this.scene.add(line)
      this.filaments.push({ line, a, b, c, current })
    }
  }

  static mixTriplet(a: Float32Array, b: Float32Array, c: Float32Array, k: number, p: number): [number, number, number] {
    if (p <= 0.5) {
      const t = smooth(p * 2)
      return [a[k] + (b[k] - a[k]) * t, a[k + 1] + (b[k + 1] - a[k + 1]) * t, a[k + 2] + (b[k + 2] - a[k + 2]) * t]
    }
    const t = smooth((p - 0.5) * 2)
    return [b[k] + (c[k] - b[k]) * t, b[k + 1] + (c[k + 1] - b[k + 1]) * t, b[k + 2] + (c[k + 2] - b[k + 2]) * t]
  }

  updateGeometry(dt: number) {
    if (this.fallback) {
      this.drawFallback()
      return
    }
    const { starts, mids, ends, positions, displacement, velocity } = this.data
    const p = this.progress
    const animate = this.quality !== 'still' && !this.reducedMotion
    const decay = Math.exp(-5.5 * dt)
    const spring = 18.0

    for (let i = 0; i < this.count; i++) {
      const k = i * 3
      const m = LivingField.mixTriplet(starts, mids, ends, k, p)
      for (let axis = 0; axis < 3; axis++) {
        if (dt > 0) {
          velocity[k + axis] = (velocity[k + axis] - displacement[k + axis] * spring * dt) * decay
          displacement[k + axis] = clamp(displacement[k + axis] + velocity[k + axis] * dt, -0.92, 0.92)
        }
        positions[k + axis] = m[axis] + displacement[k + axis]
      }
      if (animate) {
        // Continuous spatial harmonic undulation rather than uncorrelated random jitter
        const wx = positions[k] * 0.32
        const wy = positions[k + 1] * 0.42
        const wz = positions[k + 2] * 0.26
        const waveY = Math.sin(this.time * 0.52 + wx + wz * 0.5) * 0.032
        const waveZ = Math.cos(this.time * 0.38 + wy * 0.85 - wx * 0.35) * 0.022
        positions[k + 1] += waveY
        positions[k + 2] += waveZ
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true

    for (const { mesh, specs } of this.minerals) {
      specs.forEach((s, j) => {
        const k = s.index * 3
        this.dummy.position.set(positions[k], positions[k + 1], positions[k + 2])
        this.dummy.rotation.set(s.rotation[0] + this.time * 0.018, s.rotation[1], s.rotation[2])
        this.dummy.scale.setScalar(s.scale)
        this.dummy.updateMatrix()
        mesh.setMatrixAt(j, this.dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    for (const f of this.filaments) {
      for (let k = 0; k < f.current.length; k += 3) {
        const m = LivingField.mixTriplet(f.a, f.b, f.c, k, p)
        f.current[k] = m[0]
        f.current[k + 1] = m[1]
        f.current[k + 2] = m[2]
      }
      f.line.geometry.attributes.position.needsUpdate = true
    }

    this.updateCamera()
  }

  updateCamera() {
    const p = this.progress
    const desktop = this.width / this.height >= 0.8
    if (desktop) {
      // Coherent desktop framing: positions formation in center-right (37% - 70% viewport),
      // leaving left 0% - 37% as pure reserved negative space for the hero typography
      const z = 16.2 - 2.0 * Math.sin(Math.PI * p)
      const cameraX = -0.8 + 0.8 * p
      const cameraY = 0.25 + 0.15 * p
      this.camera.position.set(cameraX, cameraY, z)
      this.camera.lookAt(2.8 + 0.6 * p, 0.08, 0)
    } else {
      // Mobile framing (390x844): centered horizontally and positioned in the lower visual sweet spot
      const z = 23.5 - 1.5 * Math.sin(Math.PI * p)
      this.camera.position.set(3.6, 2.2 + 0.2 * p, z)
      this.camera.lookAt(3.6, 2.0, 0)
    }
  }

  pointerMove(e: PointerEvent) {
    if (!this.interactive || this.quality === 'still' || this.reducedMotion || this.fallback || !this.visible) return
    const target = e.target as HTMLElement | null
    if (target?.closest?.('button,input,.controls,a')) return

    const now = performance.now()
    const rect = this.host.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (!this.lastPointer) {
      this.lastPointer = { x, y, t: now }
      return
    }

    const elapsed = now - this.lastPointer.t
    const dx = x - this.lastPointer.x
    const dy = y - this.lastPointer.y
    this.lastPointer = { x, y, t: now }

    if (elapsed <= 0 || elapsed > 170 || Math.hypot(dx, dy) < 1) return
    const speed = clamp(Math.hypot(dx, dy) / elapsed, 0, 3.5)
    const ndc = new THREE.Vector3((x / rect.width) * 2 - 1, -((y / rect.height) * 2 - 1), 0.5).unproject(this.camera)
    const dir = ndc.sub(this.camera.position).normalize()
    const distance = -this.camera.position.z / dir.z
    const world = this.camera.position.clone().addScaledVector(dir, distance)
    const vx = (dx / rect.width) * 18
    const vy = (-dy / rect.height) * 12
    const radius = 1.45 + speed * 0.25
    const r2 = radius * radius
    const strength = 0.6 + speed * 4.3

    const { positions, velocity } = this.data
    for (let i = 0; i < this.count; i++) {
      const k = i * 3
      const px = positions[k] - world.x
      const py = positions[k + 1] - world.y
      const dist2 = px * px + py * py
      if (dist2 >= r2) continue
      const falloff = Math.pow(1 - dist2 / r2, 2)
      const dist = Math.sqrt(dist2) + 0.08
      velocity[k] += ((px / dist) * 0.58 + vx * 0.65) * strength * falloff
      velocity[k + 1] += ((py / dist) * 0.58 + vy * 0.65) * strength * falloff
      velocity[k + 2] += (0.25 + Math.sin(px * 3 + py * 2) * 0.12) * strength * falloff
    }
    this.pointerInfluence = Math.min(1, this.pointerInfluence + speed * 0.2)
    this.start()
  }

  setProgress(value: number, { animate = false } = {}) {
    this.targetProgress = clamp(Number(value) || 0, 0, 1)
    if (!animate || this.reducedMotion || this.quality === 'still') {
      this.progress = this.targetProgress
    }
    this.start()
    if (this.quality === 'still' || this.reducedMotion) {
      this.updateGeometry(0)
      this.render()
    }
  }

  setQuality(quality: 'full' | 'light' | 'still') {
    if (!['full', 'light', 'still'].includes(quality) || quality === this.quality) return
    this.quality = quality
    if (!this.fallback) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'light' ? 1 : 1.65))
      this.build()
      this.resize()
    }
    this.start()
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = !!reduced
    if (this.reducedMotion) {
      this.progress = this.targetProgress
      this.stop()
      this.updateGeometry(0)
      this.render()
    } else {
      this.start()
    }
  }

  resize() {
    this.width = this.host.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1)
    this.height = this.host.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1)
    if (this.fallback) {
      if (this.fallbackCanvas) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        this.fallbackCanvas.width = this.width * dpr
        this.fallbackCanvas.height = this.height * dpr
        this.drawFallback()
      }
      return
    }
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.updateCamera()
    this.renderer.setSize(this.width, this.height, false)
    if (this.points?.material) {
      ;(this.points.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = this.renderer.getPixelRatio()
    }
    this.render()
  }

  render() {
    if (this.fallback) {
      this.drawFallback()
      return
    }
    this.renderer.render(this.scene, this.camera)
  }

  tick = (now: number) => {
    if (!this.running || this.disposed || !this.visible) return
    const dt = clamp((now - this.lastFrame) / 1000 || 0.016, 0, 0.033)
    this.lastFrame = now
    this.time += dt
    this.frameCount++

    if (now - this.frameTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.frameTime))
      this.onStats({
        fps,
        particles: this.fallback ? this.fallbackPoints.length : this.count,
        drawCalls: this.renderer?.info?.render?.calls || 3,
      })
      this.frameCount = 0
      this.frameTime = now
    }

    if (Math.abs(this.targetProgress - this.progress) > 0.0005) {
      this.progress += (this.targetProgress - this.progress) * clamp(dt * 7.5, 0.05, 0.3)
      this.updateGeometry(dt)
    } else if (this.progress !== this.targetProgress) {
      this.progress = this.targetProgress
      this.updateGeometry(dt)
    } else {
      this.updateGeometry(dt)
    }

    this.render()
    this.raf = requestAnimationFrame(this.tick)
  }

  start() {
    if (this.running || this.disposed || !this.visible) return
    this.running = true
    this.lastFrame = performance.now()
    this.frameTime = performance.now()
    this.frameCount = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = null
  }

  buildFallback() {
    this.fallbackCanvas = document.createElement('canvas')
    this.fallbackCanvas.className = 'living-field-fallback'
    this.host.appendChild(this.fallbackCanvas)
    const random = rng(47382026)
    this.fallbackPoints = Array.from({ length: 4600 }, () => {
      const u = random() * 2 - 1
      const v = gauss(random)
      const layer = random() < 0.72 ? 0 : 1
      return sheetPoint(u, v, layer, random)
    })
  }

  drawFallback() {
    if (!this.fallbackCanvas) return
    const ctx = this.fallbackCanvas.getContext('2d')
    if (!ctx) return
    const w = this.fallbackCanvas.width
    const h = this.fallbackCanvas.height
    const scale = Math.min(w / 18, h / 11)
    ctx.fillStyle = '#060807'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#adb8b3'
    const offset = w < 700 ? w * 0.12 : 0
    for (const p of this.fallbackPoints) {
      const x = w * 0.52 + offset + p[0] * scale * 0.83
      const y = h * 0.52 - p[1] * scale * 0.83
      const z = clamp((p[2] + 4) / 8, 0.08, 1)
      ctx.globalAlpha = 0.22 + z * 0.54
      ctx.fillRect(x, y, Math.max(1, z * 2), Math.max(1, z * 2))
    }
    ctx.globalAlpha = 1
  }

  disposeSceneObjects() {
    if (!this.scene) return
    if (this.points) {
      this.scene.remove(this.points)
      this.points.geometry.dispose()
      ;(this.points.material as THREE.Material).dispose()
    }
    if (this.minerals) {
      for (const { mesh } of this.minerals) {
        this.scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
    }
    if (this.filaments) {
      for (const { line } of this.filaments) {
        this.scene.remove(line)
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.resizeObserver?.disconnect()
    this.host.removeEventListener('pointermove', this.pointerHandler)
    this.host.removeEventListener('pointerleave', this.leaveHandler)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.pageHideHandler)
    }
    this.disposeSceneObjects()
    this.renderer?.dispose()
    this.renderer?.domElement.remove()
    this.fallbackCanvas?.remove()
  }
}

export default LivingField
