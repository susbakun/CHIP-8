import {
  firstNibbleDecoder,
  nDecoder,
  nnDecoder,
  nnnDecoder,
  xDecoder,
  yDecoder,
} from "./decoders.ts"
import {
  CHIP8_HEIGHT,
  CHIP8_WIDTH,
  SCHIP_HEIGHT,
  SCHIP_WIDTH,
  type Display,
} from "../display.ts"
import { BIG_FONTSET, BIGFONTSTART, FONTSET, FONTSTART } from "../../font.ts"
import type { Instruction, Quirks } from "../../types.ts"
import type { Timer } from "../timer.ts"

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
  // last register (used for setting carry flag)
  private last_register = 15
  // rpl (reserved for program loading) registers (super-chip)
  private rpls = new Uint8Array(0x8)

  constructor() {
    this.load_fonts()
  }

  public load_rom(rom: Buffer) {
    for (let i = 0; i < rom.length; i++) {
      this.store_in_memory(MEMORY_START + i, rom[i])
    }
  }

  public load_fonts() {
    this.memory.set(FONTSET, FONTSTART)
    this.memory.set(BIG_FONTSET, BIGFONTSTART)
  }

  public cycle(display: Display, timer: Timer, quirks: Quirks) {
    // first fetch the command
    const opcode = this.fetch()
    // get the corresponding command
    const instruction = this.decode(opcode, display, timer, quirks)
    // execute it
    instruction.execute.apply(this, instruction.args)
  }

  private fetch(): number {
    const chunk1 = this.memory[this.pc]
    const chunk2 = this.memory[this.pc + 1]

    // be ready to fetch the next opcode
    this.pc += 2

    return (chunk1 << 8) + chunk2
  }

  // 2-byte opcode
  public decode(
    opcode: number,
    display: Display,
    timer: Timer,
    quirks: Quirks,
  ): Instruction {
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
          args: [opcode, quirks],
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

      // timer
      case 0xf000:
        return {
          execute: this.executef,
          args: [opcode, x, display, timer, quirks],
        }
        break

      // skip the command if it was unknown
      default:
        return {
          execute: this.skip_command,
          args: [],
        }
    }
  }

  // execute
  private execute0(opcode: number, display: Display) {
    const n = nDecoder(opcode)
    const nn = nnDecoder(opcode)

    switch (nn) {
      //clear display
      case 0xe0:
        display.clear()
        break

      //ret
      case 0xee:
        this.ret()
        break

      // exit
      case 0xfd:
        process.exit(0)

      // halting the program
      case 0x00:
        this.revert_command()
        break

      // scroll down
      case 0xc0 + n:
        display.scroll_down(n)
        break

      // scroll right
      case 0xfb:
        display.scroll_right()
        break

      // scroll left
      case 0xfc:
        display.scroll_left()
        break

      // hires
      case 0xff:
        display.change_res(SCHIP_WIDTH, SCHIP_HEIGHT)
        break

      // lores
      case 0xfe:
        display.change_res(CHIP8_WIDTH, CHIP8_HEIGHT)
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

  private revert_command() {
    this.pc -= 2
  }

  private execute8(opcode: number, quirks: Quirks) {
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
        this.right_shift(x, y, quirks)
        break

      case 7:
        this.subtract_two_registers(y, x)
        break

      case 0xe:
        this.left_shift(x, y, quirks)
        break
    }
  }

  private set_register(reg: number, value: number) {
    this.registers[reg] = value
  }

  private set_rpl(reg: number, value: number) {
    this.rpls[reg] = value
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

  private right_shift(reg1: number, reg2: number, quirks: Quirks) {
    const value = quirks.shift_uses_vy
      ? this.registers[reg2]
      : this.registers[reg1]

    this.set_register(reg1, value >> 1)
    this.set_register(this.last_register, value & 0x1)
  }

  private left_shift(reg1: number, reg2: number, quirks: Quirks) {
    const value = quirks.shift_uses_vy
      ? this.registers[reg2]
      : this.registers[reg1]

    this.set_register(reg1, value << 1)
    this.set_register(this.last_register, value >> 7)
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
    // handling n = 0 special command
    const height = n === 0 ? 16 : n
    const byte_count = n === 0 ? 2 : 1

    const startX = this.registers[x] % display.width
    const startY = this.registers[y] % display.height

    this.set_register(this.last_register, 0)

    let sprite_index = this.i_index

    for (let row = 0; row < height; row++) {
      let x_coord = startX
      const y_coord = (startY + row) % display.height

      for (let bc = 0; bc < byte_count; bc++) {
        const sprite_byte = this.memory[sprite_index]

        for (let bit = 0; bit < 8; bit++) {
          const index = display.width * y_coord + x_coord
          const color_bit = (sprite_byte >> (7 - bit)) & 0x1

          if (display.pixels[index] === 1 && color_bit === 1)
            this.set_register(this.last_register, 1)

          display.write_to_pixels(index, color_bit)

          x_coord = (x_coord + 1) % display.width
        }

        sprite_index += 1
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

  private executef(
    opcode: number,
    reg: number,
    display: Display,
    timer: Timer,
    quirks: Quirks,
  ) {
    const nn = nnDecoder(opcode)

    const reg_value = this.registers[reg]

    switch (nn) {
      // timers
      case 0x07:
        this.set_register(reg, timer.delayTimer)
        break

      case 0x15:
        timer.delayTimer = reg_value
        break

      case 0x18:
        timer.soundTimer = reg_value
        break

      // add to index
      case 0x1e:
        this.set_index(this.i_index + reg_value)
        break

      // get key
      case 0x0a:
        // index is basically the keycode we want
        const pressed_key = display.keyboard.get_pressed_key()
        if (pressed_key !== undefined) {
          this.set_register(reg, pressed_key)
        } else {
          this.revert_command()
        }
        break

      // font character
      case 0x29:
        this.set_index(FONTSTART + reg_value * 5)
        break

      // large font character
      case 0x30:
        this.set_index(BIGFONTSTART + reg_value * 10)
        break

      // binary-coded decimal conversion
      case 0x33:
        const hundreds = Math.floor(reg_value / 100)
        const tens = Math.floor((reg_value % 100) / 10)
        const ones = reg_value % 10

        this.store_in_memory(this.i_index, hundreds)
        this.store_in_memory(this.i_index + 1, tens)
        this.store_in_memory(this.i_index + 2, ones)
        break

      // store in memory
      case 0x55:
        for (let i = 0; i <= reg; i++) {
          this.store_in_memory(this.i_index + i, this.registers[i])
        }
        if (quirks.increment_i) this.set_index(this.i_index + reg + 1)
        break

      // load from memory
      case 0x65:
        for (let i = 0; i <= reg; i++) {
          this.set_register(i, this.memory[this.i_index + i])
        }
        if (quirks.increment_i) this.set_index(this.i_index + reg + 1)
        break

      // save flags
      case 0x75:
        for (let i = 0; i <= reg; i++) {
          this.set_rpl(i, this.registers[i])
        }
        break

      // load flags
      case 0x85:
        for (let i = 0; i <= reg; i++) {
          this.set_register(i, this.rpls[i])
        }
        break
    }
  }

  private store_in_memory(addr: number, value: number) {
    this.memory[addr] = value
  }
}
