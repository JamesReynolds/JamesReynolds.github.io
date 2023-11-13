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
  function capitalizeFirstLetterOnly(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  var image = [];
  function fillData() {
    const save = document.querySelector("#save");
    const encoded = image.map(({ colour, pixels }) => `${colour}=${encode(pixels)}`);
    save.href = "?" + encoded.join("&");
    save.textContent = "Image link";
    const pre = document.querySelector("#dataspace pre");
    const texts = image.map(({ colour, pixels }) => ({ colour, text: transpose(pixels).map((ys, y) => ys.map((v, x) => v ? `(${x},${y})` : "").filter((v) => v).join(" ")).filter((v) => v).join("\n") }));
    if (texts.length === 1) {
      pre.textContent = texts[0].text;
    } else {
      pre.textContent = texts.map(({ colour, text }) => `${capitalizeFirstLetterOnly(colour)}:
${text}`).join("\n\n");
    }
  }
  function buildTable() {
    var _a;
    const count = image[0].pixels.length;
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
          td.style.backgroundColor = ((_a = image.find(({ pixels }) => pixels[i - 1][j])) === null || _a === void 0 ? void 0 : _a.colour) || "white";
          td.onclick = () => {
            var _a2;
            const index = image.findIndex(({ pixels }) => pixels[i - 1][j]);
            if (index !== -1) {
              image[index].pixels[i - 1][j] = false;
            }
            if (index + 1 < image.length) {
              image[index + 1].pixels[i - 1][j] = true;
            }
            td.style.backgroundColor = ((_a2 = image[index + 1]) === null || _a2 === void 0 ? void 0 : _a2.colour) || "white";
            fillData();
          };
        }
      }
      table.appendChild(tr2);
    }
    fillData();
    return table;
  }
  function htmlToElement(html) {
    const template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    const child = template.content.firstChild;
    return child;
  }
  function drawColourControls(colours) {
    const colourControls = document.querySelector("#colour_controls");
    colourControls.innerHTML = "";
    for (const { colour } of image) {
      colourControls.appendChild(htmlToElement(`
            <div class="colour">
                <label for="${colour}">${capitalizeFirstLetterOnly(colour)} </label><button type="button">Remove</button>
            </div>
        `));
    }
    colourControls.querySelectorAll("button").forEach((button, idx) => {
      const colour = image[idx].colour;
      button.onclick = () => {
        if (image.length > 1) {
          const thisColour = colour;
          const index = image.findIndex(({ colour: colour2 }) => colour2 === thisColour);
          const value = image[index];
          image[index] = image[image.length - 1];
          image.length -= 1;
          value.pixels.forEach((xs, i) => xs.forEach((v, j) => {
            if (v) {
              image[0].pixels[i][j] = true;
            }
          }));
          drawColourControls(colours);
          drawImage();
        }
      };
    });
    const otherColours = colours.filter((x) => image.find(({ colour }) => x === colour) === void 0).map((x) => `<option value="${x}">${capitalizeFirstLetterOnly(x)}</option>`);
    colourControls.appendChild(htmlToElement(`<select name="colours" id="colours">
        <option value="" disabled selected style="display:none;">Add new colour</option>
        ${otherColours}
        </select>
    `));
    const selector = colourControls.querySelector("select");
    selector.onchange = () => {
      const colour = selector.value;
      const size = image[0].pixels.length;
      image.push({ colour, pixels: Array(size).fill([]).map(() => Array(size).fill(false)) });
      drawImage();
      drawColourControls(colours);
    };
  }
  function drawImage() {
    const tablespace = document.querySelector("#tablespace");
    tablespace.innerHTML = "";
    tablespace.appendChild(buildTable());
  }
  async function main() {
    const colours = ["black", "red", "blue", "green", "yellow", "orange", "purple", "brown"];
    const query = window.location.search.slice(1).split("&").map((x) => [...x.split("="), ""].slice(0, 2)).filter(([x]) => x);
    image.length = 0;
    if (query.length > 0) {
      for (const [colour, data] of query) {
        image.push({ colour, pixels: decode(base64urlDecode(data)) });
      }
    } else {
      const size = 10;
      for (const colour of colours.slice(4)) {
        image.push({ colour, pixels: Array(size).fill([]).map(() => Array(size).fill(false)) });
      }
    }
    drawColourControls(colours);
    drawImage();
    const button = document.querySelector("#make");
    button.onclick = () => {
      const countinput = document.querySelector("#count");
      const size = parseInt(countinput.value);
      const colours2 = image.map(({ colour }) => colour);
      image.length = 0;
      for (const colour of colours2) {
        image.push({ colour, pixels: Array(size).fill([]).map(() => Array(size).fill(false)) });
      }
      drawImage();
    };
  }
  (() => main())();
})();
//# sourceMappingURL=index.js.map
