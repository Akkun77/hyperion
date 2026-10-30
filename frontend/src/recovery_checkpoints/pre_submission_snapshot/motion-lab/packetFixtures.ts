export type PacketDecision = 'ALLOW' | 'FLAG' | 'BLOCK'
export interface PacketEvent {
  id: string
  method: string
  route: string
  decision: PacketDecision
  reason: string
  status: number
  client: string
  latencyMs: number | null
  lane: number
  offset: number
}
export interface PacketScenario {
  id: string
  label: string
  note: string
  events: PacketEvent[]
}

// Static demonstration fixtures. This renderer never reads the live gateway.
export const scenarios: PacketScenario[] = [
  { id: 'mixed', label: 'Three decisions', note: 'A compact tour of allow, flag, and block.', events: [
    {id:'req-01',method:'GET',route:'/api/v1/users/user_101',decision:'ALLOW',reason:'Known method and route',status:200,client:'127.0.0.1',latencyMs:32,lane:.31,offset:.2},
    {id:'req-02',method:'GET',route:'/api/v2/debug',decision:'FLAG',reason:'Unknown shadow route; observe mode',status:200,client:'127.0.0.1',latencyMs:39,lane:.50,offset:1.15},
    {id:'req-03',method:'GET',route:'/api/v2/debug',decision:'BLOCK',reason:'Unknown shadow route; block mode',status:403,client:'127.0.0.1',latencyMs:null,lane:.69,offset:2.1},
  ]},
  { id: 'shadow', label: 'Shadow route', note: 'One unknown route, two policy settings.', events: [
    {id:'shadow-01',method:'GET',route:'/api/v2/debug',decision:'FLAG',reason:'Shadow route observed',status:200,client:'127.0.0.1',latencyMs:41,lane:.39,offset:.2},
    {id:'shadow-02',method:'GET',route:'/api/v2/debug',decision:'BLOCK',reason:'Shadow blocking enabled',status:403,client:'127.0.0.1',latencyMs:null,lane:.61,offset:1.4},
  ]},
  { id: 'rate', label: 'Rate limit', note: 'The last request stops at the boundary.', events: [
    {id:'rate-01',method:'GET',route:'/health',decision:'ALLOW',reason:'Within client rate window',status:200,client:'127.0.0.1',latencyMs:18,lane:.31,offset:.1},
    {id:'rate-02',method:'GET',route:'/health',decision:'ALLOW',reason:'Within client rate window',status:200,client:'127.0.0.1',latencyMs:17,lane:.50,offset:.8},
    {id:'rate-03',method:'GET',route:'/health',decision:'BLOCK',reason:'Per-client rate limit exceeded',status:429,client:'127.0.0.1',latencyMs:null,lane:.69,offset:1.5},
  ]},
  { id: 'ownership', label: 'Ownership signal', note: 'A synthetic policy violation is flagged after forwarding.', events: [
    {id:'owner-01',method:'GET',route:'/api/v1/users/user_101',decision:'ALLOW',reason:'Synthetic owner matches caller',status:200,client:'127.0.0.1',latencyMs:28,lane:.40,offset:.2},
    {id:'owner-02',method:'GET',route:'/api/v1/users/user_202',decision:'FLAG',reason:'Synthetic owner denial with successful response',status:200,client:'127.0.0.1',latencyMs:34,lane:.60,offset:1.15},
  ]},
]

export const scenarioById = (id: string) => scenarios.find(scenario => scenario.id === id) || scenarios[0]
