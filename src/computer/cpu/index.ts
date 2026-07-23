import {
  firstNibbleDecoder,
  nDecoder,
  nnDecoder,
  nnnDecoder,
  nnnnDecoder,
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
import type { Audio } from "../audio.ts"

const MEMORY_START = 0x200

type MemType = "Main" | "Register"

export class CPU {
  // 64 kilo bytes of RAM
  private memory = new Uint8Array(0x10000)
  // 16 bit program counter (which starts at 0x200 due to chip8 interpreter taking up the first 512 bytes)
  private pc = MEMORY_START
  // 16 * 8-bit data registers named V0 to VF
  public registers = new Uint8Array(0x10)
  // 16-bit register called I, This register is generally used to store memory addresses.
  private i_index = 0x0
  // 16 * 16-bit values for the stack
  private stack = new Uint16Array(0x10)
  // stack pointer
  private sp = -1
  // last register (used for setting carry flag)
  private last_register = 15
  // 8 (on SCHIP) | 16 (on XO-CHIP) * 8-bit rpl (reserved for program loading) registers (super-chip)
  private rpls = new Uint8Array(0x10)

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

  public cycle(display: Display, timer: Timer, audio: Audio, quirks: Quirks) {
    // first fetch the command
    const opcode = this.fetch()
    // get the corresponding command
    const instruction = this.decode(opcode, display, timer, audio, quirks)
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

  private fetch_wo_changing_pc(): number {
    const chunk1 = this.memory[this.pc]
    const chunk2 = this.memory[this.pc + 1]

    return (chunk1 << 8) + chunk2
  }

  // 2-byte opcode
  public decode(
    opcode: number,
    display: Display,
    timer: Timer,
    audio: Audio,
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
          execute: this.execute5,
          args: [opcode, quirks],
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
          args: [opcode, display, quirks],
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
          args: [opcode, display, timer, audio, quirks],
        }
        break

      // throw error when command was unknown
      default:
        throw new Error(
          `Unknown opcode ${opcode.toString(16)} at ${this.pc.toString(16)}`,
        )
    }
  }

  // execute
  private execute0(opcode: number, display: Display) {
    const n = nDecoder(opcode)
    const nn = nnDecoder(opcode)

    switch (nn) {
      //clear display
      case 0xe0:
        this.clear_display(display)
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

      // scroll up
      case 0xd0 + n:
        display.scroll(n, "Up")
        break

      // scroll down
      case 0xc0 + n:
        display.scroll(n, "Down")
        break

      // scroll right
      case 0xfb:
        display.scroll(4, "Right")
        break

      // scroll left
      case 0xfc:
        display.scroll(4, "Left")
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

  private clear_display(display: Display) {
    if (display.current_plane == 0) return

    if (display.current_plane === 3) {
      display.clear(0)
      display.clear(1)
    } else {
      display.clear(display.current_plane - 1)
    }
  }

  private jump(addr: number) {
    this.pc = addr
  }

  private call(addr: number) {
    this.sp++
    if (this.sp >= this.stack.length) throw new Error("stack overflow")

    this.stack[this.sp] = this.pc
    this.jump(addr)
  }

  private ret() {
    this.jump(this.stack[this.sp])
    this.sp--

    if (this.sp < -1) throw new Error("stack underflow")
  }

  private execute5(opcode: number, quirks: Quirks) {
    const n = nDecoder(opcode)
    const x = xDecoder(opcode)
    const y = yDecoder(opcode)

    let rx_value = this.registers[x]
    let ry_value = this.registers[y]

    switch (n) {
      case 0:
        this.skip_on_condition(rx_value === ry_value)
        break
      case 2:
        this.save_to(x, y, "Main", quirks)
        break
      case 3:
        this.load_to(x, y, "Main", quirks)
        break
    }
  }

  private skip_on_condition(condition: boolean) {
    if (condition) {
      this.skip_command()
    }
  }

  private skip_command() {
    const next_command = this.fetch_wo_changing_pc()

    if (next_command === 0xf000) {
      this.pc += 4
    } else {
      this.pc += 2
    }
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
        this.subtract_reg2_from_reg1(x, y)
        break

      case 6:
        this.right_shift(x, y, quirks)
        break

      case 7:
        this.subtract_reg1_from_reg2(x, y)
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

  private subtract_reg2_from_reg1(reg1: number, reg2: number) {
    const reg1_value = this.registers[reg1]
    const reg2_value = this.registers[reg2]

    const sub = reg1_value - reg2_value
    const flag = sub >= 0 ? 1 : 0

    this.set_register(this.last_register, flag)
    this.set_register(reg1, sub)
  }

  private subtract_reg1_from_reg2(reg1: number, reg2: number) {
    const reg1_value = this.registers[reg1]
    const reg2_value = this.registers[reg2]

    const sub = reg2_value - reg1_value
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

  private display_sprite(opcode: number, display: Display, quirks: Quirks) {
    if (display.current_plane === 0) return

    const x = xDecoder(opcode)
    const y = yDecoder(opcode)

    const n = nDecoder(opcode)
    // handling n = 0 special command
    const height = n === 0 ? 16 : n
    const byte_count = n === 0 ? 2 : 1

    const start_x = this.registers[x] % display.width
    const start_y = this.registers[y] % display.height

    this.set_register(this.last_register, 0)

    // draw to both
    if (display.current_plane === 3) {
      const bytes = height * byte_count

      this.draw_plane(
        0,
        display,
        this.i_index,
        height,
        byte_count,
        start_x,
        start_y,
        quirks,
      )
      this.draw_plane(
        1,
        display,
        this.i_index + bytes,
        height,
        byte_count,
        start_x,
        start_y,
        quirks,
      )
    } else {
      this.draw_plane(
        display.current_plane - 1,
        display,
        this.i_index,
        height,
        byte_count,
        start_x,
        start_y,
        quirks,
      )
    }
  }

  private draw_plane(
    plane: number,
    display: Display,
    sprite_index_start: number,
    height: number,
    byte_count: number,
    start_x: number,
    start_y: number,
    quirks: Quirks,
  ) {
    let sprite_index = sprite_index_start

    for (let row = 0; row < height; row++) {
      const y_coord = start_y + row
      if (quirks.clip && y_coord >= display.height) {
        sprite_index += byte_count // keep byte alignment for later rows
        continue
      }

      for (let bc = 0; bc < byte_count; bc++) {
        const sprite_byte = this.memory[sprite_index++]

        for (let bit = 0; bit < 8; bit++) {
          const x_coord = start_x + bc * 8 + bit
          if (quirks.clip && x_coord >= display.width) continue

          const index =
            display.width * (y_coord % display.height) +
            (x_coord % display.width)
          const color_bit = (sprite_byte >> (7 - bit)) & 0x1

          if (display.planes[plane][index] === 1 && color_bit === 1)
            this.set_register(this.last_register, 1)

          display.xor_color_with_pixel(plane, index, color_bit)
        }
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
    display: Display,
    timer: Timer,
    audio: Audio,
    quirks: Quirks,
  ) {
    const nn = nnDecoder(opcode)
    const x = xDecoder(opcode)

    const rx_value = this.registers[x]

    switch (nn) {
      // set 16-bit number to the i
      case 0x00:
        // fetching the next command which should be (0xNNNN)
        const nnnn = nnnnDecoder(this.fetch())
        this.set_index(nnnn)
        break

      // select plane
      case 0x01:
        display.set_current_plane(x)
        break

      // load audio pattern from memory
      case 0x02:
        for (let i = 0; i < 16; i++) {
          audio.pattern[i] = this.memory[this.i_index + i]
        }
        break

      // set pitch
      case 0x3a:
        audio.set_pitch(rx_value)
        break

      // timers
      case 0x07:
        this.set_register(x, timer.delayTimer)
        break

      case 0x15:
        timer.delayTimer = rx_value
        break

      case 0x18:
        timer.soundTimer = rx_value

        if (rx_value > 0) {
          audio.play()
        } else {
          audio.stop()
        }

        break

      // add to index
      case 0x1e:
        this.set_index(this.i_index + rx_value)
        break

      // get key
      case 0x0a:
        const pressed_key = display.keyboard.get_pressed_key()
        if (pressed_key >= 0) {
          this.set_register(x, pressed_key)
        } else {
          this.revert_command()
        }
        break

      // font character
      case 0x29:
        this.set_index(FONTSTART + rx_value * 5)
        break

      // large font character
      case 0x30:
        this.set_index(BIGFONTSTART + rx_value * 10)
        break

      // binary-coded decimal conversion
      case 0x33:
        const hundreds = Math.floor(rx_value / 100)
        const tens = Math.floor((rx_value % 100) / 10)
        const ones = rx_value % 10

        this.store_in_memory(this.i_index, hundreds)
        this.store_in_memory(this.i_index + 1, tens)
        this.store_in_memory(this.i_index + 2, ones)
        break

      // store to memory
      case 0x55:
        this.save_to(0, x, "Main", quirks)
        break

      // load from memory
      case 0x65:
        this.load_to(0, x, "Main", quirks)
        break

      // save flags
      case 0x75:
        this.save_to(0, x, "Register", quirks)
        break

      // load flags
      case 0x85:
        this.load_to(0, x, "Register", quirks)
        break
    }
  }

  private save_to(x: number, y: number, to: MemType, quirks: Quirks) {
    const step = x <= y ? 1 : -1
    const end = x <= y ? y + 1 : y - 1

    let i = x

    if (to === "Register") {
      while (i != end) {
        this.set_rpl(i, this.registers[i])
        i += step
      }
    } else {
      let offset = 0

      while (i != end) {
        this.store_in_memory(this.i_index + offset, this.registers[i])

        offset++
        i += step
      }

      if (quirks.increment_i) {
        this.set_index(this.i_index + offset)
      }
    }
  }

  private load_to(x: number, y: number, from: MemType, quirks: Quirks) {
    const step = x <= y ? 1 : -1
    const end = x <= y ? y + 1 : y - 1

    let i = x

    if (from === "Register") {
      while (i != end) {
        this.set_register(i, this.rpls[i])
        i += step
      }
    } else {
      let offset = 0

      while (i != end) {
        this.set_register(i, this.memory[this.i_index + offset])

        offset++
        i += step
      }

      if (quirks.increment_i) {
        this.set_index(this.i_index + offset)
      }
    }
  }

  private store_in_memory(addr: number, value: number) {
    this.memory[addr] = value
  }
}
