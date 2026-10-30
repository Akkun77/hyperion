import * as THREE from 'three';
import { DecisionMode, DebugTuningParams, DEFAULT_DEBUG_PARAMS, UnseenPointerState } from '../types';

export interface UnseenWorldOptions {
  container: HTMLElement;
  isReducedMotion?: boolean;
  debugParams?: DebugTuningParams;
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
  private isMouseMoving = false;
  private raycaster = new THREE.Raycaster();
  private planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  // Living Matter Particles (16,000 active particles)
  private particleCount = 16000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Simulation arrays
  private posArray!: Float32Array;
  private velArray!: Float32Array;
  private targetArray!: Float32Array;
  private baseAct1Array!: Float32Array;
  private baseAct2Array!: Float32Array;
  private baseAct3Array!: Float32Array;
  private baseAct4AllowArray!: Float32Array;
  private baseAct4FlagArray!: Float32Array;
  private baseAct4BlockArray!: Float32Array;
  private baseAct5Array!: Float32Array;
  private baseAct6Array!: Float32Array;
  private phaseArray!: Float32Array;
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // Protagonist Signal Entity
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

  // Cinematic Camera Waypoints (Strictly narrative & scroll driven)
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
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initLights();
    this.initLivingMatterParticles();
    this.initSignalProtagonist();
    this.initTopologyStructure();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight('#15171B', 0.95);
    this.scene.add(this.ambientLight);

    // Directional Key Light: Sharp architectural lighting from upper right
    this.keyLight = new THREE.DirectionalLight('#F4F4F1', 2.8);
    this.keyLight.position.set(12, 18, 14);
    this.scene.add(this.keyLight);

    // Cool Rim Light: Highlighting silhouettes from rear-left
    this.rimLight = new THREE.DirectionalLight('#BFC3C7', 2.2);
    this.rimLight.position.set(-16, 8, -12);
    this.scene.add(this.rimLight);

    // Deep graphite cavity bounce
    this.fillLight = new THREE.DirectionalLight('#34383E', 1.0);
    this.fillLight.position.set(0, -12, 8);
    this.scene.add(this.fillLight);
  }

  private initLivingMatterParticles(): void {
    this.posArray = new Float32Array(this.particleCount * 3);
    this.velArray = new Float32Array(this.particleCount * 3);
    this.targetArray = new Float32Array(this.particleCount * 3);
    this.baseAct1Array = new Float32Array(this.particleCount * 3);
    this.baseAct2Array = new Float32Array(this.particleCount * 3);
    this.baseAct3Array = new Float32Array(this.particleCount * 3);
    this.baseAct4AllowArray = new Float32Array(this.particleCount * 3);
    this.baseAct4FlagArray = new Float32Array(this.particleCount * 3);
    this.baseAct4BlockArray = new Float32Array(this.particleCount * 3);
    this.baseAct5Array = new Float32Array(this.particleCount * 3);
    this.baseAct6Array = new Float32Array(this.particleCount * 3);
    this.phaseArray = new Float32Array(this.particleCount);
    this.sizeArray = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.baseAlphaArray = new Float32Array(this.particleCount);

    const cPearl = new THREE.Color('#F4F4F1');
    const cSilver = new THREE.Color('#BFC3C7');
    const cTitanium = new THREE.Color('#6C727A');
    const cGraphite = new THREE.Color('#2A2E35');
    const cObsidian = new THREE.Color('#15171B');

    // Hub centroids for Act V topology
    const hubApex = new THREE.Vector3(0, 3.8, 0.4);
    const hubIngress = new THREE.Vector3(-4.6, 0.4, 1.2);
    const hubCore = new THREE.Vector3(0.2, -0.6, -0.6);
    const hubTelemetry = new THREE.Vector3(5.0, 0.6, 0.9);

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.phaseArray[i] = Math.random() * Math.PI * 2;

      // -------------------------------------------------------------
      // 1. Act I Formation: Asymmetric Volumetric Fluid Nebula
      //    - Concentrated on right side with curved flow regions
      //    - Defined dark internal cavities
      //    - Strict exclusion zone for left typography
      // -------------------------------------------------------------
      const u = Math.random();
      const radBase = 1.2 + Math.pow(u, 1.5) * 7.2;
      const theta = (Math.random() * 0.88 + 0.06) * Math.PI * 2;
      const phi = (Math.random() - 0.48) * Math.PI * 0.85;

      // Harmonic cavity modulation (creates organic voids instead of uniform cloud)
      const cavity = Math.sin(theta * 3.0 + phi * 2.0);
      const radMod = cavity < -0.3 ? radBase * 0.6 : radBase * 1.05;

      let rx = radMod * Math.cos(phi) * Math.cos(theta) + 2.6; // Biased right
      let ry = radMod * Math.sin(phi) * 0.9 + Math.sin(rx * 0.4) * 0.8;
      let rz = radMod * Math.cos(phi) * Math.sin(theta) * 0.85;

      // Hero Text Protection Zone on left:
      // Typography sits at x in [-7, 1.2], y in [-3.5, 3.5].
      // Push any foreground particles to deep background or outer perimeter.
      if (rx < 1.2 && rx > -7.5 && ry > -3.5 && ry < 3.5) {
        if (rz > -4.0) {
          // Send to background haze or push above/below text
          if (Math.random() < 0.6) {
            rz = -5.0 - Math.random() * 4.5;
          } else {
            ry = ry >= 0 ? ry + 2.8 : ry - 2.8;
          }
        }
      }

      this.baseAct1Array[idx] = rx;
      this.baseAct1Array[idx + 1] = ry;
      this.baseAct1Array[idx + 2] = rz;

      // Initialize current positions
      this.posArray[idx] = rx;
      this.posArray[idx + 1] = ry;
      this.posArray[idx + 2] = rz;

      this.targetArray[idx] = rx;
      this.targetArray[idx + 1] = ry;
      this.targetArray[idx + 2] = rz;

      // -------------------------------------------------------------
      // 2. Act II Formation: Streaming Ingress Corridor
      //    - Dynamic flowlines framing the incoming Signal path
      // -------------------------------------------------------------
      const corrT = (i / this.particleCount) * Math.PI * 4;
      const corrRad = 1.0 + (i % 10) * 0.35;
      const corridorZ = -12.0 + (i / this.particleCount) * 22.0;
      const corridorX = 2.4 + Math.cos(corrT + corridorZ * 0.2) * corrRad * 1.4;
      const corridorY = Math.sin(corrT + corridorZ * 0.2) * corrRad * 0.85;

      this.baseAct2Array[idx] = corridorX;
      this.baseAct2Array[idx + 1] = corridorY;
      this.baseAct2Array[idx + 2] = corridorZ;

      // -------------------------------------------------------------
      // 3. Act III Formation: Living Boundary & Impact Wave
      //    - Organic particulate threshold condensing near x = 2.4
      //    - Outward radial displacement wave
      // -------------------------------------------------------------
      const boundAngle = Math.random() * Math.PI * 2;
      const boundDist = 0.5 + Math.pow(Math.random(), 1.8) * 5.5;
      const bx = 2.4 + Math.cos(boundAngle) * boundDist * 0.6;
      const by = Math.sin(boundAngle) * boundDist * 0.9;
      const bz = (Math.random() - 0.5) * 3.5;

      // Shockwave displacement from impact epicenter (2.4, 0, 0)
      const sDirX = bx - 2.4;
      const sDirY = by;
      const sDirZ = bz;
      const sDist = Math.max(0.6, Math.hypot(sDirX, sDirY, sDirZ));
      const sMag = Math.min(5.5 / sDist, 4.2);

      this.baseAct3Array[idx] = bx + (sDirX / sDist) * sMag;
      this.baseAct3Array[idx + 1] = by + (sDirY / sDist) * sMag;
      this.baseAct3Array[idx + 2] = bz + (sDirZ / sDist) * sMag;

      // -------------------------------------------------------------
      // 4. Act IV Formations: Three Policy Decision Outcomes
      // -------------------------------------------------------------
      // ALLOW: Open laminar conduit flowing towards downstream cluster (-4.5, 0.4, 2)
      const allowStream = i % 2 === 0;
      this.baseAct4AllowArray[idx] = allowStream
        ? -4.5 + (Math.random() - 0.5) * 3.0
        : 2.4 + (Math.random() - 0.5) * 2.2;
      this.baseAct4AllowArray[idx + 1] = ry * 0.6;
      this.baseAct4AllowArray[idx + 2] = 1.8 + (Math.random() - 0.5) * 2.5;

      // FLAG: Residual ionization trace eddying near boundary
      const flagTheta = Math.random() * Math.PI * 2;
      const flagR = 0.6 + Math.random() * 2.4;
      this.baseAct4FlagArray[idx] = 2.4 + Math.cos(flagTheta) * flagR;
      this.baseAct4FlagArray[idx + 1] = Math.sin(flagTheta) * flagR * 0.85;
      this.baseAct4FlagArray[idx + 2] = (Math.random() - 0.5) * 1.8;

      // BLOCK: Compressed kinetic shock dam arrested at threshold
      const blockTheta = Math.random() * Math.PI * 2;
      const blockR = 1.4 + Math.random() * 0.6;
      this.baseAct4BlockArray[idx] = 2.4 + Math.cos(blockTheta) * blockR;
      this.baseAct4BlockArray[idx + 1] = Math.sin(blockTheta) * blockR * 0.8;
      this.baseAct4BlockArray[idx + 2] = (Math.random() - 0.5) * 0.8;

      // -------------------------------------------------------------
      // 5. Act V Formation: Organic 3D Hierarchical Topology
      //    (NO rectangular clusters! 4 volumetric sector clouds + streaming arteries)
      // -------------------------------------------------------------
      const clusterSelector = i % 4;
      let clusterCenter: THREE.Vector3;
      let clusterSpread: number;

      if (clusterSelector === 0) {
        clusterCenter = hubApex;
        clusterSpread = 1.4;
      } else if (clusterSelector === 1) {
        clusterCenter = hubIngress;
        clusterSpread = 1.6;
      } else if (clusterSelector === 2) {
        clusterCenter = hubCore;
        clusterSpread = 1.5;
      } else {
        clusterCenter = hubTelemetry;
        clusterSpread = 1.6;
      }

      // Organic Gaussian volumetric distribution around cluster hub
      const u1 = Math.random();
      const u2 = Math.random();
      const randR = clusterSpread * Math.sqrt(-2.0 * Math.log(Math.max(u1, 0.0001)));
      const randTheta = 2.0 * Math.PI * u2;
      const randPhi = (Math.random() - 0.5) * Math.PI;

      this.baseAct5Array[idx] = clusterCenter.x + randR * Math.cos(randPhi) * Math.cos(randTheta);
      this.baseAct5Array[idx + 1] = clusterCenter.y + randR * Math.sin(randPhi) * 0.85;
      this.baseAct5Array[idx + 2] = clusterCenter.z + randR * Math.cos(randPhi) * Math.sin(randTheta) * 0.75;

      // -------------------------------------------------------------
      // 6. Act VI Formation: Atmospheric Perimeter Framing Constellation
      //    - Leaves open negative space for editorial evidence receipt card
      // -------------------------------------------------------------
      const evAngle = (i / this.particleCount) * Math.PI * 2;
      const evRadius = 8.6 + (i % 14) * 0.45;
      this.baseAct6Array[idx] = Math.cos(evAngle) * evRadius * 1.35;
      this.baseAct6Array[idx + 1] = Math.sin(evAngle) * evRadius * 0.82;
      this.baseAct6Array[idx + 2] = -2.8 + (Math.random() - 0.5) * 2.4;

      // -------------------------------------------------------------
      // Scale & Palette Distribution (Eliminates flat white speckle)
      // -------------------------------------------------------------
      const dice = Math.random();
      let chosenColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      if (dice < 0.40) {
        // 40% Deep graphite / slate mist: dark body & cavities
        chosenColor = Math.random() < 0.5 ? cGraphite : cObsidian;
        pSize = 0.14 + Math.random() * 0.10;
        pAlpha = 0.35 + Math.random() * 0.25;
      } else if (dice < 0.75) {
        // 35% Metallic titanium / platinum: structure catching key light
        chosenColor = cTitanium;
        pSize = 0.24 + Math.random() * 0.15;
        pAlpha = 0.65 + Math.random() * 0.20;
      } else if (dice < 0.94) {
        // 19% Refined silver highlights
        chosenColor = cSilver;
        pSize = 0.38 + Math.random() * 0.22;
        pAlpha = 0.85;
      } else {
        // 6% Rare luminous pearl focal nodes
        chosenColor = cPearl;
        pSize = 0.65 + Math.random() * 0.30;
        pAlpha = 0.98;
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

    // Custom 3D Lit Particle Shader (Spherical normal approximation + Key/Rim shading)
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

          // Perspective size attenuation
          float pSize = aSize * (360.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.2, 34.0);

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
          // Circular particle boundary with soft falloff
          vec2 uv = gl_PointCoord - vec2(0.5);
          float rSq = dot(uv, uv);
          if (rSq > 0.25) discard;

          // Spherical normal approximation for 3D form
          float zNorm = sqrt(max(0.0, 0.25 - rSq)) * 2.0;
          vec3 normal = normalize(vec3(uv * 2.0, zNorm));

          // Directional key light + rim highlight
          float diffuse = max(0.0, dot(normal, uKeyLightDir));
          float rim = pow(1.0 - max(0.0, normal.z), 2.2);

          vec3 litColor = vColor * (0.32 + 0.68 * diffuse) + vec3(0.92, 0.95, 0.98) * (rim * 0.38);

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

    // Subtle curved telemetry arteries between hubs
    const arteryPoints: THREE.Vector3[] = [];
    
    // Smooth Bezier paths
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

    // Subtle integrated service hubs (Small luminous nodes, NOT giant low-poly geometry)
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

  // Purely narrative & scroll driven camera path (ZERO camera movement from pointer!)
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

    // Responsive portrait framing adjustment
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
      this.serviceHubNodes.forEach(node => {
        node.visible = true;
        (node.material as THREE.MeshStandardMaterial).opacity = alpha * 0.9;
      });
    } else {
      arteryMat.opacity = 0;
      this.serviceHubNodes.forEach(node => {
        node.visible = false;
      });
    }
  }

  private updateLivingMatter(p: number, dt: number, time: number): void {
    // -------------------------------------------------------------
    // 1. Raycast mouse 3D position onto plane z = 0
    // -------------------------------------------------------------
    this.raycaster.setFromCamera(
      new THREE.Vector2(this.pointer.x, this.pointer.y),
      this.camera
    );
    this.raycaster.ray.intersectPlane(this.planeZ0, this.mouseWorld);

    // Compute pointer velocity in world space
    const now = performance.now();
    const isStationary = !this.pointer.active || (now - this.lastPointerTimestamp > 65) || this.pointer.speed < 0.01;

    if (isStationary) {
      // Rapidly decay velocity to 0 when mouse stops moving
      this.smoothMouseVel.multiplyScalar(Math.exp(-24.0 * dt));
      this.isMouseMoving = this.smoothMouseVel.length() > 0.03;
    } else {
      // Calculate world-space velocity based on normalized velocity and camera frustum
      const planeDist = Math.max(this.camera.position.z, 5.0);
      const halfH = planeDist * Math.tan((this.camera.fov * Math.PI) / 360);
      const halfW = halfH * this.camera.aspect;

      const targetWorldVx = this.pointer.vx * halfW;
      const targetWorldVy = this.pointer.vy * halfH;

      this.mouseVelocityWorld.set(targetWorldVx, targetWorldVy, 0);

      // Clamp maximum input velocity to prevent explosive impulse
      const maxWorldSpeed = 12.0;
      const curSpeed = this.mouseVelocityWorld.length();
      if (curSpeed > maxWorldSpeed) {
        this.mouseVelocityWorld.multiplyScalar(maxWorldSpeed / curSpeed);
      }

      this.smoothMouseVel.lerp(this.mouseVelocityWorld, 1.0 - Math.exp(-18.0 * dt));
      this.isMouseMoving = this.smoothMouseVel.length() > 0.03;
    }
    this.prevMouseWorld.copy(this.mouseWorld);

    const mouseSpeed = this.smoothMouseVel.length();

    // -------------------------------------------------------------
    // 2. Compute narrative act morph targets
    // -------------------------------------------------------------
    const tAct2 = THREE.MathUtils.smoothstep((p - 0.12) / 0.18, 0, 1);
    const tAct3 = THREE.MathUtils.smoothstep((p - 0.30) / 0.14, 0, 1);
    const tAct4 = THREE.MathUtils.smoothstep((p - 0.48) / 0.14, 0, 1);
    const tAct5 = THREE.MathUtils.smoothstep((p - 0.66) / 0.15, 0, 1);
    const tAct6 = THREE.MathUtils.smoothstep((p - 0.84) / 0.14, 0, 1);

    const act4Array = this.decisionMode === 'ALLOW' 
      ? this.baseAct4AllowArray 
      : this.decisionMode === 'FLAG' 
        ? this.baseAct4FlagArray 
        : this.baseAct4BlockArray;

    // Physics parameters
    const flowSpeed = this.debugParams.flowSpeed;
    const radius = this.debugParams.mouseRadius;
    const radiusSq = radius * radius;
    const springK = 3.8;
    const damping = Math.pow(this.debugParams.damping, dt * 60.0);
    const tFlow = time * flowSpeed;

    // Localized disturbance parameters
    const fRepelBase = this.debugParams.mouseForce * 0.14;
    const fSwirlBase = this.debugParams.mouseSwirl * 0.18;
    const speedFactor = Math.min(Math.pow(mouseSpeed / 3.0, 0.75), 2.2);
    const impulseScale = dt * 60.0; // Strictly frame-rate independent

    // Mouse wake direction
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

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const px = this.posArray[idx];
      const py = this.posArray[idx + 1];
      const pz = this.posArray[idx + 2];

      // Interpolate narrative base target
      let tx = this.baseAct1Array[idx];
      let ty = this.baseAct1Array[idx + 1];
      let tz = this.baseAct1Array[idx + 2];

      if (tAct2 > 0) {
        tx = THREE.MathUtils.lerp(tx, this.baseAct2Array[idx], tAct2);
        ty = THREE.MathUtils.lerp(ty, this.baseAct2Array[idx + 1], tAct2);
        tz = THREE.MathUtils.lerp(tz, this.baseAct2Array[idx + 2], tAct2);
      }
      if (tAct3 > 0) {
        tx = THREE.MathUtils.lerp(tx, this.baseAct3Array[idx], tAct3);
        ty = THREE.MathUtils.lerp(ty, this.baseAct3Array[idx + 1], tAct3);
        tz = THREE.MathUtils.lerp(tz, this.baseAct3Array[idx + 2], tAct3);
      }
      if (tAct4 > 0) {
        tx = THREE.MathUtils.lerp(tx, act4Array[idx], tAct4);
        ty = THREE.MathUtils.lerp(ty, act4Array[idx + 1], tAct4);
        tz = THREE.MathUtils.lerp(tz, act4Array[idx + 2], tAct4);
      }
      if (tAct5 > 0) {
        tx = THREE.MathUtils.lerp(tx, this.baseAct5Array[idx], tAct5);
        ty = THREE.MathUtils.lerp(ty, this.baseAct5Array[idx + 1], tAct5);
        tz = THREE.MathUtils.lerp(tz, this.baseAct5Array[idx + 2], tAct5);
      }
      if (tAct6 > 0) {
        tx = THREE.MathUtils.lerp(tx, this.baseAct6Array[idx], tAct6);
        ty = THREE.MathUtils.lerp(ty, this.baseAct6Array[idx + 1], tAct6);
        tz = THREE.MathUtils.lerp(tz, this.baseAct6Array[idx + 2], tAct6);
      }

      // Continuous 3D Divergence-Free Curl Flow (Ambient evolution)
      if (!this.isReducedMotion) {
        const ph = this.phaseArray[i];
        const cx = -0.28 * Math.sin(py * 0.32 + tFlow * 1.1 + ph) - 0.32 * Math.cos(pz * 0.35 + tFlow * 1.0);
        const cy = -0.36 * Math.sin(pz * 0.38 + tFlow * 0.8) - 0.38 * Math.cos(px * 0.40 + tFlow * 0.7 + ph);
        const cz = -0.26 * Math.sin(px * 0.28 + tFlow * 0.9 + ph) - 0.30 * Math.cos(py * 0.32 + tFlow * 0.95);

        tx += cx * 0.58;
        ty += cy * 0.58;
        tz += cz * 0.58;
      }

      // Localized Pointer Disturbance (Wake vortex + Repulsion)
      // Only active when mouse is genuinely moving; distant particles untouched
      if (this.isMouseMoving && !this.isReducedMotion && p < 0.68) {
        const dx = px - this.mouseWorld.x;
        const dy = py - this.mouseWorld.y;
        const dz = (pz - this.mouseWorld.z) * 1.4;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < radiusSq) {
          const d = Math.sqrt(distSq);
          const uDist = d / radius;
          // Smooth Hermite falloff
          const w = (1.0 - uDist) * (1.0 - uDist);

          const rx = dx / (d + 0.0001);
          const ry = dy / (d + 0.0001);

          // Bilateral swirl wake
          const side = dx * wakeX + dy * wakeY;
          const sideSign = side >= 0 ? 1.0 : -1.0;

          const fRepel = fRepelBase * (0.35 + 0.65 * speedFactor);
          const fSwirl = fSwirlBase * speedFactor;

          const fx = (rx * fRepel + wakeX * sideSign * fSwirl) * w * impulseScale;
          const fy = (ry * fRepel + wakeY * sideSign * fSwirl) * w * impulseScale;
          const fz = (pz - this.mouseWorld.z) * 0.08 * fRepel * w * impulseScale;

          this.velArray[idx] += fx;
          this.velArray[idx + 1] += fy;
          this.velArray[idx + 2] += fz;
        }
      }

      // Restoring spring force towards target equilibrium
      this.velArray[idx] += (tx - px) * (springK * dt);
      this.velArray[idx + 1] += (ty - py) * (springK * dt);
      this.velArray[idx + 2] += (tz - pz) * (springK * dt);

      // Stable damping
      this.velArray[idx] *= damping;
      this.velArray[idx + 1] *= damping;
      this.velArray[idx + 2] *= damping;

      // Clamp maximum individual particle velocity to prevent explosive artifacts
      const vSq = this.velArray[idx] * this.velArray[idx] +
                  this.velArray[idx + 1] * this.velArray[idx + 1] +
                  this.velArray[idx + 2] * this.velArray[idx + 2];
      if (vSq > 24.0) {
        const vScale = 4.89 / Math.sqrt(vSq);
        this.velArray[idx] *= vScale;
        this.velArray[idx + 1] *= vScale;
        this.velArray[idx + 2] *= vScale;
      }

      this.posArray[idx] += this.velArray[idx] * (dt * 60.0);
      this.posArray[idx + 1] += this.velArray[idx + 1] * (dt * 60.0);
      this.posArray[idx + 2] += this.velArray[idx + 2] * (dt * 60.0);
    }

    this.particlesGeo.attributes.position.needsUpdate = true;
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.08);
    const time = this.clock.getElapsedTime();

    this.progress = THREE.MathUtils.lerp(this.progress, this.targetProgress, dt * 8.5);

    this.updateCamera(this.progress, dt);
    this.updateSignal(this.progress, time);
    this.updateLivingMatter(this.progress, dt, time);
    this.updateTopologyStructure(this.progress);

    this.particlesMat.uniforms.uTime.value = time;
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isDisposed = true;
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
