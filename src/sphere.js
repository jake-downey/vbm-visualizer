export function initSphere() {
  "use strict";
  const canvas = document.getElementById("sphereCanvas"),
    ctx = canvas.getContext("2d"),
    display = document.getElementById("sphereDisplay"),
    controls = document.getElementById("sphereControls");
  const ids = [
    "sphereAB",
    "sphereAE",
    "sphereBE",
    "sphereEta",
    "sphereBeta",
    "sphereAlpha",
    "sphereABAll",
    "sphereAEAll",
    "sphereBEAll",
    "sphereF0",
    "sphereF1",
    "sphereF2",
    "sphereNumbers",
    "sphereCounterNumbers",
    "sphereRadius",
    "sphereFont",
    "sphereTorusGrid",
    "sphereCoreCircle",
    "sphereCounter",
    "sphereCounterAB",
    "sphereCounterAE",
    "sphereCounterBE",
    "sphereCounterABAll",
    "sphereCounterAEAll",
    "sphereCounterBEAll",
    "sphereSurfaceAB",
    "sphereSurfaceAE",
    "sphereSurfaceBE",
    "sphereSurfaceOpacity",
  ];
  const el = Object.fromEntries(
    ids.map((id) => [id, document.getElementById(id)]),
  );
  const colors = ["#49d794", "#ff686b", "#64aaff"],
    mod = (n) => ((n % 9) + 9) % 9,
    points = [],
    counterPoints = [],
    lookup = new Map(),
    dualOffsets = { AB: 2, AE: 5, BE: 8 };
  // Wikipedia convention: (x0,x1)=sin(η)(cos(ξ1),sin(ξ1)),
  // (x2,x3)=cos(η)(cos(ξ2),sin(ξ2)). The two end circles have
  // collapsed coordinates; 2π is the same angular position as 0.
  function makePoint(i, j, k, family = null) {
    const di = family === "AB" || family === "AE" ? 0.5 : 0,
      dj = family === "AB" || family === "BE" ? 0.5 : 0,
      dk = family === "AE" || family === "BE" ? 0.5 : 0;
    const eta = ((k + dk) * Math.PI) / 18,
      xi1 = ((i + di) * Math.PI) / 9,
      xi2 = ((j + dj) * Math.PI) / 9;
    const x0 = Math.sin(eta) * Math.cos(xi1),
      x1 = Math.sin(eta) * Math.sin(xi1),
      x2 = Math.cos(eta) * Math.cos(xi2),
      x3 = Math.cos(eta) * Math.sin(xi2);
    const denominator = 1 - x0,
      pole = denominator <= 1e-12,
      stereo = pole
        ? null
        : { X: x2 / denominator, Y: x3 / denominator, Z: x1 / denominator };
    return {
      i,
      j,
      k,
      di,
      dj,
      dk,
      eta,
      xi1,
      xi2,
      x0,
      x1,
      x2,
      x3,
      stereo,
      counter: !!family,
      family,
      value: family
        ? mod(8 * i + 5 * j + 2 * k + dualOffsets[family])
        : mod(i + 4 * j + 7 * k),
      key: `${family || "S"}:${i}:${j}:${k}`,
    };
  }
  for (let k = 0; k <= 9; k++)
    for (let i = 0; i < 18; i++)
      for (let j = 0; j < 18; j++) {
        if ((k === 0 && i !== 0) || (k === 9 && j !== 0)) continue;
        const p = makePoint(i, j, k);
        points.push(p);
        lookup.set(`${i}:${j}:${k}`, p);
      }
  // Each counterspace family shifts precisely its two named angles by half
  // a unit. At the endpoint circles, collapsed angles have one canonical index.
  for (let k = 0; k <= 9; k++)
    for (let i = 0; i < 18; i++)
      for (let j = 0; j < 18; j++) {
        if ((k === 0 && i !== 0) || (k === 9 && j !== 0)) continue;
        counterPoints.push(makePoint(i, j, k, "AB"));
      }
  for (const family of ["AE", "BE"])
    for (let k = 0; k < 9; k++)
      for (let i = 0; i < 18; i++)
        for (let j = 0; j < 18; j++)
          counterPoints.push(makePoint(i, j, k, family));
  let yaw = 0.62,
    pitch = 0.66,
    zoom = 1,
    panX = 0,
    panY = 0,
    W = 0,
    H = 0,
    dpr = 1,
    hits = [],
    chosen = null;
  const angle = (index, denominator) =>
    index === 0
      ? "0"
      : index === 18
        ? "2π"
        : denominator === 18 && index === 9
          ? "π/2"
          : denominator === 9 && index === 9
            ? "π"
            : `${index}π/${denominator}`;
  const pointAngle = (index, half, denominator) =>
    half ? `${2 * index + 1}π/${2 * denominator}` : angle(index, denominator);
  function updateReadouts() {
    el.sphereEta.value = String(Math.max(0, Math.min(9, +el.sphereEta.value)));
    document.getElementById("sphereEtav").textContent = angle(
      +el.sphereEta.value,
      18,
    );
    for (const [id, output] of [
      ["sphereAlpha", "sphereAlphav"],
      ["sphereBeta", "sphereBetav"],
    ])
      document.getElementById(output).textContent = angle(+el[id].value, 9);
    for (const [id, output] of [
      ["sphereRadius", "sphereRadiusv"],
      ["sphereFont", "sphereFontv"],
    ])
      document.getElementById(output).textContent = el[id].value;
    document.getElementById("sphereSurfaceOpacityv").textContent =
      el.sphereSurfaceOpacity.value + "%";
  }
  function inSelectedSlice(p) {
    return (
      (el.sphereAB.checked &&
        (el.sphereABAll.checked || p.k === +el.sphereEta.value)) ||
      (el.sphereAE.checked &&
        (el.sphereAEAll.checked ||
          p.k === 9 ||
          p.j === +el.sphereBeta.value % 18)) ||
      (el.sphereBE.checked &&
        (el.sphereBEAll.checked ||
          p.k === 0 ||
          p.i === +el.sphereAlpha.value % 18))
    );
  }
  function visible(p) {
    return el["sphereF" + (p.value % 3)].checked && inSelectedSlice(p);
  }
  function visibleCounter(p) {
    if (!el.sphereCounter.checked || !el["sphereCounter" + p.family].checked)
      return false;
    const all = el["sphereCounter" + p.family + "All"].checked;
    return (
      all ||
      (p.family === "AB" && p.k === +el.sphereEta.value) ||
      (p.family === "AE" && p.j === +el.sphereBeta.value % 18) ||
      (p.family === "BE" && p.i === +el.sphereAlpha.value % 18)
    );
  }
  // Stereographic projection from x0=1: (X,Y,Z)=(x2,x3,x1)/(1-x0).
  // A fixed interior η maps to a ring torus around the Z axis.
  function rotated(p) {
    const { X, Y, Z } = p.stereo,
      cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch),
      a = cy * X + sy * Y,
      b = -sy * X + cy * Y,
      v = cp * Z + sp * b,
      depth = sp * Z - cp * b;
    return { a, v, depth };
  }
  // Keep the origin and scale fixed as η or a slice family changes. The
  // stereographic projection is unbounded near its pole; auto-fitting each
  // selection made unrelated tori appear identical and jerked the camera.
  function project(p) {
    const q = rotated(p),
      panelWidth = controls.classList.contains("collapsed") ? 85 : 285,
      clearRight = Math.max(W * 0.48, W - panelWidth - 28),
      scale = Math.min(clearRight, H) * 0.205 * zoom;
    return {
      sx: clearRight / 2 + panX + q.a * scale,
      sy: H / 2 + panY - q.v * scale,
      depth: q.depth,
      r: Math.max(
        2.6,
        Math.min(10, scale * 0.032 * (+el.sphereRadius.value / 85)),
      ),
    };
  }
  // Mesh the actual fixed-angle Hopf surfaces, rather than inferring geometry
  // from which lattice spheres happen to be visible. The stereographic chart
  // has no finite image at x0=1. Truncate cells approaching that pole so no
  // mesh edge connects distant points across infinity.
  const surfaceCache = new Map(),
    surfaceRadiusLimit = 18,
    surfaceEdgeLimit = 5;
  function surfaceVertex(xi1, xi2, eta) {
    const sin = Math.sin(eta),
      cos = Math.cos(eta),
      x0 = sin * Math.cos(xi1),
      denominator = 1 - x0;
    if (denominator < 1e-8) return null;
    const stereo = {
      X: (cos * Math.cos(xi2)) / denominator,
      Y: (cos * Math.sin(xi2)) / denominator,
      Z: (sin * Math.sin(xi1)) / denominator,
    };
    return Object.values(stereo).every(Number.isFinite) &&
      Math.hypot(stereo.X, stereo.Y, stereo.Z) <= surfaceRadiusLimit
      ? { stereo }
      : null;
  }
  function surfaceTriangles(kind, index) {
    const key = kind + ":" + index;
    if (surfaceCache.has(key)) return surfaceCache.get(key);
    const circular = 48,
      radial = 36,
      periodicA = kind === "AB" || kind === "AE",
      periodicB = kind === "AB" || kind === "BE";
    const na = periodicA ? circular : radial,
      nb = periodicB ? circular : radial,
      vertices = [];
    for (let a = 0; a <= na; a++) {
      const row = [];
      for (let b = 0; b <= nb; b++) {
        const xi1 =
            kind === "BE" ? (index * Math.PI) / 9 : (a * 2 * Math.PI) / na,
          xi2 = kind === "AE" ? (index * Math.PI) / 9 : (b * 2 * Math.PI) / nb,
          eta =
            kind === "AB"
              ? (index * Math.PI) / 18
              : ((kind === "AE" ? b : a) * Math.PI) /
                (2 * (kind === "AE" ? nb : na));
        row.push(surfaceVertex(xi1, xi2, eta));
      }
      vertices.push(row);
    }
    const triangles = [],
      distance = (p, q) =>
        Math.hypot(
          p.stereo.X - q.stereo.X,
          p.stereo.Y - q.stereo.Y,
          p.stereo.Z - q.stereo.Z,
        );
    for (let a = 0; a < na; a++)
      for (let b = 0; b < nb; b++) {
        const p = vertices[a][b],
          q = vertices[a + 1][b],
          r = vertices[a][b + 1],
          t = vertices[a + 1][b + 1];
        for (const triangle of [
          [p, q, r],
          [q, t, r],
        ])
          if (
            triangle.every(Boolean) &&
            distance(triangle[0], triangle[1]) < surfaceEdgeLimit &&
            distance(triangle[1], triangle[2]) < surfaceEdgeLimit &&
            distance(triangle[2], triangle[0]) < surfaceEdgeLimit
          )
            triangles.push(triangle);
      }
    surfaceCache.set(key, triangles);
    return triangles;
  }
  function drawSurfaces() {
    const opacity = +el.sphereSurfaceOpacity.value / 100;
    if (!opacity) return;
    const surfaces = [
        ["AB", "sphereSurfaceAB", +el.sphereEta.value, [58, 192, 215]],
        ["AE", "sphereSurfaceAE", +el.sphereBeta.value % 18, [247, 171, 95]],
        ["BE", "sphereSurfaceBE", +el.sphereAlpha.value % 18, [193, 145, 246]],
      ],
      draw = [];
    for (const [kind, id, index, rgb] of surfaces) {
      if (!el[id].checked || (kind === "AB" && (index === 0 || index === 9)))
        continue;
      for (const triangle of surfaceTriangles(kind, index)) {
        const screen = triangle.map(project);
        draw.push({
          screen,
          rgb,
          depth: screen.reduce((sum, p) => sum + p.depth, 0) / 3,
        });
      }
    }
    draw.sort((a, b) => a.depth - b.depth);
    for (const { screen, rgb } of draw) {
      ctx.beginPath();
      ctx.moveTo(screen[0].sx, screen[0].sy);
      ctx.lineTo(screen[1].sx, screen[1].sy);
      ctx.lineTo(screen[2].sx, screen[2].sy);
      ctx.closePath();
      ctx.fillStyle = `rgba(${rgb.join(",")},${opacity})`;
      ctx.fill();
    }
  }
  function gridPoints() {
    const k = +el.sphereEta.value;
    return el.sphereTorusGrid.checked && k > 0 && k < 9
      ? points.filter((p) => p.k === k && p.stereo)
      : [];
  }
  // Sample coordinate curves on the same continuous surface as the fill.
  // Break the pen near the stereographic pole; never join the two sides of ∞.
  function drawParametricCurve(position, start, end, steps, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    let previous = null,
      segment = false;
    for (let n = 0; n <= steps; n++) {
      const t = start + ((end - start) * n) / steps,
        vertex = position(t);
      if (!vertex) {
        if (segment) ctx.stroke();
        ctx.beginPath();
        previous = null;
        segment = false;
        continue;
      }
      if (
        previous &&
        Math.hypot(
          vertex.stereo.X - previous.stereo.X,
          vertex.stereo.Y - previous.stereo.Y,
          vertex.stereo.Z - previous.stereo.Z,
        ) >= surfaceEdgeLimit
      ) {
        if (segment) ctx.stroke();
        ctx.beginPath();
        previous = null;
        segment = false;
      }
      const q = project(vertex);
      if (previous) {
        ctx.lineTo(q.sx, q.sy);
        segment = true;
      } else ctx.moveTo(q.sx, q.sy);
      previous = vertex;
    }
    if (segment) ctx.stroke();
  }
  function drawGrid() {
    if (!el.sphereTorusGrid.checked) return;
    const eta = (+el.sphereEta.value * Math.PI) / 18,
      xi1 = ((+el.sphereAlpha.value % 18) * Math.PI) / 9,
      xi2 = ((+el.sphereBeta.value % 18) * Math.PI) / 9;
    const color1 = "rgba(127,182,255,.66)",
      color2 = "rgba(244,205,130,.60)",
      colorEta = "rgba(138,230,172,.66)";
    if (el.sphereSurfaceAB.checked && eta > 0 && eta < Math.PI / 2)
      for (let index = 0; index < 18; index++) {
        const a = (index * Math.PI) / 9;
        drawParametricCurve(
          (t) => surfaceVertex(t, a, eta),
          0,
          2 * Math.PI,
          144,
          color1,
        );
        drawParametricCurve(
          (t) => surfaceVertex(a, t, eta),
          0,
          2 * Math.PI,
          144,
          color2,
        );
      }
    if (el.sphereSurfaceAE.checked)
      for (let index = 0; index < 18; index++) {
        const a = (index * Math.PI) / 9;
        drawParametricCurve(
          (t) => surfaceVertex(t, xi2, (index * Math.PI) / 18),
          0,
          2 * Math.PI,
          144,
          color1,
        );
        drawParametricCurve(
          (t) => surfaceVertex(a, xi2, t),
          0,
          Math.PI / 2,
          72,
          colorEta,
        );
      }
    if (el.sphereSurfaceBE.checked)
      for (let index = 0; index < 18; index++) {
        const a = (index * Math.PI) / 9;
        drawParametricCurve(
          (t) => surfaceVertex(xi1, t, (index * Math.PI) / 18),
          0,
          2 * Math.PI,
          144,
          color2,
        );
        drawParametricCurve(
          (t) => surfaceVertex(xi1, a, t),
          0,
          Math.PI / 2,
          72,
          colorEta,
        );
      }
  }
  function drawCoreCircle() {
    if (!el.sphereCoreCircle.checked) return;
    drawParametricCurve(
      (t) => surfaceVertex(0, t, 0),
      0,
      2 * Math.PI,
      144,
      "rgba(238,241,248,.62)",
    );
  }
  function renderInspector() {
    const detail = document.getElementById("sphereInspectPoints");
    if (!chosen) {
      detail.textContent =
        "Click a sphere to inspect its Hopf coordinates and number.";
    } else {
      const p = chosen,
        active = p.counter ? visibleCounter(p) : visible(p),
        description = p.counter
          ? `White ${p.family === "AB" ? "ξ₁ξ₂" : p.family === "AE" ? "ξ₁η" : "ξ₂η"} counterspace · 8i + 5j + 2k + ${dualOffsets[p.family]} (mod 9)`
          : "Colored space · i + 4j + 7k (mod 9)";
      detail.innerHTML = `<div class="point-card"><span class="inspect-circle" style="--circle:${p.counter ? "#f1f1ed" : colors[p.value % 3]}">${p.value}</span><div class="inspect-grid"><strong>Number:</strong> ${p.value} · F${p.value % 3}<br>${description}<br><strong>ξ₁:</strong> ${pointAngle(p.i, p.di, 9)}<br><strong>ξ₂:</strong> ${pointAngle(p.j, p.dj, 9)}<br><strong>η:</strong> ${pointAngle(p.k, p.dk, 18)}<br><strong>Indices (i,j,k):</strong> (${p.i}, ${p.j}, ${p.k})<br><strong>(x₀, x₁, x₂, x₃):</strong><br>(${[p.x0, p.x1, p.x2, p.x3].map((v) => v.toFixed(3)).join(", ")})<br><strong>Stereographic (X,Y,Z):</strong><br>${p.stereo ? `(${[p.stereo.X, p.stereo.Y, p.stereo.Z].map((v) => v.toFixed(3)).join(", ")})` : "∞ (projection pole)"}<br><small>${active ? "In the selected slices" : "Currently hidden by the point controls"}</small></div></div>`;
    }
    const planeDetail = document.getElementById("sphereInspectPlanes"),
      descriptions = [
        [
          "sphereAB",
          "sphereABAll",
          "η",
          "sphereEta",
          (p) => p.k === +el.sphereEta.value,
        ],
        [
          "sphereAE",
          "sphereAEAll",
          "ξ₂",
          "sphereBeta",
          (p) => p.k === 9 || p.j === +el.sphereBeta.value % 18,
        ],
        [
          "sphereBE",
          "sphereBEAll",
          "ξ₁",
          "sphereAlpha",
          (p) => p.k === 0 || p.i === +el.sphereAlpha.value % 18,
        ],
      ];
    planeDetail.innerHTML =
      "<strong>Selected angle slices</strong>" +
      descriptions
        .map(([id, allId, name, offsetId, match]) => {
          const enabled = el[id].checked,
            all = el[allId].checked,
            count = enabled
              ? points.filter(
                  (p) =>
                    el["sphereF" + (p.value % 3)].checked && (all || match(p)),
                ).length
              : 0,
            family = { sphereAB: "AB", sphereAE: "AE", sphereBE: "BE" }[id],
            white = counterPoints.filter(
              (p) => p.family === family && visibleCounter(p),
            ).length;
          return `<div class="point-card"><strong>${{ sphereAB: "ξ₁ξ₂", sphereAE: "ξ₁η", sphereBE: "ξ₂η" }[id]}</strong> · ${enabled ? (all ? "all offsets" : name + " = " + angle(+el[offsetId].value, name === "η" ? 18 : 9)) : "space off"}<br>${count} colored · ${white} white points</div>`;
        })
        .join("");
  }
  function render() {
    if (display.hidden || !W || !H) return;
    ctx.fillStyle = "#101923";
    ctx.fillRect(0, 0, W, H);
    hits = [];
    const space = points.filter(visible),
      counter = counterPoints.filter(visibleCounter),
      selected = [...space, ...counter],
      finite = selected.filter((p) => p.stereo),
      atInfinity = selected.length - finite.length;
    document.getElementById("spherePole").hidden = !atInfinity;
    drawSurfaces();
    drawCoreCircle();
    drawGrid();
    if (finite.length) {
      const drawn = finite
        .map((point) => ({ point, screen: project(point) }))
        .sort((a, b) => a.screen.depth - b.screen.depth);
      for (const { point: p, screen: q } of drawn) {
        const r = p.counter ? q.r * 0.85 : q.r,
          g = ctx.createRadialGradient(
            q.sx - r * 0.35,
            q.sy - r * 0.4,
            r * 0.08,
            q.sx,
            q.sy,
            r,
          );
        g.addColorStop(0, "#fff");
        g.addColorStop(0.33, p.counter ? "#f1f1ed" : colors[p.value % 3]);
        g.addColorStop(1, p.counter ? "#8997a8" : "#182b3d");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, r, 0, Math.PI * 2);
        ctx.fill();
        if (
          chosen === p &&
          document.getElementById("sphereInspectorToggle").checked
        ) {
          ctx.strokeStyle = "#ffe348";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(q.sx, q.sy, r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (
          p.counter ? el.sphereCounterNumbers.checked : el.sphereNumbers.checked
        ) {
          ctx.font = `bold ${el.sphereFont.value}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#f6f8ff";
          ctx.fillText(String(p.value), q.sx, q.sy - r - 3);
        }
        hits.push({ ...q, r, point: p });
      }
    }
    document.getElementById("sphereOverlay").textContent =
      `${space.length - atInfinity} colored · ${counter.length} white${atInfinity ? ` · ${atInfinity} at stereographic infinity` : ""} · drag to rotate`;
    renderInspector();
  }
  function resize() {
    if (display.hidden) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  for (const id of ids)
    el[id].addEventListener("input", () => {
      updateReadouts();
      render();
    });
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
    const dx = e.clientX - down.x,
      dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
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
    if (!moved && document.getElementById("sphereInspectorToggle").checked) {
      const box = canvas.getBoundingClientRect(),
        x = e.clientX - box.left,
        y = e.clientY - box.top,
        candidate = hits
          .filter((h) => Math.hypot(h.sx - x, h.sy - y) < Math.max(8, h.r + 3))
          .at(-1);
      if (candidate) {
        chosen = chosen === candidate.point ? null : candidate.point;
        document.querySelector('[data-sphere-inspector="points"]').click();
        render();
      }
    }
    down = null;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = Math.max(0.08, Math.min(5, zoom * Math.exp(-e.deltaY * 0.001)));
      render();
    },
    { passive: false },
  );
  document.getElementById("sphereReset").onclick = () => {
    yaw = 0.62;
    pitch = 0.66;
    zoom = 1;
    panX = panY = 0;
    render();
  };
  document.getElementById("sphereTogglePanel").onclick = () => {
    const collapsed = controls.classList.toggle("collapsed"),
      button = document.getElementById("sphereTogglePanel");
    button.textContent = collapsed ? "Show controls" : "Hide controls";
    button.setAttribute("aria-expanded", String(!collapsed));
    render();
  };
  document.getElementById("spherePole").onclick = () => {
    const pole = points.find((p) => !p.stereo);
    chosen = chosen === pole ? null : pole;
    document.querySelector('[data-sphere-inspector="points"]').click();
    render();
  };
  document
    .getElementById("sphereInspectorToggle")
    .addEventListener("input", resize);
  window.addEventListener("resize", resize);
  updateReadouts();
  return resize;
}
