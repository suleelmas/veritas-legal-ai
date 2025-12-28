import { supabase } from './supabase';

export async function upsertDocument(content: string, metadata: any = {}) {
  try {
    // 1. OpenAI EMBEDDING REQUEST
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: content,
        model: 'text-embedding-3-small'
      })
    });
    const embeddingData = await embeddingResp.json();
    if (!embeddingResp.ok || !embeddingData.data) throw new Error('OpenAI embedding failed');
    const embedding = embeddingData.data[0].embedding;

    // 2. SUPABASE UPSERT
    const { error, data } = await supabase
      .from('documents')
      .upsert([{ content, metadata, embedding }]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('upsertDocument error:', err);
    throw err;
  }
}






