// Patch @react-three/drei for React 19 compatibility
// In React 19, calling currentRoot.unmount() synchronously inside useLayoutEffect cleanup
// throws: "Attempted to synchronously unmount a root while React was already rendering."
// This script patches Drei's Html component so unmounting is safely deferred to next tick.

const fs = require("fs");
const path = require("path");

const dreiPkgPath = path.join(__dirname, "../node_modules/@react-three/drei/package.json");
if (!fs.existsSync(dreiPkgPath)) {
  console.log("[patch-drei] @react-three/drei is not installed. Skipping patch.");
  process.exit(0);
}

const dreiPkg = JSON.parse(fs.readFileSync(dreiPkgPath, "utf8"));
const version = dreiPkg.version || "0.0.0";
const major = parseInt(version.split(".")[0], 10);

// Only patch versions < 11 where the synchronous unmount issue exists
if (major >= 11) {
  console.log(`[patch-drei] Drei version ${version} >= 11.0.0; upstream React 19 fix expected. Skipping.`);
  process.exit(0);
}

const targets = [
  {
    path: path.join(__dirname, "../node_modules/@react-three/drei/web/Html.js"),
    find: `      return () => {
        if (target) target.removeChild(el);
        currentRoot.unmount();
      };`,
    replace: `      return () => {
        if (target && target.contains && target.contains(el)) {
          try {
            target.removeChild(el);
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[patch-drei] Notice: target.removeChild had non-fatal warning:", err);
            }
          }
        }
        setTimeout(() => {
          try {
            currentRoot.unmount();
          } catch (err) {
            // Tolerate already-unmounted roots; surface genuine unexpected errors in dev
            if (process.env.NODE_ENV !== "production" && !String(err).includes("unmount")) {
              console.warn("[patch-drei] Notice: currentRoot.unmount had non-fatal warning:", err);
            }
          }
        }, 0);
      };`,
  },
  {
    path: path.join(__dirname, "../node_modules/@react-three/drei/index.cjs.js"),
    find: `return Y&&(i?Y.prepend(G):Y.appendChild(G)),()=>{Y&&Y.removeChild(G),e.unmount()}}`,
    replace: `return Y&&(i?Y.prepend(G):Y.appendChild(G)),()=>{if(Y&&Y.contains&&Y.contains(G)){try{Y.removeChild(G)}catch(err){}}setTimeout((()=>{try{e.unmount()}catch(err){}}),0)}}`,
  },
];

let patchedCount = 0;

for (const target of targets) {
  if (fs.existsSync(target.path)) {
    let content = fs.readFileSync(target.path, "utf8");
    if (content.includes(target.find)) {
      content = content.replace(target.find, target.replace);
      fs.writeFileSync(target.path, content, "utf8");
      console.log(`[patch-drei] Successfully patched: ${path.relative(process.cwd(), target.path)}`);
      patchedCount++;
    } else if (content.includes("setTimeout") && (content.includes("currentRoot.unmount()") || content.includes("e.unmount()"))) {
      console.log(`[patch-drei] Already patched (idempotent): ${path.relative(process.cwd(), target.path)}`);
      patchedCount++;
    } else {
      console.warn(`[patch-drei] Warning: target pattern not found in ${path.relative(process.cwd(), target.path)}`);
    }
  } else {
    console.log(`[patch-drei] Skipping missing file: ${path.relative(process.cwd(), target.path)}`);
  }
}

console.log(`[patch-drei] Complete for @react-three/drei v${version}. ${patchedCount} files verified/patched.`);
