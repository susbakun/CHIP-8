export function firstNibbleDecoder(opcode: number) {
  return opcode & 0xf000
}

export function xDecoder(opcode: number) {
  return (opcode >> 8) & 0xf
}

export function yDecoder(opcode: number) {
  return (opcode >> 4) & 0xf
}

export function nDecoder(opcode: number) {
  return opcode & 0xf
}

export function nnDecoder(opcode: number) {
  return opcode & 0xff
}

export function nnnDecoder(opcode: number) {
  return opcode & 0xfff
}

// nnnn is literally opcode
export function nnnnDecoder(opcode: number) {
  return opcode
}
