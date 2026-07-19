export type Instruction = {
  execute: (...args: any[]) => void
  args: unknown[]
}

export type Quirks = {
  increment_i: boolean
  shift_uses_vy: boolean
}
