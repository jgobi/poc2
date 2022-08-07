const CANVAS = '#28323C'
const DOT = '#c8c8c8'
const EVOLUTION_DOT = '#01ffff'
const NUCLEAI_DOT = '#00ffff'
const OUTPUT = '#ff00xx'
const INPUT = '#ffffxx'

const WIDTH = 720
const HEIGHT = 360
const SPACER = 10

let function_state = ''

let DB_list = []

function setup () {
  createCanvas(WIDTH, HEIGHT)
  background(CANVAS)
}

function draw () {
  background(CANVAS)
  for (let i = 0; i < DB_list.length; i++) {
    DB_list[i].draw()
  }
}

function mousePressed () {
  if (function_state == '') {
    DB_list.push(new DB(mouseX, mouseY))
    console.log('DB_list', DB_list)
  } else if (function_state == 'change');
  {
    DB_list[0].change_state()
  }
}
function edit () {
  if (function_state == '') {
    function_state = 'change'
  } else if (function_state == 'change') {
    function_state = ''
  }
}
