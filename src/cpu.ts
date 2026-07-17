import type { Display } from "./display.ts"
import { FONTSET } from "./font.ts"

const MEMORY_START = 0x0200

export class CPU {
  // 4096 bytes of RAM
  private memory = new Uint8Array(0x1000)
  // 16 bit program counter (which starts at 0x200 due to chip8 interpreter taking up the first 512 bytes)
  private pc = MEMORY_START
  // 16 x 8-bit data registers named V0 to VF
  public registers = new Uint8Array(0x10)
  // 16-bit register called I, This register is generally used to store memory addresses.
  private i_index = 0x0
  // 16 x 16-bit values for the stack
  private stack = new Uint16Array(0x10)
  // stack pointer
  private sp = -1

  constructor() {
    this.load_fonts()
  }

  public load_fonts() {
    this.memory.set(FONTSET, 0x50)
  }

  public cycle(display: Display) {
    const opcode = this.fetch()
    this.decode(opcode, display)
  }

  private fetch(): number {
    // be ready to fetch the next opcode
    this.pc += 2

    const chunk1 = this.memory[this.pc]
    const chunk2 = this.memory[this.pc + 1]

    return (chunk1 << 8) + chunk2
  }

  // 2-byte opcode
  public decode(opcode: number, display: Display) {
    const first_nibble = opcode & 0xf000
    const x = (opcode >> 8) & 0xf
    const y = (opcode >> 4) & 0xf
    const n = opcode & 0xf
    const nn = opcode & 0xff
    const nnn = opcode & 0xfff

    let rx_value = this.registers[x]
    let ry_value = this.registers[y]

    switch (first_nibble) {
      case 0x00e0:
        //clear display
        if (opcode == 0x00e0) {
          display.clear()
        } // ret
        else if (opcode == 0x00ee) {
          this.ret()
        }
        break
      // jump
      case 0x1000:
        this.jump(nnn)
        break
      // call
      case 0x2000:
        this.call(nnn)
        break
      // skips
      case 0x3000:
        if (rx_value == nn) {
          this.skip_command()
        }
        break
      case 0x4000:
        if (rx_value != nn) {
          this.skip_command()
        }
        break
      case 0x5000:
        if (rx_value == ry_value) {
          this.skip_command()
        }
        break
      case 0x9000:
        if (rx_value != ry_value) {
          this.skip_command()
        }
        break
      // set
      case 0x6000:
        this.registers[x] = nn
        break
      // add
      case 0x7000:
        this.registers[x] += nn
        break
    }
  }

  // execute
  private jump(addr: number) {
    this.pc = addr
  }

  private call(addr: number) {
    this.sp++
    this.stack[this.sp] = this.pc
    this.jump(addr)
  }

  private ret() {
    this.jump(this.stack[this.sp])
    this.sp--
  }

  private skip_command() {
    this.pc += 2
  }
}
