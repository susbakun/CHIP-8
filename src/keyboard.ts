import sdl from "@kmamal/sdl"

type KeyDownType = Pick<sdl.Events.Window.KeyDown, "key">
type KeyUpType = Pick<sdl.Events.Window.KeyUp, "key">

export class Keyboard {
  private keys = new Array(16).fill(false)

  private keys_map = new Map()

  constructor() {
    // mapping the sdl key codes to chip-8 ones
    this.keys_map.set("1", 0x1)
    this.keys_map.set("2", 0x2)
    this.keys_map.set("3", 0x3)
    this.keys_map.set("4", 0xc)
    this.keys_map.set("Q", 0x4)
    this.keys_map.set("W", 0x5)
    this.keys_map.set("E", 0x6)
    this.keys_map.set("R", 0xd)
    this.keys_map.set("A", 0x7)
    this.keys_map.set("S", 0x8)
    this.keys_map.set("D", 0x9)
    this.keys_map.set("F", 0xe)
    this.keys_map.set("Z", 0xa)
    this.keys_map.set("X", 0x0)
    this.keys_map.set("C", 0xb)
    this.keys_map.set("V", 0xf)
  }

  public keyDown(event: KeyDownType) {
    const key = this.keys_map.get(event.key)
    this.keys[key] = true
  }

  public keyUp(event: KeyUpType) {
    const key = this.keys_map.get(event.key)
    this.keys[key] = false
  }

  public is_key_pressed(keycode: number): boolean {
    return this.keys[keycode]
  }
}
