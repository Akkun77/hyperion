import * as THREE from 'three';

/**
 * ARCHITECTURAL SCENE GEOMETRY FOR HYPERION: INSIDE THE REQUEST
 * 
 * Implements the 4 physical regions from the definitive networking blueprint:
 * 1. CLIENT INGRESS (Left origin terminal hub)
 * 2. INSPECTION CORE (Monumental multi-layered faceted gateway with concentric shells)
 * 3. PROTECTED UPSTREAM API (Architectural destination citadel in deep space)
 * 4. EVIDENCE FIELD (Branching forensic repository anchored below the gateway)
 */

export interface ConduitSystem {
  ingressSpline: THREE.CatmullRomCurve3;
  egressSpline: THREE.CatmullRomCurve3;
  evidenceSpline: THREE.CatmullRomCurve3;
}

export class GatewayArchitecture {
  // Spatial coordinates tuned to maintain 100% clean dark space on the left for hero text
  public static readonly CLIENT_POS = new THREE.Vector3(-6.8, -1.2, 0.6);
  public static readonly GATEWAY_POS = new THREE.Vector3(2.8, 0.2, -0.2);
  public static readonly UPSTREAM_POS = new THREE.Vector3(9.4, 0.8, -4.5);
  public static readonly EVIDENCE_POS = new THREE.Vector3(3.6, -3.8, 1.2);

  /**
   * Builds the 3 primary continuous transit splines connecting the system.
   */
  public static createConduitSystem(): ConduitSystem {
    // 1. Client Ingress -> Gateway Core (curving down gracefully to keep upper left dark)
    const ingressPoints = [
      GatewayArchitecture.CLIENT_POS.clone().add(new THREE.Vector3(0.9, 0.0, 0.0)),
      new THREE.Vector3(-4.8, -2.4, 0.4),
      new THREE.Vector3(-2.2, -2.0, 0.2),
      new THREE.Vector3(0.2, -0.8, 0.0),
      GatewayArchitecture.GATEWAY_POS.clone(),
    ];
    const ingressSpline = new THREE.CatmullRomCurve3(ingressPoints, false, 'centripetal', 0.5);

    // 2. Gateway Core -> Protected Upstream API
    const egressPoints = [
      GatewayArchitecture.GATEWAY_POS.clone(),
      new THREE.Vector3(4.8, 0.35, -1.4),
      new THREE.Vector3(6.8, 0.55, -2.8),
      new THREE.Vector3(8.2, 0.70, -3.8),
      GatewayArchitecture.UPSTREAM_POS.clone().add(new THREE.Vector3(-1.0, 0.0, 0.0)),
    ];
    const egressSpline = new THREE.CatmullRomCurve3(egressPoints, false, 'centripetal', 0.5);

    // 3. Gateway Core -> Evidence Repository Branch
    const evidencePoints = [
      GatewayArchitecture.GATEWAY_POS.clone().add(new THREE.Vector3(0.2, -1.0, 0.1)),
      new THREE.Vector3(3.0, -2.0, 0.5),
      new THREE.Vector3(3.3, -2.9, 0.9),
      GatewayArchitecture.EVIDENCE_POS.clone().add(new THREE.Vector3(0.0, 0.6, 0.0)),
    ];
    const evidenceSpline = new THREE.CatmullRomCurve3(evidencePoints, false, 'centripetal', 0.5);

    return { ingressSpline, egressSpline, evidenceSpline };
  }

  /**
   * Region 1: Client Ingress Terminal Chassis
   */
  public static createClientTerminal(): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(GatewayArchitecture.CLIENT_POS);

    // Palette materials
    const graphiteMat = new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.65,
      metalness: 0.35,
    });
    const satinSilverMat = new THREE.MeshStandardMaterial({
      color: 0xa8b0bc,
      roughness: 0.32,
      metalness: 0.85,
    });
    const darkFaceMat = new THREE.MeshBasicMaterial({
      color: 0x090b0e,
    });
    const pipGlowMat = new THREE.MeshBasicMaterial({
      color: 0x53ce9a,
    });

    // 1. Main chamfered chassis body
    const chassisGeo = new THREE.BoxGeometry(2.0, 1.8, 1.0);
    const chassis = new THREE.Mesh(chassisGeo, graphiteMat);
    group.add(chassis);

    // 2. Satin silver perimeter frame
    const frameGeo = new THREE.BoxGeometry(2.06, 1.86, 0.1);
    const frame = new THREE.Mesh(frameGeo, satinSilverMat);
    frame.position.set(0, 0, 0.46);
    group.add(frame);

    // 3. Recessed dark display face
    const faceGeo = new THREE.PlaneGeometry(1.75, 1.55);
    const face = new THREE.Mesh(faceGeo, darkFaceMat);
    face.position.set(0, 0, 0.52);
    group.add(face);

    // 4. Status Indicator Pip & Bezel
    const pipGeo = new THREE.CircleGeometry(0.08, 16);
    const pip = new THREE.Mesh(pipGeo, pipGlowMat);
    pip.position.set(-0.65, 0.55, 0.53);
    group.add(pip);

    // 5. Ingress Conduit Connector Nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 16);
    nozzleGeo.rotateZ(-Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, satinSilverMat);
    nozzle.position.set(1.12, 0, 0);
    group.add(nozzle);

    // 6. Architectural Accent Fins (stacked cooling vanes)
    for (let i = 0; i < 4; i++) {
      const finGeo = new THREE.BoxGeometry(1.6, 0.04, 0.6);
      const fin = new THREE.Mesh(finGeo, satinSilverMat);
      fin.position.set(0, -0.65 + i * 0.18, 0);
      group.add(fin);
    }

    return group;
  }

  /**
   * Region 2: Monumental Multi-Layered Faceted Inspection Core (Gateway)
   * 
   * Features:
   * - Outer faceted 8-sided titanium/graphite armor shell
   * - Intermediate concentric protective ring with radial cooling vanes
   * - Inner aperture conduit forming the dark central inspection chamber
   * - Radial structural struts
   */
  public static createGatewayCore(): {
    coreGroup: THREE.Group;
    outerShell: THREE.Mesh;
    midRing: THREE.Mesh;
    innerAperture: THREE.Mesh;
    struts: THREE.Group;
    sensorRings: THREE.Mesh[];
  } {
    const coreGroup = new THREE.Group();
    coreGroup.position.copy(GatewayArchitecture.GATEWAY_POS);

    // High-spec architectural materials
    const outerArmorMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.45,
      metalness: 0.70,
      side: THREE.DoubleSide,
    });
    const satinSilverMat = new THREE.MeshStandardMaterial({
      color: 0xb4bcc8,
      roughness: 0.28,
      metalness: 0.90,
      side: THREE.DoubleSide,
    });
    const darkCavityMat = new THREE.MeshBasicMaterial({
      color: 0x050608,
      side: THREE.BackSide,
    });
    const sensorGlowMat = new THREE.MeshBasicMaterial({
      color: 0xdce4ed,
      wireframe: false,
    });

    // 1. Outer Faceted 8-Sided Armor Shell (Concentric outer layer)
    const outerGeo = new THREE.CylinderGeometry(3.4, 3.4, 1.8, 8, 1, true);
    outerGeo.rotateX(Math.PI / 2);
    const outerShell = new THREE.Mesh(outerGeo, outerArmorMat);
    coreGroup.add(outerShell);

    // Outer shell beveled rim accents
    const outerFrontRimGeo = new THREE.TorusGeometry(3.42, 0.08, 8, 8);
    const outerFrontRim = new THREE.Mesh(outerFrontRimGeo, satinSilverMat);
    outerFrontRim.position.set(0, 0, 0.9);
    coreGroup.add(outerFrontRim);

    const outerBackRim = new THREE.Mesh(outerFrontRimGeo, satinSilverMat);
    outerBackRim.position.set(0, 0, -0.9);
    coreGroup.add(outerBackRim);

    // 2. Intermediate Concentric Protective Tier
    const midGeo = new THREE.CylinderGeometry(2.35, 2.35, 1.4, 12, 1, true);
    midGeo.rotateX(Math.PI / 2);
    const midRing = new THREE.Mesh(midGeo, satinSilverMat);
    coreGroup.add(midRing);

    // Cooling vanes between outer shell and mid ring
    const vaneCount = 8;
    for (let i = 0; i < vaneCount; i++) {
      const angle = (i / vaneCount) * Math.PI * 2;
      const vaneGeo = new THREE.BoxGeometry(0.9, 0.04, 1.2);
      const vane = new THREE.Mesh(vaneGeo, satinSilverMat);
      const r = 2.85;
      vane.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      vane.rotation.z = angle + 0.3;
      coreGroup.add(vane);
    }

    // 3. Inner Aperture / Inspection Conduit (Dark Central Passage)
    const innerGeo = new THREE.CylinderGeometry(1.42, 1.42, 2.6, 24, 1, true);
    innerGeo.rotateX(Math.PI / 2);
    const innerAperture = new THREE.Mesh(innerGeo, darkCavityMat);
    coreGroup.add(innerAperture);

    // 4. Concentric Inspection Sensor Rings along the inner conduit
    const sensorRings: THREE.Mesh[] = [];
    const ringZPositions = [-0.9, -0.3, 0.3, 0.9];
    for (const zPos of ringZPositions) {
      const ringGeo = new THREE.TorusGeometry(1.44, 0.035, 8, 32);
      const ring = new THREE.Mesh(ringGeo, sensorGlowMat);
      ring.position.set(0, 0, zPos);
      coreGroup.add(ring);
      sensorRings.push(ring);
    }

    // 5. Radial Structural Struts bridging Inner Aperture to Outer Shell
    const struts = new THREE.Group();
    const strutCount = 4;
    for (let i = 0; i < strutCount; i++) {
      const angle = (i / strutCount) * Math.PI * 2 + Math.PI / 4;
      const strutGeo = new THREE.BoxGeometry(1.8, 0.08, 0.25);
      const strut = new THREE.Mesh(strutGeo, satinSilverMat);
      const r = 2.35;
      strut.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      strut.rotation.z = angle;
      struts.add(strut);
    }
    coreGroup.add(struts);

    return {
      coreGroup,
      outerShell,
      midRing,
      innerAperture,
      struts,
      sensorRings,
    };
  }

  /**
   * Region 3: Protected Upstream API Citadel (Destination Port :8001 in Deep Space)
   */
  public static createProtectedApi(): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(GatewayArchitecture.UPSTREAM_POS);

    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x121418,
      roughness: 0.50,
      metalness: 0.60,
    });
    const silverBevelMat = new THREE.MeshStandardMaterial({
      color: 0xa2aab6,
      roughness: 0.30,
      metalness: 0.85,
    });
    const coreSlitMat = new THREE.MeshBasicMaterial({
      color: 0x82b4ea,
    });

    // 1. Central Citadel Monolith
    const pylonMainGeo = new THREE.BoxGeometry(2.4, 3.2, 1.8);
    const pylonMain = new THREE.Mesh(pylonMainGeo, darkTitaniumMat);
    group.add(pylonMain);

    // 2. Tapered Wing Pylons
    const wingLeftGeo = new THREE.BoxGeometry(1.2, 2.2, 1.4);
    const wingLeft = new THREE.Mesh(wingLeftGeo, darkTitaniumMat);
    wingLeft.position.set(-1.8, -0.4, -0.2);
    group.add(wingLeft);

    const wingRightGeo = new THREE.BoxGeometry(1.2, 2.2, 1.4);
    const wingRight = new THREE.Mesh(wingRightGeo, darkTitaniumMat);
    wingRight.position.set(1.8, -0.4, -0.2);
    group.add(wingRight);

    // 3. Beveled Silver Facets
    const facetGeo = new THREE.BoxGeometry(2.44, 0.06, 1.84);
    for (let i = 0; i < 5; i++) {
      const facet = new THREE.Mesh(facetGeo, silverBevelMat);
      facet.position.set(0, -1.2 + i * 0.6, 0);
      group.add(facet);
    }

    // 4. Horizontal Glowing Data Slits
    for (let i = 0; i < 3; i++) {
      const slitGeo = new THREE.PlaneGeometry(1.8, 0.06);
      const slit = new THREE.Mesh(slitGeo, coreSlitMat);
      slit.position.set(0, -0.4 + i * 0.45, 0.91);
      group.add(slit);
    }

    // 5. Inbound Receptor Nozzle
    const receptorGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.5, 16);
    receptorGeo.rotateZ(Math.PI / 2);
    const receptor = new THREE.Mesh(receptorGeo, silverBevelMat);
    receptor.position.set(-1.35, 0, 0);
    group.add(receptor);

    return group;
  }

  /**
   * Region 4: Evidence Field & Forensic Repository
   */
  public static createEvidenceField(): {
    fieldGroup: THREE.Group;
    gimbalOuter: THREE.Mesh;
    gimbalInner: THREE.Mesh;
    vaultCrystal: THREE.Mesh;
  } {
    const fieldGroup = new THREE.Group();
    fieldGroup.position.copy(GatewayArchitecture.EVIDENCE_POS);

    const satinSilverMat = new THREE.MeshStandardMaterial({
      color: 0xadb5c2,
      roughness: 0.30,
      metalness: 0.85,
    });
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6eef8,
      roughness: 0.15,
      metalness: 0.20,
      transmission: 0.65,
      thickness: 0.8,
      reflectivity: 0.9,
    });

    // 1. Gyroscopic Outer Gimbal Ring
    const outerGimbalGeo = new THREE.TorusGeometry(1.5, 0.05, 12, 32);
    const gimbalOuter = new THREE.Mesh(outerGimbalGeo, satinSilverMat);
    fieldGroup.add(gimbalOuter);

    // 2. Gyroscopic Inner Gimbal Ring
    const innerGimbalGeo = new THREE.TorusGeometry(1.15, 0.04, 12, 32);
    innerGimbalGeo.rotateX(Math.PI / 3);
    const gimbalInner = new THREE.Mesh(innerGimbalGeo, satinSilverMat);
    fieldGroup.add(gimbalInner);

    // 3. Central Faceted Evidence Crystal Vault
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const vaultCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    fieldGroup.add(vaultCrystal);

    // 4. Orbiting Telemetry Rings
    const orbitGeo = new THREE.RingGeometry(1.8, 1.82, 32);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x5a6370,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const orbit = new THREE.Mesh(orbitGeo, orbitMat);
    orbit.rotation.x = Math.PI / 2.5;
    fieldGroup.add(orbit);

    return { fieldGroup, gimbalOuter, gimbalInner, vaultCrystal };
  }

  /**
   * Visual Conduit Guide Lines and Highway Beacons
   */
  public static createConduitVisuals(conduits: ConduitSystem): THREE.Group {
    const group = new THREE.Group();

    const guideLineMat = new THREE.LineBasicMaterial({
      color: 0x3d4450,
      transparent: true,
      opacity: 0.45,
    });
    const evidenceGuideMat = new THREE.LineDashedMaterial({
      color: 0x768294,
      dashSize: 0.25,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.65,
    });

    // 1. Ingress Guide Line
    const ingressPoints = conduits.ingressSpline.getPoints(64);
    const ingressGeo = new THREE.BufferGeometry().setFromPoints(ingressPoints);
    const ingressLine = new THREE.Line(ingressGeo, guideLineMat);
    group.add(ingressLine);

    // 2. Egress Guide Line
    const egressPoints = conduits.egressSpline.getPoints(64);
    const egressGeo = new THREE.BufferGeometry().setFromPoints(egressPoints);
    const egressLine = new THREE.Line(egressGeo, guideLineMat);
    group.add(egressLine);

    // 3. Evidence Dashed Guide Line
    const evidencePoints = conduits.evidenceSpline.getPoints(48);
    const evidenceGeo = new THREE.BufferGeometry().setFromPoints(evidencePoints);
    const evidenceLine = new THREE.Line(evidenceGeo, evidenceGuideMat);
    evidenceLine.computeLineDistances();
    group.add(evidenceLine);

    // 4. Intermediate Transit Rings along Ingress
    const ringGeo = new THREE.TorusGeometry(0.42, 0.018, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4e5868,
      transparent: true,
      opacity: 0.4,
    });

    const ingressRingParams = [0.25, 0.50, 0.75];
    for (const u of ingressRingParams) {
      const p = conduits.ingressSpline.getPointAt(u);
      const tangent = conduits.ingressSpline.getTangentAt(u).normalize();
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(p);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      group.add(ring);
    }

    // 5. Intermediate Transit Rings along Egress
    const egressRingParams = [0.3, 0.65];
    for (const u of egressRingParams) {
      const p = conduits.egressSpline.getPointAt(u);
      const tangent = conduits.egressSpline.getTangentAt(u).normalize();
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(p);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      group.add(ring);
    }

    return group;
  }
}
