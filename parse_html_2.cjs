const fs = require('fs');
const html = fs.readFileSync('data.html', 'utf8');
const regex = /<span class="badge">PHÒNG (\d+)<\/span>([^<]+)<\/h2>[\s\S]*?data-copy="([^"]+)"/g;
let match;
const rooms = [];

const KEY_MAPPING = {
  "23": "prompt_architecture_hybrid",
  "24": "conflict_resolution_hierarchy",
  "25": "player_autonomy_audit",
  "26": "scene_stop_gate",
  "27": "npc_autonomy_anti_pandering",
  "28": "relationship_step_evidence",
  "29": "character_anchoring_drift",
  "30": "voice_fingerprint",
  "31": "knowledge_stratification",
  "32": "anti_cliche_forced_tropes",
  "33": "world_autonomy_no_main_center",
  "34": "fair_judgment_no_plot_armor",
  "35": "true_randomness_logic_separation",
  "36": "proportional_consequences",
  "37": "power_scaling_resource_management",
  "38": "mystery_ground_truth",
  "39": "peaceful_pacing_anti_drama",
  "40": "functional_prose_anti_loop",
  "41": "pacing_adjustment_casual_dialogue",
  "42": "rolling_summary_dual_mode",
  "43": "canon_ledger_anti_fabrication",
  "44": "spatial_temporal_continuity",
  "45": "combat_space_resources",
  "46": "auxiliary_system_limits",
  "47": "canon_error_recovery",
  "48": "prompt_length_optimization",
  "49": "platform_capability_fallback",
  "50": "final_audit_coverage_matrix"
};

while ((match = regex.exec(html)) !== null) {
  const roomNum = match[1];
  const title = match[2];
  const copyData = match[3];
  
  let unescaped = copyData.replace(/\\u([0-9a-fA-F]{4})/g, (m, c) => String.fromCharCode(parseInt(c, 16))).replace(/\\n/g, '\n');
  const parts = unescaped.split('\n\n');
  const purpose = parts[1] ? parts[1].replace(/\n/g, ' ') : '';
  
  const key = KEY_MAPPING[roomNum];
  const shortCode = 'RM' + roomNum;
  
  rooms.push({ roomNum, key, title, purpose, shortCode });
}

console.log("MAP_SHORT_TO_LONG additions:");
let mapStr = "";
rooms.forEach(r => {
  mapStr += `  ${r.shortCode}: "${r.key}",\n`;
});
console.log(mapStr);

console.log("\nROOM_META_INFO additions:");
let metaStr = "";
rooms.forEach(r => {
  metaStr += `  ${r.key}: { title: ${JSON.stringify(r.title)}, purpose: ${JSON.stringify(r.purpose.substring(0, 150) + "...")} },\n`;
});
console.log(metaStr);

console.log("\nROOM_NAMES additions:");
let nameStr = "";
rooms.forEach(r => {
  nameStr += `  ${r.key}: ${JSON.stringify(r.title)},\n`;
});
console.log(nameStr);
