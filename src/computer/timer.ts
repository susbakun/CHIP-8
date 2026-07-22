import type { Audio } from "./audio.ts"

export class Timer {
  public delayTimer = 0
  public soundTimer = 0
  // used for beep sound

  public tick(audio: Audio) {
    if (this.delayTimer > 0) this.delayTimer--

    if (this.soundTimer > 0) {
      this.soundTimer--

      if (this.soundTimer === 0) {
        audio.stop()
      }
    }
  }
}
