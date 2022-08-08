class DB {
  constructor (x, y) {
    this.x = x
    this.y = y
    this.color = '#c8c8c8'
    this.interval = 25
  }

  draw () {
    stroke(this.color)
    point(this.x, this.y)
  }

  change_state () {
    if (this.state == 'dot') {
      this.color = '#ffffxx'
    } else if (this.state == 'input') {
      this.color = '#ff00xx'
    } else if (this.state == 'output') {
      this.color = '#00ffff'
    } else {
      this.color = '#c8c8c8'
    }
  }
}
