type Vec3 = [number, number, number]
export interface SentinelMesh { vertices: Float32Array; bladeRanges: { start: number; count: number }[] }

/** Three separate solid, beveled architectural blades, not a swept circular tube.
 * Each follows one side of an open triangle. The aperture is genuine empty space.
 * Vertex layout: position xyz, normal xyz, emissive-channel material index.
 */
export function buildSentinelGeometry(steps = 64): SentinelMesh {
  if (!Number.isInteger(steps) || steps < 4) throw new Error('At least four blade segments are required')
  const vertices: number[] = [], bladeRanges: SentinelMesh['bladeRanges'] = []
  const profile = [[.07,.16],[.93,.16],[1,.09],[1,-.09],[.93,-.16],[.07,-.16],[0,-.09],[0,.09]]
  for (let blade = 0; blade < 3; blade++) {
    const start = vertices.length / 7, angle = blade * Math.PI * 2 / 3
    const point = (u: number, across: number, depth: number): Vec3 => {
      const t = .045 + .91 * u, arch = Math.sin(Math.PI * u)
      const width = (.32 + .22 * arch) * (.4 + .6 * Math.pow(Math.max(0, arch), .25))
      const offset = .12 * arch + across * width
      const x = 1.169134 * t + .8660254 * offset
      const y = 1.35 - 2.025 * t + .5 * offset
      return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), depth + .06 * Math.cos(Math.PI * u)]
    }
    const triangle = (a: Vec3, b: Vec3, c: Vec3, channel = 0) => {
      const ab = b.map((value,i)=>value-a[i]), ac = c.map((value,i)=>value-a[i])
      const normal = [ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
      const length = Math.hypot(...normal) || 1
      for (const p of [a,b,c]) vertices.push(...p,...normal.map(value=>value/length),channel)
    }
    const quad = (a: Vec3,b: Vec3,c: Vec3,d: Vec3,channel=0) => {triangle(a,b,c,channel);triangle(a,c,d,channel)}
    for (let segment = 0; segment < steps; segment++) {
      const u = segment / steps, next = (segment + 1) / steps
      for (let face = 0; face < profile.length; face++) {
        const [w,z] = profile[face], [w2,z2] = profile[(face+1)%profile.length]
        quad(point(u,w,z),point(next,w,z),point(next,w2,z2),point(u,w2,z2))
      }
      // A narrow physical inlaid strip, with a second restrained outer-edge accent.
      for (const [a,b] of [[.19,.225],[.81,.825]]) {
        if (segment > 3 && segment < steps - 5) quad(point(u,a,.162),point(next,a,.162),point(next,b,.162),point(u,b,.162),1)
      }
    }
    for (const u of [0,1]) {
      const center = point(u,.5,0)
      for (let face=0;face<profile.length;face++) {
        const [w,z]=profile[face], [w2,z2]=profile[(face+1)%profile.length]
        if(u===0) triangle(center,point(u,w,z),point(u,w2,z2))
        else triangle(center,point(u,w2,z2),point(u,w,z))
      }
    }
    bladeRanges.push({start,count:vertices.length/7-start})
  }
  return { vertices: new Float32Array(vertices), bladeRanges }
}
