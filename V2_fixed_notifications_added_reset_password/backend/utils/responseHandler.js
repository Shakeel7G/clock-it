//   Provide a consistent, toast-friendly response format for all
//   backend endpoints (Auth + User + future routes).
//   Every response includes:
//     - success: Boolean (true/false)
//     - message: Human-readable string
//     - data: Optional object with extra payload

export const sendResponse = (res, statusCode, success, message, data = null) => {
    // Build consistent JSON structure
    const payload = { success, message };

    // Include data only if it exists (keeps payload clean)
    if (data && Object.keys(data).length > 0) {
        payload.data = data;
    }

    // Send JSON response to frontend
    return res.status(statusCode).json(payload);
};
