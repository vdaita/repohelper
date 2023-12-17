import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

let embeddingsModel = new OpenAIEmbeddings();

// export const runtime = 'edge';

export default async function POST(req, res) {
    console.log("Request to get_embeddings: ", req.body);

    let body = JSON.parse(req.body)
    let strings = body["strings"];
    let isSingle = body["single"];

    let embeddings = await embeddingsModel.embedDocuments(strings);

    console.log("Returning embeddings: ", embeddings);

    if(isSingle) {
        res.status(200).json(embeddings[0]);
    } else {
        res.status(200).json(embeddings);
    }
}