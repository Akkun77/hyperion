import * as THREE from 'three';

export interface RibbonSpec {
  id: string;
  name: string;
  controlPoints: THREE.Vector3[];
  widths: number[];
  twists: number[];
  curvature?: number;
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

  constructor(spec: RibbonSpec) {
    this.spec = spec;
    this.curvature = spec.curvature ?? 0.24;
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

      // Stable orthogonal reference frame
      let up = upRef.clone();
      if (Math.abs(tangent.dot(up)) > 0.90) {
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

      // Elegant silk tapering at ribbon extremities (eliminates blunt rectangular cuts)
      const taper = Math.sin(Math.PI * Math.min(Math.max(u, 0.0), 1.0));
      const width = rawWidth * (0.15 + 0.85 * Math.pow(taper, 0.40));

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
  public evaluate(u: number, v: number, target = new THREE.Vector3()): THREE.Vector3 {
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

    return target;
  }
}

/**
 * Generates smooth, parametric ribbon geometries with parabolic cross-sections
 * for The Fractured Veil sculpture.
 */
export class FracturedVeilGeometry {
  public static createRibbonGeometry(sampler: RibbonSampler): THREE.BufferGeometry {
    const Nu = sampler.spec.segmentsU;
    const Nv = sampler.spec.segmentsV;
    const numVerts = (Nu + 1) * (Nv + 1);

    const positions = new Float32Array(numVerts * 3);
    const normals = new Float32Array(numVerts * 3);
    const uvs = new Float32Array(numVerts * 2);
    const indices: number[] = [];

    const tempPt = new THREE.Vector3();
    const tempPtDu = new THREE.Vector3();
    const tempPtDv = new THREE.Vector3();
    const dU = 0.005;
    const dV = 0.01;

    for (let i = 0; i <= Nu; i++) {
      const u = i / Nu;
      for (let j = 0; j <= Nv; j++) {
        const v = j / Nv;
        const vertIdx = i * (Nv + 1) + j;

        sampler.evaluate(u, v, tempPt);
        sampler.evaluate(Math.min(1.0, u + dU), v, tempPtDu);
        sampler.evaluate(u, Math.min(1.0, v + dV), tempPtDv);

        const tangU = new THREE.Vector3().subVectors(tempPtDu, tempPt).normalize();
        const tangV = new THREE.Vector3().subVectors(tempPtDv, tempPt).normalize();
        const norm = new THREE.Vector3().crossVectors(tangU, tangV).normalize();

        positions[vertIdx * 3] = tempPt.x;
        positions[vertIdx * 3 + 1] = tempPt.y;
        positions[vertIdx * 3 + 2] = tempPt.z;

        normals[vertIdx * 3] = norm.x;
        normals[vertIdx * 3 + 1] = norm.y;
        normals[vertIdx * 3 + 2] = norm.z;

        uvs[vertIdx * 2] = u;
        uvs[vertIdx * 2 + 1] = v;
      }
    }

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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }

  /**
   * Authored specs for THE FRACTURED VEIL.
   * Carefully tuned to:
   * 1. Match the conceptual blueprint (3 interwoven sweeping folds).
   * 2. Frame the central inspection opening near (2.4, 0, 0).
   * 3. Leave pristine negative space on the left for hero typography.
   * 4. Provide substantial parallax and depth layers.
   */
  public static getVeilSpecs(): RibbonSpec[] {
    return [
      // -------------------------------------------------------------
      // FOLD 1: The High Sweeping Fold
      // Runs from upper-right, arches high, twists over left, sweeping above headline
      // -------------------------------------------------------------
      {
        id: 'fold-high',
        name: 'The High Sweeping Fold',
        controlPoints: [
          new THREE.Vector3(8.2, 4.0, -3.2),
          new THREE.Vector3(5.6, 5.0, -1.5),
          new THREE.Vector3(2.8, 4.2, 0.8),
          new THREE.Vector3(0.5, 3.4, 2.0),
          new THREE.Vector3(-2.2, 3.2, 1.2),  // Stays above headline (y > 3.0)
          new THREE.Vector3(-5.0, 3.4, -1.0),
          new THREE.Vector3(-7.5, 3.8, -3.5),
        ],
        widths: [1.2, 2.8, 3.4, 3.2, 2.6, 1.8, 0.8],
        twists: [-0.40, -0.10, 0.30, 0.65, 0.85, 0.50, 0.20],
        curvature: 0.22,
        segmentsU: 110,
        segmentsV: 22,
      },

      // -------------------------------------------------------------
      // FOLD 2: The Broad Middle Fold (Framing the Central Opening)
      // Enters from mid-right, twists around the central inspection portal,
      // then dives below headline into lower depth on the left
      // -------------------------------------------------------------
      {
        id: 'fold-middle',
        name: 'The Broad Middle Fold',
        controlPoints: [
          new THREE.Vector3(7.8, 0.8, 1.6),
          new THREE.Vector3(5.2, 0.4, 0.6),
          new THREE.Vector3(3.2, 0.2, -0.4),  // Outer rim of inspection aperture
          new THREE.Vector3(2.4, -0.4, -1.2), // Dark cavity opening
          new THREE.Vector3(1.2, -0.8, 0.8),  // Underside exit
          new THREE.Vector3(-0.8, -1.8, 1.5), // Drops below headline (y < -1.5)
          new THREE.Vector3(-3.8, -2.6, -0.5),
          new THREE.Vector3(-6.8, -3.0, -2.8),
        ],
        widths: [1.4, 3.0, 3.8, 3.4, 3.0, 2.6, 1.8, 0.8],
        twists: [0.15, 0.35, 0.80, 1.25, 0.70, 0.20, -0.15, -0.30],
        curvature: 0.26,
        segmentsU: 110,
        segmentsV: 22,
      },

      // -------------------------------------------------------------
      // FOLD 3: The Lower Emerging Fold
      // Sweeps forward into foreground (z ~ 3.2), cradling the base
      // -------------------------------------------------------------
      {
        id: 'fold-lower',
        name: 'The Lower Emerging Fold',
        controlPoints: [
          new THREE.Vector3(7.2, -3.8, -1.5),
          new THREE.Vector3(4.0, -3.4, 2.6),  // Foreground crest
          new THREE.Vector3(1.4, -2.8, 3.2),  // High foreground point
          new THREE.Vector3(-1.4, -3.2, 1.8),
          new THREE.Vector3(-4.2, -4.0, -0.2),
          new THREE.Vector3(-6.8, -4.2, -2.0),
        ],
        widths: [1.0, 2.6, 3.4, 2.8, 2.0, 0.8],
        twists: [-0.50, -0.25, 0.05, 0.35, 0.45, 0.20],
        curvature: 0.20,
        segmentsU: 110,
        segmentsV: 22,
      },
    ];
  }
}
