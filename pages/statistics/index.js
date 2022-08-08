var $ = document.querySelector.bind(document);

var chart = new Chart($("#chart"), {
  type: "line",
  options: {
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: "Generations",
        },
      },
      y: {
        title: {
          display: true,
          text: "Fitness",
        },
        suggestedMin: 0,
        suggestedMax: 1,
      },
    },
  },
});

var layout = null;
var statistics = [];
var cursor = 0;

$("#svg").onclick = function zoomIn() {
  if (cursor >= statistics.length) return;

  const nSvg = this.cloneNode(true);
  let svg = svg2blob(nSvg);
  openBlob(svg);
};

async function change(el) {
  /** @type {File} **/
  let file = el.files[0];
  if (file && file.type == "application/json") {
    let content;
    try {
      content = JSON.parse(await file.text());
    } catch (err) {
      el.value = "";
      alert("Error parsing file, see console for more info.");
      console.error(err);
    }
    statistics = content;
    loadChart();
    loadIndividuals();
  } else {
    alert("Invalid file, please provide a valid statistics.json.");
  }
}

function loadChart() {
  chart.data = {
    labels: Array(statistics.length)
      .fill(0)
      .map((_, i) => i + 1),
    datasets: [
      ["minFitness", "red"],
      ["avgFitness", "blue"],
      ["bestFitness", "green"],
    ].map(([label, borderColor]) => ({
      label,
      data: statistics.map((s) => s[label]),
      fill: false,
      borderColor,
      tension: 0,
    })),
  };
  chart.update();
}

function loadIndividuals() {
  $("#ind").innerText = "-";
  $("#fit").innerText = "-";
  $("#cur").innerText = "-";

  cursor = statistics.length;
  prev();
}

function showIndividual() {
  if (cursor >= statistics.length) return;
  const f = statistics[cursor].bestFitness;
  const ind = statistics[cursor].bestIndividual;
  $("#ind").innerText = ind.id;
  $("#fit").innerText = f;
  $("#cur").innerText = `${cursor + 1} / ${statistics.length}`;
  if (!layout) draw($("#svg"), ind2Drawing(ind));
  else {
    layout.setInner(
      createInnerDBs(
        ind2DB(ind).map((db) => ({
          n: db.n + layout.area.n.min,
          m: db.m + layout.area.m.min,
          l: db.l,
        }))
      )
    );
    drawSparse(
      $("#svg"),
      db2Drawing(
        layout.getLayoutForGivenInput(Array(layout.inputs.length).fill(1))
      )
    );
  }
}

function first() {
  if (statistics.length) {
    cursor = 0;
    showIndividual();
  }
}
function prev() {
  if (cursor >= 0) {
    cursor--;
    showIndividual();
  }
}

function next() {
  if (cursor < statistics.length) {
    cursor++;
    showIndividual();
  }
}
function last() {
  if (statistics.length) {
    cursor = statistics.length - 1;
    showIndividual();
  }
}

function draw(svg, gc) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `-3 -3 ${gc.width + 6} ${gc.height + 6}`);
  for (let el of gc.items) {
    const c = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    c.setAttribute("class", el.db ? "db" : "dot");
    c.setAttribute("cx", el.x);
    c.setAttribute("cy", el.y);
    c.setAttribute("r", el.db ? 0.9 : 0.4);
    svg.appendChild(c);
  }
}

function drawSparse(svg, gc) {
  const dotSize = (gc.width + gc.height) * 0.005;
  svg.innerHTML = "";

  svg.setAttribute(
    "viewBox",
    `-${dotSize * 2} -${dotSize * 2} ${gc.width + dotSize * 4} ${
      gc.height + dotSize * 4
    }`
  );
  for (let el of gc.items) {
    const c = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    c.setAttribute("fill", el.color);
    c.setAttribute("stroke", "#fefefd");
    c.setAttribute("stroke-width", 0.278 * dotSize);
    c.setAttribute("cx", el.x);
    c.setAttribute("cy", el.y);
    c.setAttribute("r", dotSize);
    svg.appendChild(c);
  }
}

async function loadSiqad(el) {
  /** @type {File} **/
  let file = el.files[0];
  if (file && file.name.endsWith(".sqd")) {
    try {
      layout = DBLayoutWeb.fromSiQAD(await file.text());
      console.log(layout)
      showIndividual();
    } catch (err) {
      el.value = "";
      alert("Error parsing file, see console for more info.");
      console.error(err);
    }
  } else {
    alert("Invalid file, please provide a valid SiQAD file.");
  }
}

function unloadSiqad() {
  layout = null;
  $("#siqad").value = "";
  showIndividual();
}

function download() {
  if (cursor >= statistics.length) return;

  const nSvg = $("#svg").cloneNode(true);
  downloadSvg(nSvg, statistics[cursor].bestIndividual.id);
}