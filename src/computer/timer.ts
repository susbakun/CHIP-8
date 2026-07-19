import player from "play-sound"


export class Timer {
  public delayTimer = 0
  public soundTimer = 0
  // used for beep sound
  public player = player()

  public tick() {
    if (this.delayTimer > 0) this.delayTimer--

    if (this.soundTimer > 0) {
      this.soundTimer--

      this.player.play('beep.mp3', (err) => {
        if (err) console.error(err)
      })

    }
  }
}
