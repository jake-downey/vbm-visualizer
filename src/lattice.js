export function initLattice() {
  "use strict";
  const canvas = document.getElementById("view"),
    ctx = canvas.getContext("2d");
  const ids = [
    "xy",
    "xz",
    "yz",
    "z",
    "y",
    "x",
    "extent",
    "radius",
    "opacity",
    "labels",
    "axes",
    "wireCube",
    "greenOnly",
    "f0",
    "f1",
    "f2",
    "dual",
    "dualLabels",
    "xyOffsets",
    "xzOffsets",
    "yzOffsets",
    "df0",
    "df1",
    "df2",
    "cubes",
    "octa",
    "tetra",
    "diagGreen",
    "diagRed",
    "diagBlue",
    "diagOpacity",
    "numberSize",
    "showSpace",
    "cubeXY",
    "cubeXZ",
    "cubeYZ",
    "axisXY",
    "axisXZ",
    "axisYZ",
    "axisXYAll",
    "axisXZAll",
    "axisYZAll",
    "halfXY",
    "halfXZ",
    "halfYZ",
    "vectorMode",
    "showLoop",
    "split2D",
    "inspectPointsOn",
    "inspectPlanesOn",
    "multiVector",
    "multiPoints",
    "multiPlanes",
  ];
  const el = Object.fromEntries(
    ids.map((k) => [k, document.getElementById(k)]),
  );
  const info = document.getElementById("info");
  const C = ["#49d794", "#ff686b", "#64aaff"];
  const START_YAW = 0.62,
    START_PITCH = 0.72;
  let yaw = START_YAW,
    pitch = START_PITCH,
    zoom = 1,
    panX = 0,
    panY = 0,
    W = 0,
    H = 0,
    dpr = 1,
    hits = [],
    autoFit = true;
  let selectedVectors = [],
    vectorBase = [0, 0, 0],
    vectorYaw = 0.62,
    vectorPitch = 0.72,
    vectorHits = [];
  const VECTOR_COLORS = [
    "#ffe348",
    "#52d6f5",
    "#ff80c2",
    "#a5ef72",
    "#ffab57",
    "#bba0ff",
    "#ff6f6f",
    "#76e6c5",
  ];
  const vectorCanvas = document.getElementById("vectorCanvas"),
    vectorCtx = vectorCanvas.getContext("2d");
  const vectorWindow = document.getElementById("vectorWindow"),
    vectorStatus = document.getElementById("vectorStatus");
  const slicePanel = document.getElementById("slicePanel"),
    planeGallery = document.getElementById("planeGallery");
  let selectedPlanes = [],
    planeHits = [],
    selectedPoints = [],
    inspectorTab = "planes";
  const pointDetails = document.getElementById("pointDetails"),
    loopDetails = document.getElementById("loopDetails");
  const mod = (n) => ((n % 9) + 9) % 9;
  const latticeValue = (x, y, z) => mod(x + 4 * y + 7 * z);
  const dualOffsets = { xy: 2, xz: 5, yz: 8 };
  const counterValue = (family, x, y, z) =>
    mod(8 * x + 5 * y + 2 * z + dualOffsets[family]);
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (autoFit) fitCube();
    render();
  }
  function project(x, y, z) {
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const a = cy * x + sy * y,
      b = -sy * x + cy * y;
    const vertical = cp * z + sp * b,
      depth = sp * z - cp * b;
    const unit = Math.min(W, H) * 0.13 * zoom;
    const perspective = 8 / (8 - depth * 0.22);
    return {
      sx: W / 2 + panX + a * unit * perspective,
      sy: H / 2 + panY - vertical * unit * perspective,
      depth,
      r: unit * perspective,
    };
  }
  function line(a, b, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function polygon(corners, color) {
    ctx.beginPath();
    corners.forEach((p, i) =>
      i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color.replace(/,\s*0?\.\d+\)/, ", .5)");
    ctx.stroke();
  }
  // Fit the extent cube into the canvas area clear of the control panel.
  function fitCube() {
    if (!W || !H) return;
    zoom = 1;
    panX = panY = 0;
    const bound = Math.max(+el.extent.value + 0.35, 0.7),
      corners = [];
    for (const x of [-bound, bound])
      for (const y of [-bound, bound])
        for (const z of [-bound, bound]) corners.push(project(x, y, z));
    const xs = corners.map((p) => p.sx),
      ys = corners.map((p) => p.sy),
      left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    const controls = document.getElementById("controlPanel"),
      panelWidth =
        controls.getBoundingClientRect().width ||
        (controls.classList.contains("collapsed") ? 85 : 285),
      clearRight = Math.max(W * 0.48, W - panelWidth - 28),
      margin = Math.min(38, Math.max(14, Math.min(W, H) * 0.05));
    zoom = Math.min(
      1.3,
      (clearRight - 2 * margin) / (right - left),
      (H - 2 * margin) / (bottom - top),
    );
    zoom = Math.max(0.05, zoom);
    panX = (clearRight - W) / 2 - zoom * ((left + right) / 2 - W / 2);
    panY = -zoom * ((top + bottom) / 2 - H / 2);
  }
  function onGreenDiagonal(x, y, z, n) {
    const sum = Math.round(x + y + z);
    return mod(sum) % 3 === 0 && Math.abs(sum) < 3 * Math.max(n, 0.5);
  }
  const vectorTargets = [];
  for (const a of [-0.5, 0.5])
    for (const b of [-0.5, 0.5]) {
      vectorTargets.push({ p: [a, b, 0], kind: "face" });
      vectorTargets.push({ p: [a, 0, b], kind: "face" });
      vectorTargets.push({ p: [0, a, b], kind: "face" });
    }
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const p = [0, 0, 0];
      p[axis] = sign;
      vectorTargets.push({ p, kind: "axis" });
    }
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1])
        vectorTargets.push({ p: [x, y, z], kind: "corner" });
  function arrow(context, a, b, width, color = "#ffe348") {
    const dx = b.sx - a.sx,
      dy = b.sy - a.sy,
      L = Math.hypot(dx, dy);
    if (L < 1) return;
    const ux = dx / L,
      uy = dy / L,
      tip = Math.min(16, Math.max(9, L * 0.18));
    context.save();
    context.lineCap = "round";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = color === "#ffe348" ? 10 : 0;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(a.sx, a.sy);
    context.lineTo(b.sx - ux * tip * 0.58, b.sy - uy * tip * 0.58);
    context.stroke();
    context.beginPath();
    context.moveTo(b.sx, b.sy);
    context.lineTo(
      b.sx - ux * tip - uy * tip * 0.42,
      b.sy - uy * tip + ux * tip * 0.42,
    );
    context.lineTo(
      b.sx - ux * tip + uy * tip * 0.42,
      b.sy - uy * tip - ux * tip * 0.42,
    );
    context.closePath();
    context.fill();
    context.restore();
  }
  function arrowPieces(
    context,
    projector,
    base,
    direction,
    width,
    head = true,
    color = "#ffe348",
    parts = 24,
    opacity = 1,
  ) {
    const length = Math.hypot(...direction),
      endFactor = Math.max(0, 1 - 0.11 / length),
      pieces = [];
    for (let j = 0; j < parts; j++) {
      const t0 = (endFactor * j) / parts,
        t1 = (endFactor * (j + 1)) / parts;
      const a = projector(base.map((v, i) => v + direction[i] * t0)),
        b = projector(base.map((v, i) => v + direction[i] * t1));
      pieces.push({
        depth: (a.depth + b.depth) / 2,
        type: "vector",
        draw: () => {
          context.save();
          context.globalAlpha = opacity;
          if (j === parts - 1 && head) arrow(context, a, b, width, color);
          else if (context === ctx) line(a, b, color, width);
          else vectorLine(a, b, color, width);
          context.restore();
        },
      });
    }
    return pieces;
  }
  function vectorLine(a, b, color, width) {
    vectorCtx.beginPath();
    vectorCtx.moveTo(a.sx, a.sy);
    vectorCtx.lineTo(b.sx, b.sy);
    vectorCtx.strokeStyle = color;
    vectorCtx.lineWidth = width;
    vectorCtx.stroke();
  }
  function renderCompass() {
    if (!el.vectorMode.checked) return;
    const cw = vectorCanvas.clientWidth || 294,
      ch = vectorCanvas.clientHeight || 288,
      scale = Math.min(devicePixelRatio || 1, 2);
    vectorCanvas.width = Math.round(cw * scale);
    vectorCanvas.height = Math.round(ch * scale);
    vectorCtx.setTransform(scale, 0, 0, scale, 0, 0);
    vectorCtx.fillStyle = "#101823";
    vectorCtx.fillRect(0, 0, cw, ch);
    const cy = Math.cos(vectorYaw),
      sy = Math.sin(vectorYaw),
      cp = Math.cos(vectorPitch),
      sp = Math.sin(vectorPitch);
    const proj = (p) => {
      const a = cy * p[0] + sy * p[1],
        b = -sy * p[0] + cy * p[1],
        v = cp * p[2] + sp * b,
        d = sp * p[2] - cp * b,
        q = 5 / (5 - d * 0.28);
      return { sx: cw / 2 + a * 83 * q, sy: ch / 2 - v * 83 * q, depth: d };
    };
    const objects = [],
      corners = [];
    for (const x of [-1, 1])
      for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z]);
    for (let a = 0; a < corners.length; a++)
      for (let b = a + 1; b < corners.length; b++) {
        if (corners[a].filter((v, i) => v !== corners[b][i]).length !== 1)
          continue;
        const p = proj(corners[a]),
          q = proj(corners[b]);
        objects.push({
          depth: (p.depth + q.depth) / 2,
          type: "wire",
          draw: () => vectorLine(p, q, "#65758d", 1.35),
        });
      }
    for (const [axis, color] of [
      [0, "#ed8585"],
      [1, "#88dca4"],
      [2, "#89b8ef"],
    ]) {
      const start = [0, 0, 0],
        end = [0, 0, 0];
      start[axis] = -1.32;
      end[axis] = 1.32;
      const p = proj(start),
        q = proj(end);
      objects.push({
        depth: (p.depth + q.depth) / 2,
        type: "wire",
        draw: () => vectorLine(p, q, color, 1.8),
      });
    }
    for (const target of vectorTargets)
      objects.push(
        ...arrowPieces(
          vectorCtx,
          proj,
          [0, 0, 0],
          target.p,
          1.2,
          true,
          "#97a4b5",
          8,
          0.6,
        ).map((piece) => ({ ...piece, type: "ray" })),
      );
    const nodes = [{ p: [0, 0, 0], kind: "origin" }, ...vectorTargets];
    vectorHits = [];
    for (const node of nodes) {
      const screen = proj(node.p),
        { sx, sy } = screen,
        r = node.kind === "origin" ? 8 : node.kind === "face" ? 7 : 9;
      objects.push({
        depth: screen.depth,
        type: "sphere",
        draw: () => {
          const color =
            node.kind === "face"
              ? "#eef2f8"
              : node.kind === "origin"
                ? C[0]
                : C[latticeValue(...node.p) % 3];
          const g = vectorCtx.createRadialGradient(
            sx - r * 0.3,
            sy - r * 0.4,
            1,
            sx,
            sy,
            r,
          );
          g.addColorStop(0, "white");
          g.addColorStop(0.42, color);
          g.addColorStop(1, "#26354a");
          vectorCtx.fillStyle = g;
          vectorCtx.beginPath();
          vectorCtx.arc(sx, sy, r, 0, Math.PI * 2);
          vectorCtx.fill();
          const chosen = selectedVectors.find((v) =>
            v.p.every((value, i) => value === node.p[i]),
          );
          if (chosen) {
            vectorCtx.strokeStyle = chosen.color;
            vectorCtx.lineWidth = 2.8;
            vectorCtx.stroke();
          }
        },
      });
      if (node.kind !== "origin") vectorHits.push({ ...screen, p: node.p, r });
    }
    for (const selected of selectedVectors)
      objects.push(
        ...arrowPieces(
          vectorCtx,
          proj,
          [0, 0, 0],
          selected.p,
          4.6,
          true,
          selected.color,
        ),
      );
    objects.sort(
      (a, b) =>
        a.depth - b.depth ||
        { wire: 0, ray: 1, vector: 2, sphere: 3 }[a.type] -
          { wire: 0, ray: 1, vector: 2, sphere: 3 }[b.type],
    );
    for (const object of objects) object.draw();
    for (const [axis, label, color] of [
      [0, "X", "#ffaaaa"],
      [1, "Y", "#a8eebd"],
      [2, "Z", "#aaceff"],
    ]) {
      const p = [0, 0, 0];
      p[axis] = 1.42;
      const q = proj(p);
      vectorCtx.font = "bold 13px system-ui";
      vectorCtx.fillStyle = color;
      vectorCtx.fillText(label, q.sx - 4, q.sy + 4);
    }
  }
  // Each component lives in R/9Z. A half-unit step has order 18; a unit step has order 9.
  function vectorOrder(direction) {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const lcm = (a, b) => (a * b) / gcd(a, b);
    return direction.reduce((order, v) => {
      const step = Math.round(Math.abs(v) * 2);
      return step ? lcm(order, 18 / gcd(18, step)) : order;
    }, 1);
  }
  function wrappedPoint(p) {
    return p.map((v) => v - 9 * Math.floor((v + 4.5) / 9));
  }
  function torusPath(base, direction) {
    const segments = [],
      seams = [],
      firstStep = [],
      order = vectorOrder(direction);
    for (let i = 0; i < order; i++) {
      const a = base.map((v, j) => v + i * direction[j]),
        ts = [0, 1];
      for (let axis = 0; axis < 3; axis++) {
        const d = direction[axis];
        if (Math.abs(d) < 1e-9) continue;
        const lo = Math.min(a[axis], a[axis] + d),
          hi = Math.max(a[axis], a[axis] + d);
        for (let k = Math.ceil((lo - 4.5) / 9); k <= (hi - 4.5) / 9; k++) {
          const boundary = 4.5 + 9 * k,
            t = (boundary - a[axis]) / d;
          if (t > 1e-8 && t < 1 - 1e-8) ts.push(t);
        }
      }
      ts.sort((x, y) => x - y);
      const split = ts.filter(
        (t, j) => j === 0 || Math.abs(t - ts[j - 1]) > 1e-8,
      );
      for (let j = 0; j < split.length - 1; j++) {
        const t0 = split[j],
          t1 = split[j + 1],
          middle = (t0 + t1) / 2,
          shift = a.map(
            (v, axis) =>
              9 * Math.floor((v + direction[axis] * middle + 4.5) / 9),
          );
        const p = a.map((v, axis) => v + direction[axis] * t0 - shift[axis]),
          q = a.map((v, axis) => v + direction[axis] * t1 - shift[axis]);
        segments.push([p, q]);
        if (i === 0) firstStep.push([p, q]);
        if (j > 0) seams.push(p);
      }
    }
    return { order, segments, seams, firstStep };
  }
  // Geometry stays on the 9-unit torus; this only clips what is drawn.
  function clipSegment(start, end, bound) {
    let lo = 0,
      hi = 1;
    for (let axis = 0; axis < 3; axis++) {
      const d = end[axis] - start[axis];
      if (Math.abs(d) < 1e-10) {
        if (start[axis] < -bound || start[axis] > bound) return null;
        continue;
      }
      const a = (-bound - start[axis]) / d,
        b = (bound - start[axis]) / d;
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
      if (lo > hi + 1e-10) return null;
    }
    if (hi - lo < 1e-9) return null;
    return [
      start.map((v, i) => v + (end[i] - v) * lo),
      start.map((v, i) => v + (end[i] - v) * hi),
    ];
  }
  function pathObjects(path, bound, color) {
    const out = [],
      projector = (p) => project(...p);
    for (const segment of path.segments) {
      const clipped = clipSegment(...segment, bound);
      if (!clipped) continue;
      const [start, end] = clipped,
        length = Math.hypot(...start.map((v, i) => end[i] - v)),
        parts = Math.max(1, Math.ceil(length / 0.2));
      for (let j = 0; j < parts; j++) {
        const a = start.map((v, i) => v + ((end[i] - v) * j) / parts),
          b = start.map((v, i) => v + ((end[i] - v) * (j + 1)) / parts),
          pa = projector(a),
          pb = projector(b);
        out.push({
          depth: (pa.depth + pb.depth) / 2,
          type: "loop",
          draw: () => line(pa, pb, color, 3.5),
        });
      }
    }
    for (const p of path.seams) {
      if (p.some((v) => Math.abs(v) > bound + 1e-8)) continue;
      const q = projector(p);
      out.push({
        depth: q.depth,
        type: "loop",
        draw: () => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(q.sx, q.sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
    return out;
  }
  function showInspector(tab) {
    inspectorTab = tab;
    el.split2D.checked = true;
    slicePanel.hidden = false;
    document.body.classList.add("split");
    for (const key of ["points", "lines", "planes"]) {
      document.getElementById(
        "inspect" + key[0].toUpperCase() + key.slice(1),
      ).hidden = key !== tab;
      document
        .querySelector(`[data-inspector="${key}"]`)
        .classList.toggle("active", key === tab);
    }
    resize();
    if (tab === "lines") renderCompass();
  }
  function pointCircle(value, counter) {
    return `<span class="inspect-circle" style="--circle:${counter ? "#f1f1ed" : C[value % 3]};--inspect-font:${Math.max(12, Math.min(20, +el.numberSize.value + 5))}px">${value}</span>`;
  }
  function renderPointInspector() {
    if (!el.inspectPointsOn.checked) {
      pointDetails.innerHTML = "";
      return;
    }
    if (!selectedPoints.length) {
      pointDetails.innerHTML = "Click a sphere in the 3D view.";
      return;
    }
    pointDetails.innerHTML = selectedPoints
      .map((p) => {
        const coords = `(${p.x}, ${p.y}, ${p.z})`,
          description = p.counter
            ? `${p.family.toUpperCase()} counterspace · 8x + 5y + 2z + ${dualOffsets[p.family]} mod 9`
            : "Space · x + 4y + 7z mod 9";
        return `<div class="point-card">${pointCircle(p.value, !!p.counter)}<div class="inspect-grid"><strong>Coordinates:</strong> ${coords}<br><strong>VBM value:</strong> ${p.value}<br><strong>Family:</strong> F${p.value % 3}<br>${description}</div></div>`;
      })
      .join("");
  }
  function renderLoopInspector() {
    if (!el.vectorMode.checked) {
      loopDetails.innerHTML = "";
      return;
    }
    if (!selectedVectors.length) {
      loopDetails.innerHTML =
        "Choose a sphere in the vector compass to see its sequence.";
      return;
    }
    if (!el.showLoop.checked) {
      loopDetails.innerHTML =
        "Turn on Show repeated loop to see the numbered paths.";
      return;
    }
    const available =
        loopDetails.clientWidth || slicePanel.clientWidth - 36 || 360,
      capacity = Math.max(1, Math.floor((available - 30) / 40)),
      blocks = [];
    for (const selected of selectedVectors) {
      const direction = selected.p,
        order = vectorOrder(direction),
        start = wrappedPoint(vectorBase),
        items = [];
      for (let i = 0; i < order; i++) {
        const p = wrappedPoint(start.map((v, j) => v + i * direction[j])),
          half = p.map((v) => Math.abs(v - Math.round(v)) > 0.1),
          family =
            half[0] && half[1]
              ? "xy"
              : half[0] && half[2]
                ? "xz"
                : half[1] && half[2]
                  ? "yz"
                  : null,
          value = family
            ? counterValue(family, ...p.map(Math.floor))
            : latticeValue(...p);
        items.push(
          `<div class="loop-node" title="step ${i}: (${p.join(", ")})">${pointCircle(value, !!family)}<small>${i}</small></div>`,
        );
      }
      const split = order > capacity,
        rows = split
          ? [
              items.slice(0, Math.ceil(order / 2)),
              items.slice(Math.ceil(order / 2)),
            ]
          : [items];
      if (split)
        while (rows[1].length < rows[0].length)
          rows[1].push('<div class="loop-node" aria-hidden="true"></div>');
      blocks.push(
        `<div class="loop-block"><h3 class="loop-heading"><span class="loop-swatch" style="--vector-color:${selected.color}"></span>(${direction.join(", ")}) · ${order} steps</h3><div class="hint">From (${vectorBase.join(", ")}) · axes wrap mod 9</div>${rows.map((row, i) => `${i ? '<div class="loop-wrap">↳ continues below</div>' : ""}<div class="loop-row">${row.join("")}</div>`).join("")}<div class="hint">↩ returns to step 0</div></div>`,
      );
    }
    loopDetails.innerHTML = blocks.join("");
  }
  function highlightPlane(vertices) {
    if (vertices.length < 3) return;
    ctx.beginPath();
    vertices.forEach((p, i) =>
      i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy),
    );
    ctx.closePath();
    ctx.fillStyle = "rgba(255,222,54,.3)";
    ctx.fill();
    ctx.strokeStyle = "#ffe348";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.sy > y !== b.sy > y &&
        x < ((b.sx - a.sx) * (y - a.sy)) / (b.sy - a.sy) + a.sx
      )
        inside = !inside;
    }
    return inside;
  }
  function selectSlice(meta) {
    if (!el.inspectPlanesOn.checked) return;
    const key = meta.kind + ":" + meta.k,
      index = selectedPlanes.findIndex((p) => p.kind + ":" + p.k === key);
    if (index >= 0) selectedPlanes.splice(index, 1);
    else {
      if (!el.multiPlanes.checked) selectedPlanes = [];
      selectedPlanes.push({ kind: meta.kind, k: meta.k });
    }
    showInspector("planes");
  }
  function slicePoints(sel) {
    const n = +el.extent.value,
      points = [];
    const match = (x, y, z) =>
      sel.kind === "diag"
        ? Math.abs(x + y + z - sel.k) < 1e-8
        : Math.abs({ xy: z, xz: y, yz: x }[sel.kind] - sel.k) < 1e-8;
    const add = (x, y, z, value, counter) => {
      if (!match(x, y, z)) return;
      let u, v;
      if (sel.kind === "xy") {
        u = x;
        v = y;
      } else if (sel.kind === "xz") {
        u = x;
        v = z;
      } else if (sel.kind === "yz") {
        u = y;
        v = z;
      } else {
        u = (x - y) / Math.SQRT2;
        v = (x + y - 2 * z) / Math.sqrt(6);
      }
      points.push({ u, v, value, counter, x, y, z });
    };
    for (let x = -n; x <= n; x++)
      for (let y = -n; y <= n; y++)
        for (let z = -n; z <= n; z++)
          add(x, y, z, latticeValue(x, y, z), false);
    for (let x = Math.min(-n, -1); x <= n; x++)
      for (let y = Math.min(-n, -1); y <= n; y++)
        for (let z = Math.min(-n, -1); z <= n; z++)
          for (const [kind, p] of [
            ["xy", [x + 0.5, y + 0.5, z]],
            ["xz", [x + 0.5, y, z + 0.5]],
            ["yz", [x, y + 0.5, z + 0.5]],
          ]) {
            if (Math.max(...p.map(Math.abs)) > n + (n === 0 ? 0.51 : 0.01))
              continue;
            const value = counterValue(kind, x, y, z);
            add(...p, value, true);
          }
    return points;
  }
  function renderSlice() {
    if (!el.split2D.checked || inspectorTab !== "planes") return;
    planeGallery.innerHTML = "";
    if (!el.inspectPlanesOn.checked) return;
    if (!selectedPlanes.length) {
      planeGallery.textContent =
        "Click a colored or white plane in 3D. Shift-click to select behind a sphere.";
      return;
    }
    for (const sel of selectedPlanes) {
      const card = document.createElement("div");
      card.className = "plane-card";
      const header = document.createElement("header"),
        canvas2 = document.createElement("canvas");
      const pts = slicePoints(sel),
        label =
          sel.kind === "diag"
            ? `Diagonal · x+y+z = ${sel.k}`
            : `${sel.kind.toUpperCase()} · ${{ xy: "z", xz: "y", yz: "x" }[sel.kind]} = ${sel.k}`;
      header.innerHTML = `${label}<small>${pts.length} points · space colored, counterspace white</small>`;
      card.appendChild(header);
      card.appendChild(canvas2);
      planeGallery.appendChild(card);
      if (selectedPlanes.length === 1)
        canvas2.style.height = "calc(100vh - 180px)";
      const width = canvas2.clientWidth || planeGallery.clientWidth - 24 || 360,
        height =
          canvas2.clientHeight ||
          (selectedPlanes.length === 1 ? window.innerHeight - 180 : 360),
        dpi = Math.min(devicePixelRatio || 1, 2),
        drawCtx = canvas2.getContext("2d");
      canvas2.width = Math.round(width * dpi);
      canvas2.height = Math.round(height * dpi);
      drawCtx.setTransform(dpi, 0, 0, dpi, 0, 0);
      drawCtx.fillStyle = "#151d2a";
      drawCtx.fillRect(0, 0, width, height);
      if (!pts.length) continue;
      const minU = Math.min(...pts.map((p) => p.u)),
        maxU = Math.max(...pts.map((p) => p.u)),
        minV = Math.min(...pts.map((p) => p.v)),
        maxV = Math.max(...pts.map((p) => p.v)),
        unit = Math.min(
          64,
          (width - 65) / Math.max(1, maxU - minU + 1),
          (height - 105) / Math.max(1, maxV - minV + 1),
        ),
        cx = width / 2 - ((minU + maxU) * unit) / 2,
        cy = height / 2 + ((minV + maxV) * unit) / 2;
      const loc = (p) => [cx + p.u * unit, cy - p.v * unit];
      drawCtx.lineWidth = 1;
      const lattice = pts.filter((p) => !p.counter);
      for (let i = 0; i < lattice.length; i++)
        for (let j = i + 1; j < lattice.length; j++) {
          const a = lattice[i],
            b = lattice[j],
            distance = Math.hypot(a.u - b.u, a.v - b.v),
            neighbor = sel.kind === "diag" ? Math.SQRT2 : 1;
          if (Math.abs(distance - neighbor) > 0.001) continue;
          const [ax, ay] = loc(a),
            [bx, by] = loc(b);
          drawCtx.strokeStyle = "#344257";
          drawCtx.beginPath();
          drawCtx.moveTo(ax, ay);
          drawCtx.lineTo(bx, by);
          drawCtx.stroke();
        }
      const r = 17;
      for (const p of pts) {
        const [x, y] = loc(p);
        drawCtx.beginPath();
        drawCtx.arc(x, y, r, 0, Math.PI * 2);
        drawCtx.fillStyle = p.counter ? "#f1f1ed" : C[p.value % 3];
        drawCtx.fill();
        drawCtx.strokeStyle = p.counter ? "#8895a5" : "#0c1826";
        drawCtx.lineWidth = 1.5;
        drawCtx.stroke();
        drawCtx.fillStyle = p.counter ? "#25334a" : "#111a27";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = `bold ${Math.min(r * 1.45, Math.max(16, +el.numberSize.value + 5))}px system-ui`;
        drawCtx.fillText(String(p.value), x, y + 0.5);
      }
    }
  }
  function render() {
    if (!W) return;
    ctx.fillStyle = "#10141c";
    ctx.fillRect(0, 0, W, H);
    hits = [];
    const n = +el.extent.value,
      slices = { xy: +el.z.value, xz: +el.y.value, yz: +el.x.value };
    const planes = [];
    planeHits = [];
    const t = Math.max(n + 0.35, 0.7);
    const selected = (name, offset) =>
      el[name].checked &&
      (el[name + "Offsets"].checked || offset === slices[name]);
    const plane = (name, corners, color, meta) => {
      if (el[name].checked) {
        const depth = corners.reduce((s, p) => s + p.depth, 0) / 4;
        planes.push({ depth, draw: () => polygon(corners, color) });
        planeHits.push({ corners, depth, meta });
      }
    };
    const alpha = +el.opacity.value / 100;
    for (const [name, axisId] of [
      ["xy", "axisXY"],
      ["xz", "axisXZ"],
      ["yz", "axisYZ"],
    ]) {
      if (!el[axisId].checked) continue;
      const offsets = [...Array(2 * n + 1)]
        .map((_, i) => i - n)
        .filter(
          (k) =>
            el["axis" + name.toUpperCase() + "All"].checked ||
            k === slices[name],
        );
      for (const k of offsets) {
        const a = alpha * (k === slices[name] ? 1 : 0.35);
        if (name === "xy")
          plane(
            axisId,
            [
              [-t, -t, k],
              [t, -t, k],
              [t, t, k],
              [-t, t, k],
            ].map((p) => project(...p)),
            `rgba(67,204,227,${a})`,
            { kind: "xy", k },
          );
        if (name === "xz")
          plane(
            axisId,
            [
              [-t, k, -t],
              [t, k, -t],
              [t, k, t],
              [-t, k, t],
            ].map((p) => project(...p)),
            `rgba(255,177,93,${a})`,
            { kind: "xz", k },
          );
        if (name === "yz")
          plane(
            axisId,
            [
              [k, -t, -t],
              [k, t, -t],
              [k, t, t],
              [k, -t, t],
            ].map((p) => project(...p)),
            `rgba(199,136,255,${a})`,
            { kind: "yz", k },
          );
      }
    }
    for (const [name, id] of [
      ["xy", "halfXY"],
      ["xz", "halfXZ"],
      ["yz", "halfYZ"],
    ]) {
      if (!el[id].checked) continue;
      const offsets =
        n === 0
          ? [-0.5, 0.5]
          : Array.from({ length: 2 * n }, (_, i) => i - n + 0.5);
      for (const k of offsets) {
        const corners =
          name === "xy"
            ? [
                [-t, -t, k],
                [t, -t, k],
                [t, t, k],
                [-t, t, k],
              ]
            : name === "xz"
              ? [
                  [-t, k, -t],
                  [t, k, -t],
                  [t, k, t],
                  [-t, k, t],
                ]
              : [
                  [k, -t, -t],
                  [k, t, -t],
                  [k, t, t],
                  [k, -t, t],
                ];
        plane(
          id,
          corners.map((p) => project(...p)),
          `rgba(235,241,250,${alpha * 0.65})`,
          { kind: name, k },
        );
      }
    }
    const objects = planes.map((p) => ({ ...p, type: "plane" }));
    const visiblePoints = new Set();
    const key = (v) => v.map((x) => Math.round(x * 2)).join(",");
    if (el.axes.checked) {
      for (const [a, b, c] of [
        [[-t, 0, 0], [t, 0, 0], "#f88989"],
        [[0, -t, 0], [0, t, 0], "#92edb3"],
        [[0, 0, -t], [0, 0, t], "#89b9ff"],
      ]) {
        const pa = project(...a),
          pb = project(...b);
        objects.push({
          depth: (pa.depth + pb.depth) / 2,
          type: "axis",
          draw: () => line(pa, pb, c, 2),
        });
      }
    }
    if (el.showSpace.checked)
      for (let x = -n; x <= n; x++)
        for (let y = -n; y <= n; y++)
          for (let z = -n; z <= n; z++) {
            const active = [
                selected("xy", z),
                selected("xz", y),
                selected("yz", x),
              ],
              idx = active
                .map((a, i) => (a && true ? i : -1))
                .filter((i) => i >= 0);
            if (!idx.length) continue;
            let value = idx.length ? latticeValue(x, y, z) : null,
              color = idx.length ? C[value % 3] : "#536073";
            if (idx.length && !el["f" + (value % 3)].checked) continue;
            if (el.greenOnly.checked && !onGreenDiagonal(x, y, z, n)) continue;
            visiblePoints.add(key([x, y, z]));
            const p = project(x, y, z),
              r =
                Math.max(2.2, p.r * (+el.radius.value / 100) * 0.19) *
                (idx.length ? 1 : 0.65);
            objects.push({
              depth: p.depth,
              type: "sphere",
              draw: () => {
                ctx.globalAlpha = idx.length ? 1 : 0.28;
                const g = ctx.createRadialGradient(
                  p.sx - r * 0.36,
                  p.sy - r * 0.45,
                  r * 0.08,
                  p.sx,
                  p.sy,
                  r,
                );
                g.addColorStop(0, "#ffffff");
                g.addColorStop(0.28, color);
                g.addColorStop(1, "#162438");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                if (el.labels.checked && value !== null && r > 4) {
                  ctx.font = `bold ${el.numberSize.value}px system-ui`;
                  ctx.textAlign = "center";
                  ctx.fillStyle = "white";
                  ctx.fillText(value, p.sx, p.sy - r - 3);
                }
                hits.push({
                  x,
                  y,
                  z,
                  sx: p.sx,
                  sy: p.sy,
                  r,
                  value: latticeValue(x, y, z),
                  active,
                });
              },
            });
          }
    if (el.dual.checked) {
      const families = [
        { name: "xy", normal: "z", coords: (x, y, z) => [x + 0.5, y + 0.5, z] },
        { name: "xz", normal: "y", coords: (x, y, z) => [x + 0.5, y, z + 0.5] },
        { name: "yz", normal: "x", coords: (x, y, z) => [x, y + 0.5, z + 0.5] },
      ];
      for (const family of families) {
        if (!el[family.name].checked) continue;
        for (let x = Math.min(-n, -1); x <= n; x++)
          for (let y = Math.min(-n, -1); y <= n; y++)
            for (let z = Math.min(-n, -1); z <= n; z++) {
              const [px, py, pz] = family.coords(x, y, z);
              if (!selected(family.name, { x, y, z }[family.normal])) continue;
              if (
                Math.max(Math.abs(px), Math.abs(py), Math.abs(pz)) >
                n + (n === 0 ? 0.51 : 0.01)
              )
                continue;
              const value = counterValue(family.name, x, y, z);
              if (!el["df" + (value % 3)].checked) continue;
              if (el.greenOnly.checked && !onGreenDiagonal(px, py, pz, n))
                continue;
              visiblePoints.add(key([px, py, pz]));
              const p = project(px, py, pz),
                r = Math.max(2.2, p.r * (+el.radius.value / 100) * 0.15);
              objects.push({
                depth: p.depth,
                type: "sphere",
                draw: () => {
                  const g = ctx.createRadialGradient(
                    p.sx - r * 0.35,
                    p.sy - r * 0.4,
                    r * 0.08,
                    p.sx,
                    p.sy,
                    r,
                  );
                  g.addColorStop(0, "#ffffff");
                  g.addColorStop(0.7, "#e8e8e8");
                  g.addColorStop(1, "#8390a0");
                  ctx.fillStyle = g;
                  ctx.beginPath();
                  ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
                  ctx.fill();
                  if (el.dualLabels.checked && r > 4) {
                    ctx.font = `bold ${el.numberSize.value}px system-ui`;
                    ctx.textAlign = "center";
                    ctx.fillStyle = "white";
                    ctx.fillText(value, p.sx, p.sy - r - 3);
                  }
                  hits.push({
                    x: px,
                    y: py,
                    z: pz,
                    sx: p.sx,
                    sy: p.sy,
                    r,
                    value,
                    counter: true,
                    family: family.name,
                    indices: [x, y, z],
                  });
                },
              });
            }
      }
    } // Connections use the complete lattice at the chosen extent, independent of sphere filters.
    const topology = new Map();
    for (let x = -n; x <= n; x++)
      for (let y = -n; y <= n; y++)
        for (let z = -n; z <= n; z++) topology.set(key([x, y, z]), [x, y, z]);
    for (let x = Math.min(-n, -1); x <= n; x++)
      for (let y = Math.min(-n, -1); y <= n; y++)
        for (let z = Math.min(-n, -1); z <= n; z++)
          for (const q of [
            [x + 0.5, y + 0.5, z],
            [x + 0.5, y, z + 0.5],
            [x, y + 0.5, z + 0.5],
          ])
            if (Math.max(...q.map(Math.abs)) <= n + (n === 0 ? 0.51 : 0.01))
              topology.set(key(q), q);
    const edgeSets = {
      cubes: new Map(),
      cubeXY: new Map(),
      cubeXZ: new Map(),
      cubeYZ: new Map(),
      octa: new Map(),
      tetra: new Map(),
    };
    function edge(layer, a, b) {
      const ka = key(a),
        kb = key(b);
      if (!topology.has(ka) || !topology.has(kb) || ka === kb) return;
      const pair = [ka, kb].sort().join("|");
      edgeSets[layer].set(pair, [a, b]);
    }
    function clique(layer, points) {
      for (let i = 0; i < points.length; i++)
        for (let j = i + 1; j < points.length; j++)
          edge(layer, points[i], points[j]);
    }
    for (const p of topology.values()) {
      const fractional = p
        .map((v) => (Math.abs(v - Math.round(v)) > 0.1 ? 1 : 0))
        .join("");
      const layer = {
        "000": "cubes",
        110: "cubeXY",
        101: "cubeXZ",
        "011": "cubeYZ",
      }[fractional];
      if (layer)
        for (const axis of [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ])
          edge(
            layer,
            p,
            p.map((v, i) => v + axis[i]),
          );
      if (!p.every(Number.isInteger)) continue;
      for (const dx of [-0.5, 0.5])
        for (const dy of [-0.5, 0.5])
          for (const dz of [-0.5, 0.5])
            clique("tetra", [
              p,
              [p[0] + dx, p[1] + dy, p[2]],
              [p[0] + dx, p[1], p[2] + dz],
              [p[0], p[1] + dy, p[2] + dz],
            ]);
    }
    // Six face centers of each integer cube form an octahedron. Its 12 edges
    // join centers on different coordinate axes; opposite faces are excluded.
    for (let i = -n - 1; i <= n; i++)
      for (let j = -n - 1; j <= n; j++)
        for (let k = -n - 1; k <= n; k++) {
          const faces = [
            [
              [i + 0.5, j + 0.5, k],
              [i + 0.5, j + 0.5, k + 1],
            ],
            [
              [i + 0.5, j, k + 0.5],
              [i + 0.5, j + 1, k + 0.5],
            ],
            [
              [i, j + 0.5, k + 0.5],
              [i + 1, j + 0.5, k + 0.5],
            ],
          ];
          for (let a = 0; a < 3; a++)
            for (let b = a + 1; b < 3; b++)
              for (const pa of faces[a])
                for (const pb of faces[b]) edge("octa", pa, pb);
        }
    for (const [name, color, width] of [
      ["cubes", "#30353d", 3.5],
      ["cubeXY", "#a47fd5", 3],
      ["cubeXZ", "#db9e56", 3],
      ["cubeYZ", "#60b4ca", 3],
      ["octa", "#858e9a", 2.8],
      ["tetra", "#dbe1e9", 2.5],
    ])
      if (el[name].checked)
        for (const [a, b] of edgeSets[name].values()) {
          const pa = project(...a),
            pb = project(...b);
          objects.push({
            depth: (pa.depth + pb.depth) / 2,
            type: "edge",
            draw: () => line(pa, pb, color, width),
          });
        }
    // Clip x + y + z = k against the displayed cube and sort its vertices.
    function diagonalPolygon(k, bound) {
      const corners = [];
      for (const x of [-bound, bound])
        for (const y of [-bound, bound])
          for (const z of [-bound, bound]) corners.push([x, y, z]);
      const points = new Map();
      for (let a = 0; a < 8; a++)
        for (let b = a + 1; b < 8; b++) {
          const A = corners[a],
            B = corners[b];
          if (A.filter((v, i) => v !== B[i]).length !== 1) continue;
          const sa = A[0] + A[1] + A[2],
            sb = B[0] + B[1] + B[2];
          if (k < Math.min(sa, sb) - 1e-8 || k > Math.max(sa, sb) + 1e-8)
            continue;
          const t = (k - sa) / (sb - sa),
            q = A.map((v, i) => v + t * (B[i] - v));
          points.set(q.map((v) => v.toFixed(6)).join(","), q);
        }
      const p = [...points.values()];
      if (p.length < 3) return [];
      const mean = p.reduce(
        (acc, q) => acc.map((v, i) => v + q[i] / p.length),
        [0, 0, 0],
      );
      p.sort(
        (a, b) =>
          Math.atan2(
            a[0] + a[1] - 2 * a[2] - (mean[0] + mean[1] - 2 * mean[2]),
            a[0] - a[1] - (mean[0] - mean[1]),
          ) -
          Math.atan2(
            b[0] + b[1] - 2 * b[2] - (mean[0] + mean[1] - 2 * mean[2]),
            b[0] - b[1] - (mean[0] - mean[1]),
          ),
      );
      return p.map((q) => project(...q));
    }
    const sums = new Set(
      [...topology.values()].map((p) => Math.round(p[0] + p[1] + p[2])),
    );
    const diagColors = ["73,215,148", "255,104,107", "100,170,255"],
      diagSwitch = ["diagGreen", "diagRed", "diagBlue"];
    for (const k of [...sums].sort((a, b) => a - b)) {
      const family = ((k % 3) + 3) % 3;
      if (!el[diagSwitch[family]].checked) continue;
      const vertices = diagonalPolygon(k, n === 0 ? 0.5 : n);
      if (vertices.length < 3) continue;
      const depth =
        vertices.reduce((sum, p) => sum + p.depth, 0) / vertices.length;
      objects.push({
        depth,
        type: "plane",
        draw: () =>
          polygon(
            vertices,
            `rgba(${diagColors[family]},${+el.diagOpacity.value / 100})`,
          ),
      });
      planeHits.push({ corners: vertices, depth, meta: { kind: "diag", k } });
    }
    if (el.split2D.checked && el.inspectPointsOn.checked)
      for (const p of selectedPoints) {
        if (!visiblePoints.has(key([p.x, p.y, p.z]))) continue;
        const q = project(p.x, p.y, p.z),
          r = Math.max(
            3,
            q.r * (+el.radius.value / 100) * (p.counter ? 0.15 : 0.19),
          );
        objects.push({
          depth: q.depth,
          type: "selection",
          draw: () => {
            const g = ctx.createRadialGradient(
              q.sx - r * 0.3,
              q.sy - r * 0.4,
              1,
              q.sx,
              q.sy,
              r,
            );
            g.addColorStop(0, "#fff8ba");
            g.addColorStop(0.65, "#ffe348");
            g.addColorStop(1, "#ac7900");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(q.sx, q.sy, r, 0, Math.PI * 2);
            ctx.fill();
          },
        });
      }
    if (el.split2D.checked && el.inspectPlanesOn.checked)
      for (const { kind, k } of selectedPlanes) {
        if (!planeHits.some((h) => h.meta.kind === kind && h.meta.k === k))
          continue;
        let vertices = [];
        if (kind === "xy")
          vertices = [
            [-t, -t, k],
            [t, -t, k],
            [t, t, k],
            [-t, t, k],
          ].map((p) => project(...p));
        else if (kind === "xz")
          vertices = [
            [-t, k, -t],
            [t, k, -t],
            [t, k, t],
            [-t, k, t],
          ].map((p) => project(...p));
        else if (kind === "yz")
          vertices = [
            [k, -t, -t],
            [k, t, -t],
            [k, t, t],
            [k, -t, t],
          ].map((p) => project(...p));
        else vertices = diagonalPolygon(k, Math.max(n, 0.5));
        if (vertices.length > 2) {
          const depth =
            vertices.reduce((a, p) => a + p.depth, 0) / vertices.length;
          objects.push({
            depth,
            type: "plane",
            draw: () => highlightPlane(vertices),
          });
          planeHits.push({
            corners: vertices,
            depth: depth + 1e-5,
            meta: { kind, k },
          });
        }
      }
    if (el.wireCube.checked) {
      const boundary = t;
      for (const x of [-boundary, boundary])
        for (const y of [-boundary, boundary])
          for (const z of [-boundary, boundary]) {
            const a = [x, y, z];
            for (const axis of [0, 1, 2])
              if (a[axis] === -boundary) {
                const b = [...a];
                b[axis] = boundary;
                const pa = project(...a),
                  pb = project(...b);
                objects.push({
                  depth: (pa.depth + pb.depth) / 2,
                  type: "edge",
                  draw: () => line(pa, pb, "#485666", 1),
                });
              }
          }
    }
    if (el.split2D.checked && el.vectorMode.checked)
      for (const selected of selectedVectors) {
        const direction = selected.p,
          color = selected.color;
        let loopPath = null;
        if (el.showLoop.checked) {
          loopPath = torusPath(wrappedPoint(vectorBase), direction);
          objects.push(...pathObjects(loopPath, t, color));
        }
        if (loopPath) {
          const visibleSteps = loopPath.firstStep
            .map(([a, b]) => clipSegment(a, b, t))
            .filter(Boolean);
          visibleSteps.forEach(([a, b], i) =>
            objects.push(
              ...arrowPieces(
                ctx,
                (p) => project(...p),
                a,
                b.map((v, j) => v - a[j]),
                4.5,
                i === visibleSteps.length - 1,
                color,
              ),
            ),
          );
        } else
          objects.push(
            ...arrowPieces(
              ctx,
              (p) => project(...p),
              vectorBase,
              direction,
              4.5,
              true,
              color,
            ),
          );
      }
    objects.sort(
      (a, b) =>
        a.depth - b.depth ||
        {
          plane: 0,
          axis: 1,
          edge: 2,
          loop: 3,
          vector: 4,
          sphere: 5,
          selection: 6,
        }[a.type] -
          {
            plane: 0,
            axis: 1,
            edge: 2,
            loop: 3,
            vector: 4,
            sphere: 5,
            selection: 6,
          }[b.type],
    );
    objects.forEach((o) => o.draw());
    if (el.split2D.checked) {
      if (inspectorTab === "planes") renderSlice();
      else if (inspectorTab === "lines") renderLoopInspector();
      else renderPointInspector();
    }
    ctx.fillStyle = "#a7b4cc";
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      `${objects.filter((o) => o.type === "sphere").length} points · XY cyan · XZ amber · YZ violet`,
      14,
      H - 12,
    );
  }
  // A preset is a snapshot of every menu control, plus the active inspector tab.
  function readMenuSettings() {
    return Object.fromEntries(
      ids.map((k) => [
        k,
        el[k].type === "checkbox" ? el[k].checked : el[k].value,
      ]),
    );
  }
  const STARTUP_SETTINGS = readMenuSettings(),
    STORAGE_KEY = "vbm-lattice-presets-v1";
  const allSpheres = {
    ...STARTUP_SETTINGS,
    extent: "4",
    x: "0",
    y: "0",
    z: "0",
    xy: true,
    xz: true,
    yz: true,
    xyOffsets: true,
    xzOffsets: true,
    yzOffsets: true,
    showSpace: true,
    dual: true,
    f0: true,
    f1: true,
    f2: true,
    df0: true,
    df1: true,
    df2: true,
    greenOnly: false,
    axisXY: true,
    axisXZ: true,
    axisYZ: true,
    axisXYAll: false,
    axisXZAll: false,
    axisYZAll: false,
    halfXY: false,
    halfXZ: false,
    halfYZ: false,
    diagGreen: false,
    diagRed: false,
    diagBlue: false,
  };
  const greenDiagonals = {
    ...allSpheres,
    greenOnly: true,
    axisXY: false,
    axisXZ: false,
    axisYZ: false,
    diagGreen: true,
    diagRed: false,
    diagBlue: false,
    halfXY: false,
    halfXZ: false,
    halfYZ: false,
    cubes: false,
    cubeXY: false,
    cubeXZ: false,
    cubeYZ: false,
    octa: false,
    tetra: false,
    axes: false,
    wireCube: false,
    diagOpacity: "24",
  };
  const builtInPresets = [
    { name: "Startup Settings", settings: STARTUP_SETTINGS, tab: "points" },
    {
      name: "All spheres on with origin planes",
      settings: allSpheres,
      tab: "points",
    },
    {
      name: "Only Green long diagonal planes with spheres contained by those planes",
      settings: greenDiagonals,
      tab: "planes",
    },
  ];
  let savedPresets = [];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored))
      savedPresets = stored.filter(
        (p) =>
          p &&
          typeof p.name === "string" &&
          p.settings &&
          typeof p.settings === "object" &&
          typeof p.tab === "string",
      );
  } catch (e) {}
  const presetList = document.getElementById("presetList"),
    presetName = document.getElementById("presetName"),
    presetStatus = document.getElementById("presetStatus");
  function applyPreset(p) {
    const settings = p.settings;
    for (const k of ids) {
      const input = el[k],
        value = Object.prototype.hasOwnProperty.call(settings, k)
          ? settings[k]
          : STARTUP_SETTINGS[k];
      if (input.type === "checkbox") input.checked = value === true;
      else if (Number.isFinite(+value))
        input.value = String(
          Math.max(+input.min || 0, Math.min(+input.max || 100, +value)),
        );
    }
    for (const k of ["x", "y", "z"]) {
      el[k].min = -el.extent.value;
      el[k].max = el.extent.value;
      el[k].value = String(
        Math.max(-el.extent.value, Math.min(+el.extent.value, +el[k].value)),
      );
    }
    for (const k of [
      "x",
      "y",
      "z",
      "extent",
      "radius",
      "opacity",
      "diagOpacity",
      "numberSize",
    ])
      document.getElementById(k + "v").textContent = el[k].value;
    if (!el.inspectPointsOn.checked) selectedPoints = [];
    if (!el.inspectPlanesOn.checked) selectedPlanes = [];
    if (!el.multiPoints.checked && selectedPoints.length > 1)
      selectedPoints = [selectedPoints.at(-1)];
    if (!el.multiPlanes.checked && selectedPlanes.length > 1)
      selectedPlanes = [selectedPlanes.at(-1)];
    if (!el.multiVector.checked && selectedVectors.length > 1)
      selectedVectors = [selectedVectors.at(-1)];
    vectorWindow.hidden = !el.vectorMode.checked;
    slicePanel.hidden = !el.split2D.checked;
    document.body.classList.toggle("split", el.split2D.checked);
    inspectorTab = ["points", "lines", "planes"].includes(p.tab)
      ? p.tab
      : "points";
    for (const key of ["points", "lines", "planes"]) {
      document.getElementById(
        "inspect" + key[0].toUpperCase() + key.slice(1),
      ).hidden = key !== inspectorTab;
      document
        .querySelector(`[data-inspector="${key}"]`)
        .classList.toggle("active", key === inspectorTab);
    }
    if (el.showLoop.checked && zoom > 0.65) zoom = 0.65;
    resize();
    if (el.split2D.checked && el.vectorMode.checked) renderCompass();
    presetStatus.textContent = "Loaded: " + p.name;
  }
  function renderPresets() {
    presetList.innerHTML = "";
    for (const p of [...builtInPresets, ...savedPresets]) {
      const row = document.createElement("div");
      row.className = "preset-row";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = p.name;
      button.onclick = () => applyPreset(p);
      row.appendChild(button);
      if (savedPresets.includes(p)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-preset";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete preset " + p.name);
        remove.onclick = () => {
          savedPresets = savedPresets.filter((item) => item !== p);
          persistPresets();
          renderPresets();
          presetStatus.textContent = "Deleted: " + p.name;
        };
        row.appendChild(remove);
      }
      presetList.appendChild(row);
    }
  }
  function persistPresets() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
      return true;
    } catch (e) {
      return false;
    }
  }
  function saveCurrentPreset() {
    const name = presetName.value.trim();
    if (!name) {
      presetStatus.textContent = "Enter a name for your preset.";
      presetName.focus();
      return;
    }
    if (
      builtInPresets.some((p) => p.name.toLowerCase() === name.toLowerCase())
    ) {
      presetStatus.textContent = "That name belongs to a built-in preset.";
      return;
    }
    const snapshot = { name, settings: readMenuSettings(), tab: inspectorTab },
      index = savedPresets.findIndex(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
    if (index >= 0) savedPresets[index] = snapshot;
    else savedPresets.push(snapshot);
    const persisted = persistPresets();
    renderPresets();
    presetName.value = "";
    presetStatus.textContent =
      (index >= 0 ? "Updated: " : "Saved: ") +
      name +
      (persisted ? "" : " (this session only)");
  }
  document.getElementById("savePreset").onclick = saveCurrentPreset;
  presetName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveCurrentPreset();
  });
  renderPresets();
  for (const k of ids)
    el[k].addEventListener("input", () => {
      for (const j of [
        "x",
        "y",
        "z",
        "extent",
        "radius",
        "opacity",
        "diagOpacity",
        "numberSize",
      ])
        document.getElementById(j + "v").textContent = el[j].value;
      for (const j of ["x", "y", "z"]) {
        el[j].min = -el.extent.value;
        el[j].max = el.extent.value;
        if (+el[j].value > +el.extent.value) el[j].value = el.extent.value;
        if (+el[j].value < -el.extent.value) el[j].value = -el.extent.value;
        document.getElementById(j + "v").textContent = el[j].value;
      }
      if (k === "vectorMode") {
        vectorWindow.hidden = !el.vectorMode.checked;
        if (el.vectorMode.checked) showInspector("lines");
      }
      if (
        k === "multiVector" &&
        !el.multiVector.checked &&
        selectedVectors.length > 1
      )
        selectedVectors = [selectedVectors.at(-1)];
      if (k === "multiVector") renderCompass();
      if (k === "showLoop" && el.showLoop.checked && zoom > 0.65) zoom = 0.65;
      if (k === "split2D") {
        slicePanel.hidden = !el.split2D.checked;
        document.body.classList.toggle("split", el.split2D.checked);
        if (el.split2D.checked) {
          showInspector(inspectorTab);
          return;
        }
        resize();
        return;
      }
      if (k === "inspectPointsOn" && !el.inspectPointsOn.checked) {
        selectedPoints = [];
        pointDetails.innerHTML = "";
        info.innerHTML = "";
      }
      if (k === "inspectPlanesOn" && !el.inspectPlanesOn.checked) {
        selectedPlanes = [];
        planeGallery.innerHTML = "";
      }
      if (
        k === "multiPoints" &&
        !el.multiPoints.checked &&
        selectedPoints.length > 1
      )
        selectedPoints = [selectedPoints.at(-1)];
      if (
        k === "multiPlanes" &&
        !el.multiPlanes.checked &&
        selectedPlanes.length > 1
      )
        selectedPlanes = [selectedPlanes.at(-1)];
      render();
    });
  document.getElementById("closeVector").onclick = () => {
    el.vectorMode.checked = false;
    vectorWindow.hidden = true;
    render();
  };
  let down = null,
    moved = false;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, button: e.button };
    moved = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    let dx = e.clientX - down.x,
      dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      moved = true;
      autoFit = false;
    }
    if (down.button === 2 || e.shiftKey) {
      panX += dx;
      panY += dy;
    } else {
      yaw -= dx * 0.008;
      pitch = Math.max(-1.48, Math.min(1.48, pitch + dy * 0.008));
    }
    down.x = e.clientX;
    down.y = e.clientY;
    render();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!moved) {
      const rect = canvas.getBoundingClientRect(),
        mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      let p = hits
        .filter((h) => Math.hypot(h.sx - mx, h.sy - my) < Math.max(h.r, 7))
        .at(-1);
      if (el.inspectPlanesOn.checked && (e.shiftKey || !p)) {
        const plane = planeHits
          .filter((h) => pointInPolygon(mx, my, h.corners))
          .sort((a, b) => b.depth - a.depth)[0];
        if (plane) {
          selectSlice(plane.meta);
          down = null;
          return;
        }
      }
      if (p) {
        if (el.split2D.checked && el.inspectPointsOn.checked) {
          const key = [p.x, p.y, p.z].join(","),
            index = selectedPoints.findIndex(
              (item) => [item.x, item.y, item.z].join(",") === key,
            );
          if (index >= 0) selectedPoints.splice(index, 1);
          else {
            if (!el.multiPoints.checked) selectedPoints = [];
            selectedPoints.push(p);
          }
          if (!el.vectorMode.checked) showInspector("points");
          else renderPointInspector();
        }
        if (el.split2D.checked && el.vectorMode.checked) {
          vectorBase = [p.x, p.y, p.z];
          render();
        }
        const v = p.value;
        if (el.split2D.checked && el.inspectPointsOn.checked)
          info.innerHTML = p.counter
            ? `<strong>${p.family.toUpperCase()} counterspace (${p.x}, ${p.y}, ${p.z})</strong><br>8x + 5y + 2z + ${dualOffsets[p.family]} mod 9 = ${v}<br><span class="hint">Integer indices: (${p.indices.join(", ")})</span>`
            : `<strong>(${p.x}, ${p.y}, ${p.z})</strong><br>x + 4y + 7z mod 9 = ${v} · F${v % 3}<br><span class="hint">On selected slices: ${["XY", "XZ", "YZ"].filter((_, i) => p.active[i]).join(", ") || "none"}</span>`;
      }
    }
    down = null;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      autoFit = false;
      zoom = Math.max(0.22, Math.min(5, zoom * Math.exp(-e.deltaY * 0.001)));
      render();
    },
    { passive: false },
  );
  let vectorDrag = null,
    vectorMoved = false;
  vectorCanvas.addEventListener("pointerdown", (e) => {
    vectorCanvas.setPointerCapture(e.pointerId);
    vectorDrag = { x: e.clientX, y: e.clientY };
    vectorMoved = false;
  });
  vectorCanvas.addEventListener("pointermove", (e) => {
    if (!vectorDrag) return;
    const dx = e.clientX - vectorDrag.x,
      dy = e.clientY - vectorDrag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) vectorMoved = true;
    vectorYaw -= dx * 0.01;
    vectorPitch = Math.max(-1.46, Math.min(1.46, vectorPitch + dy * 0.01));
    vectorDrag.x = e.clientX;
    vectorDrag.y = e.clientY;
    if (vectorMoved) renderCompass();
  });
  vectorCanvas.addEventListener("pointerup", (e) => {
    if (!vectorMoved) {
      const box = vectorCanvas.getBoundingClientRect(),
        x = e.clientX - box.left,
        y = e.clientY - box.top;
      const candidate = vectorHits
        .filter((h) => Math.hypot(h.sx - x, h.sy - y) < Math.max(10, h.r + 4))
        .sort((a, b) => b.depth - a.depth)[0];
      if (candidate) {
        const key = candidate.p.join(","),
          existing = selectedVectors.findIndex((v) => v.p.join(",") === key);
        if (existing >= 0) selectedVectors.splice(existing, 1);
        else {
          if (!el.multiVector.checked) selectedVectors = [];
          selectedVectors.push({
            p: [...candidate.p],
            color: el.multiVector.checked
              ? VECTOR_COLORS.find(
                  (c) => !selectedVectors.some((v) => v.color === c),
                ) || "#ffe348"
              : VECTOR_COLORS[0],
          });
        }
        vectorStatus.innerHTML = selectedVectors.length
          ? `<strong>${selectedVectors.length} direction${selectedVectors.length === 1 ? "" : "s"} selected</strong><br>Click a selected sphere again to remove it.`
          : "Click a sphere to choose a direction. Drag to rotate.";
        renderCompass();
        render();
      }
    }
    vectorDrag = null;
  });
  document.getElementById("togglePanel").onclick = () => {
    const panel = document.getElementById("controlPanel"),
      button = document.getElementById("togglePanel");
    const collapsed = panel.classList.toggle("collapsed");
    if (autoFit) fitCube();
    render();
    button.textContent = collapsed ? "Show controls" : "Hide controls";
    button.setAttribute("aria-expanded", String(!collapsed));
  };
  document.getElementById("reset").onclick = () => {
    yaw = START_YAW;
    pitch = START_PITCH;
    autoFit = true;
    resize();
  };
  document.getElementById("shot").onclick = () => {
    const a = document.createElement("a");
    a.download = "mod9-lattice.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  for (const button of document.querySelectorAll("[data-inspector]"))
    button.addEventListener("click", () =>
      showInspector(button.dataset.inspector),
    ); // The two geometry workspaces keep independent controls and inspector state.
  const sphereDisplay = document.getElementById("sphereDisplay"),
    sphereControls = document.getElementById("sphereControls"),
    sphereInspector = document.getElementById("sphereInspector"),
    sphereInspectorToggle = document.getElementById("sphereInspectorToggle");
  const torusTab = document.getElementById("torusTab"),
    sphereTab = document.getElementById("sphereTab");
  let activeGeometry = "torus",
    sphereInspectorTab = "points";
  function showSphereInspector(tab) {
    sphereInspectorTab = tab;
    for (const name of ["points", "lines", "planes"]) {
      document.getElementById(
        "sphereInspect" + name[0].toUpperCase() + name.slice(1),
      ).hidden = name !== tab;
      document
        .querySelector(`[data-sphere-inspector="${name}"]`)
        .classList.toggle("active", name === tab);
    }
  }
  function switchGeometry(next) {
    if (next === activeGeometry) return;
    activeGeometry = next;
    const sphere = next === "sphere";
    document.body.classList.toggle("sphere-active", sphere);
    document.body.classList.toggle(
      "sphere-split",
      sphere && sphereInspectorToggle.checked,
    );
    sphereDisplay.hidden = !sphere;
    sphereControls.hidden = !sphere;
    sphereInspector.hidden = !sphere || !sphereInspectorToggle.checked;
    slicePanel.hidden = sphere || !el.split2D.checked;
    torusTab.setAttribute("aria-selected", String(!sphere));
    sphereTab.setAttribute("aria-selected", String(sphere));
    torusTab.tabIndex = sphere ? -1 : 0;
    sphereTab.tabIndex = sphere ? 0 : -1;
    canvas.setAttribute("aria-hidden", String(sphere));
    sphereDisplay.setAttribute("aria-hidden", String(!sphere));
    if (!sphere) {
      resize();
      if (
        el.split2D.checked &&
        el.vectorMode.checked &&
        inspectorTab === "lines"
      )
        renderCompass();
    }
  }
  sphereInspectorToggle.addEventListener("input", () => {
    sphereInspector.hidden = !sphereInspectorToggle.checked;
    document.body.classList.toggle(
      "sphere-split",
      activeGeometry === "sphere" && sphereInspectorToggle.checked,
    );
  });
  for (const button of document.querySelectorAll("[data-sphere-inspector]"))
    button.onclick = () => showSphereInspector(button.dataset.sphereInspector);
  showSphereInspector("points");
  window.addEventListener("resize", resize);
  vectorWindow.hidden = false;
  showInspector("points");
  renderCompass();
  return switchGeometry;
}
