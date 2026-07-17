import sdl from "@kmamal/sdl"
import { Keyboard } from "./keyboard.ts"

export class Display {
  public width = 64
  public height = 32
  public pixels = Buffer.alloc(this.width * this.height * 3)
  public window: sdl.Sdl.Video.Window

  public keyboard = new Keyboard()

  constructor() {
    this.window = sdl.video.createWindow({
      title: "CHIP-8",
      width: this.width * 10,
      height: this.height * 10,
    })

    // setup event listeners
    this.window.on("keyDown", this.keyboard.keyDown)
    this.window.on("keyUp", this.keyboard.keyUp)
  }

  // colors or either 0 or 1 (black or white)
  display_sprite(index: number, color: number) {
    // wiriting to all 3 channels
    this.pixels[index] ^= color
    this.pixels[index + 1] ^= color
    this.pixels[index + 2] ^= color
  }

  clear() {
    this.pixels.fill(255)

    this.window.render(
      this.width,
      this.height,
      this.width * 3,
      "rgb888",
      this.pixels,
    )
  }
}
