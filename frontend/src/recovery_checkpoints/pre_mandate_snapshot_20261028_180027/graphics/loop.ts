// Original (2,3) loop: the same centerline family as the WebGL sculpture.
export function loopPoint(u: number): [number, number, number] {
  const radius = 1.1 + .38 * Math.cos(3 * u)
  return [radius * Math.cos(2 * u), radius * Math.sin(2 * u), .56 * Math.sin(3 * u)]
}
export function loopEmblemPath(segments = 180) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const [x, y, z] = loopPoint(i / segments * Math.PI * 2)
    return `${i ? 'L' : 'M'}${(32 + x * 18).toFixed(2)},${(32 + (y * .7 + z * .65) * 18).toFixed(2)}`
  }).join(' ') + ' Z'
}
