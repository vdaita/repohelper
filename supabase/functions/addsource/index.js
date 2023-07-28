// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { CheerioWebBaseLoader } from "https://esm.sh/langchain/document_loaders/web/cheerio";
// import { GitbookLoader } from "https://esm.sh/langchain/document_loaders/web/gitbook"
// import ignore from "https://esm.sh/ignore";
// // import { GitHubRepoLoader } from 'https://esm.sh/langchain/document_loaders/web/github';
// import { OpenAIEmbeddings } from 'https://esm.sh/langchain/embeddings/openai'
// import { RecursiveCharacterTextSplitter } from 'https://esm.sh/langchain/text_splitter';
// import { Document } from 'https://esm.sh/langchain/document'

// import { HuggingFaceInferenceEmbeddings } from "https://esm.sh/langchain/embeddings/hf"



console.log("Hello from Functions!")

serve(async (req) => {

  const { source } = await req.json();

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    {global: {headers: {Authorization: req.headers.get('Authorization')}}}
  );

  // const embeddingsInference = new HuggingFaceInferenceEmbeddings({
  //   apiKey: Deno.env.get('HF_API_KEY'),
  //   model: 'bigcode/starcoder'
  // });

  const {data: {user}} = await supabaseClient.auth.getUser();

  

  return new Response(
    JSON.stringify({sentRequest: true}),
    { headers: { "Content-Type": "application/json" } },
  )

  // let embeddingsApi = new OpenAIEmbeddings();
  // let data = []; // 

  // if(source['type'] == 'github'){
  //   const loader = new GitHubRepoLoader(source["url"], { branch: 'main', recursive: false, unknown: "warn"});
  //   const docs = await loader.load();
  //   let embeddings = await embeddings.embedDocuments(data);
  //   // what information is stored in the documents that I would be able to present to the user?
  //   console.log(docs);
  //   for(var i = 0; i < docs.length; i++){
  //     data.push({embeddings: embeddings, uid: user.id, url: '', text: ''});
  //   }
  // } else if (source['type'] == 'stackoverflow') {
  //   // figure this out later

  // } else if (source['type'] == 'website') {
  //   const loader = new CheerioWebBaseLoader(source["url"]);
  //   console.log("Created CheerioWebBaseLoader");
  //   const data = await loader.load();
  //   console.log("Loaded data");
  //   const splitter = new RecursiveCharacterTextSplitter();
  //   const splitData = await splitter.createDocuments(data);
  //   let embeddings = await embeddings.embedDocuments(splitData);

  //   for(var i = 0; i < splitData.length; i++){
  //     data.push({embeddings: embeddings, uid: user.id, url: '', text: ''});
  //   }
  // } else if (source['type'] == 'text') {
  //   const document = new Document({pageContent: source['text']});
  //   const splitter = RecursiveCharacterTextSplitter();
  //   const splitData = await splitter.createDocuments(data);
  //   let embeddings = await embeddings.embedDocuments(splitData);


  // }

  // const { name } = await req.json()
  // const data = {
  //   message: `Hello ${name}!`,
  // }


})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
