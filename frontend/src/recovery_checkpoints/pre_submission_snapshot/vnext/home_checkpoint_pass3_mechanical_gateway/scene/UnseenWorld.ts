import * as THREE from 'three';
import { DecisionMode, DebugTuningParams, DEFAULT_DEBUG_PARAMS, UnseenPointerState } from '../types';
import { GatewayArchitecture, ConduitSystem } from './GatewayArchitectureGeometry';

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
  // ARCHITECTURAL ENVIRONMENT: 4 Real Networking Regions
  // -----------------------------------------------------------------
  private conduits!: ConduitSystem;
  private architectureMeshGroup = new THREE.Group();
  private clientTerminal!: THREE.Group;
  private gatewayComponents!: {
    coreGroup: THREE.Group;
    outerShell: THREE.Mesh;
    midRing: THREE.Mesh;
    innerAperture: THREE.Mesh;
    struts: THREE.Group;
    sensorRings: THREE.Mesh[];
  };
  private protectedApi!: THREE.Group;
  private evidenceComponents!: {
    fieldGroup: THREE.Group;
    gimbalOuter: THREE.Mesh;
    gimbalInner: THREE.Mesh;
    vaultCrystal: THREE.Mesh;
  };
  private conduitVisuals!: THREE.Group;

  // Surface-bound micro-matter particles (26,000 fine luminous fragments)
  private particleCount = 26000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Particle Streams:
  // 0: Conduit Flow (12,000 along Ingress/Egress splines)
  // 1: Gateway Inspection Shells (10,000 concentric faceted layers)
  // 2: Evidence Branch (4,000 along Evidence spline & vault)
  private particleStream!: Uint8Array;
  private particleU!: Float32Array;        // Longitudinal parameter u along spline or shell
  private particleRadius!: Float32Array;   // Transverse / radial offset
  private particleTheta!: Float32Array;    // Radial angle around axis
  private particleFlowSpeed!: Float32Array;// Tangential streaming velocity
  private particlePhase!: Float32Array;    // Harmonic breathing phase

  // Physical states
  private posArray!: Float32Array;         // Current 3D position
  private targetArray!: Float32Array;      // Base authored anchor S(t)
  private dispArray!: Float32Array;        // Physical displacement D(t)
  private dispVelArray!: Float32Array;     // Displacement velocity dD/dt
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // Protagonist Request Signal Entity
  private signalGroup = new THREE.Group();
  private signalCore!: THREE.Mesh;
  private signalAura!: THREE.Mesh;
  private signalLight!: THREE.PointLight;
  private signalTrail!: THREE.Line;
  private signalTrailGeo!: THREE.BufferGeometry;
  private signalTrailPoints: THREE.Vector3[] = [];

  // Secondary Evidence Branch Signal (for FLAG mode)
  private evidenceSignalGroup = new THREE.Group();
  private evidenceSignalCore!: THREE.Mesh;
  private evidenceSignalLight!: THREE.PointLight;

  // Act V Topology Telemetry Overlay
  private topologyGroup = new THREE.Group();
  private topologyLines!: THREE.LineSegments;
  private topologyNodes: THREE.Mesh[] = [];

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private gatewayCoreLight!: THREE.PointLight;

  // Camera Waypoints (Architecturally framed across the 6 acts; 0 mouse coupling)
  private cameraWaypoints = [
    { p: 0.00, pos: new THREE.Vector3(0.0, 0.4, 14.5), look: new THREE.Vector3(1.8, 0.0, 0.0), fov: 42 },
    { p: 0.16, pos: new THREE.Vector3(-2.0, -0.6, 9.8), look: new THREE.Vector3(-1.0, -1.0, 0.0), fov: 43 },
    { p: 0.33, pos: new THREE.Vector3(1.6, 0.2, 5.5), look: new THREE.Vector3(2.8, 0.2, -0.2), fov: 45 },
    { p: 0.50, pos: new THREE.Vector3(3.6, 0.6, 10.2), look: new THREE.Vector3(3.4, 0.1, -0.6), fov: 43 },
    { p: 0.68, pos: new THREE.Vector3(2.5, 5.2, 17.5), look: new THREE.Vector3(2.8, -0.2, -1.0), fov: 41 },
    { p: 0.86, pos: new THREE.Vector3(3.6, -2.0, 8.2), look: new THREE.Vector3(3.6, -3.8, 1.2), fov: 40 },
    { p: 1.00, pos: new THREE.Vector3(2.8, -1.2, 11.5), look: new THREE.Vector3(3.0, -2.0, 0.4), fov: 41 },
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
    this.initArchitecture();
    this.initStructuredParticles();
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
    this.ambientLight = new THREE.AmbientLight('#0F1115', 0.95);
    this.scene.add(this.ambientLight);

    // Directional Key Light: Sharp architectural lighting from upper right
    this.keyLight = new THREE.DirectionalLight('#F0F4F8', 3.4);
    this.keyLight.position.set(12, 16, 12);
    this.scene.add(this.keyLight);

    // Cool Rim Light: Highlighting silhouettes & sharp bevel ridges from rear-left
    this.rimLight = new THREE.DirectionalLight('#E2E6EE', 3.6);
    this.rimLight.position.set(-16, 10, -12);
    this.scene.add(this.rimLight);

    // Deep graphite cavity bounce
    this.fillLight = new THREE.DirectionalLight('#242832', 1.1);
    this.fillLight.position.set(2, -12, 6);
    this.scene.add(this.fillLight);

    // Gateway Core Aperture Light
    this.gatewayCoreLight = new THREE.PointLight('#EDF1F7', 2.8, 8.5, 2.0);
    this.gatewayCoreLight.position.copy(GatewayArchitecture.GATEWAY_POS);
    this.scene.add(this.gatewayCoreLight);
  }

  /**
   * Region 1-4 Architectural Meshes from GatewayArchitecture
   */
  private initArchitecture(): void {
    this.conduits = GatewayArchitecture.createConduitSystem();

    // 1. Client Terminal (Left)
    this.clientTerminal = GatewayArchitecture.createClientTerminal();
    this.architectureMeshGroup.add(this.clientTerminal);

    // 2. Gateway Core (Center)
    this.gatewayComponents = GatewayArchitecture.createGatewayCore();
    this.architectureMeshGroup.add(this.gatewayComponents.coreGroup);

    // 3. Protected Upstream API Citadel (Right Deep Space)
    this.protectedApi = GatewayArchitecture.createProtectedApi();
    this.architectureMeshGroup.add(this.protectedApi);

    // 4. Evidence Field (Lower Branch)
    this.evidenceComponents = GatewayArchitecture.createEvidenceField();
    this.architectureMeshGroup.add(this.evidenceComponents.fieldGroup);

    // 5. Conduit Guide Lines & Transit Rings
    this.conduitVisuals = GatewayArchitecture.createConduitVisuals(this.conduits);
    this.architectureMeshGroup.add(this.conduitVisuals);

    this.scene.add(this.architectureMeshGroup);
  }

  /**
   * Surface-Bound Micro-Matter Particles
   * 26,000 fine luminous fragments structured across the 4 networking regions.
   */
  private initStructuredParticles(): void {
    this.posArray = new Float32Array(this.particleCount * 3);
    this.targetArray = new Float32Array(this.particleCount * 3);
    this.dispArray = new Float32Array(this.particleCount * 3);
    this.dispVelArray = new Float32Array(this.particleCount * 3);

    this.particleStream = new Uint8Array(this.particleCount);
    this.particleU = new Float32Array(this.particleCount);
    this.particleRadius = new Float32Array(this.particleCount);
    this.particleTheta = new Float32Array(this.particleCount);
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

      // Assign particle stream:
      // Stream 0 (46%): Conduit Streaming (Ingress & Egress conduits)
      // Stream 1 (38%): Gateway Concentric Inspection Shells & Aperture
      // Stream 2 (16%): Evidence Branch & Forensic Vault
      const dice = Math.random();
      const streamIdx = dice < 0.46 ? 0 : dice < 0.84 ? 1 : 2;
      this.particleStream[i] = streamIdx;

      this.particleU[i] = Math.random();
      this.particlePhase[i] = Math.random() * Math.PI * 2;
      this.particleTheta[i] = Math.random() * Math.PI * 2;

      if (streamIdx === 0) {
        // Conduit stream: tight cylindrical envelope around Ingress/Egress splines
        this.particleRadius[i] = 0.08 + Math.random() * 0.32;
        this.particleFlowSpeed[i] = 0.045 + Math.random() * 0.035;
      } else if (streamIdx === 1) {
        // Gateway shells: 3 concentric radii (outer armor, mid ring, inner aperture)
        const shellDice = Math.random();
        if (shellDice < 0.40) {
          this.particleRadius[i] = 3.3 + (Math.random() - 0.5) * 0.3; // Outer armor
        } else if (shellDice < 0.75) {
          this.particleRadius[i] = 2.35 + (Math.random() - 0.5) * 0.25; // Mid ring
        } else {
          this.particleRadius[i] = 1.42 + (Math.random() - 0.5) * 0.15; // Inner aperture
        }
        this.particleFlowSpeed[i] = (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.025);
      } else {
        // Evidence branch: flow down evidence artery into vault
        this.particleRadius[i] = 0.06 + Math.random() * 0.28;
        this.particleFlowSpeed[i] = 0.035 + Math.random() * 0.03;
      }

      // Initial anchor position
      this.calculateBaseAnchor(i, tempTarget);

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

      // Color and size assignment
      const colorDice = Math.random();
      let chosenColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      if (colorDice < 0.22) {
        chosenColor = Math.random() < 0.5 ? cGraphite : cObsidian;
        pSize = 0.06 + Math.random() * 0.03;
        pAlpha = 0.45 + Math.random() * 0.15;
      } else if (colorDice < 0.65) {
        chosenColor = cTitanium;
        pSize = 0.09 + Math.random() * 0.04;
        pAlpha = 0.70 + Math.random() * 0.15;
      } else if (colorDice < 0.88) {
        chosenColor = cSilver;
        pSize = 0.13 + Math.random() * 0.05;
        pAlpha = 0.88;
      } else {
        chosenColor = cPearl;
        pSize = 0.20 + Math.random() * 0.07;
        pAlpha = 0.95;
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

          // Proximity illumination from protagonist request signal
          float distToSignal = length(position - uSignalPos);
          float signalGlow = uSignalIntensity / (distToSignal * distToSignal + 1.2);
          vColor += vec3(signalGlow * 0.45);

          // Perspective size attenuation
          float pSize = aSize * (200.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.0, 7.5);

          // Atmospheric depth fade
          float depthFade = clamp(1.15 - (vDepth / 34.0), 0.15, 1.0);
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

  /**
   * Computes the base physical anchor S(u, theta, t) for particle i.
   */
  private calculateBaseAnchor(i: number, target: THREE.Vector3): void {
    const stream = this.particleStream[i];
    const u = this.particleU[i];
    const r = this.particleRadius[i];
    const theta = this.particleTheta[i];

    if (stream === 0) {
      // Conduit Flow along Ingress or Egress spline
      let spline: THREE.CatmullRomCurve3;
      let splineU: number;
      if (u < 0.5) {
        spline = this.conduits.ingressSpline;
        splineU = u * 2.0;
      } else {
        spline = this.conduits.egressSpline;
        splineU = (u - 0.5) * 2.0;
      }
      splineU = THREE.MathUtils.clamp(splineU, 0, 1);
      const spineP = spline.getPointAt(splineU);
      const tangent = spline.getTangentAt(splineU).normalize();

      // Orthogonal reference frame
      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.dot(up)) > 0.88) up.set(1, 0, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      target.copy(spineP);
      target.addScaledVector(normal, Math.cos(theta) * r);
      target.addScaledVector(binormal, Math.sin(theta) * r);
    } else if (stream === 1) {
      // Gateway Inspection Core Shells
      const coreCenter = GatewayArchitecture.GATEWAY_POS;
      const zOffset = (u - 0.5) * 1.8; // Depth across core
      target.set(
        coreCenter.x + Math.cos(theta) * r,
        coreCenter.y + Math.sin(theta) * r,
        coreCenter.z + zOffset
      );
    } else {
      // Evidence Artery & Field
      const spline = this.conduits.evidenceSpline;
      const splineP = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u).normalize();

      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.dot(up)) > 0.88) up.set(0, 0, 1);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      target.copy(splineP);
      target.addScaledVector(normal, Math.cos(theta) * r);
      target.addScaledVector(binormal, Math.sin(theta) * r);
    }
  }

  private initSignalProtagonist(): void {
    // 1. Primary Signal Orb
    const coreGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF') });
    this.signalCore = new THREE.Mesh(coreGeo, coreMat);
    this.signalGroup.add(this.signalCore);

    const auraGeo = new THREE.TorusGeometry(0.44, 0.035, 16, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#BFC3C7'),
      transparent: true,
      opacity: 0.85,
    });
    this.signalAura = new THREE.Mesh(auraGeo, auraMat);
    this.signalGroup.add(this.signalAura);

    this.signalLight = new THREE.PointLight('#F4F4F1', 3.2, 9.0, 2);
    this.signalGroup.add(this.signalLight);

    // Filament Trail
    this.signalTrailPoints = [];
    for (let i = 0; i < 24; i++) {
      this.signalTrailPoints.push(new THREE.Vector3());
    }
    this.signalTrailGeo = new THREE.BufferGeometry().setFromPoints(this.signalTrailPoints);
    const trailMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#BFC3C7'),
      transparent: true,
      opacity: 0.5,
    });
    this.signalTrail = new THREE.Line(this.signalTrailGeo, trailMat);
    this.scene.add(this.signalTrail);

    this.signalGroup.position.copy(GatewayArchitecture.CLIENT_POS.clone().add(new THREE.Vector3(0.9, 0, 0)));
    this.scene.add(this.signalGroup);

    // 2. Secondary Evidence Signal (for FLAG branching)
    const evCoreGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const evCoreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E9B969') });
    this.evidenceSignalCore = new THREE.Mesh(evCoreGeo, evCoreMat);
    this.evidenceSignalGroup.add(this.evidenceSignalCore);

    this.evidenceSignalLight = new THREE.PointLight('#E9B969', 1.8, 6.0, 2);
    this.evidenceSignalGroup.add(this.evidenceSignalLight);

    this.evidenceSignalGroup.visible = false;
    this.scene.add(this.evidenceSignalGroup);
  }

  private initTopologyStructure(): void {
    // Act V Topology Graph connecting the live platform
    const pPlatform = new THREE.Vector3(2.8, 4.6, 0.2);
    const sClient = GatewayArchitecture.CLIENT_POS.clone().add(new THREE.Vector3(0, 1.2, 0));
    const sGateway = GatewayArchitecture.GATEWAY_POS.clone().add(new THREE.Vector3(0, 1.6, 0));
    const sUpstream = GatewayArchitecture.UPSTREAM_POS.clone().add(new THREE.Vector3(0, 1.8, 0));
    const sEvidence = GatewayArchitecture.EVIDENCE_POS.clone().add(new THREE.Vector3(0, 1.2, 0));

    const linePoints: THREE.Vector3[] = [];
    const connect = (a: THREE.Vector3, b: THREE.Vector3) => {
      linePoints.push(a, b);
    };

    connect(pPlatform, sClient);
    connect(pPlatform, sGateway);
    connect(pPlatform, sUpstream);
    connect(pPlatform, sEvidence);
    connect(sClient, sGateway);
    connect(sGateway, sUpstream);
    connect(sGateway, sEvidence);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#8E98A8'),
      transparent: true,
      opacity: 0.0,
    });
    this.topologyLines = new THREE.LineSegments(lineGeo, lineMat);
    this.topologyGroup.add(this.topologyLines);

    const hubGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const hubMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#EDF1F7'),
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.0,
    });

    [pPlatform, sClient, sGateway, sUpstream, sEvidence].forEach((pos, idx) => {
      const node = new THREE.Mesh(hubGeo, hubMat);
      node.position.copy(pos);
      node.scale.setScalar(idx === 0 ? 1.35 : 0.95);
      node.visible = false;
      this.topologyNodes.push(node);
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
      this.architectureMeshGroup.visible = true;
      if (this.particlesMesh) this.particlesMesh.visible = false;
    } else if (this.renderMode === 'particles') {
      this.architectureMeshGroup.visible = false;
      if (this.particlesMesh) this.particlesMesh.visible = true;
    } else {
      this.architectureMeshGroup.visible = true;
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

    // Responsive adaptation for mobile narrow viewports
    if (this.camera.aspect < 1.0) {
      targetPos.z *= 1.45;
      targetPos.x *= 0.45;
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

    const clientOrigin = GatewayArchitecture.CLIENT_POS.clone().add(new THREE.Vector3(0.9, 0, 0));
    const gatewayTarget = GatewayArchitecture.GATEWAY_POS;

    if (p < 0.16) {
      // Act I: Emitter pulse at Client Ingress
      signalPos.copy(clientOrigin);
      opacity = 0.4 + 0.6 * Math.sin(time * 6.0);
      lightIntensity = 2.4;
      auraColor.set('#EDF1F7');
    } else if (p < 0.33) {
      // Act II: Gliding along Ingress Spline toward Gateway
      const t = (p - 0.16) / 0.17;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
      const splineP = this.conduits.ingressSpline.getPointAt(smoothT);
      signalPos.copy(splineP);
      opacity = 1.0;
      lightIntensity = 3.2;
      auraColor.set('#EDF1F7');
    } else if (p < 0.50) {
      // Act III: Impacting Gateway Core Threshold
      const t = (p - 0.33) / 0.17;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
      signalPos.lerpVectors(
        this.conduits.ingressSpline.getPointAt(1.0),
        gatewayTarget,
        smoothT
      );
      const impactProximity = 1.0 - Math.abs(p - 0.42) / 0.08;
      const flare = Math.max(0, impactProximity) * 4.0;
      opacity = 1.0;
      lightIntensity = 3.4 + flare;
      auraColor.set('#FFFFFF');
    } else if (p < 0.68) {
      // Act IV: Decision Outcomes
      const t = (p - 0.50) / 0.18;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);

      if (this.decisionMode === 'ALLOW') {
        // ALLOW: Pass through aperture into Egress spline to Upstream API
        auraColor.set('#53CE9A');
        const egressP = this.conduits.egressSpline.getPointAt(smoothT);
        signalPos.copy(egressP);
        opacity = 1.0;
        lightIntensity = 3.2;
        this.evidenceSignalGroup.visible = false;
      } else if (this.decisionMode === 'FLAG') {
        // FLAG: Forward to upstream (amber) + split secondary shard to Evidence Vault
        auraColor.set('#E9B969');
        const egressP = this.conduits.egressSpline.getPointAt(smoothT);
        signalPos.copy(egressP);
        opacity = 0.95;
        lightIntensity = 2.8;

        // Secondary evidence shard traveling down evidence spline
        this.evidenceSignalGroup.visible = true;
        const evP = this.conduits.evidenceSpline.getPointAt(smoothT);
        this.evidenceSignalGroup.position.copy(evP);
      } else {
        // BLOCK: Arrested and shattered at Gateway perimeter; 0 signal passes to upstream
        auraColor.set('#EB7777');
        signalPos.copy(gatewayTarget);
        opacity = Math.max(0, 1.0 - smoothT * 1.6);
        lightIntensity = Math.max(0, 3.5 - smoothT * 3.5);
        this.evidenceSignalGroup.visible = false;
      }
    } else {
      signalPos.copy(gatewayTarget);
      opacity = 0;
      lightIntensity = 0;
      this.evidenceSignalGroup.visible = false;
    }

    this.signalGroup.position.copy(signalPos);
    (this.signalAura.material as THREE.MeshBasicMaterial).color.copy(auraColor);
    (this.signalAura.material as THREE.MeshBasicMaterial).opacity = opacity;
    (this.signalCore.material as THREE.MeshBasicMaterial).opacity = opacity;
    this.signalLight.intensity = lightIntensity;

    this.signalAura.rotation.x = time * 2.2;
    this.signalAura.rotation.y = time * 1.8;

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
    const lineMat = this.topologyLines.material as THREE.LineBasicMaterial;

    if (p >= 0.67 && p < 0.85) {
      const t = p < 0.74 
        ? (p - 0.67) / 0.07 
        : p < 0.80 
          ? 1.0 
          : 1.0 - (p - 0.80) / 0.05;
      const alpha = THREE.MathUtils.smoothstep(t, 0, 1);
      lineMat.opacity = alpha * 0.55;
      this.topologyNodes.forEach((node) => {
        node.visible = true;
        (node.material as THREE.MeshStandardMaterial).opacity = alpha * 0.9;
      });
    } else {
      lineMat.opacity = 0;
      this.topologyNodes.forEach((node) => {
        node.visible = false;
      });
    }
  }

  /**
   * Main Architectural and Particle Motion Engine:
   * A. Large-scale structural breathing of Gateway shells & gyroscopic rotation of Evidence Vault.
   * B. Active micro-matter flow along conduits, gateway aperture, and evidence branch.
   * C. True localized pointer disturbance with zero camera coupling.
   */
  private updateLivingEnvironment(p: number, dt: number, time: number): void {
    // -------------------------------------------------------------
    // A. Structural Breathing & Mechanical Rotation
    // -------------------------------------------------------------
    const breathe = Math.sin(time * 0.8);
    // Outer shell subtle breathing scale & rotation
    this.gatewayComponents.outerShell.scale.set(
      1.0 + breathe * 0.015,
      1.0 + breathe * 0.015,
      1.0
    );
    this.gatewayComponents.midRing.rotation.z = time * 0.15;

    // Gyroscopic Evidence Gimbal rotation
    this.evidenceComponents.gimbalOuter.rotation.x = time * 0.45;
    this.evidenceComponents.gimbalInner.rotation.y = time * 0.65;
    this.evidenceComponents.vaultCrystal.rotation.z = time * 0.8;

    // Gateway sensor rings pulsing
    this.gatewayComponents.sensorRings.forEach((ring, idx) => {
      const ringPulse = 0.7 + 0.3 * Math.sin(time * 3.0 + idx * 1.2);
      (ring.material as THREE.MeshBasicMaterial).opacity = ringPulse;
      (ring.material as THREE.MeshBasicMaterial).color.set(
        this.decisionMode === 'ALLOW' ? '#53CE9A' : this.decisionMode === 'FLAG' ? '#E9B969' : '#EB7777'
      );
    });

    // -------------------------------------------------------------
    // Pointer World Velocity & Interaction Plane (Calibrated physics)
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

        // Reject sudden off-screen coordinate jumps (> 8 world units in 1 frame)
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

    // Narrative Scroll Transformations
    const tImpact = THREE.MathUtils.smoothstep((p - 0.30) / 0.14, 0, 1);
    const tDecision = THREE.MathUtils.smoothstep((p - 0.48) / 0.14, 0, 1);
    const tEvidence = THREE.MathUtils.smoothstep((p - 0.84) / 0.14, 0, 1);

    // Physics parameters
    const flowMultiplier = this.debugParams.flowSpeed;
    const radius = this.debugParams.mouseRadius;
    const radiusSq = radius * radius;
    const springK = 4.2;
    const damping = Math.pow(this.debugParams.damping, dt * 60.0);

    const fRepelBase = this.debugParams.mouseForce * 0.14;
    const fSwirlBase = this.debugParams.mouseSwirl * 0.18;
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

    const tempBaseP = new THREE.Vector3();

    // Update Particles
    if (this.renderMode !== 'mesh') {
      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        const stream = this.particleStream[i];

        // -------------------------------------------------------------
        // B. Active Flow along Conduits and Shells
        // -------------------------------------------------------------
        if (!this.isReducedMotion) {
          this.particleU[i] += this.particleFlowSpeed[i] * flowMultiplier * dt;
          if (this.particleU[i] > 1.0) this.particleU[i] -= 1.0;
          if (this.particleU[i] < 0.0) this.particleU[i] += 1.0;

          // Micro-rotation theta
          this.particleTheta[i] += (stream === 1 ? 0.3 : 0.6) * dt;
        }

        // Calculate base anchor S(u, theta, t)
        this.calculateBaseAnchor(i, tempBaseP);

        let sx = tempBaseP.x;
        let sy = tempBaseP.y;
        let sz = tempBaseP.z;

        // -------------------------------------------------------------
        // Narrative Dynamics along Acts
        // -------------------------------------------------------------
        // Act III: Policy Evaluation Impact — shockwave radiating from Gateway Core
        if (tImpact > 0 && tDecision === 0) {
          const dxImp = sx - GatewayArchitecture.GATEWAY_POS.x;
          const dyImp = sy - GatewayArchitecture.GATEWAY_POS.y;
          const dzImp = sz - GatewayArchitecture.GATEWAY_POS.z;
          const dImp = Math.max(0.6, Math.hypot(dxImp, dyImp, dzImp));
          const waveMag = Math.min(3.2 / dImp, 2.0) * tImpact;
          sx += (dxImp / dImp) * waveMag;
          sy += (dyImp / dImp) * waveMag;
          sz += (dzImp / dImp) * waveMag;
        }

        // Act IV: Decision Mode Transformations
        if (tDecision > 0 && tEvidence === 0) {
          if (this.decisionMode === 'ALLOW') {
            // Egress particles accelerate toward upstream
            if (stream === 0 && this.particleU[i] >= 0.5) {
              sx += 0.8 * tDecision;
            }
          } else if (this.decisionMode === 'FLAG') {
            // Evidence stream accelerates downward
            if (stream === 2) {
              sy -= 0.6 * tDecision;
            }
          } else {
            // BLOCK: Kinetic arrest, particles contract at threshold
            if (stream === 1) {
              const blkDist = Math.hypot(sx - GatewayArchitecture.GATEWAY_POS.x, sy - GatewayArchitecture.GATEWAY_POS.y);
              if (blkDist < 3.2) {
                sx = THREE.MathUtils.lerp(sx, GatewayArchitecture.GATEWAY_POS.x + (sx - GatewayArchitecture.GATEWAY_POS.x) * 0.6, tDecision);
                sy = THREE.MathUtils.lerp(sy, GatewayArchitecture.GATEWAY_POS.y + (sy - GatewayArchitecture.GATEWAY_POS.y) * 0.6, tDecision);
              }
            }
          }
        }

        this.targetArray[idx] = sx;
        this.targetArray[idx + 1] = sy;
        this.targetArray[idx + 2] = sz;

        // -------------------------------------------------------------
        // C. Calibrated Local Pointer Disturbance
        // -------------------------------------------------------------
        const currentX = sx + this.dispArray[idx];
        const currentY = sy + this.dispArray[idx + 1];

        if (this.isMouseMoving && !this.isReducedMotion) {
          const dxM = currentX - this.mouseWorld.x;
          const dyM = currentY - this.mouseWorld.y;
          const distSq = dxM * dxM + dyM * dyM;

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const influence = Math.pow(1.0 - dist / radius, 2.0);

            let normDx = dxM / (dist + 0.0001);
            let normDy = dyM / (dist + 0.0001);

            const pushForce = influence * fRepelBase * impulseScale;
            const swirlForce = influence * fSwirlBase * impulseScale;

            this.dispVelArray[idx] += (normDx * pushForce + wakeX * swirlForce);
            this.dispVelArray[idx + 1] += (normDy * pushForce + wakeY * swirlForce);
            this.dispVelArray[idx + 2] += (normDx * wakeY - normDy * wakeX) * swirlForce * 0.5;
          }
        }

        // Spring restoration and damping
        this.dispVelArray[idx] -= this.dispArray[idx] * springK * dt;
        this.dispVelArray[idx + 1] -= this.dispArray[idx + 1] * springK * dt;
        this.dispVelArray[idx + 2] -= this.dispArray[idx + 2] * springK * dt;

        this.dispVelArray[idx] *= damping;
        this.dispVelArray[idx + 1] *= damping;
        this.dispVelArray[idx + 2] *= damping;

        this.dispArray[idx] += this.dispVelArray[idx] * dt;
        this.dispArray[idx + 1] += this.dispVelArray[idx + 1] * dt;
        this.dispArray[idx + 2] += this.dispVelArray[idx + 2] * dt;

        this.posArray[idx] = sx + this.dispArray[idx];
        this.posArray[idx + 1] = sy + this.dispArray[idx + 1];
        this.posArray[idx + 2] = sz + this.dispArray[idx + 2];
      }

      this.particlesGeo.attributes.position.needsUpdate = true;
      this.particlesMat.uniforms.uTime.value = time;
    }
  }

  private animate(): void {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Smooth scroll interpolation
    const scrollLerpSpeed = this.isReducedMotion ? 1.0 : 0.08;
    this.progress += (this.targetProgress - this.progress) * scrollLerpSpeed;

    this.updateCamera(this.progress, dt);
    this.updateSignal(this.progress, time);
    this.updateTopologyStructure(this.progress);
    this.updateLivingEnvironment(this.progress, dt, time);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
    }
    window.removeEventListener('resize', this.onResize);

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
  }
}
