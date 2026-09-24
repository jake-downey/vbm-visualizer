import { createSignal, onMount } from "solid-js";
import { initLattice } from "./lattice.js";
import { initSphere } from "./sphere.js";
import "./styles.css";

export default function App() {
  const [geometry, setGeometry] = createSignal("torus");
  let switchGeometry;
  let resizeSphere;

  onMount(() => {
    switchGeometry = initLattice();
    resizeSphere = initSphere();
  });

  function selectGeometry(next) {
    switchGeometry(next);
    setGeometry(next);
    if (next === "sphere") resizeSphere();
  }

  return (
    <>
      <nav class="space-tabs" role="tablist" aria-label="Geometry views">
        <button
          id="torusTab"
          type="button"
          role="tab"
          aria-selected={geometry() === "torus"}
          aria-controls="view"
          onClick={() => selectGeometry("torus")}
        >
          3-Torus
        </button>
        <button
          id="sphereTab"
          type="button"
          role="tab"
          aria-selected={geometry() === "sphere"}
          aria-controls="sphereDisplay"
          onClick={() => selectGeometry("sphere")}
        >
          3-Sphere
        </button>
      </nav>
      <main
        id="sphereDisplay"
        class="sphere-display"
        aria-label="3-Sphere display"
        hidden
      >
        <canvas
          id="sphereCanvas"
          aria-label="Hopf-coordinate points on the unit 3-Sphere"
        ></canvas>
        <button
          id="spherePole"
          class="sphere-pole"
          type="button"
          hidden
          title="Stereographic projection pole at infinity"
        >
          ∞ · 0
        </button>
        <div class="sphere-overlay" id="sphereOverlay">
          3-Sphere · stereographic projection · drag to rotate · click to
          inspect
        </div>
      </main>
      <aside class="panel controls sphere-controls" id="sphereControls" hidden>
        <div class="panel-header">
          <h1>3-Sphere controls</h1>
          <button id="sphereTogglePanel" type="button" aria-expanded="true">
            Hide controls
          </button>
        </div>
        <div class="panel-body">
          <label class="inspector-menu-toggle">
            Inspector
            <input id="sphereInspectorToggle" type="checkbox" checked />
          </label>
          <details open>
            <summary>Points</summary>
            <div class="hint">
              ξ₁ rotates (x₀,x₁) · ξ₂ rotates (x₂,x₃) · η sets their radii.
            </div>
            <div class="subheading">Hopf angle slices</div>
            <div class="slice-row">
              <label>
                <input id="sphereAB" type="checkbox" checked /> ξ₁ξ₂
              </label>
              <span>
                η{" "}
                <input id="sphereEta" type="range" min="0" max="9" value="4" />
                <b id="sphereEtav">4π/18</b>
              </span>
              <label class="all">
                <input id="sphereABAll" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="sphereAE" type="checkbox" /> ξ₁η
              </label>
              <span>
                ξ₂{" "}
                <input
                  id="sphereBeta"
                  type="range"
                  min="0"
                  max="18"
                  value="0"
                />
                <b id="sphereBetav">0</b>
              </span>
              <label class="all">
                <input id="sphereAEAll" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="sphereBE" type="checkbox" /> ξ₂η
              </label>
              <span>
                ξ₁{" "}
                <input
                  id="sphereAlpha"
                  type="range"
                  min="0"
                  max="18"
                  value="0"
                />
                <b id="sphereAlphav">0</b>
              </span>
              <label class="all">
                <input id="sphereBEAll" type="checkbox" /> All
              </label>
            </div>
            <div class="hint">
              ξ₁, ξ₂: π/9 steps (2π wraps to 0). η: π/18 steps through π/2.
            </div>
            <div class="subheading">Colored space families</div>
            <label>
              F0 &#123;0,3,6&#125;
              <input id="sphereF0" type="checkbox" checked />
            </label>
            <label>
              F1 &#123;1,4,7&#125;
              <input id="sphereF1" type="checkbox" checked />
            </label>
            <label>
              F2 &#123;2,5,8&#125;
              <input id="sphereF2" type="checkbox" checked />
            </label>
            <div class="subheading">
              White counterspace · half steps in each named pair
            </div>
            <label>
              Show counterspace
              <input id="sphereCounter" type="checkbox" checked />
            </label>
            <div class="slice-row">
              <label>
                <input id="sphereCounterAB" type="checkbox" checked /> ξ₁ξ₂
              </label>
              <span>η offset</span>
              <label class="all">
                <input id="sphereCounterABAll" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="sphereCounterAE" type="checkbox" /> ξ₁η
              </label>
              <span>ξ₂ offset</span>
              <label class="all">
                <input id="sphereCounterAEAll" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="sphereCounterBE" type="checkbox" /> ξ₂η
              </label>
              <span>ξ₁ offset</span>
              <label class="all">
                <input id="sphereCounterBEAll" type="checkbox" /> All
              </label>
            </div>
            <div class="hint">
              Uses the sliders above; each white family has its own All switch.
              ξ₁, ξ₂ shift by π/18; η shifts by π/36.
            </div>
          </details>
          <details>
            <summary>Lines</summary>
            <label>
              Surface coordinate curves
              <input id="sphereTorusGrid" type="checkbox" checked />
            </label>
            <label>
              Common core circle
              <input id="sphereCoreCircle" type="checkbox" checked />
            </label>
            <div class="hint">
              The core circle stays fixed as η changes. The selected torus grows
              toward the stereographic pole.
            </div>
          </details>
          <details>
            <summary>Planes</summary>
            <label>
              ξ₁ξ₂ · fixed η
              <input id="sphereSurfaceAB" type="checkbox" checked />
            </label>
            <label>
              ξ₁η · fixed ξ₂
              <input id="sphereSurfaceAE" type="checkbox" />
            </label>
            <label>
              ξ₂η · fixed ξ₁
              <input id="sphereSurfaceBE" type="checkbox" />
            </label>
            <label>
              Surface opacity{" "}
              <input
                id="sphereSurfaceOpacity"
                type="range"
                min="0"
                max="70"
                value="19"
              />
              <span class="value" id="sphereSurfaceOpacityv">
                19%
              </span>
            </label>
            <div class="hint">
              Each surface follows its corresponding offset slider in Points.
              Surfaces remain visible independently of sphere families.
            </div>
          </details>
          <details>
            <summary>Display</summary>
            <label>
              Space numbers
              <input id="sphereNumbers" type="checkbox" checked />
            </label>
            <label>
              Counterspace numbers
              <input id="sphereCounterNumbers" type="checkbox" checked />
            </label>
            <label>
              Sphere size{" "}
              <input
                id="sphereRadius"
                type="range"
                min="40"
                max="150"
                value="85"
              />
              <span class="value" id="sphereRadiusv">
                85
              </span>
            </label>
            <label>
              Number size{" "}
              <input id="sphereFont" type="range" min="8" max="24" value="11" />
              <span class="value" id="sphereFontv">
                11
              </span>
            </label>
            <div class="hint">
              ξ₁: +1/−1 ≡ 1/8 · ξ₂: +4/−4 ≡ 4/5 · η: +7/−7 ≡ 7/2 (mod 9). Zoom
              out to follow points approaching infinity.
            </div>
          </details>
          <div class="actions">
            <button id="sphereReset" type="button">
              Reset view
            </button>
          </div>
        </div>
      </aside>
      <aside class="slice-panel sphere-inspector" id="sphereInspector" hidden>
        <div class="inspector-header">
          <strong>3-Sphere Inspector</strong>
          <div class="inspector-tabs">
            <button type="button" data-sphere-inspector="points">
              Points
            </button>
            <button type="button" data-sphere-inspector="lines">
              Lines
            </button>
            <button type="button" data-sphere-inspector="planes">
              Planes
            </button>
          </div>
        </div>
        <div class="inspector-body">
          <section class="inspector-section" id="sphereInspectPoints">
            Click a colored sphere to inspect its Hopf coordinates and number.
          </section>
          <section class="inspector-section" id="sphereInspectLines" hidden>
            Path inspection will appear here once the 3-Sphere directions are
            defined.
          </section>
          <section class="inspector-section" id="sphereInspectPlanes" hidden>
            Choose angle offsets to inspect the selected point slices.
          </section>
        </div>
      </aside>
      <canvas
        id="view"
        aria-label="Interactive three-dimensional lattice"
      ></canvas>
      <div class="panel controls" id="controlPanel">
        <div class="panel-header">
          <h1>Mod 9 lattice viewer</h1>
          <button
            id="togglePanel"
            type="button"
            aria-expanded="true"
            aria-controls="panelBody"
          >
            Hide controls
          </button>
        </div>
        <div class="panel-body" id="panelBody">
          <label class="inspector-menu-toggle">
            Inspector
            <input id="split2D" type="checkbox" checked />
          </label>
          <div class="hint">
            Drag: rotate · right drag: pan · wheel: zoom · click: inspect
          </div>
          <details open>
            <summary>Presets</summary>
            <div class="preset-list" id="presetList"></div>
            <div class="preset-save">
              <input
                id="presetName"
                type="text"
                maxlength="60"
                placeholder="Name your preset"
                aria-label="Preset name"
              />
              <button id="savePreset" type="button">
                Save preset
              </button>
            </div>
            <div
              class="hint preset-status"
              id="presetStatus"
              role="status"
            ></div>
          </details>
          <details open>
            <summary>Points</summary>
            <label>
              Extent{" "}
              <input id="extent" type="range" min="0" max="4" value="4" />
              <span class="value" id="extentv">
                4
              </span>
            </label>
            <div class="subheading">
              Slices · select an offset or all offsets
            </div>
            <div class="slice-row">
              <label>
                <input id="xy" type="checkbox" checked /> XY
              </label>
              <span>
                z = <input id="z" type="range" min="-4" max="4" value="0" />{" "}
                <b id="zv">0</b>
              </span>
              <label class="all">
                <input id="xyOffsets" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="xz" type="checkbox" checked /> XZ
              </label>
              <span>
                y = <input id="y" type="range" min="-4" max="4" value="0" />{" "}
                <b id="yv">0</b>
              </span>
              <label class="all">
                <input id="xzOffsets" type="checkbox" /> All
              </label>
            </div>
            <div class="slice-row">
              <label>
                <input id="yz" type="checkbox" checked /> YZ
              </label>
              <span>
                x = <input id="x" type="range" min="-4" max="4" value="0" />{" "}
                <b id="xv">0</b>
              </span>
              <label class="all">
                <input id="yzOffsets" type="checkbox" /> All
              </label>
            </div>
            <label>
              Space labels
              <input id="labels" type="checkbox" />
            </label>
            <label>
              Counterspace labels
              <input id="dualLabels" type="checkbox" />
            </label>
            <label>
              Number size{" "}
              <input id="numberSize" type="range" min="8" max="28" value="11" />
              <span class="value" id="numberSizev">
                11
              </span>
            </label>
            <label>
              Show space
              <input id="showSpace" type="checkbox" checked />
            </label>
            <label>
              Show counterspace
              <input id="dual" type="checkbox" checked />
            </label>
            <label>
              Green diagonal spheres only
              <input id="greenOnly" type="checkbox" />
            </label>
            <div class="subheading">Space families</div>
            <label>
              F0 &#123;0,3,6&#125;
              <input id="f0" type="checkbox" checked />
            </label>
            <label>
              F1 &#123;1,4,7&#125;
              <input id="f1" type="checkbox" checked />
            </label>
            <label>
              F2 &#123;2,5,8&#125;
              <input id="f2" type="checkbox" checked />
            </label>
            <div class="subheading">Counterspace families</div>
            <label>
              F0 &#123;0,3,6&#125;
              <input id="df0" type="checkbox" checked />
            </label>
            <label>
              F1 &#123;1,4,7&#125;
              <input id="df1" type="checkbox" checked />
            </label>
            <label>
              F2 &#123;2,5,8&#125;
              <input id="df2" type="checkbox" checked />
            </label>
          </details>
          <details>
            <summary>Lines</summary>
            <label>
              <span style="color:#657080">●</span> Space cubes
              <input id="cubes" type="checkbox" />
            </label>
            <label>
              <span style="color:#c5a0ff">●</span> XY counterspace cubes
              <input id="cubeXY" type="checkbox" />
            </label>
            <label>
              <span style="color:#ffc474">●</span> XZ counterspace cubes
              <input id="cubeXZ" type="checkbox" />
            </label>
            <label>
              <span style="color:#80daf1">●</span> YZ counterspace cubes
              <input id="cubeYZ" type="checkbox" />
            </label>
            <label>
              Octahedra
              <input id="octa" type="checkbox" />
            </label>
            <label>
              Tetrahedra
              <input id="tetra" type="checkbox" />
            </label>
          </details>
          <details open>
            <summary>Planes</summary>
            <div class="hint">
              Click a colored or white plane in 3D. Shift-click selects a plane
              behind a sphere.
            </div>
            <div class="subheading">Colored axis planes</div>
            <div class="axis-row">
              <label>
                <input id="axisXY" type="checkbox" checked /> XY
              </label>
              <label>
                <input id="axisXYAll" type="checkbox" /> All
              </label>
            </div>
            <div class="axis-row">
              <label>
                <input id="axisXZ" type="checkbox" checked /> XZ
              </label>
              <label>
                <input id="axisXZAll" type="checkbox" /> All
              </label>
            </div>
            <div class="axis-row">
              <label>
                <input id="axisYZ" type="checkbox" checked /> YZ
              </label>
              <label>
                <input id="axisYZAll" type="checkbox" /> All
              </label>
            </div>
            <label>
              Opacity{" "}
              <input id="opacity" type="range" min="0" max="100" value="10" />
              <span class="value" id="opacityv">
                10
              </span>
            </label>
            <div class="subheading">White counterspace planes</div>
            <label>
              XY · halfway along Z<input id="halfXY" type="checkbox" />
            </label>
            <label>
              XZ · halfway along Y<input id="halfXZ" type="checkbox" />
            </label>
            <label>
              YZ · halfway along X<input id="halfYZ" type="checkbox" />
            </label>
            <div class="subheading">Long diagonal planes</div>
            <label>
              Green · 933966
              <input id="diagGreen" type="checkbox" />
            </label>
            <label>
              Red · 124875
              <input id="diagRed" type="checkbox" />
            </label>
            <label>
              Blue · 157842
              <input id="diagBlue" type="checkbox" />
            </label>
            <label>
              Opacity{" "}
              <input
                id="diagOpacity"
                type="range"
                min="0"
                max="100"
                value="10"
              />
              <span class="value" id="diagOpacityv">
                10
              </span>
            </label>
          </details>
          <details open>
            <summary>Display</summary>
            <label>
              Sphere size{" "}
              <input id="radius" type="range" min="40" max="150" value="85" />
              <span class="value" id="radiusv">
                85
              </span>
            </label>
            <label>
              Axes
              <input id="axes" type="checkbox" checked />
            </label>
            <label>
              Gray wireframe cube
              <input id="wireCube" type="checkbox" checked />
            </label>
          </details>
          <div class="actions">
            <button id="reset">Reset view</button>
            <button id="shot">Save PNG</button>
          </div>
        </div>
      </div>
      <div class="panel info" id="info">
        Click a sphere to inspect its value. Turn on All offsets to show the
        full grid.
        <br />
        <span class="hint">
          Choose Selected offset or All offsets for each plane. Drag to rotate;
          Reset view restores x right and y up.
        </span>
      </div>
      <div class="slice-panel" id="slicePanel" hidden>
        <div class="inspector-header">
          <strong>Inspector</strong>
          <div class="inspector-tabs">
            <div class="tab-control">
              <button type="button" data-inspector="points">
                Points
              </button>
              <input
                id="inspectPointsOn"
                type="checkbox"
                checked
                aria-label="Enable point inspector"
              />
            </div>
            <div class="tab-control">
              <button type="button" data-inspector="lines">
                Lines
              </button>
              <input
                id="vectorMode"
                type="checkbox"
                checked
                aria-label="Enable vector inspector"
              />
            </div>
            <div class="tab-control">
              <button type="button" data-inspector="planes">
                Planes
              </button>
              <input
                id="inspectPlanesOn"
                type="checkbox"
                checked
                aria-label="Enable plane inspector"
              />
            </div>
          </div>
        </div>
        <div class="inspector-body">
          <section id="inspectPoints" class="inspector-section" hidden>
            <label class="inspector-multi">
              Multiple points
              <input id="multiPoints" type="checkbox" />
            </label>
            <div id="pointDetails" class="point-details">
              Click a sphere in the 3D view.
            </div>
          </section>
          <section id="inspectLines" class="inspector-section" hidden>
            <div class="panel vector-window" id="vectorWindow" hidden>
              <div class="vector-head">
                <h2>Vector compass</h2>
                <button
                  id="closeVector"
                  type="button"
                  aria-label="Close vector compass"
                >
                  ×
                </button>
              </div>
              <canvas
                id="vectorCanvas"
                width="294"
                height="288"
                aria-label="Click a direction sphere to choose a vector"
              ></canvas>
              <label class="vector-loop-toggle">
                <span>Multiple vectors</span>
                <input id="multiVector" type="checkbox" />
              </label>
              <label class="vector-loop-toggle">
                <span>Show repeated loop</span>
                <input id="showLoop" type="checkbox" />
              </label>
              <div class="hint" id="vectorStatus">
                Click a sphere to choose a direction. Drag to rotate.
              </div>
            </div>
            <div id="loopDetails" class="loop-details">
              Turn on Vector mode under Lines and choose a direction.
            </div>
          </section>
          <section id="inspectPlanes" class="inspector-section" hidden>
            <label class="inspector-multi">
              Multiple planes
              <input id="multiPlanes" type="checkbox" />
            </label>
            <div id="planeGallery" class="plane-gallery">
              Click a colored plane in 3D or use Selected plane in the menu.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
