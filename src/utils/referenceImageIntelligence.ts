import { ReferenceAnalysis, VisualStyleDNA, SurfaceContent, ImageInput, ReferenceRole, UserCreativeContext } from "../types";
import { executeApiProxyText } from "./apiProxy";
import { getPrimaryApiProfile } from "../lib/api-db";

// System prompt for the intelligence pipeline
const ANALYSIS_SYSTEM_PROMPT = `[SYSTEM INSTRUCTIONS — ARTISTIC INTELLIGENCE ANALYST]

Your goal is to perform a deep technical analysis of a reference image to extract its "Artistic DNA" (The HOW) while separating it from its Surface Content (The WHAT).

### COMPREHENSIVE ART INTELLIGENCE & TECHNICAL TAXONOMY DATABASE (TRÍ TUỆ HỘI HỌA CHUYÊN SÂU)
Use this technical terminology to perform the analysis. Do not use generic terms like "masterpiece", "beautiful", or "high quality". Instead, map your findings directly to these technical pillars:

1. LINE ART VÀ NÉT VẼ (Line Art & Brush Strokes):
   - Analyze thickness/weight hierarchy (faces vs. background vs. hair).
   - Evaluate line tension, rhythmic tapering (độ mảnh/dày, nhịp điệu nét), sharpness, softness, natural breaks, or organic jitters.
   - Extract the line art color (e.g., colored lineart, dark sepia, or blended) and how lines integrate with color blocks.

2. CẤU TRÚC TÓC (Hair Architecture & Volume):
   - Identify hairline position, crown height (đỉnh đầu/ngôi tóc), and skull-contour compliance.
   - Analyze hair division: Primary masses (khối chính), Secondary locks (lọn phụ), and Tertiary highlight strands (sợi nhấn).
   - Trace hair flow, gravity behavior, and wind response.
   - Classify hair material: matte, glossy, satin, cel-shaded, or painterly wash.
   - Trace light-interaction (highlight shape, width, and ring-light placement).

3. KHUÔN MẶT VÀ ĐÔI MẮT (Face & Eye Construction):
   - Assess head-turn orientation, face proportions (eyes, nose, mouth, chin, cheeks).
   - Evaluate eyelid silhouette, eyelash thickness, and eye-opening level.
   - Deconstruct iris depth (đồng tử, mống mắt, phản quang, vùng bóng).
   - Analyze how emotion/expression is constructed via eyebrows, mouth corners, head tilt, and eyes.

4. GIẢI PHẪU VÀ TỶ LỆ CƠ THỂ (Anatomy & Skeletal Proportions):
   - Measure head-to-body scale ratio (tỷ lệ đầu so với thân).
   - Assess shoulder width, torso, pelvis, and limb length.
   - Trace the line of action (đường hành động), contrapposto, weight-bearing leg, hips/shoulders tilt, and foreshortening logic under camera perspective.
   - Determine stylization tier (Realistic, Semi-realistic, Anime, Fashion, or Chibi).

5. SHADING VÀ RENDER (Shading & Material Rendering):
   - Map light, midtone, and core shadow zones (mảng sáng, trung gian, tối).
   - Classify shading technique: Cel-shading, Painterly, Gradient, or Mixed.
   - Analyze edge control (Hard edges vs. Soft edges vs. Lost-and-found edges).
   - Examine material responses (skin texture vs. cloth fold vs. metallic gloss vs. glass transparency).

6. MÀU SẮC (Color Palette & Harmony):
   - Map color harmony (Analogous, Monochromatic, Complementary, Limited Palette).
   - Measure saturation levels (controlled vs. punchy accent points) and value structure.
   - Identify shadow temperatures (warm lights/cool shadows or vice versa) and reflected ambient colors.

7. ÁNH SÁNG VÀ KHÔNG KHÍ (Lighting & Atmosphere):
   - Map the key light source, fill light, rim light, and ambient environment glow.
   - Measure bloom/glow intensity, light scattering, and volumetric rays.
   - Trace spatial separation (foreground vs. midground vs. background depth).

8. CHẤT LƯỢNG HOÀN THIỆN (Artistic Finish & Finish Quality):
   - Examine detail density distribution, edge precision, surface grain/texture, and focal points versus secondary/rest zones.

### PHASE 1: UNDERSTAND THE ARTISTIC DNA (THE HOW)
Analyze the technical execution using professional art terminology. Extract the "Artistic Soul" of the execution:
- **Medium Classification:** Determine the specific medium (Anime/Manga/Webtoon/Cel-shaded vs. Photography/Traditional Painting/3D/Mixed). PRESERVE THIS MEDIUM.
- **Line Art & Strokes:** Analyze thickness/weight hierarchy (face vs background), line tension, rhythmic tapering, color of the line art, and how it blends with color blocks (sharp vs soft vs integrated).
- **Hair Mass Architecture:** Analyze hairline, crown height, and skull contour. Focus on grouping logic: Primary (large masses), Secondary (sub-grouping), and Tertiary (stray strands/accentuation). Analyze gravity, root direction, and highlight shape/position.
- **Face & Eye Construction:** Analyze facial stylization level, eyelid shape, eyelash thickness, iris depth construction (mống mắt, đồng tử, phản quang), and how expression is built through eye/brow/lip interaction.
- **Body Proportions & Human Scale:** Measure head-to-body ratio, skeletal scale (shoulder width, limb length, torso ratio), and how anatomy changes under motion. Identify the specific stylization level of the physique.
- **Shading & Rendering Architecture:** Analyze the layering (Light/Mid/Shadow). Determine the rendering style: Cel-shaded, Painterly, Gradient, or Mixed. Analyze edge control (Hard/Soft/Lost edges) and material-specific responses (skin vs fabric vs metal vs glass).
- **Color System Logic:** Identify the color harmony, saturation hierarchy, warm/cold balance, shadow colors, and reflected light logic.
- **Lighting & Atmosphere:** Analyze key/fill/rim light configuration, bloom/glow intensity, diffusion, and how light creates depth between foreground, midground, and background.
- **Artistic Finish:** Detail density distribution (focal points vs secondary areas), edge precision, and surface texture (clean vs grit/grain).

### PHASE 2: IDENTIFY SURFACE CONTENT (GROUP B - REJECT/REPLACE)
Identify specific content items that are NOT style but instance-specific content. These MUST BE REPLACED by target story canon.
- **Subjects & Identity:** Specific character faces, unique outfit designs, unique story-world symbols.
- **Composition & Pose:** Character placement, exact framing/cropping, specific head tilts, limb positions, or unique gestures/silhouettes.
- **Camera & Perspective:** Exact camera angle, lens distance, or perspective tilt.
- **Props & Environment (THE WHAT):** Specific objects like flowers, butterflies, books, clocks, Roman numerals, mirrors, musical instruments, furniture, or architectural layouts.
- **Decorative Systems:** Specific borders, stickers, typography, symbols, pattern/ribbon clusters.

### PHASE 3: THE TRANSFER MAP (ACTION LOGIC)
Assign an action to every extracted feature:
- **TRANSFER:** Technical execution principles (lines, rendering, anatomy logic).
- **ADAPT:** Visual organization principles (lighting logic, focal depth logic) adjusted for the new scene.
- **REPLACE:** Scene elements (props/backgrounds) that must be swapped with target STORY_CANON.
- **REJECT:** Identifiable original content that must be ignored.

### MANDATORY OUTPUT FORMAT:
Return a valid JSON matching the ReferenceAnalysis interface.

{
  "referenceId": "string",
  "visualStyleDNA": {
    "medium": { "type": "ANIME", "preservationMandate": "Technical medium preservation...", "description": "Medium analysis...", "action": "TRANSFER" },
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
    if (dna.medium?.priority === "CRITICAL") roles.push("MEDIUM_PRESERVATION");
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

[REFERENCE_ARTISTIC_DNA - TECHNICAL GRAMMAR (THE HOW)]
${getTransferInstruction("medium", "MEDIUM_PRESERVATION")}
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
1. WHAT TO DRAW: Strictly use STORY_CANON and CHARACTER_CANON for all subjects, props, and backgrounds.
2. HOW TO DRAW: Strictly use REFERENCE_ARTISTIC_DNA for technical execution. Learn the craftsmanship (lines, hair masses, shading architecture) but rebuild the artwork from scratch for the new subject.
3. ANTI-COPYING: Strictly REJECT or REPLACE identified Group B items. Objects like specific flowers, mirrors, or butterflies from the reference are NOT style; they are content. REJECT them.
4. MEDIUM LOCK: Preserve the specific technical medium (Anime vs Photography/Painting) from the reference.
5. HAIR ANATOMY: Hair must follow the skull contour. Use Primary-Secondary-Tertiary grouping logic. No generic AI-inflated hair or plastic surfaces.
6. HUMAN SCALE: Maintain the head-to-body ratio and skeletal proportions from the reference DNA.
7. ORIGINAL SYNTHESIS: Create a NEW composition, NEW pose, and NEW visual rhythm based on the STORY_CANON. Do not reuse the reference's layout.
8. IDENTITY LOCK: Character traits in CHARACTER_CANON are absolute.
`;
}

export function validatePrompt(score: any): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    if (score.lineArt < 0.8) errors.push("Line-art extraction is insufficient.");
    // ... complete validation logic
    return { passed: errors.length === 0, errors };
}
