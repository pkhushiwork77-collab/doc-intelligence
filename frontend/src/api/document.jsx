import client from "./client";

export const uploadDocument = async (file) => {
    const formData = new FormData();
    formData.append("file", file)
    const response = await client.post("/api/document/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data;
};

export const listDocument = async() => {
    const response = await client.get("/api/document/");
    return response.data
};

export const getDocument = async(id) => {
    const response = await client.get(`/api/document/${id}`);
    return response.data
};

export const deleteDocument = async(id) => {
    const response = await client.delete(`/api/document/${id}`);
    return response.data
}