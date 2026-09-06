export type LegalSourceDocument = {
    source: string;
    sourceName: string;
    sourceUrl: string;
    country: string;
    jurisdiction: string;
    language: string;
    type: "legislation" | "court_decision" | "guidance" | "regulation";
    lawNumber?: string;
    lawName?: string;
    articleNumber?: string | null;
    title: string;
    content: string;
    official: boolean;
    retrievedAt: string;
  };
  
  export type LegalSourceAdapter = {
    id: string;
    fetchDocuments: () => Promise<LegalSourceDocument[]>;
  };