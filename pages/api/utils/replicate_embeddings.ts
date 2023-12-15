import { Embeddings, type EmbeddingsParams } from "langchain/embeddings/base";
import Replicate from "replicate";

export class ReplicateEmbeddings extends Embeddings {
    async embedDocuments(texts: string[]): Promise<number[][]>{
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_KEY!
        })

        const model = "nateraw/bge-large-en-v1.5:9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1";
        const input = {
            texts: JSON.stringify(texts)
        }
        const output = await replicate.run(model, { input })
        
        //@ts-ignore
        return output;
    }

    async embedQuery(text: string): Promise<number[]>{
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_KEY!
        })

        const model = "nateraw/bge-large-en-v1.5:9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1";
        const input = {
            texts: JSON.stringify([text])
        }
        const output = await replicate.run(model, { input })
        
        //@ts-ignore
        return output[0];
    }
}