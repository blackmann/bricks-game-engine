import BricksEngine, { Sprite } from './engine.js'
import gameObjects from './game-objects.js'

const engine = new BricksEngine({
  screen: { width: 16, height: 32, pixelSize: 5, gutter: 1 },
})

const edgeLeft = new Sprite({
  pixels: gameObjects.edge.pixels,
  position: { x: 0, y: 0 },
})

const edgeRight = new Sprite({
  pixels: gameObjects.edge.pixels,
  position: { x: 15, y: 0 },
})

const divider = new Sprite({
  ...gameObjects.divider,
  name: 'divider',
})

const sprite = new Sprite({
  ...gameObjects.main,
})

sprite.collisionGroup = ['default']

const intervalId = setInterval(() => {
  const rand = Math.ceil(Math.random() * 2)

  const npc = new Sprite({
    ...gameObjects.npc,
    position: { x: rand > 1 ? 10 : 2, y: 0 },
  })

  npc.collisionGroup = ['default']

  npc.onRenderComplete = function () {
    this.move({ dy: 1 })
  }

  npc.onLeaveViewport = function () {
    engine.removeObjects(this)
  }

  engine.addObjects(npc)
}, 800);

sprite.on('collision', (object) => {
  clearInterval(intervalId)
  engine.stop()
  console.log('GAME::OVER')
})

engine.addObjects(sprite, edgeLeft, edgeRight, divider)


engine.start()
