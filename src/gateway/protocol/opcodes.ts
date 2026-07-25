// Numeric opcodes on the wire. Gaps (4, 5, 8, …) match the Cordis gateway spec.
export const GatewayOpcode = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  Presence: 3,
  Resume: 6,
  Reconnect: 7,
  InvalidSession: 9,
  Hello: 10,
  HeartbeatAck: 11,
  Error: 4000,
} as const

export type GatewayOpcode = (typeof GatewayOpcode)[keyof typeof GatewayOpcode]

/** Control-plane event names (`t` on the envelope). Domain events use dotted names instead. */
export const GatewayEventType = {
  Hello: 'hello',
  Identify: 'identify',
  Ready: 'ready',
  Resume: 'resume',
  Resumed: 'resumed',
  Heartbeat: 'heartbeat',
  HeartbeatAck: 'heartbeat.ack',
  Error: 'error',
} as const

export type GatewayEventType = (typeof GatewayEventType)[keyof typeof GatewayEventType]
