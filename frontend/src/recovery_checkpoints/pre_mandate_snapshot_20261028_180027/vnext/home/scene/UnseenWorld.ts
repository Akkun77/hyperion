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

// Particle Behavioral Groups (Part B.2):
// Group 0: SURFACE TRACERS (55% = 13,200) - Follow surface streamlines, communicate curvature
// Group 1: EDGE FILAMENTS (25% = 6,000) - Follow razor rim, central aperture & illuminated ridges
// Group 2: SUSPENDED MICRO-MATTER (20% = 4,800) - Drift in 3D volume around sculpture for depth
export const PARTICLE_GROUP_TRACER = 0;
export const PARTICLE_GROUP_FILAMENT = 1;
export const PARTICLE_GROUP_MATTER = 2;

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

  // Pointer interaction state (Part B.3: 10px subtle, 50px fluid wake, 600ms spring settling)
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

  // -----------------------------------------------------------------
  // THE FRACTURED VEIL: 3 Monumental Interwoven Sculptural Folds
  // -----------------------------------------------------------------
  private veilSpecs: RibbonSpec[] = [];
  private veilSamplers: RibbonSampler[] = [];
  private veilMeshGroup = new THREE.Group();
  private veilMeshes: THREE.Mesh[] = [];

  // Surface & volumetric particles (24,000 fine fragments)
  private particleCount = 24000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Particle Group Assignment & Parameters
  private particleGroup!: Uint8Array;      // 0 = Tracer, 1 = Filament, 2 = Suspended Micro-matter
  private particleFold!: Uint8Array;       // Ribbon fold 0, 1, or 2
  private particleU!: Float32Array;        // Longitudinal parameter u in [0, 1]
  private particleV!: Float32Array;        // Transverse parameter v in [0, 1]
  private particleFlowSpeed!: Float32Array;// Tangential streaming velocity
  private particlePhase!: Float32Array;    // Harmonic breathing phase
  private particleOrigin!: Float32Array;   // 3D resting coordinates for micro-matter

  // Physical states
  private posArray!: Float32Array;         // Current 3D position
  private targetArray!: Float32Array;      // Evolving surface / formation anchor
  private dispArray!: Float32Array;        // Physical pointer displacement D(t)
  private dispVelArray!: Float32Array;     // Velocity dD/dt
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private apertureLight!: THREE.PointLight;

  // Central aperture focal point for formation vortex
  private readonly apertureCenter = new THREE.Vector3(3.4, 0.3, -1.0);

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
      // Recompose camera for mobile portrait: pull back and center vertically
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
      color: new THREE.Color('#0C0E12'),
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
   * Choreographed 4-Group Particle System (Part B.2):
   * Group A (55%): Surface Tracers
   * Group B (25%): Edge Filaments
   * Group C (20%): Suspended Micro-Matter
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

    const cPearl = new THREE.Color('#FFFFFF');
    const cSilver = new THREE.Color('#D0D8E4');
    const cTitanium = new THREE.Color('#8892A2');
    const cGraphite = new THREE.Color('#323742');

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

      // Fold assignment: 50% Core Monolith, 30% Canopy, 20% Prow
      const diceFold = Math.random();
      foldIdx = diceFold < 0.30 ? 0 : diceFold < 0.80 ? 1 : 2;
      this.particleFold[i] = foldIdx;
      this.particleU[i] = u;
      this.particlePhase[i] = Math.random() * Math.PI * 2;

      if (diceGroup < 0.55) {
        // -------------------------------------------------------------
        // GROUP A: SURFACE TRACERS (55%)
        // Follow 16 precise longitudinal streamline lanes communicating curvature
        // -------------------------------------------------------------
        group = PARTICLE_GROUP_TRACER;
        const lane = Math.floor(Math.random() * 16);
        v = (lane + 0.5) / 16.0 + (Math.random() - 0.5) * 0.035;
        v = THREE.MathUtils.clamp(v, 0.06, 0.94);
        speed = (0.025 + Math.random() * 0.030) * (foldIdx === 1 ? -1 : 1);
        pColor = Math.random() < 0.7 ? cSilver : cTitanium;
        pSize = 0.12 + Math.random() * 0.06;
        pAlpha = 0.85 + Math.random() * 0.15;
      } else if (diceGroup < 0.80) {
        // -------------------------------------------------------------
        // GROUP B: EDGE FILAMENTS (25%)
        // Dense luminous particles tracing knife-edge rims and aperture vortex
        // -------------------------------------------------------------
        group = PARTICLE_GROUP_FILAMENT;
        // Concentrate along outer beveled rims (v near 0 or 1) or aperture rim
        const isOuterRim = Math.random() < 0.65;
        v = isOuterRim ? (Math.random() < 0.5 ? 0.03 + Math.random() * 0.03 : 0.94 + Math.random() * 0.03) : 0.5 + (Math.random() - 0.5) * 0.08;
        speed = (0.040 + Math.random() * 0.035) * (foldIdx === 1 ? -1 : 1);
        pColor = cPearl;
        pSize = 0.22 + Math.random() * 0.09;
        pAlpha = 1.0;
      } else {
        // -------------------------------------------------------------
        // GROUP C: SUSPENDED MICRO-MATTER (20%)
        // Drifting in 3D volume around sculpture creating atmospheric depth
        // -------------------------------------------------------------
        group = PARTICLE_GROUP_MATTER;
        v = Math.random();
        speed = 0.012 + Math.random() * 0.015;
        pColor = Math.random() < 0.5 ? cTitanium : cGraphite;
        pSize = 0.08 + Math.random() * 0.04;
        pAlpha = 0.55 + Math.random() * 0.25;

        // Authored 3D volumetric offset around sculpture
        this.particleOrigin[idx] = (Math.random() - 0.5) * 16.0 + 2.0;
        this.particleOrigin[idx + 1] = (Math.random() - 0.5) * 12.0;
        this.particleOrigin[idx + 2] = (Math.random() - 0.5) * 8.0;
      }

      this.particleGroup[i] = group;
      this.particleV[i] = v;
      this.particleFlowSpeed[i] = speed;

      // Base target position
      if (group === PARTICLE_GROUP_MATTER) {
        tempTarget.set(
          this.particleOrigin[idx],
          this.particleOrigin[idx + 1],
          this.particleOrigin[idx + 2]
        );
      } else {
        this.veilSamplers[foldIdx].evaluate(u, v, tempTarget, tempNorm);
        tempTarget.addScaledVector(tempNorm, group === PARTICLE_GROUP_FILAMENT ? 0.09 : 0.05);
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
      this.baseAlphaArray[i] = pAlpha;
      this.colorArray[idx] = pColor.r;
      this.colorArray[idx + 1] = pColor.g;
      this.colorArray[idx + 2] = pColor.b;
    }

    this.particlesGeo = new THREE.BufferGeometry();
    this.particlesGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.particlesGeo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.particlesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.baseAlphaArray, 1));

    // Custom Lit Spherical Point Shader with perspective size attenuation
    this.particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uKeyLightDir: { value: new THREE.Vector3(0.55, 0.72, 0.52).normalize() },
        uGlobalAlpha: { value: 1.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        uniform float uGlobalAlpha;

        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDepth = -mvPosition.z;

          // Perspective attenuation: crisp fine points (clamp 1.5px to 10.0px)
          float pSize = aSize * (260.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.5, 10.0);

          // Atmospheric depth fade
          float depthFade = clamp(1.15 - (vDepth / 35.0), 0.15, 1.0);
          vAlpha = aAlpha * depthFade * uGlobalAlpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        uniform vec3 uKeyLightDir;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float rSq = dot(uv, uv);
          if (rSq > 0.25) discard;

          // Spherical normal approximation
          float zNorm = sqrt(max(0.0, 0.25 - rSq)) * 2.0;
          vec3 normal = normalize(vec3(uv * 2.0, zNorm));

          // Directional key light + rim highlight
          float diffuse = max(0.0, dot(normal, uKeyLightDir));
          float rim = pow(1.0 - max(0.0, normal.z), 2.2);

          vec3 litColor = vColor * (0.35 + 0.65 * diffuse) + vec3(0.96, 0.98, 1.0) * (rim * 0.45);

          // Feathered radial edge
          float edgeAlpha = smoothstep(0.5, 0.22, sqrt(rSq));
          gl_FragColor = vec4(litColor, edgeAlpha * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particlesMesh = new THREE.Points(this.particlesGeo, this.particlesMat);
    this.scene.add(this.particlesMesh);
  }

  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    this.updateVisibilityMode();
  }

  public getRenderMode(): RenderMode {
    return this.renderMode;
  }

  private updateVisibilityMode(): void {
    if (this.veilMeshGroup) {
      this.veilMeshGroup.visible = this.renderMode === 'mesh' || this.renderMode === 'both';
    }
    if (this.particlesMesh) {
      this.particlesMesh.visible = this.renderMode === 'particles' || this.renderMode === 'both';
    }
  }

  public setProgress(p: number): void {
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  public setDecisionMode(mode: DecisionMode): void {
    this.decisionMode = mode;
    if (this.apertureLight) {
      if (mode === 'BLOCK') this.apertureLight.color.set('#EB7777');
      else if (mode === 'FLAG') this.apertureLight.color.set('#E9B969');
      else this.apertureLight.color.set('#8EB2D8');
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
      // Mobile portrait elevation
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
   * 1. Autonomous resting streaming along streamlines & drift of micro-matter
   * 2. Localized pointer disturbance wake and damped spring settling (< 600ms)
   * 3. THE FORMATION EVENT ON SCROLL (Part B.4):
   *    BOUND TO SURFACE -> RELEASE -> FLOW THROUGH APERTURE -> REASSEMBLE INTO REQUEST STREAM
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

    // Physical pointer wake parameters
    const baseRadius = 2.4;
    const radiusSq = baseRadius * baseRadius;
    const springK = 8.5;
    const damping = Math.exp(-4.2 * dt);

    // Staged formation event envelope:
    // p in [0.0, 0.20]  -> 0.0: Strict surface adherence
    // p in [0.20, 0.65] -> 0.0 to 1.0: Progressive release & vortex spiral into aperture
    // p in [0.65, 1.00] -> Reassemble into focused luminous request stream heading forward
    const formationRelease = THREE.MathUtils.clamp((p - 0.20) / 0.45, 0, 1);
    const formationStream = THREE.MathUtils.clamp((p - 0.65) / 0.35, 0, 1);

    const tempSurfacePt = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const group = this.particleGroup[i];
      const foldIdx = this.particleFold[i];
      const sampler = this.veilSamplers[foldIdx];

      // Stream particles along longitudinal coordinate u
      this.particleU[i] += this.particleFlowSpeed[i] * dt;
      if (this.particleU[i] > 1.0) this.particleU[i] -= 1.0;
      if (this.particleU[i] < 0.0) this.particleU[i] += 1.0;

      if (group === PARTICLE_GROUP_MATTER) {
        // Suspended micro-matter 3D harmonic drift
        const phase = this.particlePhase[i];
        tempSurfacePt.set(
          this.particleOrigin[idx] + Math.sin(time * 0.4 + phase) * 0.4,
          this.particleOrigin[idx + 1] + Math.cos(time * 0.5 + phase) * 0.3,
          this.particleOrigin[idx + 2] + Math.sin(time * 0.3 + phase) * 0.5
        );
      } else {
        // Surface tracers and edge filaments
        const v = this.particleV[i] + Math.sin(time * 1.5 + this.particlePhase[i]) * 0.005;
        sampler.evaluate(this.particleU[i], v, tempSurfacePt, tempNorm);
        tempSurfacePt.addScaledVector(tempNorm, group === PARTICLE_GROUP_FILAMENT ? 0.09 : 0.05);
      }

      // -------------------------------------------------------------
      // FORMATION EVENT CALCULATION (Reversible on scroll):
      // If formationRelease > 0, blend resting position toward aperture vortex & request stream
      // -------------------------------------------------------------
      if (formationRelease > 0.001) {
        // Spiral Vortex into central aperture (3.4, 0.3, -1.0)
        const vortexAngle = this.particleU[i] * Math.PI * 6.0 + time * 1.5;
        const vortexRadius = (1.0 - formationRelease * 0.75) * (1.8 + Math.sin(this.particlePhase[i]) * 0.4);
        const vortexZ = THREE.MathUtils.lerp(-1.0, -3.2, formationRelease);

        const vortexTarget = new THREE.Vector3(
          this.apertureCenter.x + Math.cos(vortexAngle) * vortexRadius,
          this.apertureCenter.y + Math.sin(vortexAngle) * vortexRadius,
          vortexZ
        );

        // Reassembled Request Stream Beam: focused cylinder heading forward along Z
        const beamZ = THREE.MathUtils.lerp(-3.2, 5.0, formationStream);
        const beamAngle = this.particlePhase[i];
        const beamRadius = 0.28 + Math.sin(this.particleU[i] * Math.PI * 2) * 0.12;

        const streamTarget = new THREE.Vector3(
          this.apertureCenter.x + Math.cos(beamAngle) * beamRadius,
          this.apertureCenter.y + Math.sin(beamAngle) * beamRadius,
          beamZ
        );

        // Blend: Surface -> Vortex -> Beam
        const intermediate = new THREE.Vector3().lerpVectors(tempSurfacePt, vortexTarget, formationRelease);
        tempSurfacePt.lerpVectors(intermediate, streamTarget, formationStream);
      }

      this.targetArray[idx] = tempSurfacePt.x;
      this.targetArray[idx + 1] = tempSurfacePt.y;
      this.targetArray[idx + 2] = tempSurfacePt.z;

      // -------------------------------------------------------------
      // Localized pointer disturbance: fluid wake on nearby particles
      // -------------------------------------------------------------
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

      // P(t) = S(u,v,t) + D(t)
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

    // Continuous harmonic organic breathing of sculpture
    if (!this.isReducedMotion) {
      const breatheY = Math.sin(time * 0.65) * 0.035;
      const breatheZ = Math.cos(time * 0.50) * 0.025;
      this.veilMeshGroup.position.set(0, breatheY, breatheZ);
    }

    // Shaders & particle simulation update
    this.particlesMat.uniforms.uTime.value = time;
    this.updateCamera(this.progress, dt);
    this.updateParticles(this.progress, time, dt);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }

    window.removeEventListener('resize', this.onResize);

    if (this.particlesGeo) this.particlesGeo.dispose();
    if (this.particlesMat) this.particlesMat.dispose();

    this.veilMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    if (this.renderer && this.renderer.domElement) {
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}
