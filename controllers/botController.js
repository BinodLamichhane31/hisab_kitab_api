const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { getFinancialSummaryForUser } = require('../services/dataAnalysisService');

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const index = pinecone.index('hisab-kitab-knowledge');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const generativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

exports.hisabAssistant = async (req, res) => {
    const { query, conversationHistory = [] } = req.body;
    const userId = req.user._id;

    if (!query) return res.status(400).json({ message: "Query is required." });

    try {
        const user = await User.findById(userId).populate('activeShop').select('fname lname activeShop subscription');
        
        const userPlan = user.subscription.plan;        
        if (userPlan === 'FREE') {
            return res.status(403).json({
                success: false,
                message: "Please upgrade to Pro to use Hisab Assistant Bot."
            });
        }
        if (!user || !user.activeShop) {
            return res.status(400).json({ message: "Please select an active shop first." });
        }
        
        const [financialContext, queryEmbedding] = await Promise.all([
            getFinancialSummaryForUser(userId, user.activeShop._id),
            embeddingModel.embedContent(query)
        ]);

        const queryResponse = await index.query({ topK: 4, vector: queryEmbedding.embedding.values, includeMetadata: true });
        const knowledgeBaseContext = queryResponse.matches.map(match => match.metadata.text).join("\n\n---\n\n");

        const systemInstruction = `You are "Hisab Assistant", an expert AI for the "Hisab Kitab" bookkeeping app in Nepal, you are developed by Binod Lamichhane..
        - Your persona is helpful, professional, and concise.
        - RESPOND IN THE ENGLISH LANGUAGE if the question is in english. If the question is asked in nepali or user says "REPLY IN NEPALI" or mixed (english+nepali), respond in the nepali language.
        - PRIORITIZE answering questions using the "USER'S FINANCIAL DATA". This is their live data.
        - Use the "KNOWLEDGE BASE" for questions about laws, taxes, and registration processes in Nepal.
        - Use the "USER PROFILE" to address the user by name.
        - If the user asks a general question (e.g., "what is the weather?"), politely state that you can only answer questions related to their business data or Nepali business regulations.
        - If you don't have enough information from the context, state that clearly. DO NOT MAKE UP INFORMATION.
        - When providing links from the knowledge base, make them clear.`;
        

        const prompt = `
        USER PROFILE:
        The user's name is ${user.fname}. Their active shop is called "${user.activeShop.name}".

        USER'S FINANCIAL DATA (Use this for questions about their sales, purchases, customers):
        ${financialContext}
        
        KNOWLEDGE BASE (Use this for questions about Nepali laws, tax, registration):
        ${knowledgeBaseContext}

        CONVERSATION HISTORY:
        ${conversationHistory.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}

        USER'S CURRENT QUESTION:
        ${query}`;

        const result = await generativeModel.generateContent(systemInstruction + prompt);
        const responseText = result.response.text();
        
        res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Error in Hisab Assistant:", error);
        res.status(500).json({ message: "An error occurred. Please try again." });
    }
};