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

      let rawWidth = THREE.MathUtils.lerp(this.spec.widths[idx0], this.spec.widths[idx1], smoothAlpha);
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
  public static createRibbonGeometry(sampler: RibbonSampler): THREE.BufferGeometry {
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

    // High-contrast architectural palette
    const cPearlHighlight = new THREE.Color('#E8EDF2'); // Brilliant silver/pearl on knife-edge ridges
    const cSatinSilver = new THREE.Color('#949BA6');     // Satin silver on illuminated face
    const cMatteGraphite = new THREE.Color('#1E222A');   // Deep matte graphite body
    const cDeepObsidian = new THREE.Color('#060709');    // Pitch dark cavity & underside

    // 1. Build Top Surface (Illuminated Sculptural Face)
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

        positions[vertIdx * 3] = tempPt.x + tempNorm.x * halfThick;
        positions[vertIdx * 3 + 1] = tempPt.y + tempNorm.y * halfThick;
        positions[vertIdx * 3 + 2] = tempPt.z + tempNorm.z * halfThick;

        normals[vertIdx * 3] = tempNorm.x;
        normals[vertIdx * 3 + 1] = tempNorm.y;
        normals[vertIdx * 3 + 2] = tempNorm.z;

        uvs[vertIdx * 2] = u;
        uvs[vertIdx * 2 + 1] = v;

        // Vertex color: Ridge crests & edges catch brilliant pearl; body is satin slate
        const distFromCenter = Math.abs(v - 0.5);
        let vColor: THREE.Color;
        if (distFromCenter > 0.36) {
          const edgeAlpha = (distFromCenter - 0.36) / 0.14;
          vColor = new THREE.Color().lerpColors(cSatinSilver, cPearlHighlight, edgeAlpha);
        } else if (distFromCenter < 0.10) {
          vColor = new THREE.Color().lerpColors(cMatteGraphite, cSatinSilver, 0.85);
        } else {
          vColor = new THREE.Color().lerpColors(cMatteGraphite, cSatinSilver, 0.35);
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

      colors[botVIdx * 3] = cSatinSilver.r;
      colors[botVIdx * 3 + 1] = cSatinSilver.g;
      colors[botVIdx * 3 + 2] = cSatinSilver.b;
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

      colors[botVIdx * 3] = cSatinSilver.r;
      colors[botVIdx * 3 + 1] = cSatinSilver.g;
      colors[botVIdx * 3 + 2] = cSatinSilver.b;
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

    return geo;
  }

  /**
   * Monumental authored specs for THE FRACTURED VEIL.
   * Sculptural, twisting architectural ribbons framing an unmistakable central opening.
   */
  public static getVeilSpecs(): RibbonSpec[] {
    return [
      // -------------------------------------------------------------
      // FOLD 1: The Monumental Vaulted Canopy (Upper & Background Veil)
      // Arches across the upper perimeter (y >= 5.2), creating a grand proscenium
      // with satin silver rim lighting, completely clearing the headline.
      // -------------------------------------------------------------
      {
        id: 'fold-canopy',
        name: 'The Monumental Vaulted Canopy',
        controlPoints: [
          new THREE.Vector3(9.5, 5.5, -4.5),   // Enters deep upper right
          new THREE.Vector3(6.8, 6.5, -2.0),   // Crests over top-right
          new THREE.Vector3(3.2, 6.2, 0.6),    // Sweeping central vault
          new THREE.Vector3(0.0, 5.6, 1.8),    // Center top arch
          new THREE.Vector3(-3.5, 5.4, 0.8),   // Well above headline (y >= 5.2)
          new THREE.Vector3(-6.8, 5.6, -1.8),  // Descending into deep left space
          new THREE.Vector3(-9.8, 5.0, -4.5),  // Exiting far left void
        ],
        widths: [2.0, 4.4, 6.2, 6.5, 5.4, 3.8, 1.6],
        twists: [-0.30, -0.10, 0.20, 0.45, 0.60, 0.35, 0.10],
        curvature: 0.20,
        thickness: 0.18,
        segmentsU: 120,
        segmentsV: 22,
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
          new THREE.Vector3(4.2, 2.6, 1.2),    // Upper lip arching over portal (oblique twist)
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
        segmentsV: 24,
      },

      // -------------------------------------------------------------
      // FOLD 3: The Foreground Emerging Prow (Near-Camera Sculptural Detail)
      // Sweeps into near-camera field (z ~ 4.8), giving palpable tactile
      // presence, brushed satin sheen, and extreme depth parallax.
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
        segmentsV: 22,
      },
    ];
  }
}
