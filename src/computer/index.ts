import { CPU } from "./cpu/index.ts"
import { Display } from "./display.ts"

export class Computer {
  private cpu_hz = 700

  public run() {
    const display = new Display()
    const cpu = new CPU()

    const cycle = setInterval(() => {
      cpu.cycle(display)
    }, 1000 / this.cpu_hz)

    clearInterval(cycle)
  }
}
