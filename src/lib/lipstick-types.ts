export type LipstickImageRef = {
  imageId: string;
  storyId: string;
  roomId: string;
  cardId: string;
  imageType: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  previewUrl: string;
  storageUrl: string;
  analysisStatus: 'pending' | 'analyzing' | 'analyzed' | 'failed';
  imageAnalysisText?: string;
  imageAnalysisJson?: any;
  // Legacy fields for backward compatibility
  id?: string;
  name?: string;
  type?: string;
  data?: string;
  time?: string;
  analysisResult?: string;
};

export type LipstickStyleAnalyzer = {
  refs: LipstickImageRef[];
  selected: string[];
  analysis: string;
  history: any[];
};

export type LipstickCardState = {
  note: string;
  refs: LipstickImageRef[];
  output: string;
};

export type LipstickHistoryItem = {
  id: string;
  time: string;
  storyId: string;
  roomId: string;
  selectedTarget: string;
  payload: any;
  result: string;
  selectedStyles: string[];
  referenceImages: any[];
  streamStatus: 'completed' | 'error';
  cards?: Record<string, LipstickCardState>;
};

export type LipstickRoomState = {
  background: string;
  cover: string;
  avatar: string;
  targetMode: 'bot' | 'user' | 'couple';
  styleAnalyzer: LipstickStyleAnalyzer;
  cards: Record<string, LipstickCardState>;
  history: LipstickHistoryItem[];
  result: string;
};

export type LipstickStoryFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeReadable: string;
  parserStatus: 'pending' | 'parsing' | 'parsed' | 'failed' | 'selected' | 'summarized' | 'empty';
  characterCount: number;
  wordCount: number;
  lineCount: number;
  pageCount?: number;
  estimatedTokenCount: number;
  createdAt: string;
  parsedAt?: string;
  extractedText: string;
  summary?: string;
  detectedSections?: {
    story?: string;
    userProfile?: string;
    botProfiles?: string;
    requirements?: string;
  };
  // Legacy backward compatibility
  id?: string;
  name?: string;
  type?: string;
  size?: number;
  text?: string;
};

export type LipstickBotCharacter = {
  characterId: string;
  displayName?: string;
  profileText: string;
  referenceImages?: Array<{
    id: string;
    name: string;
    data?: string;
    previewUrl?: string;
    analysisResult?: string;
    imageAnalysisText?: string;
  }>;
  imageAnalysis?: any[];
  isCollapsed?: boolean;
};

export type LipstickStory = {
  id: string;
  active: boolean;
  title: string;
  subtitle: string;
  story: string;
  userProfile: string;
  botProfiles: string;
  botCharacters?: LipstickBotCharacter[];
  sideCharacters?: string;
  requirements: string;
  cover: string;
  avatar: string;
  files: LipstickStoryFile[];
  rooms: Record<string, LipstickRoomState>;
  createdAt: string;
};

export type LipstickState = {
  ui: {
    globalBg: string;
    globalAvatar: string;
  };
  stories: LipstickStory[];
};

