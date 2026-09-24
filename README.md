# VBM Visualizer

VBM Visualizer is a SolidJS app for exploring a mod 9 lattice and its Hopf-coordinate representation on the 3-sphere. Switch between the **3-Torus** and **3-Sphere** tabs to explore numbered points, colored space families, white counterspace points, coordinate slices, curves, and planes. The 3-sphere view uses stereographic projection.

In the lattice view, drag to rotate, right-drag to pan, scroll to zoom, and click a point or plane to inspect it. The controls let you change the visible slices and geometry, save presets in your browser, reset the view, and export the lattice canvas as a PNG.

## Download and run

You need Node.js 20.19+ (20.x) or 22.12+, and npm.

1. Download the repository from [GitHub](https://github.com/jake-downey/vbm-visualizer) using **Code → Download ZIP** and extract it, or clone it:

   ```bash
   git clone https://github.com/jake-downey/vbm-visualizer.git
   cd vbm-visualizer
   ```

2. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

3. Open the local URL printed by Vite, usually `http://localhost:5173/`.

To build a production version, run `npm run build`. The output goes to `dist/`; use `npm run preview` to serve that build locally.

The interface is in `src/App.jsx`, with the lattice and sphere renderers in `src/lattice.js` and `src/sphere.js`.
