import { Embeddings, EmbeddingsParams } from 'langchain/embeddings/base';

export default class BackendEmbeddings extends Embeddings {
    constructor(){
        super({});
    }

    public embedDocuments(documents: string[]): Promise<number[][]>{

        if(documents.length == 0){
            return Promise.resolve([]);
        }

        return fetch(
            "/api/get_embeddings",
            {
                method: 'POST',
                body: JSON.stringify({
                    strings: documents,
                    single: false
                })
            }
        ).then((response) => response.json());
    }

    public embedQuery(query: string): Promise<number[]> {
        return fetch(
            "/api/get_embeddings",
            {
                method: 'POST',
                body: JSON.stringify({
                    strings: [query],
                    single: true
                })
            }
        ).then((response) => response.json())
    }
}