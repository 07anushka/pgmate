
const API_URL = "http://localhost:5000/api";

// =====================================================
// COMMON HELPERS
// =====================================================

const getToken = () => {
  return localStorage.getItem("pgmate_token");
};

const getAuthHeaders = (includeJson = false) => {
  const token = getToken();

  return {
    ...(includeJson
      ? {
          "Content-Type": "application/json",
        }
      : {}),

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

const handleResponse = async (response) => {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data;
};

// =====================================================
// LOGIN
// =====================================================

export const loginApi = async (mobile, password) => {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile,
        password,
      }),
    }
  );

  return handleResponse(response);
};

// =====================================================
// PAYMENT APIs
// =====================================================

export const getMyPaymentsApi = async (
  pgId = "",
  status = "",
  month = "",
  year = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (status && status !== "all") params.append("status", status);
  if (month) params.append("month", month);
  if (year) params.append("year", year);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/payments/my${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getPaymentSummaryApi = async (
  pgId = "",
  month = "",
  year = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (month) params.append("month", month);
  if (year) params.append("year", year);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/payments/summary${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// RENT RECORD APIs
// =====================================================

export const getRentRecordsApi = async (
  month,
  year,
  pgId = "",
  status = ""
) => {
  if (!month || !year) {
    throw new Error("Month and year are required");
  }

  const params = new URLSearchParams();

  params.append("month", String(month));
  params.append("year", String(year));

  if (pgId) params.append("pgId", pgId);
  if (status && status !== "all") params.append("status", status);

  const response = await fetch(
    `${API_URL}/payments/rent-records?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getRentSummaryApi = async (
  month,
  year,
  pgId = ""
) => {
  if (!month || !year) {
    throw new Error("Month and year are required");
  }

  const params = new URLSearchParams();

  params.append("month", String(month));
  params.append("year", String(year));

  if (pgId) params.append("pgId", pgId);

  const response = await fetch(
    `${API_URL}/payments/summary?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createPaymentApi = async (paymentData) => {
  const response = await fetch(
    `${API_URL}/payments`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(paymentData),
    }
  );

  return handleResponse(response);
};

export const updatePaymentStatusApi = async (
  paymentId,
  status,
  month = "",
  year = "",
  paymentMethod = ""
) => {
  const body = { status };

  if (month) body.month = month;
  if (year) body.year = year;
  if (paymentMethod) body.paymentMethod = paymentMethod;

  const response = await fetch(
    `${API_URL}/payments/${paymentId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(body),
    }
  );

  return handleResponse(response);
};

export const deletePaymentApi = async (paymentId) => {
  const response = await fetch(
    `${API_URL}/payments/${paymentId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// COLLECT VACATED TENANT OUTSTANDING DEBT
// =====================================================

export const collectVacatedDebtApi = async (
  tenantId,
  collectionData
) => {
  if (!tenantId) {
    throw new Error("Tenant ID is required.");
  }

  const response = await fetch(
    `${API_URL}/payments/tenants/${encodeURIComponent(
      tenantId
    )}/collect-debt`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(collectionData),
    }
  );

  return handleResponse(response);
};

// =====================================================
// EXPENSE APIs
// =====================================================

export const getMyExpensesApi = async (
  pgId = "",
  category = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (category && category !== "all") params.append("category", category);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/expenses/my${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getExpenseSummaryApi = async (pgId = "") => {
  const query = pgId
    ? `?pgId=${encodeURIComponent(pgId)}`
    : "";

  const response = await fetch(
    `${API_URL}/expenses/summary${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createExpenseApi = async (expenseData) => {
  const response = await fetch(
    `${API_URL}/expenses`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(expenseData),
    }
  );

  return handleResponse(response);
};

export const updateExpenseApi = async (
  expenseId,
  expenseData
) => {
  const response = await fetch(
    `${API_URL}/expenses/${expenseId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(expenseData),
    }
  );

  return handleResponse(response);
};

export const deleteExpenseApi = async (expenseId) => {
  const response = await fetch(
    `${API_URL}/expenses/${expenseId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// COMPLAINT APIs
// =====================================================

export const getMyComplaintsApi = async (
  pgId = "",
  status = "",
  category = "",
  priority = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (status && status !== "all") params.append("status", status);
  if (category && category !== "all") params.append("category", category);
  if (priority && priority !== "all") params.append("priority", priority);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/complaints/my${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getOwnerComplaintsApi = async (
  pgId = "",
  status = "",
  category = "",
  priority = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (status && status !== "all") params.append("status", status);
  if (category && category !== "all") params.append("category", category);
  if (priority && priority !== "all") params.append("priority", priority);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/complaints/owner${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getComplaintSummaryApi = async (pgId = "") => {
  const query = pgId
    ? `?pgId=${encodeURIComponent(pgId)}`
    : "";

  const response = await fetch(
    `${API_URL}/complaints/summary${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getComplaintTenantsApi = async (pgId = "") => {
  const query = pgId
    ? `?pgId=${encodeURIComponent(pgId)}`
    : "";

  const response = await fetch(
    `${API_URL}/complaints/tenants${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createComplaintApi = async (complaintData) => {
  const response = await fetch(
    `${API_URL}/complaints`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(complaintData),
    }
  );

  return handleResponse(response);
};

export const updateComplaintApi = async (
  complaintId,
  complaintData
) => {
  const response = await fetch(
    `${API_URL}/complaints/${complaintId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(complaintData),
    }
  );

  return handleResponse(response);
};

export const deleteComplaintApi = async (complaintId) => {
  const response = await fetch(
    `${API_URL}/complaints/${complaintId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// FOOD MENU APIs
// =====================================================

export const getMyFoodMenuApi = async (
  pgId = "",
  mealType = "",
  foodType = "",
  availability = "",
  day = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (mealType && mealType !== "all") params.append("mealType", mealType);
  if (foodType && foodType !== "all") params.append("foodType", foodType);
  if (availability && availability !== "all") {
    params.append("availability", availability);
  }
  if (day && day !== "all") params.append("day", day);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/food-menu/my${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getFoodMenuSummaryApi = async (pgId = "") => {
  const query = pgId
    ? `?pgId=${encodeURIComponent(pgId)}`
    : "";

  const response = await fetch(
    `${API_URL}/food-menu/summary${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createFoodItemApi = async (foodData) => {
  const response = await fetch(
    `${API_URL}/food-menu`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(foodData),
    }
  );

  return handleResponse(response);
};

export const updateFoodItemApi = async (
  foodId,
  foodData
) => {
  const response = await fetch(
    `${API_URL}/food-menu/${foodId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(foodData),
    }
  );

  return handleResponse(response);
};

export const deleteFoodItemApi = async (foodId) => {
  const response = await fetch(
    `${API_URL}/food-menu/${foodId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// NOTICE APIs
// =====================================================

export const getMyNoticesApi = async (
  pgId = "",
  noticeType = "",
  priority = "",
  audience = "",
  status = ""
) => {
  const params = new URLSearchParams();

  if (pgId) params.append("pgId", pgId);
  if (noticeType && noticeType !== "all") params.append("noticeType", noticeType);
  if (priority && priority !== "all") params.append("priority", priority);
  if (audience && audience !== "all") params.append("audience", audience);
  if (status && status !== "all") params.append("status", status);

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/notices/my${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const getNoticeSummaryApi = async (pgId = "") => {
  const query = pgId
    ? `?pgId=${encodeURIComponent(pgId)}`
    : "";

  const response = await fetch(
    `${API_URL}/notices/summary${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createNoticeApi = async (noticeData) => {
  const response = await fetch(
    `${API_URL}/notices`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(noticeData),
    }
  );

  return handleResponse(response);
};

export const updateNoticeApi = async (
  noticeId,
  noticeData
) => {
  const response = await fetch(
    `${API_URL}/notices/${noticeId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(noticeData),
    }
  );

  return handleResponse(response);
};

export const deleteNoticeApi = async (noticeId) => {
  const response = await fetch(
    `${API_URL}/notices/${noticeId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// PG APIs
// =====================================================

export const getMyPGsApi = async () => {
  const response = await fetch(
    `${API_URL}/pg/my`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createPGApi = async (pgData) => {
  const response = await fetch(
    `${API_URL}/pg`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(pgData),
    }
  );

  return handleResponse(response);
};

export const updatePGApi = async (pgId, pgData) => {
  const response = await fetch(
    `${API_URL}/pg/${pgId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(pgData),
    }
  );

  return handleResponse(response);
};

export const deletePGApi = async (pgId) => {
  const response = await fetch(
    `${API_URL}/pg/${pgId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

// =====================================================
// ROOMS & BEDS APIs
// =====================================================

export const getMyRoomsApi = async (pgId = "") => {
  if (!pgId) {
    throw new Error("PG ID is required");
  }

  const query = `?pgId=${encodeURIComponent(pgId)}`;

  const response = await fetch(
    `${API_URL}/rooms/my${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const createRoomApi = async (roomData) => {
  const response = await fetch(
    `${API_URL}/rooms`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(roomData),
    }
  );

  return handleResponse(response);
};

export const updateRoomApi = async (
  roomId,
  roomData
) => {
  if (!roomId) {
    throw new Error("Room ID is required");
  }

  const response = await fetch(
    `${API_URL}/rooms/${roomId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(roomData),
    }
  );

  return handleResponse(response);
};

export const deleteRoomApi = async (roomId) => {
  if (!roomId) {
    throw new Error("Room ID is required");
  }

  const response = await fetch(
    `${API_URL}/rooms/${roomId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

export const addBedApi = async (
  roomId,
  bedData
) => {
  if (!roomId) {
    throw new Error("Room ID is required");
  }

  const response = await fetch(
    `${API_URL}/rooms/${roomId}/beds`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(bedData),
    }
  );

  return handleResponse(response);
};

export const updateMyProfileApi = async (profileData) => {
  const response = await fetch(
    `${API_URL}/auth/profile`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(profileData),
    }
  );

  return handleResponse(response);
};

export const verifyCurrentPasswordApi = async (
  currentPassword
) => {
  const response = await fetch(
    `${API_URL}/auth/verify-current-password`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ currentPassword }),
    }
  );

  return handleResponse(response);
};

export const changePasswordApi = async (passwordData) => {
  const response = await fetch(
    `${API_URL}/auth/change-password`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(passwordData),
    }
  );

  return handleResponse(response);
};

export const updateBedStatusApi = async (
  bedId,
  status
) => {
  if (!bedId) {
    throw new Error("Bed ID is required");
  }

  const response = await fetch(
    `${API_URL}/rooms/beds/${bedId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status }),
    }
  );

  return handleResponse(response);
};
