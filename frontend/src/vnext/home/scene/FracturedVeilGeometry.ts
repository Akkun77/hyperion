import * as THREE from 'three';

export interface RibbonSpec {
  id: string;
  name: string;
  controlPoints: THREE.Vector3[];
  widths: number[];
  twists: number[];
  curvature?: number;
  thickness?: number;
  segmentsU: number;
  segmentsV: number;
}

export interface RibbonLUTEntry {
  spine: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  width: number;
  twist: number;
}

/**
 * Precomputed high-resolution lookup table (LUT) for instantaneous,
 * deterministic evaluation of surface positions along folded ribbons.
 */
export class RibbonSampler {
  public spec: RibbonSpec;
  public curve: THREE.CatmullRomCurve3;
  public lut: RibbonLUTEntry[] = [];
  public lutSize = 512;
  public curvature: number;
  public thickness: number;

  constructor(spec: RibbonSpec) {
    this.spec = spec;
    this.curvature = spec.curvature ?? 0.22;
    this.thickness = spec.thickness ?? 0.20;
    this.curve = new THREE.CatmullRomCurve3(spec.controlPoints, false, 'centripetal', 0.5);
    this.buildLUT();
  }

  public updateCurve(points: THREE.Vector3[]): void {
    this.curve.points = points;
    this.curve.updateArcLengths();
    this.buildLUT();
  }

  private buildLUT(): void {
    this.lut = [];
    const nCtrl = this.spec.widths.length;
    const upRef = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.lutSize; i++) {
      const u = i / (this.lutSize - 1);
      const spine = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();

      // Stable orthogonal reference frame with Frenet continuity
      let up = upRef.clone();
      if (Math.abs(tangent.dot(up)) > 0.88) {
        up.set(1, 0, 0);
      }
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      // Width and twist interpolation along spline
      const scaledU = u * (nCtrl - 1);
      const idx0 = Math.floor(scaledU);
      const idx1 = Math.min(idx0 + 1, nCtrl - 1);
      const alpha = scaledU - idx0;
      const smoothAlpha = THREE.MathUtils.smoothstep(alpha, 0, 1);

      const rawWidth = THREE.MathUtils.lerp(this.spec.widths[idx0], this.spec.widths[idx1], smoothAlpha);
      const twist = THREE.MathUtils.lerp(this.spec.twists[idx0], this.spec.twists[idx1], smoothAlpha);

      // Organic silk tapering at extremities
      const taper = Math.sin(Math.PI * Math.min(Math.max(u, 0.0), 1.0));
      const width = rawWidth * (0.24 + 0.76 * Math.pow(taper, 0.35));

      this.lut.push({
        spine,
        tangent,
        normal,
        binormal,
        width,
        twist,
      });
    }
  }

  /**
   * Evaluates surface 3D position at parametric coordinate (u, v).
   * u in [0, 1] (longitudinal along spline), v in [0, 1] (transverse across width).
   */
  public evaluate(
    u: number,
    v: number,
    target = new THREE.Vector3(),
    targetNormal?: THREE.Vector3,
    targetWidthDir?: THREE.Vector3
  ): THREE.Vector3 {
    const clampedU = ((u % 1.0) + 1.0) % 1.0;
    const clampedV = THREE.MathUtils.clamp(v, 0, 1);

    const fIdx = clampedU * (this.lutSize - 1);
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(i0 + 1, this.lutSize - 1);
    const frac = fIdx - i0;

    const e0 = this.lut[i0];
    const e1 = this.lut[i1];

    // Spine interpolation
    const spineX = e0.spine.x + (e1.spine.x - e0.spine.x) * frac;
    const spineY = e0.spine.y + (e1.spine.y - e0.spine.y) * frac;
    const spineZ = e0.spine.z + (e1.spine.z - e0.spine.z) * frac;

    // Width and twist interpolation
    const width = e0.width + (e1.width - e0.width) * frac;
    const twist = e0.twist + (e1.twist - e0.twist) * frac;

    // Normal & Binormal
    const bx = e0.binormal.x + (e1.binormal.x - e0.binormal.x) * frac;
    const by = e0.binormal.y + (e1.binormal.y - e0.binormal.y) * frac;
    const bz = e0.binormal.z + (e1.binormal.z - e0.binormal.z) * frac;

    const nx = e0.normal.x + (e1.normal.x - e0.normal.x) * frac;
    const ny = e0.normal.y + (e1.normal.y - e0.normal.y) * frac;
    const nz = e0.normal.z + (e1.normal.z - e0.normal.z) * frac;

    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);

    const widthDirX = bx * cosT + nx * sinT;
    const widthDirY = by * cosT + ny * sinT;
    const widthDirZ = bz * cosT + nz * sinT;

    const normDirX = nx * cosT - bx * sinT;
    const normDirY = ny * cosT - by * sinT;
    const normDirZ = nz * cosT - bz * sinT;

    const sv = clampedV - 0.5;
    // Parabolic transverse silk curl
    const crossCurl = -this.curvature * width * (1.0 - 4.0 * sv * sv);

    target.set(
      spineX + widthDirX * (sv * width) + normDirX * crossCurl,
      spineY + widthDirY * (sv * width) + normDirY * crossCurl,
      spineZ + widthDirZ * (sv * width) + normDirZ * crossCurl
    );

    if (targetNormal) {
      targetNormal.set(normDirX, normDirY, normDirZ);
    }
    if (targetWidthDir) {
      targetWidthDir.set(widthDirX, widthDirY, widthDirZ);
    }

    return target;
  }
}

/**
 * Generates monumental, volumetric ribbon geometries with physical thickness,
 * razor-sharp beveled edges, and surface-depth vertex colors for The Fractured Veil sculpture.
 */
export class FracturedVeilGeometry {
  public static createRibbonGeometry(sampler: RibbonSampler, foldIndex: number = 1): THREE.BufferGeometry {
    const Nu = sampler.spec.segmentsU;
    const Nv = sampler.spec.segmentsV;
    const baseThickness = sampler.thickness;

    const numFaceVerts = (Nu + 1) * (Nv + 1);
    const numSkirtVerts = (Nu + 1) * 4;
    const totalVerts = numFaceVerts * 2 + numSkirtVerts;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices: number[] = [];

    const tempPt = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();
    const tempWidthDir = new THREE.Vector3();

    // High-contrast architectural palette customized per fold depth plane
    // Refined to satin titanium, liquid silver highlights, and deep obsidian body
    // Exactly matches reference of dark liquid titanium sculpture with velvety shadow gradients
    const cPearlHighlight = new THREE.Color('#C8D2DC'); // Crisp silver-pearl highlight strictly on knife-edge ridges
    const cSatinTitanium = foldIndex === 0
      ? new THREE.Color('#2A323A') // Canopy: dark titanium body
      : foldIndex === 1
        ? new THREE.Color('#3E4854') // Core Monolith: satin titanium midtone
        : new THREE.Color('#4E5A68'); // Foreground Prow: liquid titanium

    const cMatteGraphite = foldIndex === 0
      ? new THREE.Color('#06080B') // Pure obsidian void
      : foldIndex === 1
        ? new THREE.Color('#0A0D11') // Dark graphite cavity
        : new THREE.Color('#0F1318'); // Charcoal shadow

    const cDeepObsidian = new THREE.Color('#040608'); // Pure void cavity & underside

    // 1. Build Top Surface (Illuminated Sculptural Face with Sculpted Fluting)
    for (let i = 0; i <= Nu; i++) {
      const u = i / Nu;
      const uTaper = Math.sin(Math.PI * u);
      const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);

      for (let j = 0; j <= Nv; j++) {
        const v = j / Nv;
        const vertIdx = i * (Nv + 1) + j;

        sampler.evaluate(u, v, tempPt, tempNorm, tempWidthDir);

        const vProfile = 1.0 - 1.4 * (v - 0.5) * (v - 0.5);
        const halfThick = Math.max(0.015, baseThickness * 0.5 * hScale * Math.max(0.2, vProfile));

        // Sculpted longitudinal fluting ridges running along ribbon length
        // Matches reference image of metallic ribbon sculpture with parallel specular light channels
        const vCenterDist = Math.abs(v - 0.5);
        const fluteWave = Math.sin(v * Math.PI * 10);
        const fluteTaper = Math.max(0, 1.0 - Math.pow(vCenterDist * 2.0, 3.0));
        const fluteDisplacement = fluteWave * 0.036 * fluteTaper * hScale;

        const totalDisplacement = halfThick + fluteDisplacement;

        positions[vertIdx * 3] = tempPt.x + tempNorm.x * totalDisplacement;
        positions[vertIdx * 3 + 1] = tempPt.y + tempNorm.y * totalDisplacement;
        positions[vertIdx * 3 + 2] = tempPt.z + tempNorm.z * totalDisplacement;

        normals[vertIdx * 3] = tempNorm.x;
        normals[vertIdx * 3 + 1] = tempNorm.y;
        normals[vertIdx * 3 + 2] = tempNorm.z;

        uvs[vertIdx * 2] = u;
        uvs[vertIdx * 2 + 1] = v;

        // Vertex color: Ridge crests catch satin titanium highlights (#3E4854 to #4E5A68),
        // Fluting troughs sink into deep obsidian (#06080B to #0A0D11)
        const crestFactor = Math.pow((fluteWave + 1.0) * 0.5, 2.2);
        let vColor: THREE.Color;
        if (vCenterDist > 0.44) {
          const edgeAlpha = (vCenterDist - 0.44) / 0.06;
          vColor = new THREE.Color().lerpColors(cSatinTitanium, cPearlHighlight, edgeAlpha * 0.75);
        } else {
          vColor = new THREE.Color().lerpColors(cMatteGraphite, cSatinTitanium, crestFactor * 0.85);
        }

        colors[vertIdx * 3] = vColor.r;
        colors[vertIdx * 3 + 1] = vColor.g;
        colors[vertIdx * 3 + 2] = vColor.b;
      }
    }

    // 2. Build Bottom Surface (Underside & Deep Cavity Wall)
    for (let i = 0; i <= Nu; i++) {
      const u = i / Nu;
      const uTaper = Math.sin(Math.PI * u);
      const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);

      for (let j = 0; j <= Nv; j++) {
        const v = j / Nv;
        const vertIdx = numFaceVerts + i * (Nv + 1) + j;

        sampler.evaluate(u, v, tempPt, tempNorm, tempWidthDir);

        const vProfile = 1.0 - 1.4 * (v - 0.5) * (v - 0.5);
        const halfThick = Math.max(0.015, baseThickness * 0.5 * hScale * Math.max(0.2, vProfile));

        positions[vertIdx * 3] = tempPt.x - tempNorm.x * halfThick;
        positions[vertIdx * 3 + 1] = tempPt.y - tempNorm.y * halfThick;
        positions[vertIdx * 3 + 2] = tempPt.z - tempNorm.z * halfThick;

        normals[vertIdx * 3] = -tempNorm.x;
        normals[vertIdx * 3 + 1] = -tempNorm.y;
        normals[vertIdx * 3 + 2] = -tempNorm.z;

        uvs[vertIdx * 2] = u;
        uvs[vertIdx * 2 + 1] = v;

        colors[vertIdx * 3] = cDeepObsidian.r;
        colors[vertIdx * 3 + 1] = cDeepObsidian.g;
        colors[vertIdx * 3 + 2] = cDeepObsidian.b;
      }
    }

    // 3. Triangles for Top Surface
    for (let i = 0; i < Nu; i++) {
      for (let j = 0; j < Nv; j++) {
        const a = i * (Nv + 1) + j;
        const b = (i + 1) * (Nv + 1) + j;
        const c = (i + 1) * (Nv + 1) + (j + 1);
        const d = i * (Nv + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // 4. Triangles for Bottom Surface (Outward normal winding)
    for (let i = 0; i < Nu; i++) {
      for (let j = 0; j < Nv; j++) {
        const a = numFaceVerts + i * (Nv + 1) + j;
        const b = numFaceVerts + (i + 1) * (Nv + 1) + j;
        const c = numFaceVerts + (i + 1) * (Nv + 1) + (j + 1);
        const d = numFaceVerts + i * (Nv + 1) + (j + 1);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    // 5. Build Explicit Bevel Skirt Vertices & Triangles for Left Edge (v = 0)
    const skirtLeftOffset = numFaceVerts * 2;
    for (let i = 0; i <= Nu; i++) {
      const u = i / Nu;
      const uTaper = Math.sin(Math.PI * u);
      const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);

      sampler.evaluate(u, 0, tempPt, tempNorm, tempWidthDir);
      const halfThick = Math.max(0.015, baseThickness * 0.5 * hScale * 0.65);

      const topVIdx = skirtLeftOffset + i * 2;
      const botVIdx = skirtLeftOffset + i * 2 + 1;

      positions[topVIdx * 3] = tempPt.x + tempNorm.x * halfThick;
      positions[topVIdx * 3 + 1] = tempPt.y + tempNorm.y * halfThick;
      positions[topVIdx * 3 + 2] = tempPt.z + tempNorm.z * halfThick;

      positions[botVIdx * 3] = tempPt.x - tempNorm.x * halfThick;
      positions[botVIdx * 3 + 1] = tempPt.y - tempNorm.y * halfThick;
      positions[botVIdx * 3 + 2] = tempPt.z - tempNorm.z * halfThick;

      normals[topVIdx * 3] = -tempWidthDir.x;
      normals[topVIdx * 3 + 1] = -tempWidthDir.y;
      normals[topVIdx * 3 + 2] = -tempWidthDir.z;

      normals[botVIdx * 3] = -tempWidthDir.x;
      normals[botVIdx * 3 + 1] = -tempWidthDir.y;
      normals[botVIdx * 3 + 2] = -tempWidthDir.z;

      colors[topVIdx * 3] = cPearlHighlight.r;
      colors[topVIdx * 3 + 1] = cPearlHighlight.g;
      colors[topVIdx * 3 + 2] = cPearlHighlight.b;

      colors[botVIdx * 3] = cDeepObsidian.r;
      colors[botVIdx * 3 + 1] = cDeepObsidian.g;
      colors[botVIdx * 3 + 2] = cDeepObsidian.b;
    }

    for (let i = 0; i < Nu; i++) {
      const tA = skirtLeftOffset + i * 2;
      const bA = skirtLeftOffset + i * 2 + 1;
      const tB = skirtLeftOffset + (i + 1) * 2;
      const bB = skirtLeftOffset + (i + 1) * 2 + 1;

      indices.push(tA, bA, tB);
      indices.push(tB, bA, bB);
    }

    // 6. Build Explicit Bevel Skirt Vertices & Triangles for Right Edge (v = 1)
    const skirtRightOffset = skirtLeftOffset + (Nu + 1) * 2;
    for (let i = 0; i <= Nu; i++) {
      const u = i / Nu;
      const uTaper = Math.sin(Math.PI * u);
      const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);

      sampler.evaluate(u, 1, tempPt, tempNorm, tempWidthDir);
      const halfThick = Math.max(0.015, baseThickness * 0.5 * hScale * 0.65);

      const topVIdx = skirtRightOffset + i * 2;
      const botVIdx = skirtRightOffset + i * 2 + 1;

      positions[topVIdx * 3] = tempPt.x + tempNorm.x * halfThick;
      positions[topVIdx * 3 + 1] = tempPt.y + tempNorm.y * halfThick;
      positions[topVIdx * 3 + 2] = tempPt.z + tempNorm.z * halfThick;

      positions[botVIdx * 3] = tempPt.x - tempNorm.x * halfThick;
      positions[botVIdx * 3 + 1] = tempPt.y - tempNorm.y * halfThick;
      positions[botVIdx * 3 + 2] = tempPt.z - tempNorm.z * halfThick;

      normals[topVIdx * 3] = tempWidthDir.x;
      normals[topVIdx * 3 + 1] = tempWidthDir.y;
      normals[topVIdx * 3 + 2] = tempWidthDir.z;

      normals[botVIdx * 3] = tempWidthDir.x;
      normals[botVIdx * 3 + 1] = tempWidthDir.y;
      normals[botVIdx * 3 + 2] = tempWidthDir.z;

      colors[topVIdx * 3] = cPearlHighlight.r;
      colors[topVIdx * 3 + 1] = cPearlHighlight.g;
      colors[topVIdx * 3 + 2] = cPearlHighlight.b;

      colors[botVIdx * 3] = cDeepObsidian.r;
      colors[botVIdx * 3 + 1] = cDeepObsidian.g;
      colors[botVIdx * 3 + 2] = cDeepObsidian.b;
    }

    for (let i = 0; i < Nu; i++) {
      const tA = skirtRightOffset + i * 2;
      const bA = skirtRightOffset + i * 2 + 1;
      const tB = skirtRightOffset + (i + 1) * 2;
      const bB = skirtRightOffset + (i + 1) * 2 + 1;

      indices.push(tA, tB, bA);
      indices.push(tB, bB, bA);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    // Compute true surface normals across fluted longitudinal ridges for specular highlight channeling
    geo.computeVertexNormals();

    return geo;
  }

  /**
   * Monumental authored specs for THE FRACTURED VEIL.
   * Sculptural, twisting architectural ribbons framing an unmistakable central opening.
   *
   * Refined to:
   * 1. Lower upper canopy peak (y <= 4.8) so it never encroaches or slices the top nav header.
   * 2. Maximize negative space aperture in center-left for pristine headline contrast.
   * 3. Provide tactile foreground emergence on the right with deep cavity shadows.
   */
  public static getVeilSpecs(): RibbonSpec[] {
    return [
      // -------------------------------------------------------------
      // FOLD 1: The Monumental Vaulted Canopy (Upper & Background Veil)
      // Arches across upper perimeter gracefully beneath navigation,
      // creating a proscenium frame with satin titanium sheen.
      // -------------------------------------------------------------
      {
        id: 'fold-canopy',
        name: 'The Monumental Vaulted Canopy',
        controlPoints: [
          new THREE.Vector3(9.5, 3.2, -4.5),   // Enters deep upper right
          new THREE.Vector3(6.8, 3.6, -2.5),   // Crests over top-right
          new THREE.Vector3(3.2, 3.5, 0.2),    // Sweeping central vault
          new THREE.Vector3(0.0, 3.2, 1.0),    // Center top arch (comfortably below header)
          new THREE.Vector3(-3.5, 3.1, 0.4),   // Well above headline
          new THREE.Vector3(-6.8, 3.0, -2.0),  // Descending into deep left space
          new THREE.Vector3(-9.8, 2.6, -4.5),  // Exiting far left void
        ],
        widths: [1.8, 3.0, 3.8, 4.0, 3.4, 2.4, 1.4],
        twists: [-0.30, -0.10, 0.20, 0.45, 0.60, 0.35, 0.10],
        curvature: 0.18,
        thickness: 0.16,
        segmentsU: 120,
        segmentsV: 32,
      },

      // -------------------------------------------------------------
      // FOLD 2: The Core Monumental Torus & Central Aperture (Centerpiece)
      // A genuine 3D spatial vortex looping around the portal at (3.4, 0.3, -0.8).
      // Continuous twisting prevents broadside flat occlusion, creating deep
      // internal shadow cavities, dramatic rim highlights, and zero headline collision.
      // -------------------------------------------------------------
      {
        id: 'fold-core-aperture',
        name: 'The Core Sculptural Monolith & Aperture',
        controlPoints: [
          new THREE.Vector3(9.2, 2.0, -1.0),   // Approach from mid-right
          new THREE.Vector3(6.8, 2.8, 0.4),    // Outer crest approach
          new THREE.Vector3(4.2, 2.6, 1.2),    // Upper lip arching over portal
          new THREE.Vector3(1.8, 0.4, -2.6),   // Deep interior cavity wall (pitch black abyss)
          new THREE.Vector3(2.6, -1.8, -1.4),  // Looping under portal floor
          new THREE.Vector3(5.4, -1.8, 0.8),   // Lower prow emerging forward right
          new THREE.Vector3(2.8, -2.8, 1.8),   // Cascading toward midground
          new THREE.Vector3(-1.0, -3.8, 1.2),  // Flowing far below headline (y = -3.8)
          new THREE.Vector3(-5.5, -4.4, -0.8), // Left background exit
          new THREE.Vector3(-8.5, -4.8, -3.2), // Deep left void submergence
        ],
        widths: [2.0, 4.2, 5.6, 5.8, 5.2, 5.0, 4.4, 3.2, 2.0, 1.2],
        twists: [0.20, 0.60, 1.15, 1.75, 2.35, 1.60, 0.90, 0.30, 0.00, -0.20],
        curvature: 0.24,
        thickness: 0.22,
        segmentsU: 130,
        segmentsV: 32,
      },

      // -------------------------------------------------------------
      // FOLD 3: The Foreground Emerging Prow (Near-Camera Sculptural Detail)
      // Sweeps into near-camera field (z ~ 4.8), giving palpable tactile
      // presence, brushed platinum sheen, and extreme depth parallax.
      // -------------------------------------------------------------
      {
        id: 'fold-foreground-prow',
        name: 'The Foreground Emerging Prow',
        controlPoints: [
          new THREE.Vector3(-3.5, -5.0, 0.4),  // Base at bottom left
          new THREE.Vector3(0.5, -4.2, 2.4),   // Climbing towards foreground
          new THREE.Vector3(3.8, -3.2, 4.6),   // Enters near-camera field (z = 4.6)
          new THREE.Vector3(6.8, -2.4, 5.0),   // Peak near-camera crest (z = 5.0)
          new THREE.Vector3(8.8, -1.8, 2.8),   // Sweeping into lower right
          new THREE.Vector3(10.5, -1.5, -0.5), // Exiting right midground
        ],
        widths: [1.8, 3.8, 5.4, 5.8, 4.4, 1.8],
        twists: [-0.35, -0.15, 0.10, 0.35, 0.45, 0.20],
        curvature: 0.20,
        thickness: 0.20,
        segmentsU: 120,
        segmentsV: 32,
      },
    ];
  }
}
