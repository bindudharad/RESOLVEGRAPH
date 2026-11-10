const fs = require("fs");
const path = require("path");

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
      if (this.onload) this.onload({ target: this });
    }).catch((err) => {
      if (this.onerror) this.onerror(err);
    });
  }
};

const THREE = require("three");
const { GLTFExporter } = require("three/examples/jsm/exporters/GLTFExporter.js");

const modelsDir = path.join(process.cwd(), "public", "models");
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

async function exportSceneToGlb(scene, filename) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true });
  const buffer = Buffer.from(result);
  const outPath = path.join(modelsDir, filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated model: ${outPath} (${buffer.length} bytes)`);
  return outPath;
}

async function generateForensicPackage() {
  const scene = new THREE.Scene();
  scene.name = "ForensicPackageScene";

  const packageRoot = new THREE.Group();
  packageRoot.name = "PackageRoot";
  scene.add(packageRoot);

  // 1. Outer Box Bottom Tray
  const bottomGeo = new THREE.BoxGeometry(2.4, 0.7, 1.8);
  const bottomMat = new THREE.MeshStandardMaterial({
    name: "CardboardDark",
    color: 0x241d17,
    roughness: 0.85,
    metalness: 0.05,
  });
  const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
  bottomMesh.name = "CartonBottom";
  bottomMesh.position.y = -0.35;
  packageRoot.add(bottomMesh);

  // 2. Outer Box Top Lid
  const lidGeo = new THREE.BoxGeometry(2.44, 0.35, 1.84);
  const lidMat = new THREE.MeshStandardMaterial({
    name: "CardboardKraft",
    color: 0x362b21,
    roughness: 0.8,
    metalness: 0.08,
  });
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.name = "CartonLid";
  lidMesh.position.y = 0.2;
  packageRoot.add(lidMesh);

  // 3. Shipping Label
  const labelGeo = new THREE.PlaneGeometry(1.6, 1.1);
  const labelMat = new THREE.MeshStandardMaterial({
    name: "ShippingLabel",
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.0,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.name = "LabelBarcode";
  labelMesh.rotation.x = -Math.PI / 2;
  labelMesh.position.set(0, 0.38, 0);
  packageRoot.add(labelMesh);

  // 4. Tamper Evident Holographic Seal Tape
  const sealGeo = new THREE.PlaneGeometry(2.35, 0.28);
  const sealMat = new THREE.MeshStandardMaterial({
    name: "HolographicTamperSeal",
    color: 0x059669,
    emissive: 0x10b981,
    emissiveIntensity: 0.8,
    roughness: 0.15,
    metalness: 0.85,
  });
  const sealMesh = new THREE.Mesh(sealGeo, sealMat);
  sealMesh.name = "SecuritySeal";
  sealMesh.rotation.x = -Math.PI / 2;
  sealMesh.position.set(0, 0.382, 0.15);
  packageRoot.add(sealMesh);

  // 5. Internal Hardware NVMe SSD PCB Board
  const pcbGroup = new THREE.Group();
  pcbGroup.name = "InternalHardwareSSD";
  packageRoot.add(pcbGroup);

  const pcbGeo = new THREE.BoxGeometry(1.8, 0.06, 0.85);
  const pcbMat = new THREE.MeshStandardMaterial({
    name: "PCBGreen",
    color: 0x0d544c,
    roughness: 0.35,
    metalness: 0.6,
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.name = "PCBBoard";
  pcbMesh.position.y = 0.0;
  pcbGroup.add(pcbMesh);

  // Controller IC
  const icGeo = new THREE.BoxGeometry(0.38, 0.05, 0.38);
  const icMat = new THREE.MeshStandardMaterial({
    name: "ICChip",
    color: 0x111115,
    roughness: 0.2,
    metalness: 0.8,
  });
  const icMesh = new THREE.Mesh(icGeo, icMat);
  icMesh.name = "ControllerIC";
  icMesh.position.set(-0.45, 0.05, 0);
  pcbGroup.add(icMesh);

  // NAND Flash Module 1
  const nandGeo = new THREE.BoxGeometry(0.55, 0.045, 0.42);
  const nandMat = new THREE.MeshStandardMaterial({
    name: "NANDModule",
    color: 0x1a1a20,
    roughness: 0.25,
    metalness: 0.5,
  });
  const nand1 = new THREE.Mesh(nandGeo, nandMat);
  nand1.name = "NANDFlash1";
  nand1.position.set(0.15, 0.05, 0);
  pcbGroup.add(nand1);

  // NAND Flash Module 2
  const nand2 = new THREE.Mesh(nandGeo, nandMat);
  nand2.name = "NANDFlash2";
  nand2.position.set(0.55, 0.05, 0);
  pcbGroup.add(nand2);

  // Gold Connector Pins
  const pinGeo = new THREE.BoxGeometry(0.08, 0.02, 0.65);
  const pinMat = new THREE.MeshStandardMaterial({
    name: "GoldConnector",
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.1,
  });
  const pinMesh = new THREE.Mesh(pinGeo, pinMat);
  pinMesh.name = "GoldPins";
  pinMesh.position.set(-0.92, 0.02, 0);
  pcbGroup.add(pinMesh);

  await exportSceneToGlb(scene, "forensic-package.glb");
}

async function generateSecurityCore() {
  const scene = new THREE.Scene();
  scene.name = "SecurityCoreScene";

  const coreGroup = new THREE.Group();
  coreGroup.name = "CoreRoot";
  scene.add(coreGroup);

  // Central Consensus Gem
  const gemGeo = new THREE.IcosahedronGeometry(1.0, 1);
  const gemMat = new THREE.MeshStandardMaterial({
    name: "ConsensusGem",
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    roughness: 0.15,
    metalness: 0.85,
    wireframe: false,
  });
  const gemMesh = new THREE.Mesh(gemGeo, gemMat);
  gemMesh.name = "CentralGem";
  coreGroup.add(gemMesh);

  // Outer Gimbal Ring 1
  const ring1Geo = new THREE.TorusGeometry(1.6, 0.04, 16, 80);
  const ring1Mat = new THREE.MeshStandardMaterial({
    name: "RingAzure",
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.2,
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  ring1.name = "GimbalRing1";
  ring1.rotation.x = Math.PI / 3;
  coreGroup.add(ring1);

  // Outer Gimbal Ring 2
  const ring2Geo = new THREE.TorusGeometry(2.0, 0.05, 16, 80);
  const ring2Mat = new THREE.MeshStandardMaterial({
    name: "RingTeal",
    color: 0x10b981,
    metalness: 0.9,
    roughness: 0.2,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.name = "GimbalRing2";
  ring2.rotation.y = Math.PI / 4;
  coreGroup.add(ring2);

  await exportSceneToGlb(scene, "security-core.glb");
}

async function run() {
  await generateForensicPackage();
  await generateSecurityCore();
  console.log("All 3D .glb models successfully written to public/models!");
}

run().catch(console.error);
