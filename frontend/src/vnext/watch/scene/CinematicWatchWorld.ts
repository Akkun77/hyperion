import * as THREE from 'three';
import { GatewayArchitecture, ConduitSystem } from './GatewayArchitectureGeometry';

export type DecisionMode = 'ALLOW' | 'FLAG' | 'BLOCK';
export type RenderMode = 'mesh' | 'particles' | 'both';

export interface CinematicWatchWorldOptions {
  container: HTMLElement;
  isReducedMotion?: boolean;
  renderMode?: RenderMode;
}

export class CinematicWatchWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private reqId: number | null = null;
  private isDisposed = false;

  // Normalized progress along the 6 scenes [0.0, 1.0]
  private progress = 0;
  private targetProgress = 0;
  private decisionMode: DecisionMode = 'ALLOW';
  private isReducedMotion = false;
  private renderMode: RenderMode = 'both';

  // -----------------------------------------------------------------
  // 3D ARCHITECTURAL STRUCTURES (GatewayArchitecture)
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

  // Structured Micro-Matter Particles (26,000 fine luminous fragments)
  private particleCount = 26000;
  private particlesGeo!: THREE.BufferGeometry;
  private particlesMat!: THREE.ShaderMaterial;
  private particlesMesh!: THREE.Points;

  // Particle Streams:
  // 0: Conduit Flow (12,000 along Ingress/Egress splines)
  // 1: Gateway Concentric Inspection Shells (10,000 concentric faceted layers)
  // 2: Evidence Branch (4,000 along Evidence spline & vault)
  private particleStream!: Uint8Array;
  private particleU!: Float32Array;
  private particleRadius!: Float32Array;
  private particleTheta!: Float32Array;
  private particleFlowSpeed!: Float32Array;
  private particlePhase!: Float32Array;

  // Particle positions & buffers
  private posArray!: Float32Array;
  private targetArray!: Float32Array;
  private sizeArray!: Float32Array;
  private colorArray!: Float32Array;
  private baseAlphaArray!: Float32Array;

  // -----------------------------------------------------------------
  // 3D PROTAGONIST REQUEST SIGNAL ENTITY
  // -----------------------------------------------------------------
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

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private gatewayCoreLight!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight;

  // Cinematic Camera Waypoints across the 6 narrative stages:
  // Stage 0: Client Origin overview
  // Stage 1: Conduit Transit tracking
  // Stage 2: Gateway Arrival inspection boundary
  // Stage 3: Policy Decision Evaluation inside core
  // Stage 4: Upstream API Delivery citadel
  // Stage 5: Evidence Dossier Vault
  // Cinematic Camera Waypoints across the narrative journey:
  // Stage 0: Establishing Wide Shot showing full architecture (Client -> Gateway -> Upstream)
  // Stage 1: Client Origin tracking & Ingress emergence
  // Stage 2: Conduit Transit following request
  // Stage 3: Gateway Core arrival and policy evaluation
  // Stage 4: Upstream API Delivery citadel
  // Stage 5: Evidence Dossier Vault & persistent trace
  private cameraWaypoints = [
    { p: 0.00, pos: new THREE.Vector3(1.5, 1.4, 13.5), look: new THREE.Vector3(1.8, -0.2, -1.8), fov: 48 },
    { p: 0.16, pos: new THREE.Vector3(-3.8, 0.6, 9.5),  look: new THREE.Vector3(-5.2, -0.8, 0.5),  fov: 44 },
    { p: 0.35, pos: new THREE.Vector3(-0.8, 1.0, 8.4),  look: new THREE.Vector3(0.5, -0.2, 0.0),   fov: 45 },
    { p: 0.55, pos: new THREE.Vector3(2.8, 1.2, 6.8),   look: new THREE.Vector3(2.8, 0.2, -0.2),  fov: 47 },
    { p: 0.78, pos: new THREE.Vector3(6.8, 1.6, 6.5),   look: new THREE.Vector3(9.0, 0.8, -4.0),  fov: 45 },
    { p: 1.00, pos: new THREE.Vector3(3.6, -1.4, 7.2),  look: new THREE.Vector3(3.6, -3.6, 1.2),  fov: 44 },
  ];

  constructor(options: CinematicWatchWorldOptions) {
    this.container = options.container;
    this.isReducedMotion = !!options.isReducedMotion;
    if (options.renderMode) {
      this.renderMode = options.renderMode;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07080A');
    this.scene.fog = new THREE.FogExp2('#07080A', 0.024);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
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
    this.renderer.toneMappingExposure = 1.30;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initLights();
    this.initArchitecture();
    this.initStructuredParticles();
    this.initSignalProtagonist();

    this.updateVisibilityMode();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight('#080A0E', 0.8);
    this.scene.add(this.ambientLight);

    // Key Light
    this.keyLight = new THREE.DirectionalLight('#FFFFFF', 3.8);
    this.keyLight.position.set(15, 18, 14);
    this.scene.add(this.keyLight);

    // Cool Rim Light
    this.rimLight = new THREE.DirectionalLight('#DDE4EC', 4.5);
    this.rimLight.position.set(-16, 12, -14);
    this.scene.add(this.rimLight);

    // Fill Light
    this.fillLight = new THREE.DirectionalLight('#15181E', 0.8);
    this.fillLight.position.set(2, -12, 6);
    this.scene.add(this.fillLight);

    // Gateway Core Interior Light
    this.gatewayCoreLight = new THREE.PointLight('#EDF1F7', 3.2, 9.0, 2.0);
    this.gatewayCoreLight.position.copy(GatewayArchitecture.GATEWAY_POS);
    this.scene.add(this.gatewayCoreLight);
  }

  private initArchitecture(): void {
    this.conduits = GatewayArchitecture.createConduitSystem();

    // 1. Client Origin Terminal (Left)
    this.clientTerminal = GatewayArchitecture.createClientTerminal();
    this.architectureMeshGroup.add(this.clientTerminal);

    // 2. Gateway Core with 8-sided faceted armor shells, cooling vanes & sensor rings (Center)
    this.gatewayComponents = GatewayArchitecture.createGatewayCore();
    this.architectureMeshGroup.add(this.gatewayComponents.coreGroup);

    // 3. Protected Upstream API Citadel (Right Deep Space)
    this.protectedApi = GatewayArchitecture.createProtectedApi();
    this.architectureMeshGroup.add(this.protectedApi);

    // 4. Evidence Field with gyroscopic gimbals and crystal vault (Lower Branch)
    this.evidenceComponents = GatewayArchitecture.createEvidenceField();
    this.architectureMeshGroup.add(this.evidenceComponents.fieldGroup);

    // 5. Conduit Guide Lines & Transit Rings
    this.conduitVisuals = GatewayArchitecture.createConduitVisuals(this.conduits);
    this.architectureMeshGroup.add(this.conduitVisuals);

    this.scene.add(this.architectureMeshGroup);
  }

  private initStructuredParticles(): void {
    this.posArray = new Float32Array(this.particleCount * 3);
    this.targetArray = new Float32Array(this.particleCount * 3);

    this.particleStream = new Uint8Array(this.particleCount);
    this.particleU = new Float32Array(this.particleCount);
    this.particleRadius = new Float32Array(this.particleCount);
    this.particleTheta = new Float32Array(this.particleCount);
    this.particleFlowSpeed = new Float32Array(this.particleCount);
    this.particlePhase = new Float32Array(this.particleCount);

    this.sizeArray = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.baseAlphaArray = new Float32Array(this.particleCount);

    const cPearl = new THREE.Color('#FFFFFF');
    const cSilver = new THREE.Color('#C8D0DC');
    const cTitanium = new THREE.Color('#788292');
    const cGraphite = new THREE.Color('#2C3038');

    const tempTarget = new THREE.Vector3();

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Assign particle stream:
      // Stream 0 (46%): Conduit Transit (Ingress & Egress splines)
      // Stream 1 (38%): Gateway Concentric Inspection Shells & Aperture
      // Stream 2 (16%): Evidence Branch & Forensic Vault
      const dice = Math.random();
      const streamIdx = dice < 0.46 ? 0 : dice < 0.84 ? 1 : 2;
      this.particleStream[i] = streamIdx;

      this.particleU[i] = Math.random();
      this.particlePhase[i] = Math.random() * Math.PI * 2;
      this.particleTheta[i] = Math.random() * Math.PI * 2;

      if (streamIdx === 0) {
        // Conduit stream: tight cylindrical envelope around splines
        this.particleRadius[i] = 0.08 + Math.random() * 0.32;
        this.particleFlowSpeed[i] = 0.045 + Math.random() * 0.035;
      } else if (streamIdx === 1) {
        // Gateway shells: 3 concentric radii
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
        // Evidence branch
        this.particleRadius[i] = 0.06 + Math.random() * 0.28;
        this.particleFlowSpeed[i] = 0.035 + Math.random() * 0.03;
      }

      this.calculateBaseAnchor(i, tempTarget);

      this.posArray[idx] = tempTarget.x;
      this.posArray[idx + 1] = tempTarget.y;
      this.posArray[idx + 2] = tempTarget.z;

      this.targetArray[idx] = tempTarget.x;
      this.targetArray[idx + 1] = tempTarget.y;
      this.targetArray[idx + 2] = tempTarget.z;

      // Color and size assignment
      const colorDice = Math.random();
      let chosenColor: THREE.Color;
      let pSize: number;
      let pAlpha: number;

      if (colorDice < 0.22) {
        chosenColor = cGraphite;
        pSize = 0.07 + Math.random() * 0.03;
        pAlpha = 0.50 + Math.random() * 0.15;
      } else if (colorDice < 0.65) {
        chosenColor = cTitanium;
        pSize = 0.11 + Math.random() * 0.04;
        pAlpha = 0.75 + Math.random() * 0.15;
      } else if (colorDice < 0.88) {
        chosenColor = cSilver;
        pSize = 0.16 + Math.random() * 0.05;
        pAlpha = 0.90;
      } else {
        chosenColor = cPearl;
        pSize = 0.24 + Math.random() * 0.08;
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

    this.particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uKeyLightDir: { value: new THREE.Vector3(0.55, 0.72, 0.52).normalize() },
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
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDepth = -mvPosition.z;
          float pSize = aSize * (260.0 / max(vDepth, 1.0));
          gl_PointSize = clamp(pSize, 1.5, 10.0);

          float depthFade = clamp(1.15 - (vDepth / 36.0), 0.15, 1.0);
          vAlpha = aAlpha * depthFade;
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

          float zNorm = sqrt(max(0.0, 0.25 - rSq)) * 2.0;
          vec3 normal = normalize(vec3(uv * 2.0, zNorm));
          float diffuse = max(0.0, dot(normal, uKeyLightDir));
          float rim = pow(1.0 - max(0.0, normal.z), 2.2);

          vec3 litColor = vColor * (0.35 + 0.65 * diffuse) + vec3(0.96, 0.98, 1.0) * (rim * 0.45);
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

  private calculateBaseAnchor(i: number, target: THREE.Vector3): void {
    const stream = this.particleStream[i];
    const u = this.particleU[i];
    const r = this.particleRadius[i];
    const theta = this.particleTheta[i];

    if (stream === 0) {
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

      let up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.dot(up)) > 0.88) up.set(1, 0, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      target.copy(spineP);
      target.addScaledVector(normal, Math.cos(theta) * r);
      target.addScaledVector(binormal, Math.sin(theta) * r);
    } else if (stream === 1) {
      const coreCenter = GatewayArchitecture.GATEWAY_POS;
      const zOffset = (u - 0.5) * 1.8;
      target.set(
        coreCenter.x + Math.cos(theta) * r,
        coreCenter.y + Math.sin(theta) * r,
        coreCenter.z + zOffset
      );
    } else {
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
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#FFFFFF'),
      transparent: true,
      opacity: 1.0,
    });
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

    // Dynamic Trail
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

  public getDecisionMode(): DecisionMode {
    return this.decisionMode;
  }

  public getSignalScreenPosition(): { x: number; y: number } {
    const vector = this.signalGroup.position.clone();
    vector.project(this.camera);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    return {
      x: (vector.x * 0.5 + 0.5) * width,
      y: (-(vector.y * 0.5) + 0.5) * height,
    };
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

    // Responsive adaptation for mobile viewports
    if (this.camera.aspect < 1.0) {
      targetPos.z *= 1.45;
      targetPos.x *= 0.45;
    }

    this.camera.position.lerp(targetPos, dt * 8.0);
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(targetLook);
  }

  /**
   * Updates the 3D Protagonist Request Entity across the 6 Storyboard Scenes:
   * Scene 1 (p in [0.00, 0.16]): Client origin pulse
   * Scene 2 (p in [0.16, 0.33]): Ingress spline transit to Gateway :8000
   * Scene 3 (p in [0.33, 0.50]): Gateway core inspection boundary
   * Scene 4 (p in [0.50, 0.68]): Decision evaluation (ALLOW emerald, FLAG amber + branch, BLOCK ruby arrest)
   * Scene 5 (p in [0.68, 0.85]): Upstream API Citadel delivery (:8001)
   * Scene 6 (p in [0.85, 1.00]): Evidence Dossier vault commit
   */
  private updateSignal(p: number, time: number): void {
    const signalPos = new THREE.Vector3();
    let opacity = 0;
    let lightIntensity = 0;
    const auraColor = new THREE.Color('#BFC3C7');

    const clientOrigin = GatewayArchitecture.CLIENT_POS.clone().add(new THREE.Vector3(0.9, 0, 0));
    const gatewayTarget = GatewayArchitecture.GATEWAY_POS;

    if (p < 0.16) {
      // Scene 1: Client Ingress origin pulse
      signalPos.copy(clientOrigin);
      opacity = 0.5 + 0.5 * Math.sin(time * 6.0);
      lightIntensity = 2.4;
      auraColor.set('#EDF1F7');
    } else if (p < 0.33) {
      // Scene 2: Gliding along Ingress Spline to Gateway :8000
      const t = (p - 0.16) / 0.17;
      const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
      const splineP = this.conduits.ingressSpline.getPointAt(smoothT);
      signalPos.copy(splineP);
      opacity = 1.0;
      lightIntensity = 3.2;
      auraColor.set('#EDF1F7');
    } else if (p < 0.50) {
      // Scene 3: Gateway Core Threshold Impact & Policy Evaluation
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
      // Scene 4: Decision Outcomes (ALLOW / FLAG / BLOCK)
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

        this.evidenceSignalGroup.visible = true;
        const evP = this.conduits.evidenceSpline.getPointAt(smoothT);
        this.evidenceSignalGroup.position.copy(evP);
      } else {
        // BLOCK: Arrested and isolated at Gateway perimeter; 0 signal passes to upstream
        auraColor.set('#EB7777');
        signalPos.copy(gatewayTarget);
        opacity = Math.max(0, 1.0 - smoothT * 1.6);
        lightIntensity = Math.max(0, 3.5 - smoothT * 3.5);
        this.evidenceSignalGroup.visible = false;
      }
    } else if (p < 0.85) {
      // Scene 5: Upstream API Delivery (:8001)
      if (this.decisionMode === 'BLOCK') {
        // BLOCK isolates upstream completely
        opacity = 0;
        lightIntensity = 0;
      } else {
        const t = (p - 0.68) / 0.17;
        const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
        const egressEnd = this.conduits.egressSpline.getPointAt(1.0);
        signalPos.lerpVectors(egressEnd, GatewayArchitecture.UPSTREAM_POS, smoothT);
        opacity = 1.0 - smoothT * 0.4;
        lightIntensity = 2.8;
        auraColor.set(this.decisionMode === 'FLAG' ? '#E9B969' : '#53CE9A');
      }
    } else {
      // Scene 6: Evidence Field commit
      signalPos.copy(GatewayArchitecture.EVIDENCE_POS);
      opacity = 0.85;
      lightIntensity = 2.5;
      auraColor.set('#C8D0DC');
    }

    this.signalGroup.position.copy(signalPos);
    this.signalGroup.visible = opacity > 0.02;
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
  }

  private updateLivingEnvironment(dt: number, time: number): void {
    // 1. Structural Breathing of Gateway shells
    const breathe = Math.sin(time * 0.8);
    this.gatewayComponents.outerShell.scale.set(
      1.0 + breathe * 0.015,
      1.0 + breathe * 0.015,
      1.0 + breathe * 0.01
    );
    this.gatewayComponents.midRing.rotation.z = time * 0.12;

    // 2. Gyroscopic Rotation of Evidence Vault Gimbals & Crystal
    this.evidenceComponents.gimbalOuter.rotation.y = time * 0.35;
    this.evidenceComponents.gimbalInner.rotation.x = time * 0.50;
    this.evidenceComponents.vaultCrystal.rotation.y = time * 0.80;
    this.evidenceComponents.vaultCrystal.rotation.z = time * 0.60;

    // 3. Sensor Ring Pulsing inside gateway conduit
    this.gatewayComponents.sensorRings.forEach((ring, idx) => {
      const ringPulse = Math.sin(time * 3.0 + idx * 0.8) * 0.5 + 0.5;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + ringPulse * 0.5;
    });

    // 4. Structured Particle Streaming along conduits, shells, and evidence artery
    const tempPt = new THREE.Vector3();
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.particleU[i] += this.particleFlowSpeed[i] * dt;
      if (this.particleU[i] > 1.0) this.particleU[i] -= 1.0;
      if (this.particleU[i] < 0.0) this.particleU[i] += 1.0;

      this.calculateBaseAnchor(i, tempPt);
      this.posArray[idx] = tempPt.x;
      this.posArray[idx + 1] = tempPt.y;
      this.posArray[idx + 2] = tempPt.z;
    }
    this.particlesGeo.attributes.position.needsUpdate = true;
  }

  private animate = (): void => {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    const lerpSpeed = this.isReducedMotion ? 1.0 : 0.085;
    this.progress = THREE.MathUtils.lerp(this.progress, this.targetProgress, lerpSpeed);

    this.updateCamera(this.progress, dt);
    this.updateSignal(this.progress, time);
    this.updateLivingEnvironment(dt, time);

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

    if (this.renderer && this.renderer.domElement) {
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}
