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

// 5 Choreographed Flow Corridors (Preserving Approved Fractured Veil Architecture):
// Corridor 0: PRIMARY ARTERIAL RIVER (55%) - One dominant, continuous living current on Fold 1
//             Entering from lower-left, sweeping along contours through central aperture, continuing to upper-right.
// Corridor 1: VAULTED CANOPY CURRENT (15%) - Majestic, slower overhead proscenium stream on Fold 0
// Corridor 2: FOREGROUND PROW SHELF (15%) - Near-camera tactile depth current on Fold 2
// Corridor 3: FLUTING CREST FILAMENTS (10%) - Fine interior sculptural fluting lines on Fold 1
// Corridor 4: DEDICATED REQUEST WAKE (5%) - Synchronized directional cohort trailing the Request Signal
export const STREAM_PRIMARY_RIVER = 0;
export const STREAM_CANOPY_ARCH = 1;
export const STREAM_PROW_SHELF = 2;
export const STREAM_STRUCTURAL_FILAMENTS = 3;
export const STREAM_REQUEST_WAKE = 4;

// Backward-compatibility aliases
export const PARTICLE_LAYER_SURFACE_TRACER = STREAM_PRIMARY_RIVER;
export const PARTICLE_LAYER_EDGE_FILAMENT = STREAM_STRUCTURAL_FILAMENTS;
export const PARTICLE_LAYER_REQUEST_CURRENT = STREAM_REQUEST_WAKE;
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
  private raycaster = new THREE.Raycaster();
  private cursorVel3D = new THREE.Vector3();
  private camRight = new THREE.Vector3();
  private camUp = new THREE.Vector3();

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

  // Choreographed Particle System (24,500 organic stardust particles along 5 flow corridors, precision flow refinement)
  private particleCount = 24500;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  private particleGroup!: Uint8Array;
  private particleFold!: Uint8Array;
  private particleU!: Float32Array;
  private particleV!: Float32Array;
  private particleFlowSpeed!: Float32Array;
  private particlePhase!: Float32Array;
  private particleLane!: Uint8Array;

  private posArray!: Float32Array;
  private targetArray!: Float32Array;
  private dispArray!: Float32Array;
  private dispVelArray!: Float32Array;
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;
  private liveAlphaArray!: Float32Array;

  // Developer Directional Flow Annotation Visualizer (Internal Verification)
  private flowAnnotationGroup = new THREE.Group();

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

  // Dedicated Request Signal Protagonist & Evidence Trace
  private requestSignalGroup = new THREE.Group();
  private requestCoreMesh!: THREE.Mesh;
  private requestHaloMesh!: THREE.Mesh;
  private requestLight!: THREE.PointLight;
  private requestTrailMesh!: THREE.Line;
  private requestTrailGeo!: THREE.BufferGeometry;
  private requestTrailPositions = new Float32Array(16 * 3);
  private evidenceBranchLine!: THREE.Line;
  private evidenceBranchGeo!: THREE.BufferGeometry;
  private evidenceBranchPositions = new Float32Array(16 * 3);
  private evidenceNodeMesh!: THREE.Mesh;
  private currentRequestPos = new THREE.Vector3(-7.5, -1.2, 0.8);

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
    this.initRequestSignal();
    this.initFlowAnnotations();

    this.updateVisibilityMode();

    if (typeof window !== 'undefined' && window.location.search.includes('debugFlow=true')) {
      this.showFlowAnnotation(true);
    }

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
    this.ambientLight = new THREE.AmbientLight('#05070A', 0.40);
    this.scene.add(this.ambientLight);

    // Key Light: Restrained architectural studio lighting from upper-left
    // Provides soft continuous gradations along folds without blown-out specular wash
    this.keyLight = new THREE.DirectionalLight('#F4F8FC', 2.6);
    this.keyLight.position.set(-14, 18, 14);
    this.scene.add(this.keyLight);

    // Rim Light: Cool titanium rim highlighting razor silhouettes from bottom-right
    this.rimLight = new THREE.DirectionalLight('#B0C2D4', 2.8);
    this.rimLight.position.set(16, -10, -14);
    this.scene.add(this.rimLight);

    // Cavity Fill: Deep obsidian shadow preservation
    this.fillLight = new THREE.DirectionalLight('#06080B', 0.20);
    this.fillLight.position.set(0, -8, 8);
    this.scene.add(this.fillLight);

    // Internal Emerald Caustic Point Light: Restrained internal emerald cavity glow (#2DD4BF)
    // Bathing the central aperture in quiet, deep emerald luminous depth
    this.apertureLight = new THREE.PointLight('#2DD4BF', 2.0, 12.0, 1.8);
    this.apertureLight.position.copy(this.apertureCenter);
    this.scene.add(this.apertureLight);
  }

  /**
   * Monumental Sculptural Meshes:
   * 3 interwoven volumetric ribbon folds with razor beveled edges, sculpted fluting ridges,
   * and multi-plane vertex colors.
   */
  private initVeilSculpturalMeshes(): void {
    this.veilSpecs = FracturedVeilGeometry.getVeilSpecs();
    this.veilSamplers = this.veilSpecs.map((spec) => new RibbonSampler(spec));

    // Refined physical materials per fold depth plane:
    // Fold 0 (Canopy): Deep obsidian body with satin titanium sheen
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#080A0D'),
      roughness: 0.36,
      metalness: 0.94,
      clearcoat: 0.70,
      clearcoatRoughness: 0.18,
      sheen: 0.65,
      sheenColor: new THREE.Color('#7A8692'),
      specularIntensity: 1.5,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 1 (Core Monolith & Central Aperture): Dark satin titanium with liquid graphite gradients
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#101419'),
      roughness: 0.30,
      metalness: 0.95,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
      sheen: 0.75,
      sheenColor: new THREE.Color('#94A0AC'),
      specularIntensity: 1.8,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Fold 2 (Foreground Emerging Prow): Sculptural liquid titanium with satin highlights
    const prowMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#161B22'),
      roughness: 0.26,
      metalness: 0.96,
      clearcoat: 0.90,
      clearcoatRoughness: 0.10,
      sheen: 0.80,
      sheenColor: new THREE.Color('#A8B4C0'),
      specularIntensity: 2.0,
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
   * Choreographed 5-Corridor Particle System:
   * Corridor 0 (55%): Primary Arterial River (One dominant living current on Fold 1: lower-left -> aperture -> upper-right)
   * Corridor 1 (15%): Vaulted Canopy Arch (Majestic slower overhead stream on Fold 0)
   * Corridor 2 (15%): Foreground Prow Shelf (Near-camera tactile depth stream on Fold 2)
   * Corridor 3 (10%): Fluting Crest Filaments (Interior structural lines on Fold 1)
   * Corridor 4 (5%):  Dedicated Request Wake (Directional cohort on Ingress Spline)
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
    this.particleLane = new Uint8Array(this.particleCount);

    this.sizeArray = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.baseAlphaArray = new Float32Array(this.particleCount);
    this.liveAlphaArray = new Float32Array(this.particleCount);

    const cPureWhite = new THREE.Color('#FFFFFF');
    const cLuminousPearl = new THREE.Color('#EAF2F8');
    const cSatinSilver = new THREE.Color('#B4C6D8');
    const cTitanium = new THREE.Color('#7A8C9E');
    const cEmeraldGlint = new THREE.Color('#5EEAD4');

    const tempTarget = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const dice = Math.random();

      let group: number;
      let foldIdx: number;
      let u: number = Math.random();
      let v: number = 0.5;
      let speed: number;
      let pColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;
      let lane = 0;

      this.particlePhase[i] = Math.random() * Math.PI * 2;

      if (dice < 0.53) {
        // ====================================================================
        // CORRIDOR 0: PRIMARY ARTERIAL RIVER (53% = ~12,985 particles)
        // Fold 1: Lower-left void (u = 1.0) -> Aperture vortex (u = 0.36) -> Upper-right (u = 0.0)
        // Silky, dense laminar streamlines directly fulfilling reference image 4
        // Precision flow refinement: Enriched continuity across central crossing (u in [0.30, 0.52])
        // and upper stream ascent (u in [0.08, 0.28])
        // ====================================================================
        group = STREAM_PRIMARY_RIVER;
        foldIdx = 1;
        lane = Math.floor(Math.random() * 32);

        // Region B (Central Crossing) & Upper Stream Enrichment
        const uRiverDice = Math.random();
        if (uRiverDice < 0.25) {
          // Region B Central Crossing Enrichment (+25% visible coverage in crossing)
          u = 0.30 + Math.random() * 0.22;
        } else if (uRiverDice < 0.38) {
          // Continuity through upper river ascent (u in [0.08, 0.28])
          u = 0.08 + Math.random() * 0.20;
        } else {
          u = Math.random();
        }

        if (lane >= 7 && lane <= 24) {
          // Inner 18 Core Lanes (high density, luminous pearl, silky river)
          const laneFrac = (lane - 15.5) / 8.5; // -1 to +1
          v = 0.50 + laneFrac * 0.040 + (Math.random() - 0.5) * 0.006;
          pSize = 0.15 + Math.random() * 0.05; // 3.2px to 5.0px
          pAlpha = 0.92 + Math.random() * 0.08;
          const colDice = Math.random();
          pColor = colDice < 0.68 ? cPureWhite : colDice < 0.90 ? cLuminousPearl : cEmeraldGlint;
        } else {
          // Outer 14 Flanking Lanes (gentle laminar fan, leaves margins bare)
          const isLeft = lane < 7;
          const subIndex = isLeft ? lane : lane - 25;
          const subFrac = subIndex / 6.0;
          if (isLeft) {
            v = 0.28 + subFrac * 0.14 + (Math.random() - 0.5) * 0.008;
          } else {
            v = 0.58 + subFrac * 0.14 + (Math.random() - 0.5) * 0.008;
          }
          pSize = 0.11 + Math.random() * 0.04; // 2.4px to 3.6px
          pAlpha = 0.68 + Math.random() * 0.20; // Refined from 0.60 for improved continuity
          const colDice = Math.random();
          pColor = colDice < 0.55 ? cSatinSilver : colDice < 0.85 ? cTitanium : cLuminousPearl;
        }

        // Parabolic Poiseuille velocity profile across river width
        const vDist = Math.abs(v - 0.50);
        const poiseuilleFactor = 1.0 - 0.28 * Math.min(1.0, Math.pow(vDist / 0.24, 2.0));
        speed = (0.024 + Math.random() * 0.008) * poiseuilleFactor;
      } else if (dice < 0.70) {
        // ====================================================================
        // CORRIDOR 1: VAULTED CANOPY ARCH - REGION A (17% = ~4,165 particles)
        // Fold 0: Sweeping across upper proscenium arch (u = 0.0 -> 1.0)
        // Increased continuity and presence where stream fades into dark upper surface
        // ====================================================================
        group = STREAM_CANOPY_ARCH;
        foldIdx = 0;
        lane = Math.floor(Math.random() * 16);
        const laneFrac = (lane - 7.5) / 7.5;
        v = 0.50 + laneFrac * 0.050 + (Math.random() - 0.5) * 0.008;

        const uCanopyDice = Math.random();
        if (uCanopyDice < 0.35) {
          // Fill weak portions across the central upper canopy
          u = 0.20 + Math.random() * 0.50;
        } else {
          u = Math.random();
        }

        speed = 0.015 + Math.random() * 0.007;
        pSize = 0.11 + Math.random() * 0.04;
        pAlpha = 0.65 + Math.random() * 0.20; // Up from 0.42 for clear, silky presence
        const colDice = Math.random();
        pColor = colDice < 0.60 ? cLuminousPearl : colDice < 0.88 ? cSatinSilver : cEmeraldGlint;
      } else if (dice < 0.86) {
        // ====================================================================
        // CORRIDOR 2: FOREGROUND PROW & RIGHT-HAND SURFACE - REGIONS C & D (16% = ~3,920 particles)
        // Fold 2: Climbing along tactile near-camera crest and right-hand shelf (u = 0.0 -> 1.0)
        // Restores visual connection of the right-hand surface to the established flow
        // ====================================================================
        group = STREAM_PROW_SHELF;
        foldIdx = 2;
        lane = Math.floor(Math.random() * 16);
        const laneFrac = (lane - 7.5) / 7.5;
        v = 0.50 + laneFrac * 0.052 + (Math.random() - 0.5) * 0.008;

        const uProwDice = Math.random();
        if (uProwDice < 0.34) {
          // Right-hand surface continuity cohort
          u = 0.55 + Math.random() * 0.35;
        } else {
          u = Math.random();
        }

        speed = 0.018 + Math.random() * 0.008;
        pSize = 0.12 + Math.random() * 0.04;
        pAlpha = 0.68 + Math.random() * 0.20; // Refined for continuous silky shelf presence
        const colDice = Math.random();
        pColor = colDice < 0.62 ? cLuminousPearl : colDice < 0.90 ? cSatinSilver : cEmeraldGlint;
      } else if (dice < 0.95) {
        // ====================================================================
        // CORRIDOR 3: FLUTING CREST FILAMENTS (9% = ~2,205 particles)
        // Fold 1: Knife-edge fluting crests (v = 0.33 and v = 0.67)
        // ====================================================================
        group = STREAM_STRUCTURAL_FILAMENTS;
        foldIdx = 1;
        lane = Math.random() < 0.5 ? 0 : 1;
        v = lane === 0 ? 0.33 + (Math.random() - 0.5) * 0.012 : 0.67 + (Math.random() - 0.5) * 0.012;
        u = Math.random();
        speed = 0.022 + Math.random() * 0.008;
        pSize = 0.10 + Math.random() * 0.03;
        pAlpha = 0.70 + Math.random() * 0.16;
        pColor = Math.random() < 0.80 ? cLuminousPearl : cPureWhite;
      } else {
        // ====================================================================
        // CORRIDOR 4: DEDICATED REQUEST COHORT WAKE (5% = ~1,225 particles)
        // Ingress trajectory stream trailing the Request protagonist
        // ====================================================================
        group = STREAM_REQUEST_WAKE;
        foldIdx = 1;
        lane = 0;
        u = Math.random();
        v = 0.50 + (Math.random() - 0.5) * 0.020;
        speed = 0.035 + Math.random() * 0.018;
        pSize = 0.14 + Math.random() * 0.04;
        pAlpha = 0.90 + Math.random() * 0.10;
        pColor = cPureWhite;
      }

      this.particleGroup[i] = group;
      this.particleFold[i] = foldIdx;
      this.particleU[i] = u;
      this.particleV[i] = v;
      this.particleLane[i] = lane;
      this.particleFlowSpeed[i] = speed;

      // Base target position calculation
      if (group === STREAM_REQUEST_WAKE) {
        this.ingressCurve.getPointAt(u, tempTarget);
        tempTarget.x += (Math.random() - 0.5) * 0.16;
        tempTarget.y += (Math.random() - 0.5) * 0.16;
        tempTarget.z += (Math.random() - 0.5) * 0.16;
      } else {
        this.veilSamplers[foldIdx].evaluate(u, v, tempTarget, tempNorm);
        const uTaper = Math.sin(Math.PI * u);
        const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);
        const vProfile = 1.0 - 1.4 * (v - 0.5) * (v - 0.5);
        const halfThick = Math.max(0.015, this.veilSamplers[foldIdx].thickness * 0.5 * hScale * Math.max(0.2, vProfile));
        const vCenterDist = Math.abs(v - 0.5);
        const fluteWave = Math.sin(v * Math.PI * 10);
        const fluteTaper = Math.max(0, 1.0 - Math.pow(vCenterDist * 2.0, 3.0));
        const fluteDisplacement = fluteWave * 0.036 * fluteTaper * hScale;
        const hoverMargin = 0.032;
        tempTarget.addScaledVector(tempNorm, halfThick + fluteDisplacement + hoverMargin);
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
      this.liveAlphaArray[i] = pAlpha;
    }

    this.particlesGeo = new THREE.BufferGeometry();
    this.particlesGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.particlesGeo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.particlesGeo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.particlesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.liveAlphaArray, 1));

    // Custom GLSL Point Shader: Fine, silky particles with soft Gaussian edges
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

          // Coordinated rendering calibration: 2.2px to 5.8px
          float pSize = aSize * (380.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 2.2, 5.8);

          float depthFade = clamp(1.15 - (vDepth / 38.0), 0.25, 1.0);
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

          // Luminous core with soft anti-aliased edge
          float dist = sqrt(distSq);
          float radialAlpha = 1.0 - smoothstep(0.20, 0.50, dist);

          gl_FragColor = vec4(vColor, vAlpha * radialAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.particlesMesh = new THREE.Points(this.particlesGeo, this.particlesMat);
    this.scene.add(this.particlesMesh);
  }

  /**
   * Dedicated Request Signal Protagonist & Evidence Trace:
   * Visualizes an incoming API request traveling along the ingress stream,
   * parting surrounding particles, reacting at the inspection aperture,
   * and committing an evidence branch to the cryptographic evidence sink.
   */
  private initRequestSignal(): void {
    // 1. Sleek, compact leading signal core (radius 0.05, never a giant floating sphere)
    const coreGeo = new THREE.SphereGeometry(0.05, 20, 20);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: new THREE.Color(0xFFFFFF),
      emissiveIntensity: 4.5,
      roughness: 0.1,
      metalness: 0.1,
    });
    this.requestCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.requestSignalGroup.add(this.requestCoreMesh);

    // 2. Soft subtle halo (radius 0.14)
    const haloGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xE8EDF2,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.requestHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.requestSignalGroup.add(this.requestHaloMesh);

    // 3. Request Point Light: casts soft localized reflection onto nearby ribbon folds
    this.requestLight = new THREE.PointLight('#FFFFFF', 1.6, 4.0, 1.8);
    this.requestSignalGroup.add(this.requestLight);

    // 4. Directional trailing filament (16 points)
    this.requestTrailGeo = new THREE.BufferGeometry();
    this.requestTrailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.requestTrailPositions, 3)
    );
    const trailMat = new THREE.LineBasicMaterial({
      color: 0xE8EDF2,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    this.requestTrailMesh = new THREE.Line(this.requestTrailGeo, trailMat);
    this.scene.add(this.requestTrailMesh);

    // 5. Evidence Branch (separates at Decision event)
    this.evidenceBranchGeo = new THREE.BufferGeometry();
    this.evidenceBranchGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.evidenceBranchPositions, 3)
    );
    const evidenceMat = new THREE.LineBasicMaterial({
      color: 0x62D4A1,
      transparent: true,
      opacity: 0.70,
      blending: THREE.AdditiveBlending,
    });
    this.evidenceBranchLine = new THREE.Line(this.evidenceBranchGeo, evidenceMat);
    this.evidenceBranchLine.visible = false;
    this.scene.add(this.evidenceBranchLine);

    // 6. Evidence Node Marker (understated geometric sink at base)
    const nodeGeo = new THREE.OctahedronGeometry(0.20, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xAEB8C0,
      emissive: new THREE.Color(0x62D4A1),
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.75,
      wireframe: true,
    });
    this.evidenceNodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    this.evidenceNodeMesh.position.copy(this.evidencePoint3D);
    this.evidenceNodeMesh.visible = false;
    this.scene.add(this.evidenceNodeMesh);

    this.scene.add(this.requestSignalGroup);
  }

  /**
   * Developer Directional Flow Annotation Visualizer:
   * Internal verification tool displaying flow vectors and stream corridors.
   * Activated via '?debugFlow=true' or __UNSEEN_WORLD__.showFlowAnnotation(true).
   */
  private initFlowAnnotations(): void {
    // 1. Primary Arterial Current corridor (Fold 1): lower-left -> aperture -> upper-right
    const primaryPts: THREE.Vector3[] = [];
    const tempPt = new THREE.Vector3();
    for (let s = 0; s <= 60; s++) {
      const u = 1.0 - s / 60;
      this.veilSamplers[1].evaluate(u, 0.50, tempPt);
      primaryPts.push(tempPt.clone().add(new THREE.Vector3(0, 0.08, 0.08)));
    }
    const primaryGeo = new THREE.BufferGeometry().setFromPoints(primaryPts);
    const primaryMat = new THREE.LineBasicMaterial({
      color: 0x5EEAD4, // Emerald cyan
      transparent: true,
      opacity: 0.85,
    });
    const primaryLine = new THREE.Line(primaryGeo, primaryMat);
    this.flowAnnotationGroup.add(primaryLine);

    // Directional cones along Primary Arterial Flow pointing in travel direction
    const arrowMeshMat = new THREE.MeshBasicMaterial({ color: 0x5EEAD4 });
    const arrowGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
    arrowGeo.rotateX(Math.PI / 2);

    const arrowUs = [0.85, 0.65, 0.45, 0.25, 0.10];
    arrowUs.forEach((uVal) => {
      const pt1 = new THREE.Vector3();
      const pt2 = new THREE.Vector3();
      this.veilSamplers[1].evaluate(uVal, 0.50, pt1);
      this.veilSamplers[1].evaluate(Math.max(0, uVal - 0.02), 0.50, pt2);
      const dir = pt2.clone().sub(pt1).normalize();

      const arrow = new THREE.Mesh(arrowGeo, arrowMeshMat);
      arrow.position.copy(pt1).add(new THREE.Vector3(0, 0.12, 0.12));
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      this.flowAnnotationGroup.add(arrow);
    });

    // 2. Vaulted Canopy corridor (Fold 0)
    const canopyPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 40; s++) {
      const u = s / 40;
      this.veilSamplers[0].evaluate(u, 0.50, tempPt);
      canopyPts.push(tempPt.clone().add(new THREE.Vector3(0, 0.08, 0.08)));
    }
    const canopyGeo = new THREE.BufferGeometry().setFromPoints(canopyPts);
    const canopyMat = new THREE.LineBasicMaterial({
      color: 0x94B4D4, // Titanium ice
      transparent: true,
      opacity: 0.70,
    });
    this.flowAnnotationGroup.add(new THREE.Line(canopyGeo, canopyMat));

    // 3. Foreground Prow corridor (Fold 2)
    const prowPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 40; s++) {
      const u = s / 40;
      this.veilSamplers[2].evaluate(u, 0.50, tempPt);
      prowPts.push(tempPt.clone().add(new THREE.Vector3(0, 0.08, 0.08)));
    }
    const prowGeo = new THREE.BufferGeometry().setFromPoints(prowPts);
    const prowMat = new THREE.LineBasicMaterial({
      color: 0xCBD8E6, // Satin platinum
      transparent: true,
      opacity: 0.70,
    });
    this.flowAnnotationGroup.add(new THREE.Line(prowGeo, prowMat));

    // 4. Ingress Request Trajectory
    const ingressPts = this.ingressCurve.getPoints(50);
    const ingressGeo = new THREE.BufferGeometry().setFromPoints(ingressPts);
    const ingressMat = new THREE.LineDashedMaterial({
      color: 0xFFFFFF,
      dashSize: 0.3,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.80,
    });
    const ingressLine = new THREE.Line(ingressGeo, ingressMat);
    ingressLine.computeLineDistances();
    this.flowAnnotationGroup.add(ingressLine);

    this.flowAnnotationGroup.visible = false;
    this.scene.add(this.flowAnnotationGroup);
  }

  public showFlowAnnotation(visible: boolean): void {
    if (this.flowAnnotationGroup) {
      this.flowAnnotationGroup.visible = visible;
    }
  }

  private updateRequestSignal(p: number, time: number): void {
    // Determine curve parameter t based on scroll progress:
    // Event 1 Ingress: p in [0.0, 0.35] -> t in [0.0, 0.38]
    // Event 2 Inspection: p in [0.35, 0.65] -> t in [0.38, 0.60] (decelerates smoothly at aperture entrance)
    // Event 3 Decision: p in [0.65, 0.85] -> t in [0.60, 0.82] (traverses aperture plane)
    // Event 4 Evidence/Handoff: p in [0.85, 1.00] -> t in [0.82, 0.98] (moves into corridor sanctuary)

    let tCurve = 0;
    if (p < 0.35) {
      tCurve = THREE.MathUtils.lerp(0.02, 0.38, p / 0.35);
    } else if (p < 0.65) {
      const sub = (p - 0.35) / 0.30;
      tCurve = THREE.MathUtils.lerp(0.38, 0.60, THREE.MathUtils.smoothstep(sub, 0, 1));
    } else if (p < 0.85) {
      const sub = (p - 0.65) / 0.20;
      tCurve = THREE.MathUtils.lerp(0.60, 0.82, THREE.MathUtils.smoothstep(sub, 0, 1));
    } else {
      const sub = (p - 0.85) / 0.15;
      tCurve = THREE.MathUtils.lerp(0.82, 0.98, THREE.MathUtils.smoothstep(sub, 0, 1));
    }

    // Physical boundary consequence: BLOCK halts directly at aperture threshold (t = 0.60)
    if (this.decisionMode === 'BLOCK' && tCurve > 0.60) {
      tCurve = 0.60;
    }

    // Luminous core color shifts upon reaching decision boundary
    if (p >= 0.58) {
      const colorHex = this.decisionMode === 'BLOCK' ? '#EA777C' : this.decisionMode === 'FLAG' ? '#E9BA6A' : '#62D4A1';
      const numColor = this.decisionMode === 'BLOCK' ? 0xEA777C : this.decisionMode === 'FLAG' ? 0xE9BA6A : 0x62D4A1;
      (this.requestCoreMesh.material as THREE.MeshStandardMaterial).emissive.set(colorHex);
      (this.requestHaloMesh.material as THREE.MeshBasicMaterial).color.set(numColor);
      if (this.requestLight) this.requestLight.color.set(colorHex);
    } else {
      (this.requestCoreMesh.material as THREE.MeshStandardMaterial).emissive.set(0xF3F4F1);
      (this.requestHaloMesh.material as THREE.MeshBasicMaterial).color.set(0xE8EDF2);
      if (this.requestLight) this.requestLight.color.set('#FFFFFF');
    }

    this.ingressCurve.getPointAt(tCurve, this.currentRequestPos);

    // Subtle continuous micro-pulse even when stationary
    const pulse = 1.0 + Math.sin(time * 3.5) * 0.08;
    this.requestCoreMesh.scale.setScalar(pulse);
    this.requestHaloMesh.scale.setScalar(pulse * (1.0 + Math.sin(time * 2.0) * 0.15));

    this.requestSignalGroup.position.copy(this.currentRequestPos);

    // Restrained emerald cavity glow flares smoothly during inspection boundary traversal
    const inspectionConcentration = THREE.MathUtils.smoothstep(p, 0.38, 0.58) * (1.0 - THREE.MathUtils.smoothstep(p, 0.64, 0.75));
    if (this.apertureLight) {
      this.apertureLight.intensity = THREE.MathUtils.lerp(2.0, 3.8, inspectionConcentration);
      this.apertureLight.distance = THREE.MathUtils.lerp(12.0, 16.0, inspectionConcentration);
    }
    if (this.requestLight) {
      this.requestLight.intensity = 1.4 + inspectionConcentration * 1.2;
    }

    // Update trailing filament behind request core
    for (let k = 0; k < 16; k++) {
      const trailT = Math.max(0.001, tCurve - k * 0.012);
      const pt = this.ingressCurve.getPointAt(trailT);
      const kIdx = k * 3;
      this.requestTrailPositions[kIdx] = pt.x;
      this.requestTrailPositions[kIdx + 1] = pt.y;
      this.requestTrailPositions[kIdx + 2] = pt.z;
    }
    this.requestTrailGeo.attributes.position.needsUpdate = true;

    // Event 3 & 4: Evidence Branch detachment and recording
    if (p >= 0.65) {
      this.evidenceBranchLine.visible = true;
      this.evidenceNodeMesh.visible = true;
      this.evidenceNodeMesh.rotation.y = time * 0.8;
      this.evidenceNodeMesh.rotation.x = time * 0.5;

      const splitPt = this.ingressCurve.getPointAt(0.60);
      const branchProgress = THREE.MathUtils.clamp((p - 0.65) / 0.25, 0, 1);

      for (let k = 0; k < 16; k++) {
        const segFrac = (k / 15) * branchProgress;
        const curPt = new THREE.Vector3().lerpVectors(splitPt, this.evidencePoint3D, segFrac);
        // Add subtle arc curve to the evidence branch
        curPt.y += Math.sin(segFrac * Math.PI) * 0.6;
        const kIdx = k * 3;
        this.evidenceBranchPositions[kIdx] = curPt.x;
        this.evidenceBranchPositions[kIdx + 1] = curPt.y;
        this.evidenceBranchPositions[kIdx + 2] = curPt.z;
      }
      this.evidenceBranchGeo.attributes.position.needsUpdate = true;
    } else {
      this.evidenceBranchLine.visible = false;
      this.evidenceNodeMesh.visible = false;
    }
  }

  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    this.updateVisibilityMode();
  }

  private updateVisibilityMode(): void {
    if (this.renderMode === 'mesh') {
      this.veilMeshGroup.visible = true;
      if (this.particlesMesh) this.particlesMesh.visible = false;
      if (this.requestSignalGroup) this.requestSignalGroup.visible = true;
    } else if (this.renderMode === 'particles') {
      this.veilMeshGroup.visible = false;
      if (this.particlesMesh) this.particlesMesh.visible = true;
      if (this.requestSignalGroup) this.requestSignalGroup.visible = true;
    } else {
      this.veilMeshGroup.visible = true;
      if (this.particlesMesh) this.particlesMesh.visible = true;
      if (this.requestSignalGroup) this.requestSignalGroup.visible = true;
    }
  }

  public setProgress(p: number): void {
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  public setDecisionMode(mode: DecisionMode): void {
    this.decisionMode = mode;
    const colorHex = mode === 'BLOCK' ? '#EA777C' : mode === 'FLAG' ? '#E9BA6A' : '#62D4A1';
    const numColor = mode === 'BLOCK' ? 0xEA777C : mode === 'FLAG' ? 0xE9BA6A : 0x62D4A1;

    if (this.apertureLight) {
      this.apertureLight.color.set(colorHex);
    }
    if (this.evidenceBranchLine) {
      (this.evidenceBranchLine.material as THREE.LineBasicMaterial).color.set(numColor);
    }
    if (this.evidenceNodeMesh) {
      ((this.evidenceNodeMesh.material as THREE.MeshStandardMaterial).emissive).set(numColor);
    }
    if (this.requestLight && this.progress >= 0.58) {
      this.requestLight.color.set(colorHex);
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
   * 1. Autonomous laminar flow along 5 distinct corridors:
   *    - Primary Arterial River (Fold 1): Continuous sweeping flow from lower-left -> aperture -> upper-right
   *      with Poiseuille parabolic velocity profile and aperture constriction acceleration.
   *    - Vaulted Canopy Arch (Fold 0): Slower, majestic overhead proscenium flow.
   *    - Foreground Prow Shelf (Fold 2): Tactile near-camera drift.
   *    - Fluting Crest Filaments (Fold 1): Interior fluting lines (v=0.33, 0.67).
   *    - Request Wake (Ingress Spline): Directional traveling cohort trailing Request Signal.
   * 2. Seamless lifecycle alpha envelope: smooth fade-in and fade-out at endpoints (zero popping/mass resets).
   * 3. Localized pointer disturbance wake and spring settling (<600ms).
   * 4. Restrained Causal Inspection Sequence:
   *    - Approach: Inbound transverse narrowing toward request (18% contraction).
   *    - Iris Contour: Strictly limited cohort (1 in 8 nearby particles) forming delicate R=0.55 ring (zero clouds).
   *    - Verdict Reaction: Color reflects decision (emerald/amber/crimson).
   *    - Wave: Delicate traveling ripple along adjacent currents.
   *    - Recovery: Restrained return to laminar flow.
   */
  private updateParticles(p: number, time: number, dt: number): void {
    // 1. Localized pointer raycast in camera space
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera);
    const cursorRay = this.raycaster.ray;
    const isPointerActive = this.pointer.active;

    // Camera basis vectors for projecting cursor screen velocity into 3D world space
    this.camRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.camUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion);

    // World-space cursor velocity from NDC pointer delta
    this.cursorVel3D.set(0, 0, 0)
      .addScaledVector(this.camRight, this.pointer.vx)
      .addScaledVector(this.camUp, this.pointer.vy);
    const pointerSpeed = Math.hypot(this.pointer.vx, this.pointer.vy);

    // Physics constants for fluid wake and spring recovery (<600ms settling)
    // Generous wake radius (2.4u) and buoyant liquid spring (k=12.5) for rich moving matter feel
    const wakeRadius = 2.40;
    const wakeRadiusSq = wakeRadius * wakeRadius;
    const springK = 12.5;
    const damping = Math.exp(-7.5 * dt);

    const tempSurfacePt = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();

    // Verdict colors for causal inspection reaction
    const cEmerald = new THREE.Color('#62D4A1');
    const cAmber = new THREE.Color('#E9BA6A');
    const cCrimson = new THREE.Color('#EA777C');

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const group = this.particleGroup[i];
      const foldIdx = this.particleFold[i];
      const baseSpeed = this.particleFlowSpeed[i];
      let u = this.particleU[i];
      const baseV = this.particleV[i];
      const phase = this.particlePhase[i];

      // Curvature & Aperture Velocity Acceleration:
      // Moderated velocity acceleration (+18%) through aperture crossing (u in [0.24, 0.48], peak 0.36)
      // Maintains forward momentum while eliminating visual thinning across the crossing
      let speedMult = 1.0;
      if (foldIdx === 1) {
        const uDistAp = Math.abs(u - 0.36);
        speedMult = 1.0 + 0.18 * Math.exp(-(uDistAp * uDistAp) / (2 * 0.14 * 0.14));
      }

      // Continuous autonomous advance along longitudinal coordinate u
      if (!this.isReducedMotion) {
        if (group === STREAM_PRIMARY_RIVER || group === STREAM_STRUCTURAL_FILAMENTS) {
          // Fold 1 flows lower-left (u = 1.0) -> upper-right (u = 0.0): negative speed
          u = (u - baseSpeed * speedMult * dt + 1.0) % 1.0;
        } else {
          // Folds 0 & 2 & Ingress flow u = 0.0 -> 1.0: positive speed
          u = (u + baseSpeed * speedMult * dt) % 1.0;
        }
        this.particleU[i] = u;
      }

      // Seamless Lifecycle Alpha Envelope:
      // Extended fade-out at endpoints for unbroken stream continuity
      let lifecycleAlpha = 1.0;
      if (group === STREAM_PRIMARY_RIVER || group === STREAM_STRUCTURAL_FILAMENTS) {
        const fadeIn = THREE.MathUtils.smoothstep(1.0 - u, 0.0, 0.08);
        const fadeOut = THREE.MathUtils.smoothstep(u, 0.01, 0.08);
        lifecycleAlpha = fadeIn * fadeOut;
      } else if (group === STREAM_CANOPY_ARCH || group === STREAM_PROW_SHELF) {
        const fadeIn = THREE.MathUtils.smoothstep(u, 0.01, 0.08);
        const fadeOut = THREE.MathUtils.smoothstep(1.0 - u, 0.01, 0.08);
        lifecycleAlpha = fadeIn * fadeOut;
      }

      // Harmonic streamline waviness: gives fibrous, silky fluid streamlines (Reference: Image 4)
      const harmonicWave = Math.sin(u * Math.PI * 3.0 + phase) * 0.007;
      let evalV = THREE.MathUtils.clamp(baseV + harmonicWave, 0.02, 0.98);

      // Local mesh displacement from unfolding
      const mesh = this.veilMeshes[foldIdx];
      const meshOffset = mesh ? mesh.position : new THREE.Vector3();

      if (group === STREAM_REQUEST_WAKE) {
        // Coherent packet traveling along Ingress Spline
        this.ingressCurve.getPointAt(u, tempSurfacePt);
        tempSurfacePt.x += Math.sin(time * 2.0 + phase) * 0.14;
        tempSurfacePt.y += Math.cos(time * 2.0 + phase) * 0.14;
        tempSurfacePt.z += Math.sin(time * 1.5 + phase) * 0.14;
        tempNorm.set(0, 0, 1);
      } else {
        // Surface evaluation
        this.veilSamplers[foldIdx].evaluate(u, evalV, tempSurfacePt, tempNorm);
        tempSurfacePt.add(meshOffset);

        const uTaper = Math.sin(Math.PI * u);
        const hScale = Math.pow(Math.max(uTaper, 0.01), 0.35);
        const vProfile = 1.0 - 1.4 * (evalV - 0.5) * (evalV - 0.5);
        const halfThick = Math.max(0.015, this.veilSamplers[foldIdx].thickness * 0.5 * hScale * Math.max(0.2, vProfile));
        const vCenterDist = Math.abs(evalV - 0.5);
        const fluteWave = Math.sin(evalV * Math.PI * 10);
        const fluteTaper = Math.max(0, 1.0 - Math.pow(vCenterDist * 2.0, 3.0));
        const fluteDisplacement = fluteWave * 0.036 * fluteTaper * hScale;
        const hoverMargin = 0.030;

        tempSurfacePt.addScaledVector(tempNorm, halfThick + fluteDisplacement + hoverMargin);
      }

      // ====================================================================
      // RESTRAINED CAUSAL INSPECTION SEQUENCE (Zero Uncontrolled Cloud)
      // ====================================================================
      if (p >= 0.28 && p <= 0.68) {
        const apDx = tempSurfacePt.x - this.apertureCenter.x;
        const apDy = tempSurfacePt.y - this.apertureCenter.y;
        const apDz = tempSurfacePt.z - this.apertureCenter.z;
        const apDistSq = apDx * apDx + apDy * apDy + apDz * apDz;

        // Phase A: Inbound Narrowing & Draw (p in [0.28, 0.38])
        // Nearby stream narrows transversely toward the inbound request
        if (p < 0.38) {
          const reqDx = tempSurfacePt.x - this.currentRequestPos.x;
          const reqDy = tempSurfacePt.y - this.currentRequestPos.y;
          const reqDz = tempSurfacePt.z - this.currentRequestPos.z;
          const reqDist = Math.sqrt(reqDx * reqDx + reqDy * reqDy + reqDz * reqDz);
          if (reqDist < 1.4 && reqDist > 0.01) {
            const attractWeight = (1.0 - reqDist / 1.4) * 0.09 * THREE.MathUtils.smoothstep(p, 0.28, 0.36);
            tempSurfacePt.x -= (reqDx / reqDist) * attractWeight;
            tempSurfacePt.y -= (reqDy / reqDist) * attractWeight;
            tempSurfacePt.z -= (reqDz / reqDist) * attractWeight;
          }
        }

        // Phase B: Precision Iris Perimeter Contour at Aperture Boundary (p in [0.38, 0.48], peak at 0.43)
        // Strictly limited cohort (only 1 in 10 nearby particles) within radius 1.15 of aperture
        // ZERO overpopulated clouds or fireworks!
        if (apDistSq < 1.32 && (i % 10 === 0)) {
          const contourProg = THREE.MathUtils.smoothstep(p, 0.38, 0.43) * (1.0 - THREE.MathUtils.smoothstep(p, 0.46, 0.52));
          if (contourProg > 0.001) {
            const apDist = Math.sqrt(apDistSq);
            const angle = Math.atan2(apDy, apDx) + phase * 0.15;
            // Precision geometric iris contour (radius 0.55)
            const ringX = this.apertureCenter.x + Math.cos(angle) * 0.55;
            const ringY = this.apertureCenter.y + Math.sin(angle) * 0.55;
            const ringZ = this.apertureCenter.z + Math.sin(angle * 2.0) * 0.05;

            const pullStrength = contourProg * (1.0 - apDist / 1.15) * 0.50;
            tempSurfacePt.x = THREE.MathUtils.lerp(tempSurfacePt.x, ringX, pullStrength);
            tempSurfacePt.y = THREE.MathUtils.lerp(tempSurfacePt.y, ringY, pullStrength);
            tempSurfacePt.z = THREE.MathUtils.lerp(tempSurfacePt.z, ringZ, pullStrength);

            // Verdict reaction color on iris contour
            if (p >= 0.42) {
              const vCol = this.decisionMode === 'BLOCK' ? cCrimson : this.decisionMode === 'FLAG' ? cAmber : cEmerald;
              this.colorArray[idx] = THREE.MathUtils.lerp(this.colorArray[idx], vCol.r, contourProg);
              this.colorArray[idx + 1] = THREE.MathUtils.lerp(this.colorArray[idx + 1], vCol.g, contourProg);
              this.colorArray[idx + 2] = THREE.MathUtils.lerp(this.colorArray[idx + 2], vCol.b, contourProg);
            }
          }
        }

        // Phase C: Delicate Traveling Wave along Adjacent Surface Currents (p in [0.44, 0.56])
        if (p >= 0.44 && p <= 0.56 && apDistSq < 6.25) {
          const waveEnv = THREE.MathUtils.smoothstep(p, 0.44, 0.48) * (1.0 - THREE.MathUtils.smoothstep(p, 0.52, 0.56));
          const apDist = Math.sqrt(apDistSq);
          const wavePhase = apDist * 5.0 - time * 5.5;
          const waveDisplacement = Math.sin(wavePhase) * Math.exp(-apDist * 0.90) * 0.028 * waveEnv;
          tempSurfacePt.addScaledVector(tempNorm, waveDisplacement);
        }
      }

      // Localized subtle parting wake immediately around moving Request Signal entity
      const reqDx = tempSurfacePt.x - this.currentRequestPos.x;
      const reqDy = tempSurfacePt.y - this.currentRequestPos.y;
      const reqDz = tempSurfacePt.z - this.currentRequestPos.z;
      const reqDistSq = reqDx * reqDx + reqDy * reqDy + reqDz * reqDz;
      if (reqDistSq < 1.44 && reqDistSq > 0.001) {
        const reqDist = Math.sqrt(reqDistSq);
        const repelFactor = (1.0 - reqDist / 1.20) * 0.20;
        tempSurfacePt.x += (reqDx / reqDist) * repelFactor;
        tempSurfacePt.y += (reqDy / reqDist) * repelFactor;
        tempSurfacePt.z += (reqDz / reqDist) * repelFactor;
      }

      this.targetArray[idx] = tempSurfacePt.x;
      this.targetArray[idx + 1] = tempSurfacePt.y;
      this.targetArray[idx + 2] = tempSurfacePt.z;

      // Update live alpha with lifecycle envelope
      this.liveAlphaArray[i] = this.baseAlphaArray[i] * lifecycleAlpha;

      // Localized pointer disturbance: physical fluid wake on nearby particles (<600ms spring settling)
      if (isPointerActive) {
        // Project particle onto cursor ray: tRay = (particle - ray.origin) . ray.direction
        const toOriginX = tempSurfacePt.x - cursorRay.origin.x;
        const toOriginY = tempSurfacePt.y - cursorRay.origin.y;
        const toOriginZ = tempSurfacePt.z - cursorRay.origin.z;
        const tRay = toOriginX * cursorRay.direction.x +
                     toOriginY * cursorRay.direction.y +
                     toOriginZ * cursorRay.direction.z;

        if (tRay > 0.1) {
          // Closest point on ray to particle in 3D world space
          const rX = cursorRay.origin.x + cursorRay.direction.x * tRay;
          const rY = cursorRay.origin.y + cursorRay.direction.y * tRay;
          const rZ = cursorRay.origin.z + cursorRay.direction.z * tRay;

          // Vector from ray to particle
          const dx = tempSurfacePt.x - rX;
          const dy = tempSurfacePt.y - rY;
          const dz = tempSurfacePt.z - rZ;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < wakeRadiusSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist;
            const falloff = 1.0 - dist / wakeRadius;
            const hermite = falloff * falloff * (3.0 - 2.0 * falloff);

            // Dynamic wake impulse proportional to cursor motion with fluid swirl
            if (pointerSpeed > 0.012) {
              const effectiveSpeed = Math.min(Math.max(pointerSpeed * 2.4, 0.45), 4.2);
              const pushAcc = effectiveSpeed * hermite * 70.0;

              // 1. Radial component (parts particles away from cursor ray)
              const radX = dx * invDist;
              const radY = dy * invDist;
              const radZ = dz * invDist;

              // 2. Tangential swirl / vortex vector (cross product: cursorRay.direction x D)
              let swirlX = cursorRay.direction.y * dz - cursorRay.direction.z * dy;
              let swirlY = cursorRay.direction.z * dx - cursorRay.direction.x * dz;
              let swirlZ = cursorRay.direction.x * dy - cursorRay.direction.y * dx;
              const sMag = Math.sqrt(swirlX * swirlX + swirlY * swirlY + swirlZ * swirlZ);
              if (sMag > 0.001) {
                const invS = 1.0 / sMag;
                swirlX *= invS;
                swirlY *= invS;
                swirlZ *= invS;
              }

              // Combine 40% radial expansion + 60% rotational swirl
              let fX = (radX * 0.40 + swirlX * 0.60) * pushAcc;
              let fY = (radY * 0.40 + swirlY * 0.60) * pushAcc;
              let fZ = (radZ * 0.40 + swirlZ * 0.60) * pushAcc;

              // 3. Advection drag component along cursor velocity vector
              const dragAcc = Math.min(pointerSpeed * 1.2, 2.5) * hermite * 20.0;
              fX += this.cursorVel3D.x * dragAcc;
              fY += this.cursorVel3D.y * dragAcc;
              fZ += this.cursorVel3D.z * dragAcc;

              this.dispVelArray[idx] += fX * dt;
              this.dispVelArray[idx + 1] += fY * dt;
              this.dispVelArray[idx + 2] += fZ * dt;
            } else if (dist < 0.35) {
              // Gentle static deflection if stationary cursor rests directly on streamline
              const staticPush = (1.0 - dist / 0.35) * 1.5;
              this.dispVelArray[idx] += dx * invDist * staticPush * dt;
              this.dispVelArray[idx + 1] += dy * invDist * staticPush * dt;
              this.dispVelArray[idx + 2] += dz * invDist * staticPush * dt;
            }
          }
        }
      }

      // Spring-damper returning displacement D(t) -> 0 (< 600ms settling)
      let dX = this.dispArray[idx];
      let dY = this.dispArray[idx + 1];
      let dZ = this.dispArray[idx + 2];

      this.dispVelArray[idx] += -dX * springK * dt;
      this.dispVelArray[idx + 1] += -dY * springK * dt;
      this.dispVelArray[idx + 2] += -dZ * springK * dt;

      this.dispVelArray[idx] *= damping;
      this.dispVelArray[idx + 1] *= damping;
      this.dispVelArray[idx + 2] *= damping;

      dX += this.dispVelArray[idx] * dt;
      dY += this.dispVelArray[idx + 1] * dt;
      dZ += this.dispVelArray[idx + 2] * dt;

      // ====================================================================
      // CRITICAL ANTI-OCCLUSION PROJECTION:
      // Guarantee particles NEVER penetrate into the solid sculpture mesh!
      // ====================================================================
      const dotN = dX * tempNorm.x + dY * tempNorm.y + dZ * tempNorm.z;
      const tX = dX - dotN * tempNorm.x;
      const tY = dY - dotN * tempNorm.y;
      const tZ = dZ - dotN * tempNorm.z;
      const tMagSq = tX * tX + tY * tY + tZ * tZ;
      const maxTangent = 1.65; // Lush lateral displacement across the ribbon width
      const scaleT = tMagSq > maxTangent * maxTangent ? maxTangent / Math.sqrt(tMagSq) : 1.0;

      // Normal component: strictly non-negative (>= 0), safe lift [0.0, 0.35]
      const safeDotN = THREE.MathUtils.clamp(dotN, 0.0, 0.35);

      // Reconstructed safe displacement
      dX = tX * scaleT + safeDotN * tempNorm.x;
      dY = tY * scaleT + safeDotN * tempNorm.y;
      dZ = tZ * scaleT + safeDotN * tempNorm.z;

      // Eliminate any inward velocity along normal so spring doesn't fight inward push
      const velDotN = this.dispVelArray[idx] * tempNorm.x + this.dispVelArray[idx + 1] * tempNorm.y + this.dispVelArray[idx + 2] * tempNorm.z;
      if (velDotN < 0) {
        this.dispVelArray[idx] -= velDotN * tempNorm.x;
        this.dispVelArray[idx + 1] -= velDotN * tempNorm.y;
        this.dispVelArray[idx + 2] -= velDotN * tempNorm.z;
      }

      this.dispArray[idx] = dX;
      this.dispArray[idx + 1] = dY;
      this.dispArray[idx + 2] = dZ;

      this.posArray[idx] = this.targetArray[idx] + dX;
      this.posArray[idx + 1] = this.targetArray[idx + 1] + dY;
      this.posArray[idx + 2] = this.targetArray[idx + 2] + dZ;
    }

    this.particlesGeo.attributes.position.needsUpdate = true;
    this.particlesGeo.attributes.aAlpha.needsUpdate = true;
    this.particlesGeo.attributes.aColor.needsUpdate = true;
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Smooth scroll progress interpolation
    const lerpSpeed = this.isReducedMotion ? 1.0 : 0.085;
    this.progress = THREE.MathUtils.lerp(this.progress, this.targetProgress, lerpSpeed);

    // Multi-timescale autonomous structural breathing & restrained elastic edge movement:
    // Selected free edges and cantilevered folds gently flex like a suspended flexible surface responding to fluid forces
    if (this.veilMeshes.length >= 3) {
      const unfoldT = this.progress;
      const unfoldEase = unfoldT < 0.5 ? 2 * unfoldT * unfoldT : -1 + (4 - 2 * unfoldT) * unfoldT;

      let cElY = 0;
      let cElZ = 0;
      let cElRotZ = 0;
      let mElX = 0;
      let mElY = 0;
      let mElRotY = 0;
      let pElX = 0;
      let pElY = 0;
      let pElZ = 0;
      let pElRotX = 0;

      if (!this.isReducedMotion) {
        const tCanopy = time * 0.72;
        const tCore = time * 0.58;
        const tProw = time * 0.84;

        // Mesh 0: Canopy (vertical suspension wave)
        cElY = (Math.sin(tCanopy) * 0.045 + Math.cos(tCanopy * 0.45) * 0.020);
        cElZ = Math.cos(tCanopy * 0.8) * 0.035;
        cElRotZ = Math.sin(tCanopy * 0.5) * 0.008;

        // Mesh 1: Core Monolith (grounded focal anchor with micro-elastic aperture breathing)
        mElX = Math.sin(tCore * 0.9) * 0.030;
        mElY = Math.cos(tCore * 0.7) * 0.025;
        mElRotY = Math.sin(tCore * 0.4) * 0.006;

        // Mesh 2: Sweeping Foreground Prow (cantilevered tip flexes with liquid grace)
        pElX = Math.cos(tProw * 0.8) * 0.040;
        pElY = Math.sin(tProw * 1.1) * 0.055;
        pElZ = Math.cos(tProw * 0.6) * 0.035;
        pElRotX = Math.sin(tProw * 0.7) * 0.010;
      }

      // Mesh 0: Canopy (lifts up and back, creating expansive proscenium)
      this.veilMeshes[0].position.set(
        -unfoldEase * 1.6,
        unfoldEase * 1.8 + cElY,
        -unfoldEase * 2.2 + cElZ
      );
      this.veilMeshes[0].rotation.set(
        -unfoldEase * 0.08,
        unfoldEase * 0.05,
        -unfoldEase * 0.04 + cElRotZ
      );

      // Mesh 1: Core Monolith (parts to the right, widening central inspection aperture)
      this.veilMeshes[1].position.set(
        unfoldEase * 2.2 + mElX,
        -unfoldEase * 0.6 + mElY,
        -unfoldEase * 1.4
      );
      this.veilMeshes[1].rotation.set(
        unfoldEase * 0.06,
        -unfoldEase * 0.16 + mElRotY,
        unfoldEase * 0.08
      );

      // Mesh 2: Foreground Prow (sweeps downward and forward)
      this.veilMeshes[2].position.set(
        -unfoldEase * 0.8 + pElX,
        -unfoldEase * 1.6 + pElY,
        unfoldEase * 0.6 + pElZ
      );
      this.veilMeshes[2].rotation.set(
        -unfoldEase * 0.08 + pElRotX,
        unfoldEase * 0.10,
        -unfoldEase * 0.06
      );
    }

    this.updateCamera(this.progress, dt);
    this.updateRequestSignal(this.progress, time);
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

    this.requestCoreMesh?.geometry?.dispose();
    (this.requestCoreMesh?.material as THREE.Material)?.dispose();
    this.requestHaloMesh?.geometry?.dispose();
    (this.requestHaloMesh?.material as THREE.Material)?.dispose();
    this.requestLight?.dispose();
    this.requestTrailGeo?.dispose();
    (this.requestTrailMesh?.material as THREE.Material)?.dispose();
    this.evidenceBranchGeo?.dispose();
    (this.evidenceBranchLine?.material as THREE.Material)?.dispose();
    this.evidenceNodeMesh?.geometry?.dispose();
    (this.evidenceNodeMesh?.material as THREE.Material)?.dispose();

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
