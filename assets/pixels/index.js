new EventSource('/esbuild').addEventListener('change', () => location.reload());
"use strict";
(() => {
  // app.ts
  function createTr(h) {
    const tr = document.createElement("tr");
    tr.style.height = h;
    return tr;
  }
  function createTd(w) {
    const td = document.createElement("td");
    td.style.width = w;
    return td;
  }
  function transpose(matrix) {
    return matrix[0].map((_, c) => matrix.map((_2, r) => matrix[r][c]));
  }
  function base64urlEncode(str) {
    return window.btoa(str).replace(/\//g, "_").replace(/\+/g, "-");
  }
  function base64urlDecode(str) {
    return window.atob(str.replace("-", "+").replace("_", "/"));
  }
  function decode(str) {
    const all = str.split("").flatMap((x) => {
      const r = [];
      for (let i = 0; i < 8; ++i) {
        r[i] = (x.charCodeAt(0) & 1 << i) !== 0;
      }
      return r;
    });
    const size = Math.floor(Math.sqrt(all.length));
    return Array(size).fill([]).map((_, x) => Array(size).fill([]).map((_2, y) => all[y + x * size]));
  }
  function encode(pixels) {
    const buffer = new Uint8Array(Math.ceil(pixels[0].length * pixels[0].length / 8));
    pixels.flat().forEach((x, i) => {
      buffer[Math.floor(i / 8)] |= (x ? 1 : 0) << i % 8;
    });
    return base64urlEncode(String.fromCharCode(...buffer));
  }
  function fillData(pixels) {
    const pre = document.querySelector("#dataspace pre");
    const transposed = transpose(pixels);
    pre.textContent = transposed.map((ys, y) => ys.map((v, x) => v ? `(${x},${y})` : "").filter((v) => v).join(" ")).filter((v) => v).join("\n");
    const save = document.querySelector("#save");
    const encoded = encode(pixels);
    save.href = encoded;
    save.textContent = encoded;
  }
  function buildTable(pixels) {
    const count = pixels.length;
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.height = "100%";
    const tr = createTr(`${100 / (count + 1)}%`);
    for (let i = 0; i <= count; ++i) {
      const td = createTd(`${100 / (count + 1)}%`);
      tr.appendChild(td);
      if (i > 0) {
        td.textContent = `${i - 1}`;
      }
    }
    table.appendChild(tr);
    for (let j = 0; j < count; ++j) {
      const tr2 = createTr(`${100 / (count + 1)}%`);
      for (let i = 0; i <= count; ++i) {
        const td = createTd(`${100 / (count + 1)}%`);
        tr2.appendChild(td);
        if (i == 0) {
          td.textContent = `${j}`;
        } else {
          td.style.backgroundColor = pixels[i - 1][j] ? "black" : "white";
          td.onclick = () => {
            pixels[i - 1][j] = !pixels[i - 1][j];
            td.style.backgroundColor = pixels[i - 1][j] ? "black" : "white";
            fillData(pixels);
          };
        }
      }
      table.appendChild(tr2);
    }
    fillData(pixels);
    return table;
  }
  async function main() {
    const tablespace = document.querySelector("#tablespace");
    const button = document.querySelector("#make");
    let pixels = [];
    const image = window.location.pathname.split("/").slice(-1)[0];
    if (image) {
      pixels = decode(base64urlDecode(image));
    } else {
      const size = 10;
      pixels = Array(size).fill([]).map(() => Array(size).fill(false));
    }
    tablespace.innerHTML = "";
    tablespace.appendChild(buildTable(pixels));
    button.onclick = () => {
      const countinput = document.querySelector("#count");
      const size = parseInt(countinput.value);
      pixels = Array(size).fill([]).map(() => Array(size).fill(false));
      tablespace.innerHTML = "";
      tablespace.appendChild(buildTable(pixels));
    };
  }
  (() => main())();
})();
//# sourceMappingURL=index.js.map
