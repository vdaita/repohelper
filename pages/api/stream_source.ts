import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from 'langchain/document';
import { convert } from 'html-to-text';

let embeddingsModel = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
});

function iteratorToStream(iterator: any) { // https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next()
   
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
    })
}

const encoder = new TextEncoder();

async function getSourceGoogle(search_query: string) {
    console.log("get_sources: ", search_query);
    return ["https://nextjs.org/docs", "https//nextjs.org/docs/pages"]

    let data = JSON.stringify({
        "q": "site:" + search_query,
        "num": 100
    });

    const headers: HeadersInit = {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json'
    };
    let serperResult = await fetch("https://google.serper.dev/search", {
        method: 'POST',
        headers: headers,
        body: data
    });

    let searchResults: any = await serperResult.json();

    console.log(JSON.stringify(searchResults).substring(0, 200))

    let links = [];
    for(var i = 0; i < searchResults["organic"].length; i++){
        links.push(searchResults["organic"][i]["link"]);
    }

    console.log("Returning links: ", links);

    return links;
}

function findStringsBetweenLocTags(inputText: string) {
    const regex = /<loc>(.*?)<\/loc>/g;
    const matches = [];
    let match;
  
    while ((match = regex.exec(inputText)) !== null) {
      matches.push(match[1]);
    }
  
    return matches;
  }

async function getSourceSitemap(sitemap: string, filterURLs: string){
    
    const websiteResult = await fetch(sitemap);
    const websiteContent = await websiteResult.text();

    const urls = findStringsBetweenLocTags(websiteContent);
    const filteredUrls: string[] = [];
    
    for(var i = 0; i < urls.length; i++){
        let flag = false;

        for(var j = 0; j < urls.length; j++){
            if(urls[i].includes(filterURLs[j]) || filterURLs.length === 0){
                flag = true
            }
        }
        
        if(flag){
            filteredUrls.push(urls[i]);
        }
    }

    return filteredUrls;
}

async function getSite(url: string) {
    console.log("site loader: ", url);    

    let htmlContent = await fetch(url, {
        method: 'GET',
    })
    let contentString = await htmlContent.text();
    console.log(contentString.substring(0, 200));

    let textified = await fetch("/extract_text", {
        method: "POST",
        body: JSON.stringify({
            "content": contentString
        })
    });
    let textifiedResult = await textified.json();

    contentString = textifiedResult;

    console.log(contentString)
    return {
        url: url,
        link: url,
        content: contentString,
        title: url
    };
}

async function getEmbeddings(content: string){
    let embeddedContent = await embeddingsModel.embedQuery(content);
    console.log("Embedded content length: ", embeddedContent.length);
    return embeddedContent;
}


async function* makeIterator(sites: string[], sourceName: string){ // set an automatic limit to 200 webpages - otherwise, split it into chunks.
    let textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000
    });
    for(var i = 0; i < sites!.length; i++){
        try {
            let siteExtracted = await getSite(sites[i]);
            let document = new Document({
                pageContent: siteExtracted["content"],
                metadata: {
                    url: sites[i],
                    source_name: sourceName
                }
            })
            // splitting text into parts
            let splitDocuments = await textSplitter.splitDocuments([document]);
            console.log("   Split " + siteExtracted["url"] + " into " + splitDocuments.length + " pieces");

            for(var j = 0; j < splitDocuments.length; j++){
                let embeddedContent = await getEmbeddings(splitDocuments[j].pageContent);

                yield encoder.encode(JSON.stringify({
                    embeddings: embeddedContent,
                    content: splitDocuments[j].pageContent,
                    url: splitDocuments[j].metadata.url,
                    link: splitDocuments[j].metadata.url,
                    title: splitDocuments[j].metadata.title
                }));
            }
        } catch (e) {
            console.error(e);
            yield encoder.encode(JSON.stringify({
                embedding: [],
                pageContent: null,
                metadata: null
            }));
        }
    }
}

export const runtime = 'edge';

export default async function POST(req: Request){
    let body = await req.json();

    const sites = await getSourceGoogle(body["site_url"]);
    console.log("Got websites: ", sites)

    // let filteredUrls = body["filter_urls"].split(",");
    // let refilteredUrls = [];
    // for(var i = 0; i < filteredUrls.length; i++){
    //     let currUrl = filteredUrls[i].trim();
    //     if(currUrl > 0){
    //         refilteredUrls.push(currUrl);
    //     }
    // }

    // const sites = await getSourceSitemap(body["sitemap_url"], filteredUrls);
    // console.log("Got sitemaps: ", sites);

    if("error" in sites){
        console.log("There is an error in sites.");
        throw "error";
    } else {
        const iterator = makeIterator(sites, body["name"]);
        const stream = iteratorToStream(iterator);
        return new Response(stream);
    }
}
