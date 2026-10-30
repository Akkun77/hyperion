import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera } from 'three'

type Pointer = { x: number; y: number }
type Props = { progress: React.MutableRefObject<number>; pointer: React.MutableRefObject<Pointer>; onReady: () => void }
type Mark = { p: number; position: [number, number, number]; target: [number, number, number]; fov: number }

const marks: Mark[] = [
  { p: 0, position: [15, 9, 25], target: [1.1, 5.8, 0], fov: 31 },
  { p: .16, position: [12, 8, 21], target: [1.1, 5.5, .3], fov: 33 },
  { p: .34, position: [5.4, 5.25, 8.4], target: [1.32, 4.3, 1.1], fov: 37 },
  { p: .5, position: [4.8, 4.9, 7.4], target: [1.32, 4.3, 1.5], fov: 35 },
  { p: .64, position: [3.8, 4.4, 5.3], target: [1.3, 4.3, -2], fov: 37 },
  { p: .71, position: [1.32, 4.3, -.1], target: [1.3, 4.2, -8], fov: 40 },
  { p: .78, position: [3.2, 6.5, -9], target: [1, 2, -17], fov: 40 },
  { p: .86, position: [8, 10, -15], target: [0, 1, -19], fov: 38 },
  { p: 1, position: [9, 11, -12], target: [0, 0, -20], fov: 34 },
]
const clamp = (value: number) => MathUtils.clamp(value, 0, 1)
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [MathUtils.lerp(a[0], b[0], t), MathUtils.lerp(a[1], b[1], t), MathUtils.lerp(a[2], b[2], t)]
function cameraPose(p: number) {
  const next = marks.findIndex(mark => mark.p >= p)
  const end = marks[Math.max(next, 1)]
  const start = marks[Math.max(next - 1, 0)]
  const t = smooth((p - start.p) / (end.p - start.p))
  return { position: lerp3(start.position, end.position, t), target: lerp3(start.target, end.target, t), fov: MathUtils.lerp(start.fov, end.fov, t) }
}

function ArrayModel({ progress, pointer, onReady }: Props) {
  const gltf = useLoader(GLTFLoader, '/hyperion-2/models/inspection_array.glb')
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    const channels: { material: MeshStandardMaterial; color: Color }[] = []
    const fragments: { object: Object3D; x: number; y: number; rotation: number }[] = []
    const pivots: { left?: Object3D; right?: Object3D; probe?: Object3D; debris?: Object3D } = {}
    root.traverse(object => {
      if (object.name.startsWith('Backplane |')) object.visible = false
      if (object.name === 'Pivot_Gate_Left') pivots.left = object
      if (object.name === 'Pivot_Gate_Right') pivots.right = object
      if (object.name === 'Pivot_Probe') pivots.probe = object
      if (object.name === 'Pivot_Debris') pivots.debris = object
      if (object.name.startsWith('Debris_Hero_')) fragments.push({ object, x: object.position.x, y: object.position.y, rotation: object.rotation.z })
      if (object instanceof Mesh) {
        if (Array.isArray(object.material)) return
        if (object.material?.name.startsWith('Signal_')) {
          const material = object.material.clone() as MeshStandardMaterial
          object.material = material
          channels.push({ material, color: new Color(material.name.startsWith('Signal_Cyan') ? '#75ddeb' : '#d2f85a') })
        }
      }
      if (object.type.endsWith('Light')) object.visible = false
    })
    return { root, channels, fragments, ...pivots }
  }, [gltf])
  const origin = useRef<{ left: number; right: number; probe: number; debris: number } | null>(null)
  const pointerState = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const ready = useRef(false)

  useFrame(({ camera }, delta) => {
    if (!ready.current) { ready.current = true; onReady() }
    const p = clamp(progress.current)
    const pose = cameraPose(p)
    const view = camera as PerspectiveCamera
    view.position.set(...pose.position)
    view.lookAt(...pose.target)
    if (Math.abs(view.fov - pose.fov) > .01) { view.fov = pose.fov; view.updateProjectionMatrix() }
    if (!origin.current) origin.current = {
      left: model.left?.position.x ?? 0, right: model.right?.position.x ?? 0,
      probe: model.probe?.position.z ?? 0, debris: model.debris?.position.y ?? 0,
    }
    const base = origin.current
    const approach = smooth((p - .32) / .085)
    const retreat = smooth((p - .49) / .16)
    if (model.probe) model.probe.position.z = base.probe - 1.91 * approach + .12 * retreat
    const impact = smooth((p - .405) / .045) * (1 - smooth((p - .49) / .11))
    if (model.debris) model.debris.position.y = base.debris + impact * .3
    const gate = smooth((p - .5) / .14)
    if (model.left) model.left.position.x = base.left - .42 * gate
    if (model.right) model.right.position.x = base.right + .42 * gate
    const activation = smooth((p - .50) / .13)
    for (const { material, color } of model.channels) {
      material.emissive.copy(color)
      material.emissiveIntensity = activation * (material.name.startsWith('Signal_Lime') ? 1.3 : .9)
    }
    const motion = pointerState.current
    const rate = Math.min(1, delta * 9)
    const nextX = MathUtils.lerp(motion.x, pointer.current.x, rate)
    const nextY = MathUtils.lerp(motion.y, pointer.current.y, rate)
    motion.vx = MathUtils.lerp(motion.vx, nextX - motion.x, Math.min(1, delta * 7))
    motion.vy = MathUtils.lerp(motion.vy, nextY - motion.y, Math.min(1, delta * 7))
    motion.x = nextX; motion.y = nextY
    const pointerWeight = 1 - smooth((p - .32) / .2)
    model.fragments.forEach(({ object, x, y, rotation }, i) => {
      const sign = i % 2 ? -1 : 1
      object.position.x = x + sign * (motion.x * .085 + motion.vx * .42) * pointerWeight + impact * sign * (.05 + i * .012)
      object.position.y = y + (motion.y * .07 + motion.vy * .35) * pointerWeight + impact * (.11 + i * .035)
      object.rotation.z = rotation + impact * sign * (.1 + i * .027)
    })
  })
  return <primitive object={model.root as Group} />
}

export default function InspectionScene(props: Props) {
  return <Canvas className="arrival-canvas" camera={{ position: [15, 9, 25], fov: 31, near: .1, far: 140 }} dpr={[1, 1.7]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#080a0c']} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[-8, 15, 10]} intensity={3.8} color="#ecf8ff" />
    <directionalLight position={[5, 11, -5]} intensity={2.5} color="#a7bec5" />
    <pointLight position={[1.3, 5, 1.6]} intensity={18} color="#d9eaec" distance={7} />
    <Suspense fallback={null}><ArrayModel {...props} /></Suspense>
  </Canvas>
}
