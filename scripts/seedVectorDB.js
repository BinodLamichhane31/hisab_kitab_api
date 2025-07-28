const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const indexName = 'hisab-kitab-knowledge';
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const chunkTextByParagraphs = (text) => {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
};

async function seedDatabase() {
    console.log("Connecting to Pinecone index...");
    const index = pinecone.index(indexName);

    const knowledgeBaseDir = path.join(__dirname, '../knowledge_base');
    const files = fs.readdirSync(knowledgeBaseDir);

    for (const file of files) {
        console.log(`Processing file: ${file}`);
        const content = fs.readFileSync(path.join(knowledgeBaseDir, file), 'utf-8');
        const chunks = chunkTextByParagraphs(content);
        const batchSize = 50;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batchChunks = chunks.slice(i, i + batchSize);
            console.log(`  Embedding batch starting at chunk ${i + 1}...`);

    
            const requests = batchChunks.map(chunk => ({
                content: {
                    parts: [{ text: chunk }],
                },
                taskType: "RETRIEVAL_DOCUMENT",
            }));
            
            const result = await embeddingModel.batchEmbedContents({ requests });

            const embeddings = result.embeddings;

            const vectors = batchChunks.map((chunk, j) => ({
                id: `${file}-chunk-${i + j}`,
                values: embeddings[j].values,
                metadata: { source: file, text: chunk }
            }));

            await index.upsert(vectors);
            console.log(`  Upserted batch of ${vectors.length} vectors.`);
        }
    }
    console.log("Seeding complete!");
}

seedDatabase().catch(console.error);