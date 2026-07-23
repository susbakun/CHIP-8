import sdl from "@kmamal/sdl"

type KeyDownType = Pick<sdl.Events.Window.KeyDown, "key">
type KeyUpType = Pick<sdl.Events.Window.KeyUp, "key">

export class Keyboard {
  private keys = new Array<boolean>(16).fill(false)
  private keys_map: Map<string, number> = new Map()

  private last_pressed_key = -1

  constructor() {
    // mapping the sdl key codes to chip-8 ones
    this.keys_map.set("1", 0x1)
    this.keys_map.set("2", 0x2)
    this.keys_map.set("3", 0x3)
    this.keys_map.set("4", 0xc)
    this.keys_map.set("q", 0x4)
    this.keys_map.set("w", 0x5)
    this.keys_map.set("e", 0x6)
    this.keys_map.set("r", 0xd)
    this.keys_map.set("a", 0x7)
    this.keys_map.set("s", 0x8)
    this.keys_map.set("d", 0x9)
    this.keys_map.set("f", 0xe)
    this.keys_map.set("z", 0xa)
    this.keys_map.set("x", 0x0)
    this.keys_map.set("c", 0xb)
    this.keys_map.set("v", 0xf)
  }

  public keyDown(event: KeyDownType) {
    if (event.key) {
      // exit the program if escape was hit
      if (event.key === "escape") process.exit(0)

      const chip8_key = this.keys_map.get(event.key)
      if (chip8_key !== undefined) {
        this.keys[chip8_key] = true
        this.last_pressed_key = chip8_key
      }
    }
  }

  public keyUp(event: KeyUpType) {
    if (event.key) {
      const chip8_key = this.keys_map.get(event.key)
      if (chip8_key !== undefined) {
        this.keys[chip8_key] = false
      }
    }
  }

  public get_pressed_key() {
    const key = this.last_pressed_key
    this.last_pressed_key = -1
    return key
  }

  public is_key_pressed(keycode: number): boolean {
    return this.keys[keycode] ?? false
  }
}
