import client from "./client";

export const sendMessage = async (question, docId = null) => {
    const response = await client.post("/api/chat/", {
        question,
        doc_id : docId
    });
    return response.data
}