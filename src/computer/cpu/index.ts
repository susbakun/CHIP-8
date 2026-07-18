import {
  firstNibbleDecoder,
  nDecoder,
  nnDecoder,
  nnnDecoder,
  xDecoder,
  yDecoder,
} from "./decoders.ts"
import type { Display } from "../display.ts"
import { FONTSET } from "../../font.ts"
import type { Instruction } from "../../types.ts"

const MEMORY_START = 0x0200

class CPU {
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
    // first fetch the command
    const opcode = this.fetch()
    // get the corresponding command
    const instruction = this.decode(opcode, display)
    // execute it
    instruction.execute.apply(this, instruction.args)
  }

  private fetch(): number {
    // be ready to fetch the next opcode
    this.pc += 2

    const chunk1 = this.memory[this.pc]
    const chunk2 = this.memory[this.pc + 1]

    return (chunk1 << 8) + chunk2
  }

  // 2-byte opcode
  public decode(opcode: number, display: Display): Instruction {
    const first_nibble = firstNibbleDecoder(opcode)
    const x = xDecoder(opcode)
    const y = yDecoder(opcode)
    const nn = nnDecoder(opcode)
    const nnn = nnnDecoder(opcode)

    let rx_value = this.registers[x]
    let ry_value = this.registers[y]

    switch (first_nibble) {
      case 0x0000:
        return {
          execute: this.execute0,
          args: [opcode, display],
        }

      // jump
      case 0x1000:
        return {
          execute: this.jump,
          args: [nnn],
        }

      // call
      case 0x2000:
        return {
          execute: this.call,
          args: [nnn],
        }

      // skips
      case 0x3000:
        return {
          execute: this.skip_on_condition,
          args: [rx_value === nn],
        }

      case 0x4000:
        return {
          execute: this.skip_on_condition,
          args: [rx_value !== nn],
        }

      case 0x5000:
        return {
          execute: this.skip_on_condition,
          args: [rx_value === ry_value],
        }

      case 0x9000:
        return {
          execute: this.skip_on_condition,
          args: [rx_value !== ry_value],
        }

      // set register
      case 0x6000:
        return {
          execute: this.set_register,
          args: [x, nn],
        }

      // add immediate
      case 0x7000:
        return {
          execute: this.set_register,
          args: [x, rx_value + nn],
        }

      // Logical and arithmetic instructions
      case 0x8000:
        return {
          execute: this.execute8,
          args: [opcode],
        }

      // set index
      case 0xa000:
        return {
          execute: this.set_index,
          args: [nnn],
        }

      // jump with offset
      case 0xb000:
        return {
          execute: this.jump,
          args: [nnn + this.registers[0]],
        }

      // random
      case 0xc000:
        return {
          execute: this.random,
          args: [opcode],
        }

      // display
      case 0xd000:
        return {
          execute: this.display_sprite,
          args: [opcode, display],
        }

      // skip if key
      case 0xe000:
        return {
          execute: this.skip_if_key_pressed,
          args: [opcode, display],
        }

      default:
        return {
          execute: this.skip_command,
          args: [],
        }
    }
  }

  // execute
  private execute0(opcode: number, display: Display) {
    const nnn = nnnDecoder(opcode)

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
  }

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

  private skip_on_condition(condition: boolean) {
    if (condition) {
      this.skip_command()
    }
  }

  private skip_command() {
    this.pc += 2
  }

  private execute8(opcode: number) {
    const x = xDecoder(opcode)
    const y = yDecoder(opcode)
    const n = nDecoder(opcode)

    let rx_value = this.registers[x]
    let ry_value = this.registers[y]

    switch (n) {
      case 0:
        this.set_register(x, ry_value)
        break
      case 1:
        this.set_register(x, rx_value | ry_value)
        break
      case 2:
        this.set_register(x, rx_value & ry_value)
        break
      case 3:
        this.set_register(x, rx_value ^ ry_value)
        break
      case 4:
        this.add_two_registers(x, y)
        break
      case 5:
        this.subtract_two_registers(x, y)
        break
      case 6:
        this.right_shift_reg_and_store(x, y)
        break

      case 7:
        this.subtract_two_registers(y, x)
        break

      case 0xe:
        this.left_shift_reg_and_store(x, y)
        break
    }
  }

  private set_register(reg: number, value: number) {
    this.registers[reg] = value
  }

  private add_two_registers(reg1: number, reg2: number) {
    const reg1_value = this.registers[reg1]
    const reg2_value = this.registers[reg2]

    const sum = reg1_value + reg2_value
    const flag = sum > 0xff ? 1 : 0

    this.set_register(this.last_register, flag)
    this.set_register(reg1, sum)
  }

  private subtract_two_registers(reg1: number, reg2: number) {
    const reg1_value = this.registers[reg1]
    const reg2_value = this.registers[reg2]

    const sub = reg1_value - reg2_value
    const flag = sub >= 0 ? 1 : 0

    this.set_register(this.last_register, flag)
    this.set_register(reg1, sub)
  }

  private right_shift_reg_and_store(reg1: number, reg2: number) {
    const reg2_value = this.registers[reg2]

    this.set_register(reg1, reg2_value >> 1)
    this.set_register(this.last_register, reg2_value & 0x1)
  }

  private left_shift_reg_and_store(reg1: number, reg2: number) {
    const reg2_value = this.registers[reg2]

    this.set_register(reg1, reg2_value << 1)
    this.set_register(this.last_register, reg2_value >> 7)
  }

  private random(opcode: number) {
    const min = 0
    const max = 255

    let random_number = Math.floor(Math.random() * (max - min + 1)) + min

    const x = xDecoder(opcode)
    const nn = nnDecoder(opcode)

    random_number &= nn

    this.set_register(x, random_number)
  }

  private set_index(addr: number) {
    this.i_index = addr
  }

  private display_sprite(opcode: number, display: Display) {
    const x = xDecoder(opcode)
    const y = yDecoder(opcode)
    const n = nDecoder(opcode)

    const startX = this.registers[x] % display.width
    const startY = this.registers[y] % display.height

    this.set_register(this.last_register, 0)

    for (let row = 0; row < n; row++) {
      let x_coord = startX
      const y_coord = startY + row

      // reached bottom?
      if (y_coord >= display.height) break

      const sprite_byte = this.memory[this.i_index + row]

      for (let bit = 0; bit < 8; bit++) {
        // reached right edge?
        if (x_coord >= display.width) break

        const index = (display.width * y_coord + x_coord) * 3
        const color_bit = (sprite_byte >> (7 - bit)) & 0x1

        if (display.pixels[index] === 1 && color_bit === 1)
          this.set_register(this.last_register, 1)

        display.display_sprite(index, color_bit)

        x_coord++
      }
    }
  }

  private skip_if_key_pressed(opcode: number, display: Display) {
    const x = xDecoder(opcode)
    const nn = nnDecoder(opcode)

    const rx_value = this.registers[x]
    const keycode = rx_value

    switch (nn) {
      case 0x9e:
        if (display.keyboard.is_key_pressed(keycode)) this.skip_command()
        break
      case 0xa1:
        if (!display.keyboard.is_key_pressed(keycode)) this.skip_command()
        break
    }
  }
}

export { CPU }
