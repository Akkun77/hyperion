import * as THREE from 'three';
import { DecisionMode, DebugTuningParams, DEFAULT_DEBUG_PARAMS, UnseenPointerState } from '../types';
import { FracturedVeilGeometry, RibbonSampler, RibbonSpec } from './FracturedVeilGeometry';

export type RenderMode = 'mesh' | 'particles' | 'both';

export interface UnseenWorldOptions {
  container: HTMLElement;
  isReducedMotion?: boolean;
  debugParams?: DebugTuningParams;
  renderMode?: RenderMode;
}

// 4 Identifiable Particle Currents:
// Layer 0: SURFACE CURRENT (50%) - Fine particles follow actual folds, revealing surface curvature
// Layer 1: EDGE CURRENT (25%) - Brighter particles follow selected structural ridges toward central opening
// Layer 2: REQUEST CURRENT (15%) - Coherent concentration of particles traveling along ingress path toward aperture
// Layer 3: RESIDUAL TRACES (10%) - Subtle trailing wake left behind as request passes
export const PARTICLE_LAYER_SURFACE_TRACER = 0;
export const PARTICLE_LAYER_EDGE_FILAMENT = 1;
export const PARTICLE_LAYER_REQUEST_CURRENT = 2;
export const PARTICLE_LAYER_RESIDUAL_TRACE = 3;

export class UnseenWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private reqId: number | null = null;
  private isDisposed = false;

  // Normalized progress & state
  private progress = 0;
  private targetProgress = 0;
  private decisionMode: DecisionMode = 'ALLOW';
  private isReducedMotion = false;
  private debugParams: DebugTuningParams = { ...DEFAULT_DEBUG_PARAMS };
  private renderMode: RenderMode = 'both';

  // Pointer interaction state: localized world-space disturbance (<600ms spring settling)
  private pointer: UnseenPointerState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    active: false,
  };
  private mouseWorld = new THREE.Vector3();
  private prevMouseWorld = new THREE.Vector3();
  private mouseVelocityWorld = new THREE.Vector3();
  private smoothMouseVel = new THREE.Vector3();
  private hasPrevMouseWorld = false;
  private raycaster = new THREE.Raycaster();
  private planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  // Sculptural Ribbon Meshes: The Fractured Veil
  private veilSpecs: RibbonSpec[] = [];
  private veilSamplers: RibbonSampler[] = [];
  private veilMeshes: THREE.Mesh[] = [];
  private veilMeshGroup = new THREE.Group();

  // Ingress & Request Spline: Curving from ingress boundary into central aperture
  private ingressCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7.5, -1.2, 0.8),
    new THREE.Vector3(-4.8, -2.2, 0.5),
    new THREE.Vector3(-1.4, -1.8, 0.2),
    new THREE.Vector3(1.6, 0.4, -0.6),
    new THREE.Vector3(3.4, 0.3, -1.0),
    new THREE.Vector3(5.6, 0.7, -2.4),
    new THREE.Vector3(8.5, 1.2, -4.2),
  ], false, 'centripetal', 0.5);

  // 4-Layer Choreographed Particle System (24,000 fine stardust particles)
  private particleCount = 24000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  private particleGroup!: Uint8Array;
  private particleFold!: Uint8Array;
  private particleU!: Float32Array;
  private particleV!: Float32Array;
  private particleFlowSpeed!: Float32Array;
  private particlePhase!: Float32Array;
  private particleOrigin!: Float32Array;

  private posArray!: Float32Array;
  private targetArray!: Float32Array;
  private dispArray!: Float32Array;
  private dispVelArray!: Float32Array;
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // Cinematic 4-point lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private apertureLight!: THREE.PointLight;

  // Central aperture focal point for formation vortex
  private readonly apertureCenter = new THREE.Vector3(3.4, 0.3, -1.0);

  // Spatial context coordinates for non-intrusive annotations
  private readonly ingressPoint3D = new THREE.Vector3(-5.2, -1.8, 0.5);
  private readonly inspectionPoint3D = new THREE.Vector3(3.4, 0.3, -1.0);
  private readonly evidencePoint3D = new THREE.Vector3(4.2, -2.8, 0.6);

  // Camera Waypoints: Narrative & scroll-driven only (ZERO camera shake from pointer)
  private cameraWaypoints = [
    { p: 0.00, pos: new THREE.Vector3(1.2, 0.9, 14.8), look: new THREE.Vector3(1.6, 0.1, 0.0), fov: 42 },
    { p: 0.30, pos: new THREE.Vector3(1.8, 0.8, 12.0), look: new THREE.Vector3(1.8, 0.1, 0.0), fov: 42 },
    { p: 0.65, pos: new THREE.Vector3(2.5, 0.5, 8.5),  look: new THREE.Vector3(2.6, 0.2, -0.5), fov: 44 },
    { p: 0.85, pos: new THREE.Vector3(3.0, 0.4, 5.8),  look: new THREE.Vector3(3.2, 0.3, -0.8), fov: 45 },
    { p: 1.00, pos: new THREE.Vector3(3.4, 0.3, 3.6),  look: new THREE.Vector3(3.4, 0.3, -1.0), fov: 46 },
  ];

  constructor(options: UnseenWorldOptions) {
    this.container = options.container;
    this.isReducedMotion = !!options.isReducedMotion;
    if (options.debugParams) {
      this.debugParams = { ...options.debugParams };
    }
    if (options.renderMode) {
      this.renderMode = options.renderMode;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07080A');
    this.scene.fog = new THREE.FogExp2('#07080A', 0.022);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.adjustCameraForViewport(width, height);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initLights();
    this.initVeilSculpturalMeshes();
    this.initChoreographedParticles();

    this.updateVisibilityMode();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    if (typeof window !== 'undefined') {
      (window as any).__UNSEEN_WORLD__ = this;
    }

    this.animate();
  }

  private adjustCameraForViewport(width: number, height: number): void {
    const isMobile = width < 768;
    if (isMobile) {
      this.camera.fov = 52;
      this.camera.position.set(0.2, 0.2, 19.5);
      this.camera.lookAt(new THREE.Vector3(0.2, -0.6, 0.0));
    } else {
      this.camera.fov = 42;
      this.camera.position.copy(this.cameraWaypoints[0].pos);
      this.camera.lookAt(this.cameraWaypoints[0].look);
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight('#07090D', 0.7);
    this.scene.add(this.ambientLight);

    // Key Light: Sharp architectural lighting from upper right
    this.keyLight = new THREE.DirectionalLight('#FFFFFF', 4.2);
    this.keyLight.position.set(16, 20, 15);
    this.scene.add(this.keyLight);

    // Rim Light: Cool platinum rim highlighting razor silhouettes from rear-left
    this.rimLight = new THREE.DirectionalLight('#E2EBF5', 5.5);
    this.rimLight.position.set(-18, 14, -16);
    this.scene.add(this.rimLight);

    // Cavity Bounce: Deep obsidian shadow preservation
    this.fillLight = new THREE.DirectionalLight('#0D1015', 0.5);
    this.fillLight.position.set(2, -12, 6);
    this.scene.add(this.fillLight);

    // Interior Aperture Point Light: Concentrated glow from central opening cavity
    this.apertureLight = new THREE.PointLight('#8EB2D8', 3.8, 12.0, 2.0);
    this.apertureLight.position.copy(this.apertureCenter);
    this.scene.add(this.apertureLight);
  }

  /**
   * Monumental Sculptural Meshes:
   * 3 interwoven volumetric ribbon folds with razor beveled edges and multi-plane vertex colors.
   */
  private initVeilSculpturalMeshes(): void {
    this.veilSpecs = FracturedVeilGeometry.getVeilSpecs();
    this.veilSamplers = this.veilSpecs.map((spec) => new RibbonSampler(spec));

    // Refined physical materials per fold depth plane:
    // Fold 0 (Canopy): Brushed deep graphite obsidian
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#111418'),
      roughness: 0.35,
      metalness: 0.90,
      clearcoat: 0.20,
      specularIntensity: 1.3,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 1 (Core Monolith & Central Aperture): Liquid satin silver with micro-anisotropic sheen
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#383E4A'),
      roughness: 0.16,
      metalness: 0.97,
      clearcoat: 0.60,
      clearcoatRoughness: 0.12,
      sheen: 0.95,
      sheenColor: new THREE.Color('#EEF4FC'),
      specularIntensity: 1.8,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 2 (Foreground Emerging Prow): Polished platinum silver catching razor specular highlights
    const prowMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#4A5262'),
      roughness: 0.10,
      metalness: 0.98,
      clearcoat: 0.75,
      clearcoatRoughness: 0.08,
      specularIntensity: 2.1,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const materials = [canopyMat, coreMat, prowMat];

    this.veilSamplers.forEach((sampler, idx) => {
      const geo = FracturedVeilGeometry.createRibbonGeometry(sampler, idx);
      const mesh = new THREE.Mesh(geo, materials[idx]);
      this.veilMeshes.push(mesh);
      this.veilMeshGroup.add(mesh);
    });

    this.scene.add(this.veilMeshGroup);
  }

  /**
   * Choreographed 4-Layer Particle System:
   * Layer 0 (50%): Surface Current (reveals curvature along streamlines)
   * Layer 1 (25%): Edge Current (traces knife-edge ridges leading to opening)
   * Layer 2 (15%): Request Current (coherent packet traveling along ingress path)
   * Layer 3 (10%): Residual Traces (trailing wake behind passing requests)
   */
  private initChoreographedParticles(): void {
    this.posArray = new Float32Array(this.particleCount * 3);
    this.targetArray = new Float32Array(this.particleCount * 3);
    this.dispArray = new Float32Array(this.particleCount * 3);
    this.dispVelArray = new Float32Array(this.particleCount * 3);

    this.particleGroup = new Uint8Array(this.particleCount);
    this.particleFold = new Uint8Array(this.particleCount);
    this.particleU = new Float32Array(this.particleCount);
    this.particleV = new Float32Array(this.particleCount);
    this.particleFlowSpeed = new Float32Array(this.particleCount);
    this.particlePhase = new Float32Array(this.particleCount);
    this.particleOrigin = new Float32Array(this.particleCount * 3);

    this.sizeArray = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.baseAlphaArray = new Float32Array(this.particleCount);

    const cPearl = new THREE.Color('#F3F4F1');
    const cSilver = new THREE.Color('#AEB8C0');
    const cTitanium = new THREE.Color('#78828E');
    const cGraphite = new THREE.Color('#333A41');
    const cRequest = new THREE.Color('#E0F2FE'); // Luminous pearl for request current

    const tempTarget = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const diceGroup = Math.random();

      let group: number;
      let foldIdx: number;
      let u: number = Math.random();
      let v: number = 0.5;
      let speed: number;
      let pColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      const diceFold = Math.random();
      foldIdx = diceFold < 0.30 ? 0 : diceFold < 0.80 ? 1 : 2;
      this.particleFold[i] = foldIdx;
      this.particleU[i] = u;
      this.particlePhase[i] = Math.random() * Math.PI * 2;

      if (diceGroup < 0.50) {
        // Layer 0: Surface Current (50%)
        group = PARTICLE_LAYER_SURFACE_TRACER;
        const lane = Math.floor(Math.random() * 16);
        v = (lane + 0.5) / 16.0 + (Math.random() - 0.5) * 0.035;
        v = THREE.MathUtils.clamp(v, 0.06, 0.94);
        speed = (0.024 + Math.random() * 0.028) * (foldIdx === 1 ? -1 : 1);
        pColor = Math.random() < 0.7 ? cSilver : cTitanium;
        pSize = 0.11 + Math.random() * 0.05;
        pAlpha = 0.85 + Math.random() * 0.15;
      } else if (diceGroup < 0.75) {
        // Layer 1: Edge Current (25%)
        group = PARTICLE_LAYER_EDGE_FILAMENT;
        const isOuterRim = Math.random() < 0.65;
        v = isOuterRim ? (Math.random() < 0.5 ? 0.03 + Math.random() * 0.02 : 0.95 + Math.random() * 0.02) : 0.5 + (Math.random() - 0.5) * 0.06;
        speed = (0.038 + Math.random() * 0.032) * (foldIdx === 1 ? -1 : 1);
        pColor = cPearl;
        pSize = 0.18 + Math.random() * 0.08;
        pAlpha = 1.0;
      } else if (diceGroup < 0.90) {
        // Layer 2: Request Current (15%) - Coherent ingress packet
        group = PARTICLE_LAYER_REQUEST_CURRENT;
        u = Math.random();
        v = 0.5;
        speed = 0.065 + Math.random() * 0.035;
        pColor = cRequest;
        pSize = 0.22 + Math.random() * 0.08;
        pAlpha = 1.0;
      } else {
        // Layer 3: Residual Traces (10%) - Ambient trailing wake
        group = PARTICLE_LAYER_RESIDUAL_TRACE;
        v = Math.random();
        speed = 0.015 + Math.random() * 0.018;
        pColor = Math.random() < 0.5 ? cTitanium : cGraphite;
        pSize = 0.09 + Math.random() * 0.04;
        pAlpha = 0.60 + Math.random() * 0.25;

        this.particleOrigin[idx] = (Math.random() - 0.5) * 14.0 + 2.0;
        this.particleOrigin[idx + 1] = (Math.random() - 0.5) * 10.0;
        this.particleOrigin[idx + 2] = (Math.random() - 0.5) * 7.0;
      }

      this.particleGroup[i] = group;
      this.particleV[i] = v;
      this.particleFlowSpeed[i] = speed;

      // Base target position
      if (group === PARTICLE_LAYER_REQUEST_CURRENT) {
        this.ingressCurve.getPointAt(u, tempTarget);
        tempTarget.x += (Math.random() - 0.5) * 0.45;
        tempTarget.y += (Math.random() - 0.5) * 0.45;
        tempTarget.z += (Math.random() - 0.5) * 0.45;
      } else if (group === PARTICLE_LAYER_RESIDUAL_TRACE) {
        tempTarget.set(
          this.particleOrigin[idx],
          this.particleOrigin[idx + 1],
          this.particleOrigin[idx + 2]
        );
      } else {
        this.veilSamplers[foldIdx].evaluate(u, v, tempTarget, tempNorm);
        tempTarget.addScaledVector(tempNorm, group === PARTICLE_LAYER_EDGE_FILAMENT ? 0.08 : 0.04);
      }

      this.posArray[idx] = tempTarget.x;
      this.posArray[idx + 1] = tempTarget.y;
      this.posArray[idx + 2] = tempTarget.z;

      this.targetArray[idx] = tempTarget.x;
      this.targetArray[idx + 1] = tempTarget.y;
      this.targetArray[idx + 2] = tempTarget.z;

      this.dispArray[idx] = 0;
      this.dispArray[idx + 1] = 0;
      this.dispArray[idx + 2] = 0;

      this.dispVelArray[idx] = 0;
      this.dispVelArray[idx + 1] = 0;
      this.dispVelArray[idx + 2] = 0;

      this.sizeArray[i] = pSize;
      this.colorArray[idx] = pColor.r;
      this.colorArray[idx + 1] = pColor.g;
      this.colorArray[idx + 2] = pColor.b;
      this.baseAlphaArray[i] = pAlpha;
    }

    this.particlesGeo = new THREE.BufferGeometry();
    this.particlesGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.particlesGeo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.particlesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.baseAlphaArray, 1));

    // Custom GLSL Point Shader with perspective attenuation and spherical normal lighting
    this.particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          vColor = aColor;
          vAlpha = aAlpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mvPosition.z;

          // Perspective attenuation: crisp fine points (clamped between 1.2px and 8.5px)
          float pSize = aSize * (260.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.2, 8.5);

          float depthFade = clamp(1.15 - (vDepth / 35.0), 0.15, 1.0);
          vAlpha *= depthFade;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform vec3 uLightDir;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distSq = dot(coord, coord);
          if (distSq > 0.25) discard;

          float z = sqrt(max(0.0, 0.25 - distSq));
          vec3 normal = normalize(vec3(coord, z));

          float diff = max(dot(normal, uLightDir), 0.0);
          float spec = pow(max(dot(normal, normalize(uLightDir + vec3(0.0, 0.0, 1.0))), 0.0), 18.0);

          vec3 finalColor = vColor * (0.65 + 0.45 * diff) + vec3(spec * 0.55);
          float radialAlpha = smoothstep(0.5, 0.15, sqrt(distSq));

          gl_FragColor = vec4(finalColor, vAlpha * radialAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.particlesMesh = new THREE.Points(this.particlesGeo, this.particlesMat);
    this.scene.add(this.particlesMesh);
  }

  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    this.updateVisibilityMode();
  }

  private updateVisibilityMode(): void {
    if (this.renderMode === 'mesh') {
      this.veilMeshGroup.visible = true;
      if (this.particlesMesh) this.particlesMesh.visible = false;
    } else if (this.renderMode === 'particles') {
      this.veilMeshGroup.visible = false;
      if (this.particlesMesh) this.particlesMesh.visible = true;
    } else {
      this.veilMeshGroup.visible = true;
      if (this.particlesMesh) this.particlesMesh.visible = true;
    }
  }

  public setProgress(p: number): void {
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  public setDecisionMode(mode: DecisionMode): void {
    this.decisionMode = mode;
    if (this.apertureLight) {
      if (mode === 'BLOCK') {
        this.apertureLight.color.set('#EA777C');
      } else if (mode === 'FLAG') {
        this.apertureLight.color.set('#E9BA6A');
      } else {
        this.apertureLight.color.set('#62D4A1');
      }
    }
  }

  public getDecisionMode(): DecisionMode {
    return this.decisionMode;
  }

  public setPointer(x: number, y: number, vx: number, vy: number, active: boolean): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.vx = vx;
    this.pointer.vy = vy;
    this.pointer.speed = Math.hypot(vx, vy);
    this.pointer.active = active;
  }

  public setReducedMotion(reduced: boolean): void {
    this.isReducedMotion = reduced;
  }

  public updateDebugParams(params: Partial<DebugTuningParams>): void {
    this.debugParams = { ...this.debugParams, ...params };
  }

  /**
   * Screen-projected spatial context annotations:
   * Returns screen coordinates for INGRESS, INSPECTION, and EVIDENCE
   */
  public getSpatialLabels(): {
    ingress: { x: number; y: number; visible: boolean };
    inspection: { x: number; y: number; visible: boolean };
    evidence: { x: number; y: number; visible: boolean };
  } {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const project = (pt: THREE.Vector3) => {
      const v = pt.clone().project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * width,
        y: (-(v.y * 0.5) + 0.5) * height,
      };
    };

    const p = this.progress;
    const ing = project(this.ingressPoint3D);
    const insp = project(this.inspectionPoint3D);
    const evid = project(this.evidencePoint3D);

    return {
      ingress: { ...ing, visible: p >= 0.05 && p <= 0.35 },
      inspection: { ...insp, visible: p >= 0.35 && p <= 0.70 },
      evidence: { ...evid, visible: p >= 0.70 && p <= 0.98 },
    };
  }

  private onResize(): void {
    if (this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.adjustCameraForViewport(width, height);
    this.renderer.setSize(width, height);
  }

  // Camera progression strictly along narrative waypoints (ZERO pointer coupling)
  private updateCamera(p: number, dt: number): void {
    const width = this.container.clientWidth || window.innerWidth;
    if (width < 768) {
      const mobileZ = THREE.MathUtils.lerp(19.5, 13.0, p);
      const mobileY = THREE.MathUtils.lerp(0.2, 1.2, p);
      this.camera.position.set(0.2, mobileY, mobileZ);
      this.camera.lookAt(new THREE.Vector3(0.2, -0.6, 0.0));
      return;
    }

    let i0 = 0;
    while (i0 < this.cameraWaypoints.length - 2 && this.cameraWaypoints[i0 + 1].p <= p) {
      i0++;
    }
    const i1 = i0 + 1;
    const w0 = this.cameraWaypoints[i0];
    const w1 = this.cameraWaypoints[i1];

    const segRange = Math.max(0.0001, w1.p - w0.p);
    const segT = THREE.MathUtils.clamp((p - w0.p) / segRange, 0, 1);
    const smoothT = THREE.MathUtils.smoothstep(segT, 0, 1);

    const targetPos = new THREE.Vector3().lerpVectors(w0.pos, w1.pos, smoothT);
    const targetLook = new THREE.Vector3().lerpVectors(w0.look, w1.look, smoothT);
    const targetFov = THREE.MathUtils.lerp(w0.fov, w1.fov, smoothT);

    const lerpRate = 1.0 - Math.exp(-12.0 * dt);
    this.camera.position.lerp(targetPos, lerpRate);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, lerpRate);
    this.camera.updateProjectionMatrix();

    const curLook = new THREE.Vector3();
    this.camera.getWorldDirection(curLook);
    const curLookPoint = this.camera.position.clone().add(curLook.multiplyScalar(10.0));
    curLookPoint.lerp(targetLook, lerpRate);
    this.camera.lookAt(curLookPoint);
  }

  /**
   * Main Particle Animation:
   * 1. Autonomous resting flow along 4 organized layers
   * 2. Localized pointer disturbance wake and spring settling (< 600ms)
   * 3. Sculpture Unfolding & Formation on Scroll
   */
  private updateParticles(p: number, time: number, dt: number): void {
    // 1. Localized pointer raycast
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera);
    const hitPoint = new THREE.Vector3();
    let hasHit = false;

    if (this.pointer.active && this.raycaster.ray.intersectPlane(this.planeZ0, hitPoint)) {
      this.mouseWorld.copy(hitPoint);
      if (this.hasPrevMouseWorld) {
        this.mouseVelocityWorld.subVectors(this.mouseWorld, this.prevMouseWorld).divideScalar(Math.max(dt, 0.001));
      }
      this.prevMouseWorld.copy(this.mouseWorld);
      this.hasPrevMouseWorld = true;
      hasHit = true;
    } else {
      this.hasPrevMouseWorld = false;
      this.mouseVelocityWorld.set(0, 0, 0);
    }

    const mouseSmoothing = 1.0 - Math.exp(-18.0 * dt);
    this.smoothMouseVel.lerp(this.mouseVelocityWorld, mouseSmoothing);
    const mouseSpeed = this.smoothMouseVel.length();

    // Physics constants
    const baseRadius = 2.4;
    const radiusSq = baseRadius * baseRadius;
    const springK = 8.5;
    const damping = Math.exp(-9.0 * dt);

    const tempSurfacePt = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    // Formation weighting along scroll progression
    const releaseWeight = THREE.MathUtils.smoothstep(p, 0.18, 0.50);
    const reassembleWeight = THREE.MathUtils.smoothstep(p, 0.55, 0.95);

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const group = this.particleGroup[i];
      const foldIdx = this.particleFold[i];

      // Continuous autonomous advance along longitudinal coordinate u
      if (!this.isReducedMotion) {
        this.particleU[i] = (this.particleU[i] + this.particleFlowSpeed[i] * dt + 1.0) % 1.0;
      }
      const u = this.particleU[i];
      const v = this.particleV[i];

      // Local mesh displacement from unfolding
      const mesh = this.veilMeshes[foldIdx];
      const meshOffset = mesh ? mesh.position : new THREE.Vector3();

      if (group === PARTICLE_LAYER_REQUEST_CURRENT) {
        // Coherent packet traveling along Ingress Spline
        this.ingressCurve.getPointAt(u, tempSurfacePt);
        tempSurfacePt.x += Math.sin(time * 2.0 + this.particlePhase[i]) * 0.15;
        tempSurfacePt.y += Math.cos(time * 2.0 + this.particlePhase[i]) * 0.15;
        tempSurfacePt.z += Math.sin(time * 1.5 + this.particlePhase[i]) * 0.15;
      } else if (group === PARTICLE_LAYER_RESIDUAL_TRACE) {
        // Ambient micro-drift
        tempSurfacePt.set(
          this.particleOrigin[idx] + Math.sin(time * 0.4 + this.particlePhase[i]) * 0.35,
          this.particleOrigin[idx + 1] + Math.cos(time * 0.3 + this.particlePhase[i]) * 0.35,
          this.particleOrigin[idx + 2] + Math.sin(time * 0.25 + this.particlePhase[i]) * 0.25
        );
      } else {
        // Surface current & edge filament riding the unfolding ribbon
        this.veilSamplers[foldIdx].evaluate(u, v, tempSurfacePt, tempNorm);
        tempSurfacePt.add(meshOffset);
        tempSurfacePt.addScaledVector(tempNorm, group === PARTICLE_LAYER_EDGE_FILAMENT ? 0.08 : 0.04);
      }

      // Scroll Formation Event: Aperture Spiral -> Coherent Request Stream
      if (releaseWeight > 0.001 && group !== PARTICLE_LAYER_REQUEST_CURRENT) {
        const spiralAngle = this.particlePhase[i] + time * 1.8 + u * Math.PI * 4.0;
        const spiralRadius = THREE.MathUtils.lerp(2.2, 0.45, THREE.MathUtils.smoothstep(p, 0.20, 0.65));
        const spiralX = this.apertureCenter.x + Math.cos(spiralAngle) * spiralRadius;
        const spiralY = this.apertureCenter.y + Math.sin(spiralAngle) * spiralRadius;
        const spiralZ = this.apertureCenter.z + (u - 0.5) * 3.5;

        tempSurfacePt.lerp(new THREE.Vector3(spiralX, spiralY, spiralZ), releaseWeight * (1.0 - reassembleWeight * 0.7));

        if (reassembleWeight > 0.001) {
          const streamU = THREE.MathUtils.clamp((u + time * 0.2) % 1.0, 0, 1);
          const streamPt = this.ingressCurve.getPointAt(streamU);
          tempSurfacePt.lerp(streamPt, reassembleWeight);
        }
      }

      this.targetArray[idx] = tempSurfacePt.x;
      this.targetArray[idx + 1] = tempSurfacePt.y;
      this.targetArray[idx + 2] = tempSurfacePt.z;

      // Localized pointer disturbance: fluid wake on nearby particles
      if (hasHit && mouseSpeed > 0.05) {
        const dx = tempSurfacePt.x - this.mouseWorld.x;
        const dy = tempSurfacePt.y - this.mouseWorld.y;
        const dz = tempSurfacePt.z - this.mouseWorld.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const falloff = 1.0 - dist / baseRadius;
          const hermite = falloff * falloff * (3.0 - 2.0 * falloff);

          const pushMag = THREE.MathUtils.clamp(mouseSpeed * 0.45, 0.1, 1.8) * hermite;
          const invD = dist > 0.001 ? 1.0 / dist : 0;

          // Tangential wake vortex vector
          const tanX = -dy * invD;
          const tanY = dx * invD;

          this.dispVelArray[idx] += (dx * invD * 0.4 + tanX * 0.6) * pushMag;
          this.dispVelArray[idx + 1] += (dy * invD * 0.4 + tanY * 0.6) * pushMag;
          this.dispVelArray[idx + 2] += dz * invD * 0.2 * pushMag;
        }
      }

      // Spring-damper returning displacement D(t) -> 0 (< 600ms settling)
      const dX = this.dispArray[idx];
      const dY = this.dispArray[idx + 1];
      const dZ = this.dispArray[idx + 2];

      this.dispVelArray[idx] += -dX * springK * dt;
      this.dispVelArray[idx + 1] += -dY * springK * dt;
      this.dispVelArray[idx + 2] += -dZ * springK * dt;

      this.dispVelArray[idx] *= damping;
      this.dispVelArray[idx + 1] *= damping;
      this.dispVelArray[idx + 2] *= damping;

      this.dispArray[idx] += this.dispVelArray[idx] * dt;
      this.dispArray[idx + 1] += this.dispVelArray[idx + 1] * dt;
      this.dispArray[idx + 2] += this.dispVelArray[idx + 2] * dt;

      this.posArray[idx] = this.targetArray[idx] + this.dispArray[idx];
      this.posArray[idx + 1] = this.targetArray[idx + 1] + this.dispArray[idx + 1];
      this.posArray[idx + 2] = this.targetArray[idx + 2] + this.dispArray[idx + 2];
    }

    this.particlesGeo.attributes.position.needsUpdate = true;
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Smooth scroll progress interpolation
    const lerpSpeed = this.isReducedMotion ? 1.0 : 0.085;
    this.progress = THREE.MathUtils.lerp(this.progress, this.targetProgress, lerpSpeed);

    // Multi-timescale autonomous structural breathing
    if (!this.isReducedMotion) {
      const breathX = Math.sin(time * 0.75) * 0.025;
      const breathY = Math.cos(time * 0.60) * 0.035;
      const breathZ = Math.sin(time * 0.45) * 0.020;
      this.veilMeshGroup.position.set(breathX, breathY, breathZ);
    }

    // Dynamic Sculpture Unfolding on Scroll:
    // As progress p advances, the canopy lifts, core monolith parts laterally,
    // and prow lowers, opening a clear, profound central corridor through the aperture!
    if (this.veilMeshes.length >= 3) {
      const unfoldT = this.progress;
      const unfoldEase = unfoldT < 0.5 ? 2 * unfoldT * unfoldT : -1 + (4 - 2 * unfoldT) * unfoldT;

      // Mesh 0: Canopy (lifts up and back, creating expansive proscenium)
      this.veilMeshes[0].position.set(-unfoldEase * 1.6, unfoldEase * 1.8, -unfoldEase * 2.2);
      this.veilMeshes[0].rotation.set(-unfoldEase * 0.08, unfoldEase * 0.05, -unfoldEase * 0.04);

      // Mesh 1: Core Monolith (parts to the right, widening central inspection aperture)
      this.veilMeshes[1].position.set(unfoldEase * 2.2, -unfoldEase * 0.6, -unfoldEase * 1.4);
      this.veilMeshes[1].rotation.set(unfoldEase * 0.06, -unfoldEase * 0.16, unfoldEase * 0.08);

      // Mesh 2: Foreground Prow (sweeps downward and forward)
      this.veilMeshes[2].position.set(-unfoldEase * 0.8, -unfoldEase * 1.6, unfoldEase * 0.6);
      this.veilMeshes[2].rotation.set(-unfoldEase * 0.08, unfoldEase * 0.10, -unfoldEase * 0.06);
    }

    this.updateCamera(this.progress, dt);
    this.updateParticles(this.progress, time, dt);

    if (this.particlesMat) {
      this.particlesMat.uniforms.uTime.value = time;
      this.particlesMat.uniforms.uProgress.value = this.progress;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.reqId) cancelAnimationFrame(this.reqId);
    window.removeEventListener('resize', this.onResize);

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh || (obj as THREE.Points).isPoints) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: THREE.Material) => m.dispose());
        } else if (mesh.material) {
          (mesh.material as THREE.Material).dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
