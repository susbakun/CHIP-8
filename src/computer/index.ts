import { readFileSync } from "fs"
import { CPU } from "./cpu/index.ts"
import { Display } from "./display.ts"
import { Timer } from "./timer.ts"
import path from "path"
import type { Quirks } from "../types.ts"

export class Computer {
  private cpu_hz = 700
  private timer_hz = 60
  private display_hz = 60

  private display = new Display()
  private cpu = new CPU()
  private timer = new Timer()
  private quirks: Quirks

  constructor(quirks: Quirks) {
    this.quirks = quirks
  }

  public load_in_memory() {
    this.cpu.load_fonts()

    const rom_name = process.argv[2] ?? "ibm.ch8"
    const rom_path = path.join("./roms", rom_name)
    const rom = readFileSync(rom_path)

    this.cpu.load_rom(rom)
  }

  public run() {
    this.load_in_memory()
    // cpu cycle
    setInterval(() => {
      this.cpu.cycle(this.display, this.timer, this.quirks)
    }, 1000 / this.cpu_hz)

    // timer tick
    setInterval(() => {
      this.timer.tick()
    }, 1000 / this.timer_hz)

    // display rendering
    setInterval(() => {
      this.display.render()
    }, 1000 / this.display_hz)
  }
}
