import { Computer } from "./computer/index.ts"

function main() {
  const computer = new Computer({
    increment_i: false,
    shift_uses_vy: false,
    clip: true,
  })
  computer.run()
}

main()
