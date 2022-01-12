export class Utils {
  static hasCommonGroup(arr1, arr2) {
    for (let i = 0; i < arr2.length; i++) {
      if (arr1.includes(arr2[i])) {
        return true
      }
    }

    return false
  }
}

export class HUD {
  static baseFeatures = [
    'score',
    'high-score',
    'graphic',
    'level',
    'sound',
    'pause',
  ]

  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   */

  constructor({
    canvas,
    height = 40,
    width = 20,
    features = HUD.baseFeatures,
  }) {

    if (!canvas) {
      canvas = document.createElement('canvas')

      canvas.width = width
      canvas.height = height

      document.body.appendChild(canvas)
    } else {
      canvas.width = width
      canvas.height = height
    }

    canvas.id = 'hud'

    this.canvas = canvas
    this.features = features
    this.height = height
    this.width = width

    this.state = {}
  }

  drawFrame() {
    const ctx = this.canvas.getContext('2d')

    ctx.beginPath()
    ctx.rect(0, 0, this.width, this.height)
    ctx.stroke()

    ctx.closePath()
  }

  draw() {
    document.fonts.ready.then(() => {
      this.drawFrame()

      const ctx = this.canvas.getContext('2d')
      ctx.font = '12pt DigitalNormal'

      HUD.baseFeatures.forEach((feature, i) => {
        ctx.fillStyle = i === 3 ? '#aaa' : '#222'

        if (feature !== 'graphic') {
          ctx.fillText(feature.toUpperCase(), 10, (i+2) * 12 + 10 * i)
        } else {
        }
      })
    })
  }

  update(state) {
    this.state = state
  }
}

export class Sprite {
  constructor({
    name = 'sprite',
    pixels,
    position = { x: 0, y: 0 },
    movementEnabled,
    moveMultiplier = 1,
  }) {
    this.name = name

    this.pixels = pixels
    this.position = position
    this.width = pixels[0].length
    this.height = pixels.length

    this.moveMultiplier = moveMultiplier
    this.collisionGroup = []

    this.events = {}

    if (movementEnabled) {
      this.on('key:ArrowRight', function () {
        this.move({ dx: 1 })
      })

      this.on('key:ArrowLeft', function () {
        this.move({ dx: -1 })
      })

      this.on('key:ArrowDown', function () {
        this.move({ dy: 1 })
      })

      this.on('key:ArrowUp', function () {
        this.move({ dy: -1 })
      })
    }
  }

  get inViewport() {
    return this._inViewport
  }

  set inViewport(v) {
    if (this._inViewport !== v) {
      this._inViewport = v
      v ? this.onEnterViewport() : this.onLeaveViewport()
    }
  }

  onEnterViewport() {}

  onLeaveViewport() {
    // override
  }

  onRenderStart() {
    // override with custom
  }

  onRenderComplete() {
    // override with custom
  }

  // this is called on every frame... apply effects like velocity or eases here before
  renderToBuffer(buffer) {
    this.onRenderStart()

    const { x, y } = this.position

    if (x >= buffer[0].length || x < 0 || y >= buffer.length || y < 0) {
      this.inViewport = false
      return
    }

    this.inViewport = true

    for (
      let i = this.position.y, y = 0;
      i < this.height + this.position.y && i < buffer.length;
      i++, y++
    ) {
      for (
        let j = this.position.x, x = 0;
        j < this.position.x + this.width && j < buffer[0].length;
        j++, x++
      ) {
        buffer[i][j] = this.pixels[y][x]
      }
    }

    this.onRenderComplete()
  }

  move({ dx = 0, dy = 0 }) {
    this.position.x += dx * this.moveMultiplier
    this.position.y += dy * this.moveMultiplier
  }

  on(event, f) {
    this.events[event] = f.bind(this)
  }

  act(event) {
    this.events[event]?.()
  }

  toString() {
    return `Sprite:${this.name}`
  }
}

class BricksEngine {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {number} options.fps
   * @param {object} options.screen
   * @param {number} options.screen.gutter Space between pixels
   * @param {number} options.screen.width Screen width based on render pixels
   * @param {number} options.screen.height Screen height based on redner pixels
   * @param {number} options.screen.pixelSize
   */
  constructor({
    canvas,
    fps = 12,
    screen: { gutter = 1, height = 45, pixelSize = 5, width = 45 } = {},
  } = {}) {
    const _width = width * pixelSize + (width - 1) * gutter
    const _height = height * pixelSize + (height - 1) * gutter

    if (!canvas) {
      canvas = document.createElement('canvas')

      canvas.width = _width
      canvas.height = _height

      document.body.appendChild(canvas)
    } else {
      canvas.width = _width
      canvas.height = _height
    }

    this.canvas = canvas
    this.fps = fps
    this.screen = {
      gutter,
      height,
      pixelSize,
      width,
    }

    this.screenBuffer = Array.from({ length: this.screen.height }, () =>
      Array.from({ length: this.screen.width }, () => 0)
    )

    /** @type {Sprite[]} */
    this.objects = []
  }

  addObjects(...object) {
    this.objects.push(...object)
  }

  clearBuffer() {
    this.screenBuffer.forEach((row) => {
      row.forEach((_, i) => (row[i] = 0))
    })
  }

  detectCollisions() {
    const collidables = this.objects.filter((obj) => obj.collisionGroup.length)

    for (let i = 0; i < collidables.length; i++) {
      const collider = collidables[i]

      const [x1, x2] = [
        collider.position.x,
        collider.position.x + collider.width,
      ].sort((a, b) => a - b)

      const [y1, y2] = [
        collider.position.y,
        collider.position.y + collider.height,
      ].sort((a, b) => a - b)

      for (let j = i + 1; j < collidables.length; j++) {
        const collidee = collidables[j]

        if (
          Utils.hasCommonGroup(collider.collisionGroup, collidee.collisionGroup)
        ) {
          // collision is simple with this engine style
          // if there's no intersection between the x coordinates, then
          // there's no intersection between the y
          //
          // this is because the convex hull of an object is rectangular

          const [xa1, xa2] = [
            collidee.position.x,
            collidee.position.x + collidee.width,
          ].sort((a, b) => a - b)

          if (xa1 >= x1 && xa2 <= x2) {
            const [ya1, ya2] = [
              collidee.position.y,
              collidee.position.y + collidee.height,
            ].sort((a, b) => a - b)

            if (ya1 >= y1 && ya2 >= y2) {
              // collides
              collider.act('collision', collidee)
              collidee.act('collision', collider)
            }
          }
        }
      }
    }
  }

  drawPixels() {
    const pixels = this.screenBuffer
    const ctx = this.canvas.getContext('2d')

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const { gutter, width, pixelSize } = this.screen

    pixels.forEach((row, index) => {
      const y = index * pixelSize + gutter * index

      for (let i = 0; i < width; i++) {
        const pixel = row[i] || 0

        ctx.fillStyle = pixel ? '#777' : '#eee'

        ctx.beginPath()
        ctx.rect(i * pixelSize + i * gutter, y, pixelSize, pixelSize)
        ctx.fill()
        ctx.closePath()
      }
    })
  }

  initialize() {
    document.addEventListener('keydown', (event) => {
      this.objects.forEach((object) => {
        object.act(`key:${event.code}`)
      })
    })
  }

  render() {
    this.renderInterval = setInterval(() => {
      this.clearBuffer()
      this.objects.forEach((object) => object.renderToBuffer(this.screenBuffer))
      this.drawPixels()

      this.detectCollisions()
    }, 1000 / this.fps)
  }

  removeObjects(...objects) {
    this.objects = this.objects.filter((obj) => !objects.includes(obj))
  }

  start() {
    this.initialize()
    this.render()
  }

  stop() {
    clearInterval(this.renderInterval)
  }
}

export default BricksEngine
