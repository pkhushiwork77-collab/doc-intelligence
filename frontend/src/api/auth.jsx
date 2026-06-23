import client from "./client";

export const register = async (email, password, fullName) => {
    const response = await client.post("/api/auth/register", {
        email,
        password,
        full_name: fullName
    });

    return response.data;
}

export const login = async (email, password) => {
    const response = await client.post(
        "/api/auth/login",
        new URLSearchParams({username: email, password}),
        {headers: { "Content-Type": "application/x-www-form-urlencoded" }}
    );

    return response.data;
}

export const me = async () => {
    const response = await client.get("/api/auth/me");
    return response.data;
}