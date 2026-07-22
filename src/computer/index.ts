import { readFileSync } from "fs"
import { CPU } from "./cpu/index.ts"
import { Display } from "./display.ts"
import { Timer } from "./timer.ts"
import path from "path"
import type { Quirks } from "../types.ts"
import { Audio } from "./audio.ts"

export class Computer {
  private cpu_hz = 700
  private timer_hz = 60
  private display_hz = 60

  private display = new Display()
  private cpu = new CPU()
  private timer = new Timer()
  private audio = new Audio()
  private quirks: Quirks

  constructor(quirks: Quirks) {
    this.quirks = quirks
  }

  public setup() {
    // load font
    this.cpu.load_fonts()

    // load rom
    const rom_name = process.argv[2] ?? "ibm.ch8"
    const rom_path = path.join("./roms", rom_name)
    const rom = readFileSync(rom_path)
    this.cpu.load_rom(rom)

    // start the audio system
    this.audio.start()
  }

  public run() {
    this.setup()
    // cpu cycle
    setInterval(() => {
      this.cpu.cycle(this.display, this.timer, this.audio, this.quirks)
    }, 1000 / this.cpu_hz)

    // timer tick
    setInterval(() => {
      this.timer.tick(this.audio)
    }, 1000 / this.timer_hz)

    // display rendering
    setInterval(() => {
      this.display.render()
    }, 1000 / this.display_hz)
  }
}
