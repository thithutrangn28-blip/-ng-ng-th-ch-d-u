export type FileItem = {
  name: string;
  size: number;
  ext: string;
  status: string;
  content: string;
  storyId?: string;
  source?: "local_device";
  fileName?: string;
  relativePath?: string;
  fileType?: string;
  fileSize?: number;
  lastModified?: number;
  parserStatus?: "selected" | "reading" | "parsed" | "summarized" | "parser-needed" | "failed" | "empty";
  parsedText?: string;
  summary?: string;
  extractedSummary?: string;
  importantFacts?: {
    logline?: string[];
    characters?: string[];
    relationships?: string[];
    setting?: string[];
    timeline?: string[];
    canon?: string[];
    canonFacts?: string[];
    memory?: string[];
    worldbuilding?: string[];
    writingRules?: string[];
    specialRules?: string[];
    voiceDNA?: string[];
    promptRequirements?: string[];
    promptInstructions?: string[];
  };
  characterCount?: number;
  estimatedTokens?: number;
  chunks?: string[];
  importedAt?: number;
};

export type CharProfile = {
  id: string;
  profileGroup: "bot_char";
  name: string;
  role: string;
  identity: string;
  status: string;
  appearance: string;
  personality: string;
  relationship: string;
  voiceDNA: string;
  canon: string;
  avatar: string; // base64
};

export type UserProfileSingle = {
  name: string;
  relation: string;
  publicInfo: string;
  privateInfo: string;
  agency: string;
  style: string;
};

export type StoryDetail = {
  storyAltTitle: string;
  storyStatus: string;
  storySubGenre: string;
  storyRoute: string;
  storyLogline: string;
  storyWorld: string;
  storyTimeline: string;
  storyCanonDeep: string;
  storyGoal: string;
  storyMustHave: string;
};

export type StoryContext = {
  story: string;
  charProfile: string;
  userProfile: string;
  memory: string;
  canon: string;
  voiceDNA: string;
  request: string;
  mergedContext: string;
  files: FileItem[];
  rooms?: any;
};

export type Story = {
  id: string;
  title: string;
  genre: string;
  summary: string;
  cover: string; // base64
  background: string; // base64
  avatar: string; // base64
  createdAt: number;
  updatedAt: number;
  context: StoryContext;
  detail: StoryDetail;
  characters: CharProfile[];
  userProfileSingle: UserProfileSingle;
};

const DB_NAME = "prompt_markdown_db_v1";
const STORE_NAME = "stories";

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function dbGetAllStories(): Promise<Story[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPutStory(story: Story): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(story);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteStory(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export const emptyContext = (): StoryContext => ({
  story: "",
  charProfile: "",
  userProfile: "",
  memory: "",
  canon: "",
  voiceDNA: "",
  request: "",
  mergedContext: "Bấm Smart Merge để hợp nhất context của truyện đang chọn.",
  files: [],
});

export const emptyDetail = (): StoryDetail => ({
  storyAltTitle: "",
  storyStatus: "",
  storySubGenre: "",
  storyRoute: "",
  storyLogline: "",
  storyWorld: "",
  storyTimeline: "",
  storyCanonDeep: "",
  storyGoal: "",
  storyMustHave: "",
});

export const emptyUserProfile = (): UserProfileSingle => ({
  name: "",
  relation: "",
  publicInfo: "",
  privateInfo: "",
  agency: "",
  style: "",
});

export function createNewStory(title: string = "Câu chuyện mới"): Story {
  return {
    id: "story_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    title,
    genre: "",
    summary: "",
    cover: "",
    background: "",
    avatar: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    context: emptyContext(),
    detail: emptyDetail(),
    characters: [],
    userProfileSingle: emptyUserProfile(),
  };
}
