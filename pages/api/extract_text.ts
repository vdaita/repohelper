import { convert } from 'html-to-text';

export default async function POST(req: Request) {
    let jsoned = await req.json();
    return {"content": convert(jsoned["content"])};
}