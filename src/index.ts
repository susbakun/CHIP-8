import { CPU } from "./cpu.ts"
import { Display } from "./display.ts"

function main() {
  const display = new Display()
  const cpu = new CPU()

  display.create()

  while (true) {
    const opcode = cpu.fetch()
    if (!opcode) continue

    cpu.decode(opcode, display)
  }
}

main()
