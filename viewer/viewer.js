function svg2blob(nSvg) {
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");

  bg.setAttribute("x", nSvg.viewBox.baseVal.x);
  bg.setAttribute("y", nSvg.viewBox.baseVal.y);
  bg.setAttribute("width", nSvg.viewBox.baseVal.width);
  bg.setAttribute("height", nSvg.viewBox.baseVal.height);
  bg.setAttribute("fill", "#28323c");

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.innerHTML = `
          .db {
            fill: #c8c8c8;
            stroke: #fefefd;
            stroke-width: 0.25;
          }
          .dot {
            fill: #5b626a;
            stroke: none;
          }`;
  nSvg.prepend(style, bg);

  var svg = new Blob([nSvg.outerHTML], {
    type: "image/svg+xml;charset=utf-8",
  });
  return svg;
}

function downloadSvg(nSvg, name) {
  let svg = svg2blob(nSvg);

  var canvas = document.createElement("canvas");
  canvas.width = nSvg.viewBox.baseVal.width * 10;
  canvas.height = nSvg.viewBox.baseVal.height * 10;
  var ctx = canvas.getContext("2d");

  var url = URL.createObjectURL(svg);
  var img = new Image();
  img.onload = function () {
    // draw it to the canvas
    ctx.drawImage(this, 0, 0);
    URL.revokeObjectURL(url);

    let a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = name + ".png";
    a.target = "_blank";
    a.click();
  };
  img.src = url;
}

function openBlob(blob) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 10);
}

function ind2DB(ind) {
  const w = ind.preview.split("\n")[0].trim().split(" ").length;
  const h = ind.preview.split("\n").length;
  return ind.gc
    .split("")
    .map(
      (el, i) =>
        +el && {
          n: i % w,
          m: Math.floor(i / w),
          l: el - 1,
        }
    )
    .filter((e) => e);
}

function db2Drawing(dbs) {
  const min = {
    n: dbs.reduce((acc, db) => Math.min(db.n, acc), dbs[0].n),
    m: dbs.reduce((acc, db) => Math.min(db.m, acc), dbs[0].m),
  };
  return {
    width:
      (dbs.reduce((acc, db) => Math.max(db.n, acc), dbs[0].n) - min.n) * 3.84,
    height:
      (dbs.reduce((acc, db) => Math.max(db.m, acc), dbs[0].m) - min.m) * 7.68 +
      2.25,
    items: dbs.map((db) => ({
      x: (db.n - min.n) * 3.84,
      y: (db.m - min.m) * 7.68 + db.l * 2.25,
      color: "#" + db.color.substring(3),
    })),
  };
}

function ind2Drawing(ind) {
  const w = ind.preview.split("\n")[0].trim().split(" ").length;
  const h = ind.preview.split("\n").length;
  return {
    width: (w - 1) * 3.84,
    height: (h - 1) * 7.68 + 2.25,
    items: ind.gc.split("").flatMap((el, i) =>
      [0, 1].map((k) => ({
        x: (i % w) * 3.84,
        y: Math.floor(i / w) * 7.68 + k * 2.25,
        db: k + 1 === +el,
      }))
    ),
  };
}
