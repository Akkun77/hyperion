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

  // Surface-bound living matter particles (24,000 fine silk fragments)
  private particleCount = 24000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Surface-binding coordinates: P(t) = S(u,v,t) + F(t) + D(t)
  private particleFold!: Uint8Array;        // Fold index 0, 1, or 2
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

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private apertureLight!: THREE.PointLight;

  // Camera Waypoints (Narrative & scroll-driven only; ZERO camera shake from mouse)
  private cameraWaypoints = [
    { p: 0.00, pos: new THREE.Vector3(1.2, 1.2, 14.5), look: new THREE.Vector3(1.6, 0.2, 0.0), fov: 42 },
    { p: 0.25, pos: new THREE.Vector3(1.8, 0.9, 11.5), look: new THREE.Vector3(1.4, 0.1, 0.0), fov: 42 },
    { p: 0.50, pos: new THREE.Vector3(2.4, 0.6, 8.0),  look: new THREE.Vector3(1.2, 0.0, 0.0), fov: 44 },
    { p: 0.75, pos: new THREE.Vector3(1.5, 0.3, 5.5),  look: new THREE.Vector3(0.8, 0.0, 0.0), fov: 45 },
    { p: 1.00, pos: new THREE.Vector3(0.0, 0.8, 3.8),  look: new THREE.Vector3(0.0, 0.0, 0.0), fov: 46 },
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
    this.renderer.toneMappingExposure = 1.22;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initLights();
    this.initVeilSculpturalMeshes();
    this.initSurfaceBoundParticles();

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
      // Recompose camera for mobile portrait: pull back and elevate
      this.camera.fov = 50;
      this.camera.position.set(0.4, 0.8, 18.2);
      this.camera.lookAt(new THREE.Vector3(0.2, -0.4, 0.0));
    } else {
      this.camera.fov = 42;
      this.camera.position.copy(this.cameraWaypoints[0].pos);
      this.camera.lookAt(this.cameraWaypoints[0].look);
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight('#0D0F14', 0.9);
    this.scene.add(this.ambientLight);

    // Directional Key Light: Sharp architectural lighting from upper right
    this.keyLight = new THREE.DirectionalLight('#FFFFFF', 3.4);
    this.keyLight.position.set(14, 18, 14);
    this.scene.add(this.keyLight);

    // Cool Rim Light: Highlighting silhouettes & razor bevel ridges from rear-left
    this.rimLight = new THREE.DirectionalLight('#DDE4EC', 4.5);
    this.rimLight.position.set(-16, 12, -14);
    this.scene.add(this.rimLight);

    // Deep graphite cavity bounce
    this.fillLight = new THREE.DirectionalLight('#15181E', 0.65);
    this.fillLight.position.set(1, -12, 6);
    this.scene.add(this.fillLight);

    // Interior Aperture Cavity Point Light: Casts mysterious ambient glow from inside central opening
    this.apertureLight = new THREE.PointLight('#9FB0C0', 2.8, 10.0, 2.0);
    this.apertureLight.position.set(3.2, 0.2, -1.8);
    this.scene.add(this.apertureLight);
  }

  /**
   * Monumental Sculptural Meshes:
   * Constructs the 3 massive volumetric ribbons of The Fractured Veil with physical thickness,
   * beveled edges, and surface-depth vertex colors.
   */
  private initVeilSculpturalMeshes(): void {
    this.veilSpecs = FracturedVeilGeometry.getVeilSpecs();
    this.veilSamplers = this.veilSpecs.map((spec) => new RibbonSampler(spec));

    // Refined materials per fold depth plane:
    // Fold 0 (Canopy): Deep brushed obsidian/graphite
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#14161C'),
      roughness: 0.38,
      metalness: 0.88,
      clearcoat: 0.15,
      specularIntensity: 1.1,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 1 (Core Monolith & Central Aperture): Satin silver with micro-anisotropic sheen
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2A2E38'),
      roughness: 0.20,
      metalness: 0.95,
      clearcoat: 0.40,
      clearcoatRoughness: 0.15,
      sheen: 0.85,
      sheenColor: new THREE.Color('#D8E2EC'),
      specularIntensity: 1.6,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 2 (Foreground Emerging Prow): Polished platinum silver catching razor specular highlights
    const prowMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#3C4250'),
      roughness: 0.14,
      metalness: 0.98,
      clearcoat: 0.50,
      clearcoatRoughness: 0.10,
      specularIntensity: 1.9,
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
   * Surface-Bound Particles
   * Binds 24,000 fine particles to the parametric surfaces S(u, v) of the 3 folds.
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

    const cPearl = new THREE.Color('#FFFFFF');
    const cSilver = new THREE.Color('#C8D0DC');
    const cTitanium = new THREE.Color('#828A98');
    const cGraphite = new THREE.Color('#2C3038');
    const cObsidian = new THREE.Color('#121418');

    const tempTarget = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Assign fold: 50% Core Monolith (aperture), 30% Vaulted Canopy, 20% Foreground Prow
      const diceFold = Math.random();
      const foldIdx = diceFold < 0.30 ? 0 : diceFold < 0.80 ? 1 : 2;
      this.particleFold[i] = foldIdx;

      // Longitudinal parameter u along fold
      const u = Math.random();
      this.particleU[i] = u;

      // Transverse parameter v across fold width:
      // Structured silk grain distribution:
      // - 65% in 12 discrete longitudinal streamline lanes
      // - 25% concentrated along crest ridges (v ~ 0.5)
      // - 10% tracing edge contour boundaries (v ~ 0.05 and 0.95)
      const rV = Math.random();
      let vParam: number;
      if (rV < 0.65) {
        const lane = Math.floor(Math.random() * 12);
        const laneV = (lane + 0.5) / 12.0;
        vParam = laneV + (Math.random() - 0.5) * 0.055;
      } else if (rV < 0.90) {
        vParam = 0.5 + (Math.random() - 0.5) * 0.12;
      } else {
        vParam = Math.random() < 0.5 ? 0.04 + Math.random() * 0.04 : 0.92 + Math.random() * 0.04;
      }
      this.particleV[i] = THREE.MathUtils.clamp(vParam, 0.02, 0.98);

      // Tangential surface flow speed
      const baseSpeed = 0.032 + Math.random() * 0.045;
      const flowDir = foldIdx === 1 ? -1 : 1;
      this.particleFlowSpeed[i] = baseSpeed * flowDir;
      this.particlePhase[i] = Math.random() * Math.PI * 2;

      // Initial surface anchor position S(u, v) on top volumetric face
      const tempNorm = new THREE.Vector3();
      this.veilSamplers[foldIdx].evaluate(u, this.particleV[i], tempTarget, tempNorm);
      tempTarget.addScaledVector(tempNorm, 0.06);

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

      // Palette and scale distribution (Fine silk fragments, NOT oversized bubbles)
      const dice = Math.random();
      let chosenColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      if (dice < 0.20) {
        // Deep graphite: dark structural body
        chosenColor = Math.random() < 0.5 ? cGraphite : cObsidian;
        pSize = 0.08 + Math.random() * 0.05;
        pAlpha = 0.55 + Math.random() * 0.25;
      } else if (dice < 0.65) {
        // Metallic titanium/platinum: illuminated surface contours
        chosenColor = cTitanium;
        pSize = 0.14 + Math.random() * 0.06;
        pAlpha = 0.80 + Math.random() * 0.15;
      } else if (dice < 0.90) {
        // Refined satin silver highlights on ridges
        chosenColor = cSilver;
        pSize = 0.22 + Math.random() * 0.08;
        pAlpha = 0.95;
      } else {
        // Luminous pearl focal highlights
        chosenColor = cPearl;
        pSize = 0.32 + Math.random() * 0.10;
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

          // Perspective size attenuation (crisp fine points, no oversized bubbles)
          float pSize = aSize * (240.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.2, 12.0);

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
      else this.apertureLight.color.set('#9FB0C0');
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

  // Purely narrative & scroll driven camera path (ZERO camera movement from pointer!)
  private updateCamera(p: number, dt: number): void {
    const width = this.container.clientWidth || window.innerWidth;
    if (width < 768) {
      // Mobile framing: elevated overview
      const mobileZ = THREE.MathUtils.lerp(18.2, 12.0, p);
      const mobileY = THREE.MathUtils.lerp(0.8, 1.8, p);
      this.camera.position.set(0.4, mobileY, mobileZ);
      this.camera.lookAt(new THREE.Vector3(0.2, -0.4, 0.0));
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

  private updateParticles(_p: number, time: number, dt: number): void {
    // 1. Raycast mouse position onto sculpture plane for localized disturbance
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

    // 2. Physical interaction parameters
    const baseRadius = 2.4;
    const radiusSq = baseRadius * baseRadius;
    const springK = 8.5;
    const damping = Math.exp(-4.2 * dt);

    const tempSurfacePt = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const foldIdx = this.particleFold[i];
      const sampler = this.veilSamplers[foldIdx];

      // Stream particles along ribbon longitudinal spline u
      this.particleU[i] += this.particleFlowSpeed[i] * dt;
      if (this.particleU[i] > 1.0) this.particleU[i] -= 1.0;
      if (this.particleU[i] < 0.0) this.particleU[i] += 1.0;

      // Small transverse silk grain breathing
      const v = this.particleV[i] + Math.sin(time * 1.5 + this.particlePhase[i]) * 0.006;
      sampler.evaluate(this.particleU[i], v, tempSurfacePt, tempNorm);

      // Elevated slightly above volumetric ribbon face
      tempSurfacePt.addScaledVector(tempNorm, 0.06);

      this.targetArray[idx] = tempSurfacePt.x;
      this.targetArray[idx + 1] = tempSurfacePt.y;
      this.targetArray[idx + 2] = tempSurfacePt.z;

      // Localized pointer disturbance: nearby particles swirl and displace gracefully
      if (hasHit && mouseSpeed > 0.05) {
        const dx = tempSurfacePt.x - this.mouseWorld.x;
        const dy = tempSurfacePt.y - this.mouseWorld.y;
        const dz = tempSurfacePt.z - this.mouseWorld.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const falloff = 1.0 - dist / baseRadius;
          const hermite = falloff * falloff * (3.0 - 2.0 * falloff);

          // Force: Push away + curl tangential wake
          const pushMag = THREE.MathUtils.clamp(mouseSpeed * 0.45, 0.1, 1.8) * hermite;
          const invD = dist > 0.001 ? 1.0 / dist : 0;

          // Wake vortex tangential vector
          const tanX = -dy * invD;
          const tanY = dx * invD;

          this.dispVelArray[idx] += (dx * invD * 0.4 + tanX * 0.6) * pushMag;
          this.dispVelArray[idx + 1] += (dy * invD * 0.4 + tanY * 0.6) * pushMag;
          this.dispVelArray[idx + 2] += dz * invD * 0.2 * pushMag;
        }
      }

      // Spring-damper integration returning displacement D(t) -> 0
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

    // Structural continuous organic breathing
    if (!this.isReducedMotion) {
      const breatheY = Math.sin(time * 0.65) * 0.035;
      const breatheZ = Math.cos(time * 0.50) * 0.025;
      this.veilMeshGroup.position.set(0, breatheY, breatheZ);
    }

    // Update shaders & scene motion
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
