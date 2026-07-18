export type Instruction = {
  execute: (...args: any[]) => void
  args: unknown[]
}
