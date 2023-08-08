type Document = {
    embedding: number[],
    metadata: any,
    content: string,
    repo: string,
    created_at: number // are timestamps formatted to be numbers?
};

export default Document;