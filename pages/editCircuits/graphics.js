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

function setup () {
  createCanvas(WIDTH, HEIGHT)
  background(CANVAS)
}
async function loadSiqad (el) {
  /** @type {File} **/
  let file = el.files[0]
  if (file && file.name.endsWith('.sqd')) {
    try {
      layout = DBLayoutWeb.fromSiQAD(await file.text())
      console.log(layout)
      putAllDBsArraysIntoOneArray(DB_mesh)
    } catch (err) {
      el.value = ''
      alert('Error parsing file, see console for more info.')
      console.error(err)
    }
  } else {
    alert('Invalid file, please provide a valid SiQAD file.')
  }
}

async function joinDBArray (DB_Array) {
  let DB_list = []
  for (let i = 0; i < DB_Array.length; i++) {
    DB_list.push({
      color: DB_mesh.fixed[i].color,
      index: DB_mesh.fixed[i].index,
      l: DB_mesh.fixed[i].l,
      m: DB_mesh.fixed[i].m,
      n: DB_mesh.fixed[i].n
    })
  }
  return DB_list
}

async function putAllDBsArraysIntoOneArray (DB_mesh) {
  let DB_list = []
  DB_list.push(joinDBArray(DB_mesh.inputs))
  DB_list.push(joinDBArray(DB_mesh.outputs))
  DB_list.push(joinDBArray(DB_mesh.inner))
  DB_list.push(joinDBArray(DB_mesh.fixed))
  console.log(DB_list)
  return DB_list
}
