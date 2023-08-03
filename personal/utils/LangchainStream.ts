import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import { RetrievalQAChain } from "langchain/chains";


export async function LangchainStream(chain: RetrievalQAChain, message: string) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
  
    let counter = 0;
    try {
      const res = await chain.call({query: message});
  
      const stream = new ReadableStream({
        async start(controller) {
          // callback
          function onParse(event: ParsedEvent | ReconnectInterval) {
            if (event.type === "event") {
              const data = event.data;
  
              if (data === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const text = json.choices[0].delta?.content || "";
                if (counter < 2 && (text.match(/\n/) || []).length) {
                  // this is a prefix character (i.e., "\n\n"), do nothing
                  return;
                }
                const queue = encoder.encode(text);
                controller.enqueue(queue);
                counter++;
              } catch (e) {
                // maybe parse error
                controller.error(e);
              }
            }
          }
    
          // stream response (SSE) from OpenAI may be fragmented into multiple chunks
          // this ensures we properly read chunks and invoke an event for each SSE event stream
          const parser = createParser(onParse);
          // https://web.dev/streams/#asynchronous-iteration
          for await (const chunk of res.body as any) {
            parser.feed(decoder.decode(chunk));
          }
        },
      });
    
      return stream;
    } catch (err) {
      return JSON.stringify({error: err});
    }
  }