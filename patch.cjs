const fs = require('fs');
const file = 'src/screens/lipstick-prompt/RoomView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `export default function RoomView({ roomDef, roomState, currentStory, state, save, toast, onBack, onHome, onOpenDrawer, progress, setProgress, isCompactHeader, onToggleCompact, onOpenStoryForm }: any) {`;
const replace1 = `function CardNoteInput({ cs, c, roomState, state, save }: any) {
  const [val, setVal] = useState(cs.note || "");
  
  useEffect(() => {
    setVal(cs.note || "");
  }, [cs.note]);

  return (
    <textarea 
      value={val} 
      onChange={(e) => { 
        setVal(e.target.value);
        if (!roomState.cards[c.id]) {
          roomState.cards[c.id] = { note: "", refs: [], output: "" };
        }
        roomState.cards[c.id].note = e.target.value; 
      }}
      onBlur={() => {
        save(state);
      }}
      placeholder={\`Ví dụ yêu cầu cho \${c.title}...\`}
    />
  );
}

export default function RoomView({ roomDef, roomState, currentStory, state, save, toast, onBack, onHome, onOpenDrawer, progress, setProgress, isCompactHeader, onToggleCompact, onOpenStoryForm }: any) {`;

const target2 = `<textarea \n                      value={cs.note} \n                      onChange={(e) => { \n                        if (!roomState.cards[c.id]) {\n                          roomState.cards[c.id] = { note: "", refs: [], output: "" };\n                        }\n                        roomState.cards[c.id].note = e.target.value; \n                        forceUpdate(); \n                      }}\n                      placeholder={\`Ví dụ yêu cầu cho \${c.title}...\`}\n                    />`;
const replace2 = `<CardNoteInput \n                      cs={cs} \n                      c={c} \n                      roomState={roomState} \n                      state={state} \n                      save={save} \n                    />`;

if (content.includes(target1)) {
  content = content.replace(target1, replace1);
  console.log("Replaced target1");
} else {
  console.log("Could not find target1");
}

if (content.includes(target2)) {
  content = content.replace(target2, replace2);
  console.log("Replaced target2");
} else {
  console.log("Could not find target2");
}

fs.writeFileSync(file, content);
