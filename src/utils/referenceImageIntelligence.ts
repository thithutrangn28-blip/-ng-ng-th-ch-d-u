import { ReferenceAnalysis, VisualStyleDNA, SurfaceContent, ImageInput, ReferenceRole, UserCreativeContext } from "../types";
import { executeApiProxyText } from "./apiProxy";
import { getPrimaryApiProfile } from "../lib/api-db";

// System prompt for the intelligence pipeline
const ANALYSIS_SYSTEM_PROMPT = `[SYSTEM INSTRUCTIONS — ARTISTIC INTELLIGENCE ANALYST]

Your goal is to perform a deep technical analysis of a reference image to extract its "Artistic DNA" (The HOW) while separating it from its Surface Content (The WHAT).

### PHASE 1: UNDERSTAND THE ARTISTIC DNA (THE HOW)
Analyze the technical execution using professional art terminology. Extract the "Artistic Soul" of the execution:
- **Line Quality & Strokes:** Beyond weight, analyze line tension, rhythmic tapering, and "life" in the strokes. Is it sketchy, organic, or deliberate?
- **Hair Mass Architecture:** Focus on silhouette masses, block construction vs. strands, directional flow, gravity, and geometric highlight logic. Identify the "large-medium-small" rhythm of hair masses.
- **Face & Eye Construction:** Facial stylization, iris layering, catchlight design, and the emotional "gaze" logic.
- **Coloring & Shading:** Saturation hierarchy, temperature balancing, and edge control (Hard vs. Soft vs. Lost edges).
- **Lighting & Atmosphere:** Key/Fill/Rim configuration and how light is used to lead the eye.
- **Composition & Visual Path:** Visual entry points, directional eye-paths (flow), and the logic of negative space/asymmetry.
- **Shape Rhythm:** Recurring geometric or organic motifs in the design's silhouette.

### PHASE 2: IDENTIFY SURFACE CONTENT (GROUP B - REJECT/REPLACE)
Identify specific objects and identifiers that must NOT be copied unless they exist in the target story.
- **Subjects:** Character faces, specific hairstyles, unique outfits.
- **Props & Environment:** Specific flowers, butterflies, clocks, mirrors, buildings, symbols, or logos.
- **Compositional Layouts:** High-recognition poses or exact object placements.

### PHASE 3: THE TRANSFER MAP (ACTION LOGIC)
Assign an action to every extracted feature:
- **TRANSFER:** Technical principles to be applied directly to the new character/scene.
- **ADAPT:** Visual principles (lighting/composition) that need adjustment for the new context.
- **REPLACE:** Props or backgrounds that must be swapped with items from the target STORY_CANON.
- **REJECT:** Identifiable original content that must be ignored to prevent copying.

### MANDATORY OUTPUT FORMAT:
Return a valid JSON matching the ReferenceAnalysis interface.

{
  "referenceId": "string",
  "visualStyleDNA": {
    "lineArt": { "description": "Technical analysis of strokes...", "action": "TRANSFER", "weight": "...", "edgeBehavior": "..." },
    "hair": { "description": "Technical analysis of hair masses...", "action": "TRANSFER", "silhouette": "...", "majorMasses": "..." },
    "faceAndEyes": { "description": "Technical analysis of facial features...", "action": "TRANSFER", "eyeShape": "...", "irisLayering": "..." },
    "colorSystem": { "description": "Technical analysis of color logic...", "action": "TRANSFER", "saturation": "...", "contrastLogic": "..." },
    "rendering": { "description": "Technical analysis of shading/texture...", "action": "TRANSFER", "shadingMethod": "...", "edgeControl": "..." },
    "lighting": { "description": "Technical analysis of light...", "action": "TRANSFER", "keyLight": "...", "shadowSoftness": "..." },
    "camera": { "description": "Technical analysis of camera...", "action": "TRANSFER", "angle": "...", "shotType": "..." },
    "composition": { "description": "Extract principle (e.g. negative space)...", "action": "ADAPT", "layoutType": "..." },
    "decorativeFlow": { "description": "Extract rhythm/framing logic...", "action": "ADAPT", "rhythm": "..." }
  },
  "surfaceContent": {
    "subjects": ["..."],
    "clothing": ["..."],
    "objects": ["..."],
    "environment": ["..."],
    "action": "REJECT",
    "reason": "Ensure zero leakage of original props/background into the new prompt."
  },
  "groupBItems": ["list specific items that MUST be replaced"]
}
`;

export async function analyzeReferenceImage(
  image: ImageInput
): Promise<ReferenceAnalysis> {
  const profile = await getPrimaryApiProfile();
  if (!profile) {
    throw new Error("No API Profile found. Please configure your API settings first nhen vợ yêu!");
  }

  const responseText = await executeApiProxyText(
    profile,
    [
      { role: "user", content: [
        { type: "text", text: "Analyze this image for its technical artistic principles vs surface content based on the provided system instructions." },
        { type: "image_url", image_url: { url: image.url } }
      ]}
    ],
    { systemPrompt: ANALYSIS_SYSTEM_PROMPT }
  );

  return JSON.parse(responseText);
}

// Implementation based on priorities defined in the user request
export function assignReferenceRoles(dna: VisualStyleDNA): ReferenceRole[] {
    const roles: ReferenceRole[] = [];
    if (dna.lineArt.priority === "CRITICAL") roles.push("LINE_ART");
    if (dna.hair.priority === "CRITICAL") roles.push("HAIR_RENDERING");
    if (dna.faceAndEyes.priority === "VERY_HIGH") roles.push("FACE_AND_EYES");
    if (dna.anatomy.priority === "VERY_HIGH") roles.push("ANATOMY");
    if (dna.pose.priority === "VERY_HIGH") roles.push("POSE");
    if (dna.camera.priority === "VERY_HIGH") roles.push("CAMERA");
    if (dna.composition.priority === "VERY_HIGH") roles.push("COMPOSITION");
    if (dna.colorSystem.priority === "HIGH") roles.push("COLOR");
    if (dna.rendering.priority === "HIGH") roles.push("SHADING");
    if (dna.lighting.priority === "HIGH") roles.push("LIGHTING");
    if (dna.decorativeFlow.priority === "MEDIUM") roles.push("DECORATIVE_FLOW");
    return roles;
}

export function synthesizeNewScenePrompt(input: {
  context: UserCreativeContext,
  style: VisualStyleDNA,
  surface?: SurfaceContent,
  groupB?: string[]
}): string {
    const dna = input.style;
    
    const getTransferInstruction = (category: keyof VisualStyleDNA, label: string) => {
        const item = dna[category] as any;
        if (!item || item.action === "REJECT") return "";
        
        let prefix = `[${label}] `;
        let techDescription = item.description || "";
        
        if (!techDescription) {
            techDescription = Object.entries(item)
                .filter(([k]) => k !== "priority" && k !== "action" && k !== "description" && typeof item[k] === "string")
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
        }

        if (item.action === "TRANSFER") {
            return `${prefix}Technical execution principle: ${techDescription}. Force this logic onto the target character and scene.\n`;
        } else if (item.action === "ADAPT") {
            return `${prefix}Adapt visual principle: ${techDescription}. Apply this principle using only narrative elements from STORY_CANON.\n`;
        } else if (item.action === "REPLACE") {
            return `${prefix}Maintain the visual role of "${techDescription}" but replace original props with items from STORY_CANON.\n`;
        }
        return "";
    };

    const groupBSection = input.groupB && input.groupB.length > 0 
        ? `\n[FORBIDDEN_REFERENCE_CONTENT - GROUP B]\n- The following items from the reference MUST NOT be copied (REJECT/REPLACE): ${input.groupB.join(", ")}\n`
        : "";

    return `
[STORY_CANON]
- Narrative Context: ${input.context.story}
- Current Scene: ${input.context.scene}
- Primary Interaction/Action: ${input.context.action}
- Emotional Atmosphere: ${input.context.characterEmotion}

[CHARACTER_CANON]
${input.context.characterProfile}

[REFERENCE_ARTISTIC_DNA - THE HOW-TO MANUAL]
${getTransferInstruction("lineArt", "LINE_ART_STYLE")}
${getTransferInstruction("hair", "HAIR_ARCHITECTURE")}
${getTransferInstruction("faceAndEyes", "FACIAL_STYLIZATION")}
${getTransferInstruction("anatomy", "BODY_STYLIZATION")}
${getTransferInstruction("pose", "GESTURE_DYNAMICS")}
${getTransferInstruction("camera", "CAMERA_PERSPECTIVE")}
${getTransferInstruction("composition", "VISUAL_ORGANIZATION")}
${getTransferInstruction("colorSystem", "COLOR_HARMONY_LOGIC")}
${getTransferInstruction("rendering", "SHADING_AND_TEXTURE")}
${getTransferInstruction("lighting", "LIGHTING_CONFIGURATION")}
${groupBSection}
[ART_DIRECTION_MANDATE]
1. WHAT TO DRAW: Strictly use STORY_CANON and CHARACTER_CANON.
2. HOW TO DRAW: Strictly use REFERENCE_ARTISTIC_DNA for technical execution (lines, hair masses, coloring).
3. VISUAL FLOW: Prioritize a strong visual path and eye-flow. Use story-relevant props to drive the composition and framing.
4. HAIR & LINES: Use mass-based hair construction with rhythmic stray strands. Apply organic line tension with variable tapering.
5. ANTI-COPYING: Strictly REJECT or REPLACE identified Group B items. No leakage of original props.
6. ANTI-AI-SLOP: Forbid plastic skin and sterile vector-like surfaces. Maintain edge variation and artistic texture.
7. IDENTITY LOCK: Character traits in CHARACTER_CANON are absolute.
`;
}

export function validatePrompt(score: any): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    if (score.lineArt < 0.8) errors.push("Line-art extraction is insufficient.");
    // ... complete validation logic
    return { passed: errors.length === 0, errors };
}
