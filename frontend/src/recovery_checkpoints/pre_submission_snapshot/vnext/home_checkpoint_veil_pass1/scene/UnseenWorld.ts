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

  // Pointer interaction state
  private pointer: UnseenPointerState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    active: false,
  };
  private lastPointerTimestamp = 0;
  private mouseWorld = new THREE.Vector3();
  private prevMouseWorld = new THREE.Vector3();
  private mouseVelocityWorld = new THREE.Vector3();
  private smoothMouseVel = new THREE.Vector3();
  private hasPrevMouseWorld = false;
  private isMouseMoving = false;
  private raycaster = new THREE.Raycaster();
  private planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  // -----------------------------------------------------------------
  // THE FRACTURED VEIL: 3 Primary Interwoven Folded Surfaces
  // -----------------------------------------------------------------
  private veilSpecs: RibbonSpec[] = [];
  private veilSamplers: RibbonSampler[] = [];
  private veilMeshGroup = new THREE.Group();
  private veilMeshes: THREE.Mesh[] = [];

  // Surface-bound living matter particles (26,000 silk fragments)
  private particleCount = 26000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Surface-binding coordinates: P(t) = S(u,v,t) + F(t) + D(t)
  private particleFold!: Uint8Array;    // Fold index 0, 1, or 2
  private particleU!: Float32Array;        // Longitudinal position along ribbon u in [0, 1]
  private particleV!: Float32Array;        // Transverse position across ribbon v in [0, 1]
  private particleFlowSpeed!: Float32Array;// Tangential flow speed
  private particlePhase!: Float32Array;    // Harmonic breathing phase

  // Particle physical states
  private posArray!: Float32Array;         // Current 3D position
  private targetArray!: Float32Array;      // Evolving surface anchor S(u,v,t)
  private dispArray!: Float32Array;        // Physical displacement D(t)
  private dispVelArray!: Float32Array;     // Physical displacement velocity dD/dt
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // Signal Protagonist Entity
  private signalGroup = new THREE.Group();
  private signalCore!: THREE.Mesh;
  private signalAura!: THREE.Mesh;
  private signalLight!: THREE.PointLight;
  private signalTrail!: THREE.Line;
  private signalTrailGeo!: THREE.BufferGeometry;
  private signalTrailPoints: THREE.Vector3[] = [];

  // Act V Topology Telemetry Lines & Hubs
  private topologyGroup = new THREE.Group();
  private arteryLines!: THREE.LineSegments;
  private serviceHubNodes: THREE.Mesh[] = [];

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  // Camera Waypoints (Narrative & scroll-driven only; zero mouse coupling)
  private cameraWaypoints = [
    { p: 0.00, pos: new THREE.Vector3(1.2, 1.2, 14.5), look: new THREE.Vector3(1.6, 0.2, 0.0), fov: 42 },
    { p: 0.15, pos: new THREE.Vector3(1.6, 0.9, 11.5), look: new THREE.Vector3(1.2, 0.1, 0.0), fov: 42 },
    { p: 0.32, pos: new THREE.Vector3(2.2, 0.6, 7.5), look: new THREE.Vector3(1.0, 0.0, 0.0), fov: 44 },
    { p: 0.44, pos: new THREE.Vector3(1.0, 0.2, 5.2), look: new THREE.Vector3(0.6, 0.0, 0.0), fov: 45 },
    { p: 0.60, pos: new THREE.Vector3(-0.6, 0.6, 7.5), look: new THREE.Vector3(1.2, 0.0, 0.0), fov: 44 },
    { p: 0.78, pos: new THREE.Vector3(0.0, 6.5, 16.0), look: new THREE.Vector3(0.0, 0.5, 0.0), fov: 40 },
    { p: 1.00, pos: new THREE.Vector3(0.0, 1.2, 13.5), look: new THREE.Vector3(0.0, 0.0, 0.0), fov: 38 },
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
    this.camera.position.copy(this.cameraWaypoints[0].pos);
    this.camera.lookAt(this.cameraWaypoints[0].look);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initLights();
    this.initVeilSculpturalMeshes();
    this.initSurfaceBoundParticles();
    this.initSignalProtagonist();
    this.initTopologyStructure();

    this.updateVisibilityMode();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Expose for E2E testing and telemetry verification
    if (typeof window !== 'undefined') {
      (window as any).__UNSEEN_WORLD__ = this;
    }

    this.animate();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight('#0F1115', 0.85);
    this.scene.add(this.ambientLight);

    // Directional Key Light: Sharp architectural lighting from upper right
    this.keyLight = new THREE.DirectionalLight('#F0F4F8', 3.2);
    this.keyLight.position.set(12, 16, 12);
    this.scene.add(this.keyLight);

    // Cool Rim Light: Highlighting silhouettes & sharp bevel ridges from rear-left
    this.rimLight = new THREE.DirectionalLight('#E2E6EE', 3.8);
    this.rimLight.position.set(-16, 10, -12);
    this.scene.add(this.rimLight);

    // Deep graphite cavity bounce
    this.fillLight = new THREE.DirectionalLight('#242832', 0.9);
    this.fillLight.position.set(2, -12, 6);
    this.scene.add(this.fillLight);

    // Interior Aperture Cavity Point Light: Casts mysterious ambient glow from inside the central opening
    const apertureLight = new THREE.PointLight('#A8B2BD', 2.6, 8.0, 2.0);
    apertureLight.position.set(2.8, 0.2, -1.8);
    this.scene.add(apertureLight);
  }

  /**
   * Monumental Sculptural Meshes:
   * Constructs the 3 massive volumetric ribbons of The Fractured Veil with physical thickness,
   * beveled edges, and surface-depth vertex colors.
   */
  private initVeilSculpturalMeshes(): void {
    this.veilSpecs = FracturedVeilGeometry.getVeilSpecs();
    this.veilSamplers = this.veilSpecs.map((spec) => new RibbonSampler(spec));

    // High quality metallic architectural material with satin silver sheen & pearl highlights
    const veilMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1E222A'),
      roughness: 0.28,
      metalness: 0.85,
      clearcoat: 0.45,
      clearcoatRoughness: 0.20,
      sheen: 0.95,
      sheenColor: new THREE.Color('#D8DEE6'),
      specularIntensity: 1.55,
      specularColor: new THREE.Color('#FFFFFF'),
      vertexColors: true,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    this.veilSamplers.forEach((sampler) => {
      const geo = FracturedVeilGeometry.createRibbonGeometry(sampler);
      const mesh = new THREE.Mesh(geo, veilMat);
      this.veilMeshes.push(mesh);
      this.veilMeshGroup.add(mesh);
    });

    this.scene.add(this.veilMeshGroup);
  }

  /**
   * GATE 2: Surface-Bound Particles
   * Binds 16,000 particles to the parametric surfaces S(u, v) of the 3 folds.
   */
  private initSurfaceBoundParticles(): void {
    this.posArray = new Float32Array(this.particleCount * 3);
    this.targetArray = new Float32Array(this.particleCount * 3);
    this.dispArray = new Float32Array(this.particleCount * 3);
    this.dispVelArray = new Float32Array(this.particleCount * 3);

    this.particleFold = new Uint8Array(this.particleCount);
    this.particleU = new Float32Array(this.particleCount);
    this.particleV = new Float32Array(this.particleCount);
    this.particleFlowSpeed = new Float32Array(this.particleCount);
    this.particlePhase = new Float32Array(this.particleCount);

    this.sizeArray = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.baseAlphaArray = new Float32Array(this.particleCount);

    const cPearl = new THREE.Color('#F4F4F1');
    const cSilver = new THREE.Color('#BFC3C7');
    const cTitanium = new THREE.Color('#6C727A');
    const cGraphite = new THREE.Color('#2A2E35');
    const cObsidian = new THREE.Color('#15171B');

    const tempTarget = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Assign fold: 48% Core Monolith (aperture), 32% Vaulted Canopy, 20% Foreground Prow
      const diceFold = Math.random();
      const foldIdx = diceFold < 0.32 ? 0 : diceFold < 0.80 ? 1 : 2;
      this.particleFold[i] = foldIdx;

      // Longitudinal parameter u along fold
      const u = Math.random();
      this.particleU[i] = u;

      // Transverse parameter v across fold width:
      // Structured silk grain distribution:
      // - 70% in 12 discrete longitudinal streamline lanes across ribbon
      // - 20% concentrated along central crest ridge (v ~ 0.5)
      // - 10% tracing edge contour boundaries (v ~ 0.05 and 0.95)
      const rV = Math.random();
      let vParam: number;
      if (rV < 0.70) {
        const lane = Math.floor(Math.random() * 12);
        const laneV = (lane + 0.5) / 12.0;
        vParam = laneV + (Math.random() - 0.5) * 0.055;
      } else if (rV < 0.90) {
        vParam = 0.5 + (Math.random() - 0.5) * 0.12;
      } else {
        vParam = Math.random() < 0.5 ? 0.04 + Math.random() * 0.04 : 0.92 + Math.random() * 0.04;
      }
      this.particleV[i] = THREE.MathUtils.clamp(vParam, 0.02, 0.98);

      // Tangential surface flow speed: fine particles stream across surface
      const baseSpeed = 0.030 + Math.random() * 0.038;
      const flowDir = foldIdx === 1 ? -1 : 1; // Middle fold streams counter to high fold
      this.particleFlowSpeed[i] = baseSpeed * flowDir;
      this.particlePhase[i] = Math.random() * Math.PI * 2;

      // Initial surface anchor position S(u, v) on top volumetric face
      const tempNorm = new THREE.Vector3();
      this.veilSamplers[foldIdx].evaluate(u, this.particleV[i], tempTarget, tempNorm);
      tempTarget.addScaledVector(tempNorm, 0.08);

      this.posArray[idx] = tempTarget.x;
      this.posArray[idx + 1] = tempTarget.y;
      this.posArray[idx + 2] = tempTarget.z;

      this.targetArray[idx] = tempTarget.x;
      this.targetArray[idx + 1] = tempTarget.y;
      this.targetArray[idx + 2] = tempTarget.z;

      // Displacement starts at zero
      this.dispArray[idx] = 0;
      this.dispArray[idx + 1] = 0;
      this.dispArray[idx + 2] = 0;

      this.dispVelArray[idx] = 0;
      this.dispVelArray[idx + 1] = 0;
      this.dispVelArray[idx + 2] = 0;

      // Palette and scale distribution (Fine silk fragments, NOT oversized bubbles)
      const dice = Math.random();
      let chosenColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      if (dice < 0.25) {
        // 25% Deep graphite / slate: dark structural body & shadow folds
        chosenColor = Math.random() < 0.5 ? cGraphite : cObsidian;
        pSize = 0.10 + Math.random() * 0.06;
        pAlpha = 0.55 + Math.random() * 0.25;
      } else if (dice < 0.65) {
        // 40% Metallic titanium / platinum: illuminated surface contours
        chosenColor = cTitanium;
        pSize = 0.16 + Math.random() * 0.08;
        pAlpha = 0.80 + Math.random() * 0.15;
      } else if (dice < 0.90) {
        // 25% Refined satin silver highlights on ridges
        chosenColor = cSilver;
        pSize = 0.26 + Math.random() * 0.10;
        pAlpha = 0.95;
      } else {
        // 10% Luminous pearl focal highlights
        chosenColor = cPearl;
        pSize = 0.38 + Math.random() * 0.14;
        pAlpha = 1.0;
      }

      this.sizeArray[i] = pSize;
      this.baseAlphaArray[i] = pAlpha;
      this.colorArray[idx] = chosenColor.r;
      this.colorArray[idx + 1] = chosenColor.g;
      this.colorArray[idx + 2] = chosenColor.b;
    }

    this.particlesGeo = new THREE.BufferGeometry();
    this.particlesGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.particlesGeo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.particlesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.baseAlphaArray, 1));

    // Custom 3D Lit Spherical Point Shader
    this.particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uKeyLightDir: { value: new THREE.Vector3(0.5, 0.75, 0.55).normalize() },
        uRimLightDir: { value: new THREE.Vector3(-0.6, 0.4, -0.7).normalize() },
        uSignalPos: { value: new THREE.Vector3(0, 20, -30) },
        uSignalIntensity: { value: 0 },
        uGlobalAlpha: { value: 1.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        uniform vec3 uSignalPos;
        uniform float uSignalIntensity;
        uniform float uGlobalAlpha;

        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDepth = -mvPosition.z;

          // Illumination from Signal protagonist
          float distToSignal = length(position - uSignalPos);
          float signalGlow = uSignalIntensity / (distToSignal * distToSignal + 1.2);
          vColor += vec3(signalGlow * 0.45);

          // Perspective size attenuation (crisp fine points, no oversized bubbles)
          float pSize = aSize * (260.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.2, 16.0);

          // Atmospheric depth fade
          float depthFade = clamp(1.15 - (vDepth / 32.0), 0.15, 1.0);
          vAlpha = aAlpha * depthFade * uGlobalAlpha;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;
        uniform vec3 uKeyLightDir;
        uniform vec3 uRimLightDir;

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

          vec3 litColor = vColor * (0.35 + 0.65 * diffuse) + vec3(0.96, 0.98, 1.0) * (rim * 0.48);

          // Soft feathered radial edge
          float edgeAlpha = smoothstep(0.5, 0.25, sqrt(rSq));
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

  private initSignalProtagonist(): void {
    const coreGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF') });
    this.signalCore = new THREE.Mesh(coreGeo, coreMat);
    this.signalGroup.add(this.signalCore);

    const auraGeo = new THREE.TorusGeometry(0.42, 0.03, 16, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#BFC3C7'),
      transparent: true,
      opacity: 0.8,
    });
    this.signalAura = new THREE.Mesh(auraGeo, auraMat);
    this.signalGroup.add(this.signalAura);

    this.signalLight = new THREE.PointLight('#F4F4F1', 3.0, 8.5, 2);
    this.signalGroup.add(this.signalLight);

    this.signalTrailPoints = [];
    for (let i = 0; i < 20; i++) {
      this.signalTrailPoints.push(new THREE.Vector3());
    }
    this.signalTrailGeo = new THREE.BufferGeometry().setFromPoints(this.signalTrailPoints);
    const trailMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#BFC3C7'),
      transparent: true,
      opacity: 0.45,
    });
    this.signalTrail = new THREE.Line(this.signalTrailGeo, trailMat);
    this.scene.add(this.signalTrail);

    this.signalGroup.position.set(0, 20, -30);
    this.scene.add(this.signalGroup);
  }

  private initTopologyStructure(): void {
    const pPlatform = new THREE.Vector3(0, 3.8, 0.4);
    const sIngress = new THREE.Vector3(-4.6, 0.4, 1.2);
    const sCore = new THREE.Vector3(0.2, -0.6, -0.6);
    const sTelemetry = new THREE.Vector3(5.0, 0.6, 0.9);

    const arteryPoints: THREE.Vector3[] = [];
    const addCurvePoints = (start: THREE.Vector3, end: THREE.Vector3, ctrl: THREE.Vector3) => {
      const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
      const pts = curve.getPoints(16);
      for (let i = 0; i < pts.length - 1; i++) {
        arteryPoints.push(pts[i], pts[i + 1]);
      }
    };

    addCurvePoints(pPlatform, sIngress, new THREE.Vector3(-2.2, 2.5, 1.0));
    addCurvePoints(pPlatform, sCore, new THREE.Vector3(0.1, 1.6, 0.0));
    addCurvePoints(pPlatform, sTelemetry, new THREE.Vector3(2.6, 2.4, 0.8));
    addCurvePoints(sIngress, sCore, new THREE.Vector3(-2.0, -0.2, 0.4));
    addCurvePoints(sCore, sTelemetry, new THREE.Vector3(2.4, -0.1, 0.2));

    const arteryGeo = new THREE.BufferGeometry().setFromPoints(arteryPoints);
    const arteryMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#8A9099'),
      transparent: true,
      opacity: 0.0,
    });
    this.arteryLines = new THREE.LineSegments(arteryGeo, arteryMat);
    this.topologyGroup.add(this.arteryLines);

    const hubGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const hubMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E4E6E8'),
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.0,
    });

    [pPlatform, sIngress, sCore, sTelemetry].forEach((pos, idx) => {
      const node = new THREE.Mesh(hubGeo, hubMat);
      node.position.copy(pos);
      node.scale.setScalar(idx === 0 ? 1.25 : 0.9);
      node.visible = false;
      this.serviceHubNodes.push(node);
      this.topologyGroup.add(node);
    });

    this.scene.add(this.topologyGroup);
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
  }

  public setPointer(x: number, y: number, vx: number, vy: number, active: boolean): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.vx = vx;
    this.pointer.vy = vy;
    this.pointer.speed = Math.hypot(vx, vy);
    this.pointer.active = active;
    this.lastPointerTimestamp = performance.now();
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
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateCamera(p: number, dt: number): void {
    let i0 = 0;
    while (i0 < this.cameraWaypoints.length - 2 && this.cameraWaypoints[i0 + 1].p <= p) {
      i0++;
    }
    const i1 = i0 + 1;
    const w0 = this.cameraWaypoints[i0];
    const w1 = this.cameraWaypoints[i1];

    const segmentT = (p - w0.p) / Math.max(w1.p - w0.p, 0.0001);
    const smoothT = THREE.MathUtils.smoothstep(segmentT, 0, 1);

    const targetPos = new THREE.Vector3().lerpVectors(w0.pos, w1.pos, smoothT);
    const targetLook = new THREE.Vector3().lerpVectors(w0.look, w1.look, smoothT);
    const targetFov = THREE.MathUtils.lerp(w0.fov, w1.fov, smoothT);

    if (this.camera.aspect < 1.0) {
      targetPos.z *= 1.45;
      targetPos.x *= 0.5;
    }

    this.camera.position.lerp(targetPos, dt * 8.0);
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(targetLook);
  }

  private updateSignal(p: number, time: number): void {
    const signalPos = new THREE.Vector3();
    let opacity = 0;
    let lightIntensity = 0;
    const auraColor = new THREE.Color('#BFC3C7');
    const targetX = 2.4;

    if (p < 0.12) {
      signalPos.set(10, 15, -25);
      opacity = 0;
      lightIntensity = 0;
    } else if (p < 0.32) {
      const t = (p - 0.12) / 0.20;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
      signalPos.set(
        THREE.MathUtils.lerp(9.0, 3.8, smoothT),
        THREE.MathUtils.lerp(4.5, 0.8, smoothT),
        THREE.MathUtils.lerp(-12.0, -1.5, smoothT)
      );
      opacity = smoothT;
      lightIntensity = smoothT * 3.2;
    } else if (p < 0.50) {
      const t = (p - 0.32) / 0.18;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
      signalPos.set(
        THREE.MathUtils.lerp(3.8, targetX, smoothT),
        THREE.MathUtils.lerp(0.8, 0.0, smoothT),
        THREE.MathUtils.lerp(-1.5, 0.0, smoothT)
      );
      const impactProximity = 1.0 - Math.abs(p - 0.42) / 0.08;
      const flare = Math.max(0, impactProximity) * 3.5;
      opacity = 1.0;
      lightIntensity = 3.2 + flare;
    } else if (p < 0.68) {
      const t = (p - 0.50) / 0.18;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);

      if (this.decisionMode === 'ALLOW') {
        auraColor.set('#53CE9A');
        signalPos.set(
          THREE.MathUtils.lerp(targetX, -4.5, smoothT),
          THREE.MathUtils.lerp(0.0, 0.4, smoothT),
          THREE.MathUtils.lerp(0.0, 2.0, smoothT)
        );
        opacity = 1.0 - smoothT * 0.45;
        lightIntensity = 2.8;
      } else if (this.decisionMode === 'FLAG') {
        auraColor.set('#E9B969');
        signalPos.set(
          THREE.MathUtils.lerp(targetX, -1.5, smoothT),
          THREE.MathUtils.lerp(0.0, 0.2, smoothT),
          THREE.MathUtils.lerp(0.0, 1.5, smoothT)
        );
        opacity = 0.85;
        lightIntensity = 2.6;
      } else {
        auraColor.set('#EB7777');
        signalPos.set(targetX, 0, 0);
        opacity = Math.max(0, 1.0 - smoothT * 1.5);
        lightIntensity = Math.max(0, 2.8 - smoothT * 2.8);
      }
    } else {
      signalPos.set(targetX, 0, 0);
      opacity = 0;
      lightIntensity = 0;
    }

    this.signalGroup.position.copy(signalPos);
    (this.signalAura.material as THREE.MeshBasicMaterial).color.copy(auraColor);
    (this.signalAura.material as THREE.MeshBasicMaterial).opacity = opacity;
    (this.signalCore.material as THREE.MeshBasicMaterial).opacity = opacity;
    this.signalLight.intensity = lightIntensity;

    this.signalAura.rotation.x = time * 2.0;
    this.signalAura.rotation.y = time * 1.6;

    if (opacity > 0.05) {
      this.signalTrailPoints.unshift(signalPos.clone());
      this.signalTrailPoints.pop();
      this.signalTrailGeo.setFromPoints(this.signalTrailPoints);
      (this.signalTrail.material as THREE.LineBasicMaterial).opacity = opacity * 0.45;
    } else {
      (this.signalTrail.material as THREE.LineBasicMaterial).opacity = 0;
    }

    this.particlesMat.uniforms.uSignalPos.value.copy(signalPos);
    this.particlesMat.uniforms.uSignalIntensity.value = lightIntensity;
  }

  private updateTopologyStructure(p: number): void {
    const arteryMat = this.arteryLines.material as THREE.LineBasicMaterial;
    
    if (p >= 0.67 && p < 0.85) {
      const t = p < 0.74 
        ? (p - 0.67) / 0.07 
        : p < 0.80 
          ? 1.0 
          : 1.0 - (p - 0.80) / 0.05;
      const alpha = THREE.MathUtils.smoothstep(t, 0, 1);
      arteryMat.opacity = alpha * 0.55;
      this.serviceHubNodes.forEach((node) => {
        node.visible = true;
        (node.material as THREE.MeshStandardMaterial).opacity = alpha * 0.9;
      });
    } else {
      arteryMat.opacity = 0;
      this.serviceHubNodes.forEach((node) => {
        node.visible = false;
      });
    }
  }

  /**
   * The Fractured Veil Motion Engine:
   * A. Structural Motion: Folds breathe and flex harmonically.
   * B. Surface Flow: Particles travel tangentially along authored ribbon coordinates u.
   * C. Local Physical Displacement: D(t) with spring return and damping.
   */
  private updateFracturedVeil(p: number, dt: number, time: number): void {
    // -------------------------------------------------------------
    // A. Structural Breathing of the 3 Folds
    // -------------------------------------------------------------
    const breatheAngle = time * 0.35;
    this.veilMeshGroup.rotation.y = Math.sin(breatheAngle * 0.6) * 0.035;
    this.veilMeshGroup.rotation.x = Math.cos(breatheAngle * 0.4) * 0.02;
    this.veilMeshGroup.position.y = Math.sin(breatheAngle * 0.8) * 0.08;

    // -------------------------------------------------------------
    // Pointer World Velocity & Interaction Plane
    // -------------------------------------------------------------
    this.raycaster.setFromCamera(
      new THREE.Vector2(this.pointer.x, this.pointer.y),
      this.camera
    );
    this.raycaster.ray.intersectPlane(this.planeZ0, this.mouseWorld);

    const now = performance.now();
    const isStationary = !this.pointer.active || (now - this.lastPointerTimestamp > 70);

    if (isStationary) {
      this.smoothMouseVel.multiplyScalar(Math.exp(-22.0 * dt));
      this.isMouseMoving = this.smoothMouseVel.length() > 0.02;
      this.hasPrevMouseWorld = false;
    } else {
      if (!this.hasPrevMouseWorld) {
        this.prevMouseWorld.copy(this.mouseWorld);
        this.hasPrevMouseWorld = true;
        this.smoothMouseVel.set(0, 0, 0);
        this.isMouseMoving = false;
      } else {
        const dx = this.mouseWorld.x - this.prevMouseWorld.x;
        const dy = this.mouseWorld.y - this.prevMouseWorld.y;
        const worldDelta = Math.hypot(dx, dy);

        // Reject extreme off-screen coordinate jumps (> 8 world units in 1 frame)
        if (worldDelta > 8.0) {
          this.prevMouseWorld.copy(this.mouseWorld);
          this.smoothMouseVel.set(0, 0, 0);
          this.isMouseMoving = false;
        } else {
          const effectiveDt = Math.max(dt, 0.001);
          const rawVx = dx / effectiveDt;
          const rawVy = dy / effectiveDt;
          this.mouseVelocityWorld.set(rawVx, rawVy, 0);

          const maxWorldSpeed = 16.0;
          const curSpeed = this.mouseVelocityWorld.length();
          if (curSpeed > maxWorldSpeed) {
            this.mouseVelocityWorld.multiplyScalar(maxWorldSpeed / curSpeed);
          }

          this.smoothMouseVel.lerp(this.mouseVelocityWorld, 1.0 - Math.exp(-22.0 * dt));
          this.isMouseMoving = this.smoothMouseVel.length() > 0.02;
        }
      }
    }
    this.prevMouseWorld.copy(this.mouseWorld);

    const mouseSpeed = this.smoothMouseVel.length();

    // -------------------------------------------------------------
    // Narrative Scroll Transformations along Acts
    // -------------------------------------------------------------
    const tDescent = THREE.MathUtils.smoothstep((p - 0.12) / 0.18, 0, 1);
    const tImpact = THREE.MathUtils.smoothstep((p - 0.30) / 0.14, 0, 1);
    const tDecision = THREE.MathUtils.smoothstep((p - 0.48) / 0.14, 0, 1);
    const tUnfold = THREE.MathUtils.smoothstep((p - 0.66) / 0.15, 0, 1);
    const tEvidence = THREE.MathUtils.smoothstep((p - 0.84) / 0.14, 0, 1);

    // Physics parameters
    const flowMultiplier = this.debugParams.flowSpeed;
    const radius = this.debugParams.mouseRadius;
    const radiusSq = radius * radius;
    const springK = 4.2;
    const damping = Math.pow(this.debugParams.damping, dt * 60.0);

    const fRepelBase = this.debugParams.mouseForce * 0.14;
    const fSwirlBase = this.debugParams.mouseSwirl * 0.18;
    const speedFactor = Math.min(Math.pow(mouseSpeed / 3.0, 0.75), 2.2);
    const impulseScale = dt * 60.0;

    let dirX = 0;
    let dirY = 0;
    let wakeX = 0;
    let wakeY = 0;
    if (mouseSpeed > 0.01) {
      dirX = this.smoothMouseVel.x / mouseSpeed;
      dirY = this.smoothMouseVel.y / mouseSpeed;
      wakeX = -dirY;
      wakeY = dirX;
    }

    const tempSurfaceP = new THREE.Vector3();
    const tempSurfaceNorm = new THREE.Vector3();

    // Only update particle positions if particles are active
    if (this.renderMode !== 'mesh') {
      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        const foldIdx = this.particleFold[i];

        // -------------------------------------------------------------
        // B. Surface Flow: Advance u along the authored ribbon surface
        // -------------------------------------------------------------
        if (!this.isReducedMotion) {
          this.particleU[i] += this.particleFlowSpeed[i] * flowMultiplier * dt;
          if (this.particleU[i] > 1.0) this.particleU[i] -= 1.0;
          if (this.particleU[i] < 0.0) this.particleU[i] += 1.0;
        }

        // Evaluate authored surface anchor S(u, v, t)
        this.veilSamplers[foldIdx].evaluate(
          this.particleU[i],
          this.particleV[i],
          tempSurfaceP,
          tempSurfaceNorm
        );
        tempSurfaceP.addScaledVector(tempSurfaceNorm, 0.08);

        // Apply structural breathing translation to surface anchor
        tempSurfaceP.y += Math.sin(breatheAngle * 0.8 + this.particlePhase[i]) * 0.06;

        let sx = tempSurfaceP.x;
        let sy = tempSurfaceP.y;
        let sz = tempSurfaceP.z;

        // -------------------------------------------------------------
        // Narrative Scroll Morphing (Reversible, preserving structure identity)
        // -------------------------------------------------------------
        // Act II: Descent — foreground matter parts slightly to clear central corridor
        if (tDescent > 0 && tImpact === 0) {
          const corridorDist = Math.hypot(sx - 2.4, sy);
          if (corridorDist < 2.5) {
            const partMag = (1.0 - corridorDist / 2.5) * 1.2 * tDescent;
            sx += (sx >= 2.4 ? 1 : -1) * partMag;
          }
        }

        // Act III: Impact — radial pressure wave radiating from central opening (2.4, 0, 0)
        if (tImpact > 0 && tDecision === 0) {
          const dxImp = sx - 2.4;
          const dyImp = sy;
          const dzImp = sz;
          const dImp = Math.max(0.6, Math.hypot(dxImp, dyImp, dzImp));
          const waveMag = Math.min(3.8 / dImp, 2.5) * tImpact;
          sx += (dxImp / dImp) * waveMag;
          sy += (dyImp / dImp) * waveMag;
          sz += (dzImp / dImp) * waveMag;
        }

        // Act IV: Decision Outcomes
        if (tDecision > 0 && tUnfold === 0) {
          if (this.decisionMode === 'ALLOW') {
            // Folds open laminar downstream conduit
            if (foldIdx === 1) {
              sx = THREE.MathUtils.lerp(sx, sx - 2.5, tDecision);
              sz = THREE.MathUtils.lerp(sz, sz + 1.8, tDecision);
            }
          } else if (this.decisionMode === 'FLAG') {
            // Ionization trace along fold 1 lip
            if (foldIdx === 1) {
              sy += Math.sin(time * 3.0 + this.particlePhase[i]) * 0.15 * tDecision;
            }
          } else {
            // BLOCK: Kinetic arrest, folds contract tightly at threshold
            if (foldIdx === 1) {
              const blkDist = Math.hypot(sx - 2.4, sy);
              if (blkDist < 3.0) {
                sx = THREE.MathUtils.lerp(sx, 2.4 + (sx - 2.4) * 0.5, tDecision);
                sy = THREE.MathUtils.lerp(sy, sy * 0.5, tDecision);
              }
            }
          }
        }

        // Act V: Unfolding Topology — Folds separate hierarchically into 3 distinct service regions
        if (tUnfold > 0 && tEvidence === 0) {
          if (foldIdx === 0) {
            // High fold aligns with Platform Apex & Ingress
            sx = THREE.MathUtils.lerp(sx, sx - 1.8, tUnfold);
            sy = THREE.MathUtils.lerp(sy, sy + 0.8, tUnfold);
          } else if (foldIdx === 1) {
            // Middle fold settles into Core Inspection sector
            sz = THREE.MathUtils.lerp(sz, sz - 1.2, tUnfold);
          } else {
            // Lower fold flows out to Telemetry cluster
            sx = THREE.MathUtils.lerp(sx, sx + 2.2, tUnfold);
            sy = THREE.MathUtils.lerp(sy, sy - 0.6, tUnfold);
          }
        }

        // Act VI: Evidence — Matter gracefully settles into framing perimeter
        if (tEvidence > 0) {
          const evAngle = (i / this.particleCount) * Math.PI * 2;
          const evRadius = 8.6 + (i % 14) * 0.45;
          const evX = Math.cos(evAngle) * evRadius * 1.35;
          const evY = Math.sin(evAngle) * evRadius * 0.82;
          const evZ = -2.8 + (Math.sin(this.particlePhase[i]) * 1.2);

          sx = THREE.MathUtils.lerp(sx, evX, tEvidence);
          sy = THREE.MathUtils.lerp(sy, evY, tEvidence);
          sz = THREE.MathUtils.lerp(sz, evZ, tEvidence);
        }

        this.targetArray[idx] = sx;
        this.targetArray[idx + 1] = sy;
        this.targetArray[idx + 2] = sz;

        // Current particle position: P = S(u, v, t) + D(t)
        const curPx = sx + this.dispArray[idx];
        const curPy = sy + this.dispArray[idx + 1];
        const curPz = sz + this.dispArray[idx + 2];

        // -------------------------------------------------------------
        // C. Local Physical Displacement D(t) from Pointer Interaction
        // -------------------------------------------------------------
        if (this.isMouseMoving && !this.isReducedMotion && p < 0.68) {
          const dx = curPx - this.mouseWorld.x;
          const dy = curPy - this.mouseWorld.y;
          const dz = (curPz - this.mouseWorld.z) * 1.4;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < radiusSq) {
            const d = Math.sqrt(distSq);
            const uDist = d / radius;
            const w = (1.0 - uDist) * (1.0 - uDist);

            const rx = dx / (d + 0.001);
            const ry = dy / (d + 0.001);

            const side = dx * wakeX + dy * wakeY;
            const sideSign = side >= 0 ? 1.0 : -1.0;

            const fRepel = fRepelBase * (0.35 + 0.65 * speedFactor);
            const fSwirl = fSwirlBase * speedFactor;

            const fx = (rx * fRepel + wakeX * sideSign * fSwirl) * w * impulseScale;
            const fy = (ry * fRepel + wakeY * sideSign * fSwirl) * w * impulseScale;
            const fz = (curPz - this.mouseWorld.z) * 0.08 * fRepel * w * impulseScale;

            this.dispVelArray[idx] += fx;
            this.dispVelArray[idx + 1] += fy;
            this.dispVelArray[idx + 2] += fz;
          }
        }

        // Restoring spring pulling displacement back to zero
        this.dispVelArray[idx] -= this.dispArray[idx] * (springK * dt);
        this.dispVelArray[idx + 1] -= this.dispArray[idx + 1] * (springK * dt);
        this.dispVelArray[idx + 2] -= this.dispArray[idx + 2] * (springK * dt);

        // Damping
        this.dispVelArray[idx] *= damping;
        this.dispVelArray[idx + 1] *= damping;
        this.dispVelArray[idx + 2] *= damping;

        // Clamp maximum displacement velocity
        const vSq = this.dispVelArray[idx] * this.dispVelArray[idx] +
                    this.dispVelArray[idx + 1] * this.dispVelArray[idx + 1] +
                    this.dispVelArray[idx + 2] * this.dispVelArray[idx + 2];
        if (vSq > 24.0) {
          const s = 4.89 / Math.sqrt(vSq);
          this.dispVelArray[idx] *= s;
          this.dispVelArray[idx + 1] *= s;
          this.dispVelArray[idx + 2] *= s;
        }

        // Integrate displacement
        this.dispArray[idx] += this.dispVelArray[idx] * (dt * 60.0);
        this.dispArray[idx + 1] += this.dispVelArray[idx + 1] * (dt * 60.0);
        this.dispArray[idx + 2] += this.dispVelArray[idx + 2] * (dt * 60.0);

        // Final integrated position P(t) = S(u,v,t) + D(t)
        this.posArray[idx] = sx + this.dispArray[idx];
        this.posArray[idx + 1] = sy + this.dispArray[idx + 1];
        this.posArray[idx + 2] = sz + this.dispArray[idx + 2];
      }

      this.particlesGeo.attributes.position.needsUpdate = true;
    }
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.08);
    const time = this.clock.getElapsedTime();

    this.progress = THREE.MathUtils.lerp(this.progress, this.targetProgress, dt * 8.5);

    this.updateCamera(this.progress, dt);
    this.updateSignal(this.progress, time);
    this.updateFracturedVeil(this.progress, dt, time);
    this.updateTopologyStructure(this.progress);

    if (this.particlesMat) {
      this.particlesMat.uniforms.uTime.value = time;
    }
    this.renderer.render(this.scene, this.camera);
  };

  public getDisplacementStats(cursorRadius = 1.8, farThreshold = 3.8) {
    if (!this.dispArray || !this.targetArray) {
      return { near: { count: 0, avg: 0, max: 0 }, far: { count: 0, avg: 0, max: 0 } };
    }
    let nearCount = 0;
    let nearSum = 0;
    let nearMax = 0;
    let farCount = 0;
    let farSum = 0;
    let farMax = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const dx = this.dispArray[idx];
      const dy = this.dispArray[idx + 1];
      const dz = this.dispArray[idx + 2];
      const disp = Math.hypot(dx, dy, dz);

      const curX = this.targetArray[idx] + dx;
      const curY = this.targetArray[idx + 1] + dy;
      const curZ = this.targetArray[idx + 2] + dz;
      const distToCursor = Math.hypot(
        curX - this.mouseWorld.x,
        curY - this.mouseWorld.y,
        curZ - this.mouseWorld.z
      );

      if (distToCursor <= cursorRadius) {
        nearCount++;
        nearSum += disp;
        if (disp > nearMax) nearMax = disp;
      } else if (distToCursor >= farThreshold) {
        farCount++;
        farSum += disp;
        if (disp > farMax) farMax = disp;
      }
    }

    return {
      near: {
        count: nearCount,
        avg: nearCount > 0 ? nearSum / nearCount : 0,
        max: nearMax,
      },
      far: {
        count: farCount,
        avg: farCount > 0 ? farSum / farCount : 0,
        max: farMax,
      },
    };
  }

  public dispose(): void {
    this.isDisposed = true;
    if (typeof window !== 'undefined' && (window as any).__UNSEEN_WORLD__ === this) {
      (window as any).__UNSEEN_WORLD__ = null;
    }
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }

    window.removeEventListener('resize', this.onResize);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
