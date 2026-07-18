export class Timer {
  public delayTimer = 0
  public soundTimer = 0

  public tick() {
    if (this.delayTimer > 0) this.delayTimer--

    if (this.soundTimer > 0) {
      this.soundTimer--
      // TODO: splay beep sound
    }
  }
}
