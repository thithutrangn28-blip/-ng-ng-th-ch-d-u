export type Priority = "CRITICAL" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

export type ReferenceRole =
  | "MEDIUM_PRESERVATION"
  | "LINE_ART"
  | "HAIR_RENDERING"
  | "FACE_AND_EYES"
  | "ANATOMY"
  | "POSE"
  | "CAMERA"
  | "COMPOSITION"
  | "COLOR"
  | "LIGHTING"
  | "SHADING"
  | "BACKGROUND"
  | "DECORATIVE_FLOW";

export interface UserCreativeContext {
  story: string;
  scene: string;
  characterProfile: string;
  characterEmotion: string;
  action: string;
  location: string;
  outputPurpose:
    | "ILLUSTRATION"
    | "POSTER"
    | "COVER"
    | "CHARACTER_ART"
    | "SCENE_ART";
}

export interface ImageInput {
  id: string;
  url: string;
}

export interface SurfaceContent {
  subjects: string[];
  clothing: string[];
  objects: string[];
  environment: string[];
  visibleActions: string[];
  action?: "REJECT" | "REPLACE" | "ADAPT";
  reason?: string;
}

export interface VisualStyleDNA {
  medium: {
    type: "ANIME" | "REALISTIC" | "TRADITIONAL" | "3D" | "MIXED";
    preservationMandate: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "CRITICAL";
  };
  lineArt: {
    weight: string;
    sharpness: string;
    cleanliness: string;
    edgeBehavior: string;
    lineColor: string;
    pressureVariation: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "CRITICAL";
  };
  hair: {
    silhouette: string;
    majorMasses: string;
    strandDensity: string;
    lockSeparation: string;
    contourRhythm: string;
    rootAndBangsStructure: string;
    tipShape: string;
    motionDirection: string;
    gravityBehavior: string;
    highlightGeometry: string;
    shadowGrouping: string;
    texture: string;
    roleInComposition: string;
    forbiddenDefaults: string[];
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "CRITICAL";
  };
  faceAndEyes: {
    faceShape: string;
    eyeShape: string;
    upperLashDesign: string;
    lowerLashDesign: string;
    irisLayering: string;
    catchlightDesign: string;
    gazeDirection: string;
    expressionIntensity: string;
    renderingDensity: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "VERY_HIGH";
  };
  anatomy: {
    headToBodyRatio: string;
    neckLength: string;
    shoulderWidth: string;
    torsoLength: string;
    limbLength: string;
    handStyle: string;
    bodyStylization: string;
    silhouetteType: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "VERY_HIGH";
  };
  pose: {
    lineOfAction: string;
    weightDistribution: string;
    torsoTwist: string;
    shoulderHipRelationship: string;
    handGesture: string;
    legRhythm: string;
    movementEnergy: string;
    silhouetteReadability: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "VERY_HIGH";
  };
  camera: {
    angle: string;
    shotType: string;
    viewpoint: string;
    focalLengthEquivalent: string;
    cameraDistance: string;
    perspectiveStrength: string;
    tilt: string;
    subjectScaleInFrame: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "VERY_HIGH";
  };
  composition: {
    layoutType: string;
    subjectPosition: string;
    focalPoint: string;
    secondaryFocalPoints: string[];
    visualEntryPoint: string;
    eyePath: string;
    directionalFlow: string;
    foregroundFraming: string;
    midgroundStructure: string;
    backgroundStructure: string;
    negativeSpace: string;
    depthLayering: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "VERY_HIGH";
  };
  colorSystem: {
    dominantColors: string[];
    secondaryColors: string[];
    accentColors: string[];
    saturation: string;
    valueRange: string;
    temperature: string;
    contrastLogic: string;
    colorBlockingMethod: string;
    gradientBehavior: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "HIGH";
  };
  rendering: {
    shadingMethod: string;
    brushBehavior: string;
    blendingLevel: string;
    textureDensity: string;
    materialTreatment: string;
    edgeControl: string;
    realismLevel: string;
    stylizationLevel: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "HIGH";
  };
  lighting: {
    keyLight: string;
    fillLight: string;
    rimLight: string;
    shadowSoftness: string;
    bloomLevel: string;
    atmosphericLight: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "HIGH";
  };
  decorativeFlow: {
    elements: string[];
    visualFunction: string;
    direction: string;
    framingBehavior: string;
    rhythm: string;
    description?: string;
    action?: "TRANSFER" | "ADAPT" | "REPLACE" | "REJECT";
    priority: "MEDIUM";
  };
}

export interface ReferenceAnalysis {
  referenceId: string;
  surfaceContent: SurfaceContent;
  visualStyleDNA: VisualStyleDNA;
  recommendedRoles: ReferenceRole[];
  confidence: Record<ReferenceRole, number>;
  reusableStyleTraits: string[];
  nonReusableSurfaceTraits: string[];
  groupBItems?: string[]; // Specifically for items to REJECT or REPLACE
}
