export function buildContextWindow(
  currentStory: any,
  currentRoomId: string,
  allowedCardIds: string[],
  roomState: any
) {
  const activeRefs: any[] = [];
  const addIfActive = (img: any) => {
    // Treat as active if isActive is true or undefined (legacy)
    if (img && img.isActive !== false) {
      activeRefs.push(img);
    }
  };

  // 1. Bot character reference images (Global to the story)
  if (currentStory && currentStory.botCharacters) {
    currentStory.botCharacters.forEach((c: any) => {
      if (c.referenceImages) {
        c.referenceImages.forEach(addIfActive);
      }
    });
  }

  // 2. Style analyzer reference images (Room level)
  if (roomState && roomState.styleAnalyzer && roomState.styleAnalyzer.referenceImages) {
    roomState.styleAnalyzer.referenceImages.forEach(addIfActive);
  }

  // 3. Work cards reference images (Only ALLOWED cards)
  if (roomState && roomState.cards) {
    for (const cardId of allowedCardIds) {
      const card = roomState.cards[cardId];
      if (card && card.refs) {
        card.refs.forEach(addIfActive);
      }
      if (card && card.outfitRefs) {
        card.outfitRefs.forEach(addIfActive);
      }
    }
  }

  // Remove duplicates by url
  const uniqueUrls = new Set<string>();
  const finalImages = [];
  for (const img of activeRefs) {
    const url = img.data || img.previewUrl || img.storageUrl;
    if (url && !uniqueUrls.has(url)) {
      uniqueUrls.add(url);
      finalImages.push(img);
    }
  }

  return {
    orderedVisionRefs: finalImages
  };
}
