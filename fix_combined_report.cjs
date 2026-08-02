const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const targetStr = `              negConstraints ? \`[NEGATIVE_CONSTRAINTS]\\n\${negConstraints}\` : ""
          ].filter(Boolean).join("\\n\\n");`;

const replacement = `              negConstraints ? \`[NEGATIVE_CONSTRAINTS]\\n\${negConstraints}\` : "",
              finalValidation ? \`[FINAL_VALIDATION]\\n\${finalValidation}\` : ""
          ].filter(Boolean).join("\\n\\n");`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', code);
    console.log("Fixed combinedReport");
} else {
    console.log("Could not find target string.");
}
