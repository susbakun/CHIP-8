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
  // last register (used for setting carry flags)
  private last_register = 15

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

    let sub = rx_value - ry_value

    switch (first_nibble) {
      case 0x0000:
        switch (nnn) {
          //clear display
          case 0x00e0:
            display.clear()
            break
          //ret
          case 0x00ee:
            this.ret()
            break
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
      // Logical and arithmetic instructions
      case 0x8000:
        switch (n) {
          case 0:
            this.registers[x] = ry_value
            break
          case 1:
            this.registers[x] |= ry_value
            break
          case 2:
            this.registers[x] &= ry_value
            break
          case 3:
            this.registers[x] ^= ry_value
            break
          case 4:
            const sum = rx_value + ry_value

            this.registers[this.last_register] = sum > 0xff ? 1 : 0
            this.registers[x] = sum
            break
          case 5:
            sub = rx_value - ry_value

            this.registers[this.last_register] = sub >= 0 ? 1 : 0
            this.registers[x] = sub

            break
          case 6:
            this.registers[x] = ry_value >> 1

            this.registers[this.last_register] = ry_value & 0x1

            break

          case 7:
            sub = ry_value - rx_value

            this.registers[this.last_register] = sub >= 0 ? 1 : 0
            this.registers[x] = sub

            break

          case 0xe:
            this.registers[x] = ry_value << 1

            this.registers[this.last_register] = ry_value >> 7

            break
        }
        break

      // set index
      case 0xa000:
        this.i_index = nnn
        break
      // jump with offset
      case 0xb000:
        this.jump(nnn + rx_value)

        break

      // random
      case 0xc000:
        const min = 0
        const max = 255
        let random_number = Math.floor(Math.random() * (max - min + 1)) + min

        random_number &= nn

        this.registers[x] = random_number

        break

      // display
      case 0xd000:
        const startX = this.registers[x] % display.width
        const startY = this.registers[y] % display.height

        this.registers[this.last_register] = 0

        for (let row = 0; row < n; row++) {
          let x_coord = startX
          const y_coord = startY + row

          if (y_coord >= display.height) break

          const sprite_byte = this.memory[this.i_index + row]

          for (let bit = 0; bit < 8; bit++) {
            if (x_coord >= display.width) break

            const index = (display.width * y_coord + x_coord) * 3
            const color_bit = (sprite_byte >> (7 - bit)) & 0x1

            if (display.pixels[index] === 1 && color_bit === 1)
              this.registers[this.last_register] = 1

            display.display_sprite(index, color_bit)

            x_coord++
          }
        }

        break

      case 0xe000:
        const keycode = rx_value
        switch (nn) {
          case 0x9e:
            if (display.keyboard.is_key_pressed(keycode)) this.skip_command()
            break
          case 0xa1:
            if (!display.keyboard.is_key_pressed(keycode)) this.skip_command()
            break
        }
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
