export interface LessonSection {
  heading: string;
  explanation: string;
  svgCode: string;
  wikiSearch?: string;   // Wikipedia search term for fetching a real diagram
  imageUrl?: string;     // Real image fetched from Wikipedia/Wikimedia
  chatSvgCode?: string;    // SVG set by the chat assistant (not persisted)
  chatImageUrl?: string;   // Real diagram fetched by chat assistant from Wikimedia
  keyPoints: string[];
}

export interface LessonData {
  id: string;
  title: string;
  topic: string;
  overview: string;
  sections: LessonSection[];
  summary: string;
  clinicalRelevance: string;
  createdAt: Date | string;
}

export interface LessonSummary {
  id: string;
  title: string;
  topic: string;
  overview: string;
  createdAt: Date | string;
}
