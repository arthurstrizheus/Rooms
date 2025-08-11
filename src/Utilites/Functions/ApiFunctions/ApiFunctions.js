// ...existing code...

// Make sure axios requests don't override the Authorization header
export async function ApiCall(method, url, data = null) {
    try {
        const token = localStorage.getItem("authToken");
        const config = {
            method,
            url,
            headers: {},
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        console.log(
            `📡 API Call: ${method.toUpperCase()} ${url} - Token: ${
                token ? "Present" : "Missing"
            }`
        );

        const response = await axios(config);
        return response;
    } catch (error) {
        console.error(
            `❌ API Call failed: ${method.toUpperCase()} ${url}`,
            error
        );
        throw error;
    }
}

// ...existing code...
