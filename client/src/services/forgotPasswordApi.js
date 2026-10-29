
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Request failed. Please try again."
    );
  }

  return data;
}

export const forgotPasswordApi = {
  // Send a 6-digit OTP to the registered email address
  sendOtp(email) {
    return request("/auth/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Verify the OTP sent to the email address
  verifyOtp(email, otp) {
    return request("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  // Reset the password after successful OTP verification
  resetPassword(payload) {
    return request("/auth/forgot-password/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
