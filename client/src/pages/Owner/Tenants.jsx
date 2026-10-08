import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users,
  Plus,
  Search,
  X,
  Phone,
  BedDouble,
  CalendarDays,
  UserPlus,
  UserX,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  DoorOpen,
  ShieldCheck,
  FileText,
  Pencil,
  Trash2,
  IndianRupee,
  CalendarClock,
  Building2,
  Wallet,
  CreditCard,
  CircleDollarSign,
  Banknote,
  Globe2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import MessageCard from "../../components/MessageCard";

import "./Tenants.css";

const API_URL = "http://localhost:5000/api";

/* =====================================================
   INITIAL FORM
===================================================== */

const getInitialForm = () => ({
  name: "",
  mobile: "",
  password: "",

  pgId: "",
  roomId: "",
  bedId: "",

  joiningDate: new Date()
    .toISOString()
    .split("T")[0],

  rentDueDay: "5",

  monthlyRent: "",
  securityDeposit: "",

  emergencyContactName: "",
  emergencyContactNumber: "",

  notes: "",
});

/* =====================================================
   RENT DAYS
===================================================== */

const rentDays = Array.from(
  { length: 28 },
  (_, index) => index + 1
);

const getOrdinal = (number) => {
  const n = Number(number);

  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";

  return `${n}th`;
};

/* =====================================================
   PERIOD HELPERS
===================================================== */

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getPeriodRange = (period) => {
  if (!period) return null;

  const [year, month] = period
    .split("-")
    .map(Number);

  if (!year || !month) {
    return null;
  }

  return {
    start: new Date(
      year,
      month - 1,
      1,
      0,
      0,
      0,
      0
    ),

    end: new Date(
      year,
      month,
      0,
      23,
      59,
      59,
      999
    ),
  };
};

const getPeriodLabel = (period) => {
  if (!period) {
    return "Selected Period";
  }

  const [year, month] = period
    .split("-")
    .map(Number);

  if (!year || !month) {
    return "Selected Period";
  }

  return `${monthNames[month - 1]} ${year}`;
};

/* =====================================================
   HELPERS
===================================================== */

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString(
    "en-IN"
  )}`;
};

const getRoomLabel = (room) => {
  if (!room) return "-";

  return room.roomNumber
    ? `Room ${room.roomNumber}`
    : "-";
};

const getBedLabel = (bed) => {
  if (!bed) return "-";

  return bed.bedNumber || "-";
};

/*
  This only decides which payment record belongs
  to the tenant's current rent cycle.

  It does NOT decide whether the tenant paid.
  Paid / Pending is taken from the payment record
  that the owner explicitly creates or changes.
*/
const getRentCycleStart = (
  rentDueDay
) => {
  const today = new Date();

  const dueDay = Math.min(
    28,
    Math.max(
      1,
      Number(rentDueDay || 5)
    )
  );

  let year =
    today.getFullYear();

  let month =
    today.getMonth();

  if (
    today.getDate() <
    dueDay
  ) {
    month -= 1;

    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  return new Date(
    year,
    month,
    dueDay,
    0,
    0,
    0,
    0
  );
};

const getCurrentCyclePayment = (
  tenant,
  payments
) => {
  if (!tenant?._id) {
    return null;
  }

  const cycleStart =
    getRentCycleStart(
      tenant.rentDueDay
    );

  const today = new Date();

  const tenantPayments =
    payments.filter(
      (payment) => {
        const paymentTenantId =
          payment.tenantId?._id ||
          payment.tenantId;

        if (
          String(
            paymentTenantId
          ) !==
          String(tenant._id)
        ) {
          return false;
        }

        const paymentDate =
          new Date(
            payment.paymentDate
          );

        return (
          paymentDate >=
            cycleStart &&
          paymentDate <=
            today
        );
      }
    );

  if (
    !tenantPayments.length
  ) {
    return null;
  }

  return [
    ...tenantPayments,
  ].sort(
    (a, b) =>
      new Date(
        b.paymentDate
      ) -
      new Date(
        a.paymentDate
      )
  )[0];
};

const getRentStatus = (
  tenant,
  payments
) => {
  if (
    tenant.status !==
    "active"
  ) {
    return "pending";
  }

  const payment =
    getCurrentCyclePayment(
      tenant,
      payments
    );

  if (
    payment?.status ===
    "paid"
  ) {
    return "paid";
  }

  return "pending";
};

/* =====================================================
   PERIOD PAYMENT STATUS
===================================================== */

const getPeriodPayment = (
  tenant,
  payments,
  selectedPeriod
) => {
  if (!tenant?._id) {
    return null;
  }

  const range =
    getPeriodRange(
      selectedPeriod
    );

  if (!range) {
    return null;
  }

  const tenantPayments =
    payments.filter(
      (payment) => {
        const paymentTenantId =
          payment.tenantId?._id ||
          payment.tenantId;

        if (
          String(
            paymentTenantId
          ) !==
          String(tenant._id)
        ) {
          return false;
        }

        const paymentDate =
          new Date(
            payment.paymentDate
          );

        return (
          paymentDate >=
            range.start &&
          paymentDate <=
            range.end
        );
      }
    );

  if (
    !tenantPayments.length
  ) {
    return null;
  }

  return [
    ...tenantPayments,
  ].sort(
    (a, b) =>
      new Date(
        b.paymentDate
      ) -
      new Date(
        a.paymentDate
      )
  )[0];
};

const getPeriodRentStatus = (
  tenant,
  payments,
  selectedPeriod
) => {
  if (
    tenant.status !==
    "active"
  ) {
    return "pending";
  }

  const payment =
    getPeriodPayment(
      tenant,
      payments,
      selectedPeriod
    );

  if (
    payment?.status ===
    "paid"
  ) {
    return "paid";
  }

  return "pending";
};

/* =====================================================
   COMPONENT
===================================================== */

function Tenants() {
  const { token } =
    useAuth();

  /* ===================================================
     TENANTS
  =================================================== */

  const [tenants, setTenants] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("active");

  const now = new Date();

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    now.getFullYear()
  );

  const selectedPeriod =
    `${selectedYear}-${String(
      selectedMonth
    ).padStart(2, "0")}`;

  /* ===================================================
     PAYMENTS
  =================================================== */

  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    paymentsLoading,
    setPaymentsLoading,
  ] = useState(false);

  const [
    rentUpdating,
    setRentUpdating,
  ] = useState(null);

  /* ===================================================
     PGs
  =================================================== */

  const [pgs, setPGs] =
    useState([]);

  const [
    pgLoading,
    setPgLoading,
  ] = useState(true);

  /* ===================================================
     EXPANDED CARDS
  =================================================== */

  const [
    expandedTenantIds,
    setExpandedTenantIds,
  ] = useState(
    new Set()
  );

  /* ===================================================
     ADD / EDIT MODAL
  =================================================== */

  const [
    showTenantModal,
    setShowTenantModal,
  ] = useState(false);

  const [
    editingTenant,
    setEditingTenant,
  ] = useState(null);

  const [
    creatingTenant,
    setCreatingTenant,
  ] = useState(false);

  const [
    tenantError,
    setTenantError,
  ] = useState("");

  const [form, setForm] =
    useState(
      getInitialForm()
    );

  /* ===================================================
     AVAILABLE BEDS
  =================================================== */

  const [
    availableBeds,
    setAvailableBeds,
  ] = useState([]);

  const [
    bedsLoading,
    setBedsLoading,
  ] = useState(false);

  /* ===================================================
     VACATE
  =================================================== */

  const [
    vacatingTenant,
    setVacatingTenant,
  ] = useState(null);

  const [
    vacateTarget,
    setVacateTarget,
  ] = useState(null);

  /* ===================================================
     DELETE
  =================================================== */

  const [
    deletingTenant,
    setDeletingTenant,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  /* ===================================================
     MESSAGE
  =================================================== */

  const [message, setMessage] =
    useState(null);

  /* ===================================================
     PAYMENT METHOD
  =================================================== */

  const [
    paymentMethodTarget,
    setPaymentMethodTarget,
  ] = useState(null);

  /* ===================================================
     HEADERS
  =================================================== */

  const getHeaders = () => ({
    Authorization:
      `Bearer ${token}`,
  });

  /* ===================================================
     FETCH PGs
  =================================================== */

  const fetchPGs = async () => {
    try {
      setPgLoading(true);

      const response =
        await fetch(
          `${API_URL}/pg/my`,
          {
            headers:
              getHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to fetch properties."
        );
      }

      setPGs(
        data.pgs || []
      );
    } catch (
      fetchError
    ) {
      console.error(
        "Fetch PGs error:",
        fetchError
      );

      setMessage({
        type: "error",
        title:
          "Unable to Load Properties",
        message:
          fetchError.message ||
          "Failed to fetch your properties.",
      });
    } finally {
      setPgLoading(false);
    }
  };

  /* ===================================================
     FETCH TENANTS
  =================================================== */

  const fetchTenants =
    async () => {
      try {
        setLoading(true);
        setError("");

        const activePGId =
          localStorage.getItem(
            "pgmate_active_pg"
          ) || "all";

        const query =
          activePGId &&
            activePGId !== "all"
            ? `?pgId=${encodeURIComponent(
                activePGId
              )}`
            : "";

        const response =
          await fetch(
            `${API_URL}/tenants/my${query}`,
            {
              headers:
                getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to fetch tenants."
          );
        }

        setTenants(
          data.tenants || []
        );
      } catch (
        fetchError
      ) {
        console.error(
          "Fetch tenants error:",
          fetchError
        );

        setError(
          fetchError.message ||
          "Failed to load tenants."
        );
      } finally {
        setLoading(false);
      }
    };

  /* ===================================================
     FETCH PAYMENTS
  =================================================== */

  const fetchPayments =
    async () => {
      try {
        setPaymentsLoading(
          true
        );

        const activePGId =
          localStorage.getItem(
            "pgmate_active_pg"
          ) || "";

        const query =
          activePGId
            ? `?pgId=${encodeURIComponent(
                activePGId
              )}`
            : "";

        const response =
          await fetch(
            `${API_URL}/payments/my${query}`,
            {
              headers:
                getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to fetch payments."
          );
        }

        setPayments(
          data.payments || []
        );
      } catch (
        paymentError
      ) {
        console.error(
          "Fetch payments error:",
          paymentError
        );

        setPayments([]);
      } finally {
        setPaymentsLoading(
          false
        );
      }
    };

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    if (!token) return;

    fetchPGs();
    fetchTenants();
    fetchPayments();
  }, [token]);

  /* ===================================================
     FORM CHANGE
  =================================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setTenantError("");
  };

  /* ===================================================
     FETCH AVAILABLE BEDS
  =================================================== */

  const fetchAvailableBeds =
    async (pgId) => {
      if (!pgId) {
        setAvailableBeds(
          []
        );

        return;
      }

      try {
        setBedsLoading(true);
        setTenantError("");

        const response =
          await fetch(
            `${API_URL}/tenants/available-beds?pgId=${encodeURIComponent(
              pgId
            )}`,
            {
              headers:
                getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to fetch available beds."
          );
        }

        setAvailableBeds(
          data.beds || []
        );
      } catch (
        fetchError
      ) {
        console.error(
          "Fetch beds error:",
          fetchError
        );

        setTenantError(
          fetchError.message ||
          "Failed to load available beds."
        );
      } finally {
        setBedsLoading(false);
      }
    };

  /* ===================================================
     PG CHANGE
  =================================================== */

  const handlePGChange =
    async (event) => {
      const pgId =
        event.target.value;

      setForm(
        (previous) => ({
          ...previous,
          pgId,
          roomId: "",
          bedId: "",
          monthlyRent: "",
        })
      );

      setAvailableBeds(
        []
      );

      if (!pgId) return;

      await fetchAvailableBeds(
        pgId
      );
    };

  /* ===================================================
     ROOM CHANGE
  =================================================== */

  const handleRoomChange =
    (event) => {
      const roomId =
        event.target.value;

      const selectedRoom =
        rooms.find(
          (room) =>
            String(
              room._id
            ) ===
            String(roomId)
        );

      const roomRent =
        selectedRoom?.monthlyRent ??
        selectedRoom?.rent ??
        "";

      setForm(
        (previous) => ({
          ...previous,
          roomId,
          bedId: "",
          monthlyRent:
            roomRent,
        })
      );

      setTenantError("");
    };

  /* ===================================================
     BED CHANGE
  =================================================== */

  const handleBedChange =
    (event) => {
      setForm(
        (previous) => ({
          ...previous,
          bedId:
            event.target.value,
        })
      );

      setTenantError("");
    };

  /* ===================================================
     OPEN ADD
  =================================================== */

  const openAddTenant =
    async () => {
      const activePGId =
        localStorage.getItem(
          "pgmate_active_pg"
        );

      const validPGId =
        activePGId &&
        activePGId !== "all"
          ? activePGId
          : pgs.length === 1
          ? pgs[0]._id
          : "";

      setEditingTenant(
        null
      );

      setForm({
        ...getInitialForm(),
        pgId:
          validPGId || "",
      });

      setAvailableBeds(
        []
      );

      setTenantError("");
      setShowTenantModal(
        true
      );

      if (validPGId) {
        await fetchAvailableBeds(
          validPGId
        );
      }
    };

  /* ===================================================
     OPEN EDIT
  =================================================== */

  const openEditTenant =
    async (tenant) => {
      setEditingTenant(
        tenant
      );

      const tenantPGId =
        tenant.pgId?._id ||
        tenant.pgId ||
        "";

      setForm({
        name:
          tenant.userId
            ?.name || "",

        mobile:
          tenant.userId
            ?.mobile || "",

        password: "",

        pgId:
          tenantPGId,

        roomId:
          tenant.roomId
            ?._id ||
          tenant.roomId ||
          "",

        bedId:
          tenant.bedId
            ?._id ||
          tenant.bedId ||
          "",

        joiningDate:
          tenant.joiningDate
            ? new Date(
                tenant.joiningDate
              )
                .toISOString()
                .split("T")[0]
            : getInitialForm()
                .joiningDate,

        rentDueDay:
          String(
            tenant.rentDueDay ||
              5
          ),

        monthlyRent:
          tenant.monthlyRent ??
          "",

        securityDeposit:
          tenant.securityDeposit ??
          "",

        emergencyContactName:
          tenant.emergencyContactName ||
          "",

        emergencyContactNumber:
          tenant.emergencyContactNumber ||
          "",

        notes:
          tenant.notes ||
          "",
      });

      setTenantError("");
      setAvailableBeds(
        []
      );
      setShowTenantModal(
        true
      );

      if (tenantPGId) {
        await fetchAvailableBeds(
          tenantPGId
        );
      }
    };

  /* ===================================================
     CLOSE MODAL
  =================================================== */

  const closeTenantModal =
    () => {
      if (
        creatingTenant
      ) {
        return;
      }

      setShowTenantModal(
        false
      );

      setEditingTenant(
        null
      );

      setTenantError("");

      setAvailableBeds(
        []
      );

      setForm(
        getInitialForm()
      );
    };

  /* ===================================================
     UNIQUE ROOMS
  =================================================== */

  const rooms = useMemo(
    () => {
      const roomMap =
        new Map();

      availableBeds.forEach(
        (bed) => {
          if (
            bed.roomId?._id &&
            !roomMap.has(
              bed.roomId._id
            )
          ) {
            roomMap.set(
              bed.roomId._id,
              bed.roomId
            );
          }
        }
      );

      if (
        editingTenant
          ?.roomId?._id &&
        !roomMap.has(
          editingTenant.roomId
            ._id
        )
      ) {
        roomMap.set(
          editingTenant.roomId
            ._id,
          editingTenant.roomId
        );
      }

      return Array.from(
        roomMap.values()
      ).sort((a, b) =>
        String(
          a.roomNumber ||
            ""
        ).localeCompare(
          String(
            b.roomNumber ||
              ""
          ),
          undefined,
          {
            numeric: true,
          }
        )
      );
    },
    [
      availableBeds,
      editingTenant,
    ]
  );

  /* ===================================================
     FILTERED BEDS
  =================================================== */

  const filteredBeds =
    useMemo(() => {
      if (!form.roomId) {
        return [];
      }

      const roomBeds =
        availableBeds.filter(
          (bed) =>
            String(
              bed.roomId?._id
            ) ===
            String(
              form.roomId
            )
        );

      if (
        editingTenant
          ?.bedId?._id &&
        String(
          editingTenant.bedId
            ._id
        ) ===
          String(
            form.bedId
          ) &&
        !roomBeds.some(
          (bed) =>
            String(
              bed._id
            ) ===
            String(
              form.bedId
            )
        )
      ) {
        return [
          editingTenant.bedId,
          ...roomBeds,
        ];
      }

      return roomBeds;
    }, [
      availableBeds,
      form.roomId,
      form.bedId,
      editingTenant,
    ]);

  /* ===================================================
     CREATE / UPDATE TENANT
  =================================================== */

  const handleSubmitTenant =
    async (event) => {
      event.preventDefault();

      setTenantError("");

      if (
        !form.name.trim() ||
        !form.mobile.trim() ||
        !form.pgId ||
        !form.roomId ||
        !form.bedId ||
        form.monthlyRent ===
          "" ||
        !form.rentDueDay
      ) {
        setTenantError(
          "Please fill all required fields."
        );

        return;
      }

      if (
        !editingTenant &&
        !form.password
      ) {
        setTenantError(
          "Please create a login password."
        );

        return;
      }

      try {
        setCreatingTenant(
          true
        );

        const payload = {
          name:
            form.name.trim(),

          mobile:
            form.mobile.trim(),

          pgId:
            form.pgId,

          roomId:
            form.roomId,

          bedId:
            form.bedId,

          joiningDate:
            form.joiningDate,

          rentDueDay:
            Number(
              form.rentDueDay
            ),

          monthlyRent:
            Number(
              form.monthlyRent
            ),

          securityDeposit:
            form.securityDeposit ===
            ""
              ? 0
              : Number(
                  form.securityDeposit
                ),

          emergencyContactName:
            form.emergencyContactName.trim(),

          emergencyContactNumber:
            form.emergencyContactNumber.trim(),

          notes:
            form.notes.trim(),
        };

        if (
          form.password
        ) {
          payload.password =
            form.password;
        }

        const url =
          editingTenant
            ? `${API_URL}/tenants/${editingTenant._id}`
            : `${API_URL}/tenants`;

        const method =
          editingTenant
            ? "PATCH"
            : "POST";

        const response =
          await fetch(
            url,
            {
              method,
              headers: {
                ...getHeaders(),
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                payload
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to save tenant."
          );
        }

        await Promise.all([
          fetchTenants(),
          fetchPayments(),
        ]);

        setShowTenantModal(
          false
        );

        setEditingTenant(
          null
        );

        setAvailableBeds(
          []
        );

        setForm(
          getInitialForm()
        );

        setMessage({
          type: "success",
          title:
            editingTenant
              ? "Tenant Updated"
              : "Tenant Added",
          message:
            editingTenant
              ? "Tenant details have been updated successfully."
              : "Tenant account was created and the bed was assigned successfully.",
        });
      } catch (
        submitError
      ) {
        console.error(
          "Tenant submit error:",
          submitError
        );

        setTenantError(
          submitError.message ||
          "Failed to save tenant."
        );
      } finally {
        setCreatingTenant(
          false
        );
      }
    };

  /* ===================================================
     RENT STATUS
  =================================================== */

  const updateRentStatus =
    async (
      tenant,
      nextStatus,
      paymentMethod = null
    ) => {
      if (
        !tenant?._id ||
        tenant.status !==
          "active"
      ) {
        return;
      }

      if (
        nextStatus ===
          "paid" &&
        !paymentMethod
      ) {
        setPaymentMethodTarget(
          tenant
        );

        return;
      }

      const currentPayment =
        getCurrentCyclePayment(
          tenant,
          payments
        );

      const tenantName =
        tenant.userId
          ?.name ||
        "Tenant";

      try {
        setRentUpdating(
          `${tenant._id}-${nextStatus}`
        );

        let response;

        if (
          currentPayment?._id
        ) {
          response =
            await fetch(
              `${API_URL}/payments/${currentPayment._id}/status`,
              {
                method:
                  "PATCH",
                headers: {
                  ...getHeaders(),
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    status:
                      nextStatus,

                    ...(nextStatus ===
                      "paid" &&
                    paymentMethod
                      ? {
                          paymentMethod:
                            paymentMethod,
                        }
                      : {}),
                  }),
              }
            );
        } else {
          response =
            await fetch(
              `${API_URL}/payments`,
              {
                method:
                  "POST",

                headers: {
                  ...getHeaders(),
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    tenantId:
                      tenant._id,

                    userId:
                      tenant
                        .userId
                        ?._id ||
                      tenant.userId,

                    pgId:
                      tenant
                        .pgId?._id ||
                      tenant.pgId,

                    amount:
                      Number(
                        tenant.monthlyRent ||
                          0
                      ),

                    paymentDate:
                      new Date().toISOString(),

                    paymentMethod:
                      nextStatus ===
                      "paid"
                        ? paymentMethod
                        : "other",

                    status:
                      nextStatus,

                    notes:
                      nextStatus ===
                      "paid"
                        ? `Rent marked as paid from Tenants page via ${
                            paymentMethod ===
                            "cash"
                              ? "cash"
                              : "online"
                          }.`
                        : "Rent marked as not paid from Tenants page.",
                  }),
              }
            );
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to update rent status."
          );
        }

        await fetchPayments();

        if (
          nextStatus ===
          "paid"
        ) {
          setPaymentMethodTarget(
            null
          );

          setMessage({
            type: "success",
            title:
              "Rent Marked Paid",
            message:
              `${tenantName}'s rent has been marked as paid via ${
                paymentMethod ===
                "cash"
                  ? "cash"
                  : "online"
              }.`,
          });
        } else {
          setMessage({
            type: "warning",
            title:
              "Rent Marked Not Paid",
            message:
              `${tenantName}'s rent has been marked as not paid.`,
          });
        }
      } catch (
        rentError
      ) {
        console.error(
          "Update rent status error:",
          rentError
        );

        setMessage({
          type: "error",
          title:
            "Rent Status Failed",
          message:
            rentError.message ||
            "Failed to update rent status.",
        });
      } finally {
        setRentUpdating(
          null
        );
      }
    };

  const handlePaidClick = (
    tenant
  ) => {
    if (
      !tenant?._id ||
      tenant.status !==
        "active"
    ) {
      return;
    }

    setPaymentMethodTarget(
      tenant
    );
  };

  const handlePaymentMethodSelect =
    (paymentMethod) => {
      if (
        !paymentMethodTarget
      ) {
        return;
      }

      updateRentStatus(
        paymentMethodTarget,
        "paid",
        paymentMethod
      );
    };

  /* ===================================================
     VACATE
  =================================================== */

  const handleVacateTenant =
    (tenant) => {
      setVacateTarget(
        tenant
      );
    };

  const confirmVacateTenant =
    async () => {
      if (!vacateTarget) {
        return;
      }

      try {
        setVacatingTenant(
          vacateTarget._id
        );

        const response =
          await fetch(
            `${API_URL}/tenants/${vacateTarget._id}/vacate`,
            {
              method:
                "PATCH",
              headers:
                getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to vacate tenant."
          );
        }

        const tenantName =
          vacateTarget.userId
            ?.name ||
          "Tenant";

        setVacateTarget(
          null
        );

        await Promise.all([
          fetchTenants(),
          fetchPayments(),
        ]);

        setMessage({
          type: "success",
          title:
            "Tenant Vacated",
          message:
            `${tenantName} has been marked as vacated and the bed has been released.`,
        });
      } catch (
        vacateError
      ) {
        console.error(
          "Vacate tenant error:",
          vacateError
        );

        setVacateTarget(
          null
        );

        setMessage({
          type: "error",
          title:
            "Vacate Failed",
          message:
            vacateError.message ||
            "Failed to vacate tenant.",
        });
      } finally {
        setVacatingTenant(
          null
        );
      }
    };

  /* ===================================================
     DELETE
  =================================================== */

  const handleDeleteTenant =
    (tenant) => {
      setDeleteTarget(
        tenant
      );
    };

  const confirmDeleteTenant =
    async () => {
      if (!deleteTarget) {
        return;
      }

      try {
        setDeletingTenant(
          deleteTarget._id
        );

        const response =
          await fetch(
            `${API_URL}/tenants/${deleteTarget._id}`,
            {
              method:
                "DELETE",
              headers:
                getHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to delete tenant."
          );
        }

        const tenantName =
          deleteTarget.userId
            ?.name ||
          "Tenant";

        setDeleteTarget(
          null
        );

        await Promise.all([
          fetchTenants(),
          fetchPayments(),
        ]);

        setMessage({
          type: "success",
          title:
            "Tenant Deleted",
          message:
            `${tenantName} has been permanently deleted.`,
        });
      } catch (
        deleteError
      ) {
        console.error(
          "Delete tenant error:",
          deleteError
        );

        setDeleteTarget(
          null
        );

        setMessage({
          type: "error",
          title:
            "Delete Failed",
          message:
            deleteError.message ||
            "Failed to delete tenant.",
        });
      } finally {
        setDeletingTenant(
          null
        );
      }
    };

  /* ===================================================
     EXPAND / COLLAPSE
  =================================================== */

  const toggleTenantDetails =
    (tenantId) => {
      setExpandedTenantIds(
        (previous) => {
          const next =
            new Set(
              previous
            );

          if (
            next.has(
              tenantId
            )
          ) {
            next.delete(
              tenantId
            );
          } else {
            next.add(
              tenantId
            );
          }

          return next;
        }
      );
    };

  /* ===================================================
     FILTERED TENANTS
  =================================================== */

  const filteredTenants =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return tenants.filter(
        (tenant) => {
          const name =
            tenant.userId
              ?.name || "";

          const mobile =
            tenant.userId
              ?.mobile || "";

          const emergency =
            tenant.emergencyContactNumber ||
            "";

          const room =
            tenant.roomId
              ?.roomNumber ||
            "";

          const bed =
            tenant.bedId
              ?.bedNumber || "";

          const pg =
            tenant.pgId
              ?.name || "";

          const searchText =
            `${name} ${mobile} ${emergency} ${room} ${bed} ${pg}`.toLowerCase();

          const matchesSearch =
            !query ||
            searchText.includes(
              query
            );

          /*
            PERIOD FILTER

            The tenant must have existed
            during the selected month/year.
          */

          const periodRange =
            getPeriodRange(
              selectedPeriod
            );

          let matchesPeriod =
            true;

          if (
            periodRange
          ) {
            const joiningDate =
              tenant.joiningDate
                ? new Date(
                    tenant.joiningDate
                  )
                : null;

            const vacatedDate =
              tenant.vacatedAt
                ? new Date(
                    tenant.vacatedAt
                  )
                : null;

            if (
              joiningDate
            ) {
              matchesPeriod =
                joiningDate <=
                periodRange.end;
            }

            if (
              matchesPeriod &&
              vacatedDate
            ) {
              matchesPeriod =
                vacatedDate >=
                periodRange.start;
            }
          }

          /*
            CATEGORY FILTER

            Active
            → active tenants only

            Vacated
            → vacated tenants only

            Paid
            → active tenants whose
              selected period is paid

            Not Paid
            → active tenants whose
              selected period is not paid
          */

          let matchesCategory =
            true;

          if (
            categoryFilter ===
            "active"
          ) {
            matchesCategory =
              tenant.status ===
              "active";
          }

          if (
            categoryFilter ===
            "vacated"
          ) {
            matchesCategory =
              tenant.status ===
              "vacated";
          }

          if (
            categoryFilter ===
            "paid"
          ) {
            matchesCategory =
              tenant.status ===
                "active" &&
              getPeriodRentStatus(
                tenant,
                payments,
                selectedPeriod
              ) ===
                "paid";
          }

          if (
            categoryFilter ===
            "not_paid"
          ) {
            matchesCategory =
              tenant.status ===
                "active" &&
              getPeriodRentStatus(
                tenant,
                payments,
                selectedPeriod
              ) ===
                "pending";
          }

          return (
            matchesSearch &&
            matchesCategory &&
            matchesPeriod
          );
        }
      );
    }, [
      tenants,
      payments,
      search,
      categoryFilter,
      selectedPeriod,
    ]);

  /* ===================================================
     RENT STATS
  =================================================== */

  const rentStats =
    useMemo(() => {
      let pendingAmount =
        0;

      let pendingPeople =
        0;

      let paidAmount =
        0;

      let paidPeople =
        0;

      const activePeople =
        tenants.filter(
          (tenant) =>
            tenant.status ===
            "active"
        ).length;

      tenants
        .filter(
          (tenant) =>
            tenant.status ===
            "active"
        )
        .forEach(
          (tenant) => {
            const amount =
              Number(
                tenant.monthlyRent ||
                  0
              );

            const status =
              getPeriodRentStatus(
                tenant,
                payments,
                selectedPeriod
              );

            if (
              status === "paid"
            ) {
              paidAmount +=
                amount;

              paidPeople +=
                1;
            } else {
              pendingAmount +=
                amount;

              pendingPeople +=
                1;
            }
          }
        );

      return {
        pendingAmount,
        pendingPeople,
        paidAmount,
        paidPeople,
        activePeople,
      };
    }, [
      tenants,
      payments,
      selectedPeriod,
    ]);

  /* ===================================================
     LOADING
  =================================================== */

  if (
    loading &&
    !tenants.length
  ) {
    return (
      <div className="tenants-page">

        <div className="tenants-loading-page">

          <div className="tenants-loading-card">

            <div className="tenants-loading-icon">
              <LoaderCircle
                size={24}
              />
            </div>

            <div>
              <strong>
                Loading tenants...
              </strong>

              <span>
                Please wait while we
                fetch your resident
                information.
              </span>
            </div>

          </div>

        </div>

      </div>
    );
  }

  /* ===================================================
     MAIN
  =================================================== */

  return (
    <div className="tenants-page">

      {/* HEADER */}

      <div className="tenants-page-header">

        <div>

          <span className="tenants-eyebrow">
            RESIDENT MANAGEMENT
          </span>

          <h1>
            Tenants
          </h1>

          <p>
            Manage residents,
            rent status and
            room assignments.
          </p>

        </div>

        <button
          className="tenants-add-button"
          onClick={
            openAddTenant
          }
          type="button"
        >
          <Plus size={17} />

          <span>
            Add Tenant
          </span>
        </button>

      </div>

      {/* RENT STATS */}

      <div className="tenants-stat-grid">

        <div className="tenant-stat-card pending">

          <div className="tenant-stat-icon red">
            <Wallet size={19} />
          </div>

          <div>

            <strong>
              {formatCurrency(
                rentStats.pendingAmount
              )}
            </strong>

            <span>
              Pending Rents
            </span>

            <small>
              {
                rentStats.pendingPeople
              }{" "}
              {
                rentStats.pendingPeople ===
                1
                  ? "person"
                  : "people"
              }
            </small>

          </div>

        </div>

        <div className="tenant-stat-card paid">

          <div className="tenant-stat-icon green">
            <CircleDollarSign
              size={19}
            />
          </div>

          <div>

            <strong>
              {formatCurrency(
                rentStats.paidAmount
              )}
            </strong>

            <span>
              Paid Rents
            </span>

            <small>
              {
                rentStats.paidPeople
              }{" "}
              {
                rentStats.paidPeople ===
                1
                  ? "person"
                  : "people"
              }
            </small>

          </div>

        </div>

        <div className="tenant-stat-card active">

          <div className="tenant-stat-icon blue">
            <Users size={19} />
          </div>

          <div>

            <strong>
              {
                rentStats.activePeople
              }
            </strong>

            <span>
              Active Tenants
            </span>

            <small>
              Vacated tenants are not included
            </small>

          </div>

        </div>

      </div>

      {/* TENANTS SECTION */}

      <section className="tenants-section">

        <div className="tenants-section-header">

          <div>

            <h2>
              All Tenants
            </h2>

            <p>
              Click the arrow on a
              tenant to view all
              details.
            </p>

          </div>

          <span className="tenants-count">
            {
              filteredTenants.length
            }{" "}
            resident
            {
              filteredTenants.length !==
              1
                ? "s"
                : ""
            }
          </span>

        </div>

        {/* SEARCH + FILTER */}

        <div className="tenants-toolbar">

          {/* SEARCH */}

          <div className="tenants-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search tenant, mobile, room, bed or PG..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

          </div>

          {/* MONTH + YEAR */}

          <div className="tenant-view-filter">

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  Number(event.target.value)
                )
              }
            >

              {monthNames.map(
                (month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                )
              )}

            </select>

            <ChevronDown
              size={15}
            />

          </div>

          <div className="tenant-view-filter">

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(event.target.value)
                )
              }
            >

              {Array.from(
                {
                  length: 5,
                },
                (_, index) =>
                  new Date().getFullYear() -
                  index
              ).map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}

            </select>

            <ChevronDown
              size={15}
            />

          </div>

        </div>

        {/* STATUS TABS */}

        <div className="tenant-status-tabs">

          <button
            type="button"
            className={
              categoryFilter ===
              "active"
                ? "active"
                : ""
            }
            onClick={() =>
              setCategoryFilter(
                "active"
              )
            }
          >
            Active
          </button>

          <button
            type="button"
            className={
              categoryFilter ===
              "vacated"
                ? "active"
                : ""
            }
            onClick={() =>
              setCategoryFilter(
                "vacated"
              )
            }
          >
            Vacated
          </button>

          <button
            type="button"
            className={
              categoryFilter ===
              "paid"
                ? "active"
                : ""
            }
            onClick={() =>
              setCategoryFilter(
                "paid"
              )
            }
          >
            Paid
          </button>

          <button
            type="button"
            className={
              categoryFilter ===
              "not_paid"
                ? "active"
                : ""
            }
            onClick={() =>
              setCategoryFilter(
                "not_paid"
              )
            }
          >
            Not Paid
          </button>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="tenants-loading-card">

            <div className="tenants-loading-icon">
              <LoaderCircle
                size={25}
              />
            </div>

            <div>

              <strong>
                Loading tenants...
              </strong>

              <span>
                Fetching resident
                information.
              </span>

            </div>

          </div>
        )}

        {/* ERROR */}

        {!loading &&
          error && (
            <div className="tenants-error-card">

              <AlertCircle
                size={18}
              />

              <div>

                <strong>
                  Unable to load tenants
                </strong>

                <span>
                  {error}
                </span>

              </div>

              <button
                type="button"
                onClick={() => {
                  fetchTenants();
                  fetchPayments();
                }}
              >
                Try Again
              </button>

            </div>
          )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredTenants.length ===
            0 && (
            <div className="tenants-empty-card">

              <div className="tenants-empty-icon">
                <Users size={25} />
              </div>

              <h3>

                {tenants.length ===
                0
                  ? "No tenants yet"
                  : `No data for ${getPeriodLabel(
                      selectedPeriod
                    )}`}

              </h3>

              <p>

                {tenants.length ===
                0
                  ? "Add your first tenant and assign them to an available bed."
                  : `There is no tenant data available for ${getPeriodLabel(
                      selectedPeriod
                    )}.`}

              </p>

              {tenants.length ===
                0 && (
                <button
                  type="button"
                  onClick={
                    openAddTenant
                  }
                >
                  <Plus size={15} />
                  Add Tenant
                </button>
              )}

            </div>
          )}

        {/* TENANT LIST */}

        {!loading &&
          !error &&
          filteredTenants.length >
            0 && (
            <div className="tenant-list">

              {filteredTenants.map(
                (tenant) => {
                  const tenantName =
                    tenant.userId
                      ?.name ||
                    "Tenant";

                  const tenantMobile =
                    tenant.userId
                      ?.mobile ||
                    "-";

                  const emergencyNumber =
                    tenant.emergencyContactNumber ||
                    "-";

                  const room =
                    tenant.roomId;

                  const bed =
                    tenant.bedId;

                  const pg =
                    tenant.pgId;

                  const rentStatus =
                    getPeriodRentStatus(
                      tenant,
                      payments,
                      selectedPeriod
                    );

                  const isExpanded =
                    expandedTenantIds.has(
                      tenant._id
                    );

                  const currentPayment =
                    getCurrentCyclePayment(
                      tenant,
                      payments
                    );

                  const isPaidUpdating =
                    rentUpdating ===
                    `${tenant._id}-paid`;

                  const isPendingUpdating =
                    rentUpdating ===
                    `${tenant._id}-pending`;

                  return (
                    <article
                      className={
                        "tenant-card " +
                        (rentStatus ===
                        "paid"
                          ? "rent-paid-card "
                          : "rent-pending-card ") +
                        (isExpanded
                          ? "expanded"
                          : "")
                      }
                      key={
                        tenant._id
                      }
                    >

                      {/* COMPACT ROW */}

                      <div className="tenant-compact-row">

                        <div className="tenant-avatar">
                          {tenantName
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </div>

                        <div className="tenant-compact-main">

                          <h3>
                            {
                              tenantName
                            }
                          </h3>

                          <div className="tenant-compact-info">

                            <span>
                              <Phone
                                size={12}
                              />

                              {
                                tenantMobile
                              }
                            </span>

                            <span>
                              <Building2
                                size={12}
                              />

                              {
                                pg?.name ||
                                "-"
                              }
                            </span>

                            <span>
                              <DoorOpen
                                size={12}
                              />

                              {getRoomLabel(
                                room
                              )}
                            </span>

                            <span>
                              <BedDouble
                                size={12}
                              />

                              {getBedLabel(
                                bed
                              )}
                            </span>

                          </div>

                        </div>

                        <div className="tenant-compact-rent">

                          <span>
                            Pending Rent
                          </span>

                          <strong
                            className={
                              rentStatus ===
                              "paid"
                                ? "paid-text"
                                : "pending-text"
                            }
                          >
                            {formatCurrency(
                              rentStatus ===
                              "paid"
                                ? 0
                                : tenant.monthlyRent
                            )}
                          </strong>

                        </div>

                        <div className="tenant-compact-status">

                          {tenant.status ===
                          "active" ? (
                            <div className="rent-status-buttons">

                              <button
                                type="button"
                                className={
                                  "rent-status-button paid " +
                                  (rentStatus ===
                                  "paid"
                                    ? "active"
                                    : "")
                                }
                                disabled={
                                  isPaidUpdating ||
                                  isPendingUpdating
                                }
                                onClick={() =>
                                  handlePaidClick(
                                    tenant
                                  )
                                }
                              >

                                {isPaidUpdating ? (
                                  <LoaderCircle
                                    size={
                                      12
                                    }
                                    className="tenant-button-spinner"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={
                                      12
                                    }
                                  />
                                )}

                                Paid

                              </button>

                              <button
                                type="button"
                                className={
                                  "rent-status-button pending " +
                                  (rentStatus ===
                                  "pending"
                                    ? "active"
                                    : "")
                                }
                                disabled={
                                  isPaidUpdating ||
                                  isPendingUpdating
                                }
                                onClick={() =>
                                  updateRentStatus(
                                    tenant,
                                    "pending"
                                  )
                                }
                              >

                                {isPendingUpdating ? (
                                  <LoaderCircle
                                    size={
                                      12
                                    }
                                    className="tenant-button-spinner"
                                  />
                                ) : (
                                  <Wallet
                                    size={
                                      12
                                    }
                                  />
                                )}

                                Not Paid

                              </button>

                            </div>
                          ) : (
                            <span className="vacated-mini-status">
                              Vacated
                            </span>
                          )}

                        </div>

                        <div className="tenant-compact-actions">

                          <button
                            type="button"
                            className="tenant-icon-button edit"
                            onClick={() =>
                              openEditTenant(
                                tenant
                              )
                            }
                            title="Edit tenant"
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className="tenant-icon-button delete"
                            onClick={() =>
                              handleDeleteTenant(
                                tenant
                              )
                            }
                            title="Delete tenant"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className="tenant-expand-button"
                            onClick={() =>
                              toggleTenantDetails(
                                tenant._id
                              )
                            }
                            title={
                              isExpanded
                                ? "Hide details"
                                : "View details"
                            }
                          >

                            {isExpanded ? (
                              <ChevronUp
                                size={17}
                              />
                            ) : (
                              <ChevronDown
                                size={17}
                              />
                            )}

                          </button>

                        </div>

                      </div>

                      {/* EXPANDED DETAILS */}

                      {isExpanded && (
                        <div className="tenant-expanded">

                          <div className="tenant-detail-grid">

                            <div className="tenant-detail-box">
                              <Phone
                                size={15}
                              />

                              <div>
                                <span>
                                  Phone
                                </span>

                                <strong>
                                  {
                                    tenantMobile
                                  }
                                </strong>
                              </div>
                            </div>

                            <div className="tenant-detail-box emergency">

                              <ShieldCheck
                                size={15}
                              />

                              <div>

                                <span>
                                  Emergency No.
                                </span>

                                <strong>
                                  {
                                    emergencyNumber
                                  }
                                </strong>

                              </div>

                            </div>

                            <div className="tenant-detail-box">

                              <CalendarDays
                                size={15}
                              />

                              <div>

                                <span>
                                  Joined
                                </span>

                                <strong>
                                  {formatDate(
                                    tenant.joiningDate
                                  )}
                                </strong>

                              </div>

                            </div>

                            <div className="tenant-detail-box rent-cycle">

                              <CalendarClock
                                size={15}
                              />

                              <div>

                                <span>
                                  Rent Due
                                </span>

                                <strong>
                                  {getOrdinal(
                                    tenant.rentDueDay ||
                                    5
                                  )}{" "}
                                  every month
                                </strong>

                              </div>

                            </div>

                          </div>

                          <div className="tenant-assignment-row">

                            <div className="tenant-assignment-box">

                              <Building2
                                size={15}
                              />

                              <div>

                                <span>
                                  PG
                                </span>

                                <strong>
                                  {
                                    pg?.name ||
                                    "-"
                                  }
                                </strong>

                              </div>

                            </div>

                            <div className="tenant-assignment-box">

                              <DoorOpen
                                size={15}
                              />

                              <div>

                                <span>
                                  Room
                                </span>

                                <strong>
                                  {getRoomLabel(
                                    room
                                  )}
                                </strong>

                              </div>

                            </div>

                            <div className="tenant-assignment-box">

                              <BedDouble
                                size={15}
                              />

                              <div>

                                <span>
                                  Bed
                                </span>

                                <strong>
                                  {getBedLabel(
                                    bed
                                  )}
                                </strong>

                              </div>

                            </div>

                          </div>

                          <div className="tenant-rent-detail-row">

                            <div className="tenant-rent-detail monthly">

                              <IndianRupee
                                size={15}
                              />

                              <div>

                                <span>
                                  Monthly Rent
                                </span>

                                <strong>
                                  {formatCurrency(
                                    tenant.monthlyRent
                                  )}
                                </strong>

                              </div>

                            </div>

                            <div
                              className={
                                "tenant-rent-detail status " +
                                rentStatus
                              }
                            >

                              <CreditCard
                                size={15}
                              />

                              <div>

                                <span>
                                  Current Rent Status
                                </span>

                                <strong>
                                  {rentStatus ===
                                  "paid"
                                    ? "Paid"
                                    : "Not Paid"}
                                </strong>

                              </div>

                            </div>

                            <div className="tenant-rent-detail">

                              <Wallet
                                size={15}
                              />

                              <div>

                                <span>
                                  Security Deposit
                                </span>

                                <strong>
                                  {formatCurrency(
                                    tenant.securityDeposit
                                  )}
                                </strong>

                              </div>

                            </div>

                          </div>

                          {tenant.notes && (
                            <div className="tenant-notes">

                              <FileText
                                size={14}
                              />

                              <div>

                                <span>
                                  Notes
                                </span>

                                <p>
                                  {
                                    tenant.notes
                                  }
                                </p>

                              </div>

                            </div>
                          )}

                          <div className="tenant-expanded-footer">

                            {tenant.status ===
                              "active" && (
                              <button
                                type="button"
                                className="tenant-vacate-button"
                                disabled={
                                  vacatingTenant ===
                                  tenant._id
                                }
                                onClick={() =>
                                  handleVacateTenant(
                                    tenant
                                  )
                                }
                              >

                                {vacatingTenant ===
                                tenant._id ? (
                                  <>
                                    <LoaderCircle
                                      size={
                                        14
                                      }
                                      className="tenant-button-spinner"
                                    />

                                    Vacating...
                                  </>
                                ) : (
                                  <>
                                    <UserX
                                      size={
                                        14
                                      }
                                    />

                                    Vacate Tenant
                                  </>
                                )}

                              </button>
                            )}

                          </div>

                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>
          )}

      </section>

      {/* ADD / EDIT MODAL */}

      {showTenantModal && (
        <div
          className="tenant-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeTenantModal();
            }
          }}
        >

          <div className="tenant-modal">

            <div className="tenant-modal-header">

              <div>

                <span>
                  RESIDENT MANAGEMENT
                </span>

                <h2>
                  {editingTenant
                    ? "Edit Tenant"
                    : "Add Tenant"}
                </h2>

                <p>
                  {editingTenant
                    ? "Update resident details, rent cycle and assignment."
                    : "Create a tenant account and assign an available bed."}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeTenantModal
                }
                disabled={
                  creatingTenant
                }
              >
                <X size={18} />
              </button>

            </div>

            <form
              className="tenant-form"
              onSubmit={
                handleSubmitTenant
              }
            >

              {/* BASIC */}

              <div className="tenant-form-section">

                <div className="tenant-form-section-title">

                  <UserPlus
                    size={15}
                  />

                  Tenant Information

                </div>

                <div className="tenant-form-grid">

                  <div className="tenant-form-group">

                    <label>
                      Full Name *
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Tenant name"
                      required
                    />

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Mobile Number *
                    </label>

                    <input
                      type="tel"
                      name="mobile"
                      value={
                        form.mobile
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Mobile number"
                      required
                    />

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Login Password
                      {!editingTenant &&
                        " *"}
                    </label>

                    <input
                      type="password"
                      name="password"
                      value={
                        form.password
                      }
                      onChange={
                        handleChange
                      }
                      placeholder={
                        editingTenant
                          ? "Leave blank to keep current"
                          : "Create login password"
                      }
                      required={
                        !editingTenant
                      }
                    />

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Joining Date *
                    </label>

                    <input
                      type="date"
                      name="joiningDate"
                      value={
                        form.joiningDate
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />

                  </div>

                </div>

              </div>

              {/* ASSIGNMENT */}

              <div className="tenant-form-section">

                <div className="tenant-form-section-title">

                  <Building2
                    size={15}
                  />

                  PG & Bed Assignment

                </div>

                <div className="tenant-form-grid">

                  <div className="tenant-form-group">

                    <label>
                      PG *
                    </label>

                    <div className="tenant-select-wrapper">

                      <select
                        name="pgId"
                        value={
                          form.pgId
                        }
                        onChange={
                          handlePGChange
                        }
                        required
                      >

                        <option value="">
                          Select PG
                        </option>

                        {pgs.map(
                          (pg) => (
                            <option
                              key={
                                pg._id
                              }
                              value={
                                pg._id
                              }
                            >
                              {
                                pg.name
                              }
                            </option>
                          )
                        )}

                      </select>

                      <ChevronDown
                        size={14}
                      />

                    </div>

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Room *
                    </label>

                    <div className="tenant-select-wrapper">

                      <select
                        name="roomId"
                        value={
                          form.roomId
                        }
                        onChange={
                          handleRoomChange
                        }
                        disabled={
                          !form.pgId ||
                          bedsLoading ||
                          rooms.length ===
                            0
                        }
                        required
                      >

                        <option value="">
                          {bedsLoading
                            ? "Loading rooms..."
                            : rooms.length ===
                              0
                            ? "No available rooms"
                            : "Select room"}
                        </option>

                        {rooms.map(
                          (room) => (
                            <option
                              key={
                                room._id
                              }
                              value={
                                room._id
                              }
                            >
                              Room{" "}
                              {
                                room.roomNumber
                              }
                              {" • "}
                              {formatCurrency(
                                room.monthlyRent
                              )}
                            </option>
                          )
                        )}

                      </select>

                      <ChevronDown
                        size={14}
                      />

                    </div>

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Bed *
                    </label>

                    <div className="tenant-select-wrapper">

                      <select
                        name="bedId"
                        value={
                          form.bedId
                        }
                        onChange={
                          handleBedChange
                        }
                        disabled={
                          !form.roomId ||
                          bedsLoading
                        }
                        required
                      >

                        <option value="">
                          {bedsLoading
                            ? "Loading beds..."
                            : !form.roomId
                            ? "Select room first"
                            : filteredBeds.length ===
                              0
                            ? "No available beds"
                            : "Select bed"}
                        </option>

                        {filteredBeds.map(
                          (bed) => (
                            <option
                              key={
                                bed._id
                              }
                              value={
                                bed._id
                              }
                            >
                              {
                                bed.bedNumber
                              }
                            </option>
                          )
                        )}

                      </select>

                      <ChevronDown
                        size={14}
                      />

                    </div>

                  </div>

                  <div className="tenant-assignment-success">

                    <CheckCircle2
                      size={15}
                    />

                    <span>
                      {form.bedId
                        ? `Bed ${
                            filteredBeds.find(
                              (
                                bed
                              ) =>
                                String(
                                  bed._id
                                ) ===
                                String(
                                  form.bedId
                                )
                            )
                              ?.bedNumber ||
                            ""
                          } is selected.`
                        : "Select a room and bed to continue."}
                    </span>

                  </div>

                </div>

              </div>

              {/* RENT */}

              <div className="tenant-form-section">

                <div className="tenant-form-section-title">

                  <Wallet
                    size={15}
                  />

                  Rent & Due Day

                </div>

                <div className="tenant-rent-info">

                  <CalendarClock
                    size={17}
                  />

                  <div>

                    <strong>
                      Choose the monthly
                      rent due day
                    </strong>

                    <span>
                      Example: choose 5th
                      and this tenant's
                      rent will be due
                      every 5th of the
                      month.
                    </span>

                  </div>

                </div>

                <div className="tenant-form-grid">

                  <div className="tenant-form-group">

                    <label>
                      Rent Due Day *
                    </label>

                    <div className="tenant-select-wrapper">

                      <select
                        name="rentDueDay"
                        value={
                          form.rentDueDay
                        }
                        onChange={
                          handleChange
                        }
                        required
                      >

                        {rentDays.map(
                          (day) => (
                            <option
                              key={day}
                              value={day}
                            >
                              {getOrdinal(
                                day
                              )}
                            </option>
                          )
                        )}

                      </select>

                      <ChevronDown
                        size={14}
                      />

                    </div>

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Monthly Rent *
                    </label>

                    <div className="tenant-auto-rent">

                      <input
                        type="number"
                        name="monthlyRent"
                        value={
                          form.monthlyRent
                        }
                        readOnly
                        min="0"
                        placeholder={
                          form.roomId
                            ? "Room rent"
                            : "Select room first"
                        }
                        required
                      />

                    </div>

                    <small className="tenant-field-hint">
                      Automatically taken
                      from the selected
                      room.
                    </small>

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Security Deposit
                    </label>

                    <input
                      type="number"
                      name="securityDeposit"
                      value={
                        form.securityDeposit
                      }
                      onChange={
                        handleChange
                      }
                      min="0"
                      placeholder="25000"
                    />

                  </div>

                </div>

              </div>

              {/* EMERGENCY */}

              <div className="tenant-form-section">

                <div className="tenant-form-section-title">

                  <ShieldCheck
                    size={15}
                  />

                  Emergency Contact

                </div>

                <div className="tenant-form-grid">

                  <div className="tenant-form-group">

                    <label>
                      Contact Name
                    </label>

                    <input
                      type="text"
                      name="emergencyContactName"
                      value={
                        form.emergencyContactName
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Parent / Guardian"
                    />

                  </div>

                  <div className="tenant-form-group">

                    <label>
                      Emergency Number
                    </label>

                    <input
                      type="tel"
                      name="emergencyContactNumber"
                      value={
                        form.emergencyContactNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Emergency mobile"
                    />

                  </div>

                </div>

              </div>

              {/* NOTES */}

              <div className="tenant-form-section">

                <div className="tenant-form-section-title">

                  <FileText
                    size={15}
                  />

                  Additional Notes

                </div>

                <div className="tenant-form-group">

                  <label>
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={
                      form.notes
                    }
                    onChange={
                      handleChange
                    }
                    rows="3"
                    placeholder="Optional notes about the tenant..."
                  />

                </div>

              </div>

              {tenantError && (
                <div className="tenant-form-error">

                  <AlertCircle
                    size={15}
                  />

                  <span>
                    {
                      tenantError
                    }
                  </span>

                </div>
              )}

              {/* ACTIONS */}

              <div className="tenant-modal-actions">

                <button
                  type="button"
                  className="tenant-modal-cancel"
                  onClick={
                    closeTenantModal
                  }
                  disabled={
                    creatingTenant
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tenant-modal-submit"
                  disabled={
                    creatingTenant ||
                    bedsLoading
                  }
                >

                  {creatingTenant ? (
                    <>
                      <LoaderCircle
                        size={14}
                        className="tenant-button-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      {editingTenant ? (
                        <Pencil
                          size={14}
                        />
                      ) : (
                        <UserPlus
                          size={14}
                        />
                      )}

                      {editingTenant
                        ? "Save Changes"
                        : "Add Tenant"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* PAYMENT METHOD */}

      {paymentMethodTarget && (
        <div
          className="rent-payment-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              if (
                !rentUpdating
              ) {
                setPaymentMethodTarget(
                  null
                );
              }
            }
          }}
        >

          <div
            className="rent-payment-card"
            role="dialog"
            aria-modal="true"
          >

            <button
              type="button"
              className="rent-payment-close"
              onClick={() => {
                if (
                  !rentUpdating
                ) {
                  setPaymentMethodTarget(
                    null
                  );
                }
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="rent-payment-icon">
              <CreditCard
                size={25}
              />
            </div>

            <span className="rent-payment-label">
              RENT PAYMENT
            </span>

            <h2>
              How was the rent paid?
            </h2>

            <p>
              Select the payment method for{" "}
              <strong>
                {
                  paymentMethodTarget
                    .userId
                    ?.name ||
                  "this tenant"
                }
              </strong>
              .
            </p>

            <div className="rent-payment-options">

              <button
                type="button"
                className="rent-payment-option cash"
                disabled={Boolean(
                  rentUpdating
                )}
                onClick={() =>
                  handlePaymentMethodSelect(
                    "cash"
                  )
                }
              >

                <span className="rent-payment-option-icon">
                  <Banknote
                    size={21}
                  />
                </span>

                <span>

                  <strong>
                    Cash
                  </strong>

                  <small>
                    Paid in cash
                  </small>

                </span>

              </button>

              <button
                type="button"
                className="rent-payment-option online"
                disabled={Boolean(
                  rentUpdating
                )}
                onClick={() =>
                  handlePaymentMethodSelect(
                    "upi"
                  )
                }
              >

                <span className="rent-payment-option-icon">
                  <Globe2
                    size={21}
                  />
                </span>

                <span>

                  <strong>
                    Online
                  </strong>

                  <small>
                    UPI / online payment
                  </small>

                </span>

              </button>

            </div>

            <button
              type="button"
              className="rent-payment-cancel"
              disabled={Boolean(
                rentUpdating
              )}
              onClick={() =>
                setPaymentMethodTarget(
                  null
                )
              }
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      {/* VACATE */}

      {vacateTarget && (
        <MessageCard
          type="confirm"
          title="Vacate Tenant?"
          message={
            "Are you sure you want to vacate " +
            (vacateTarget.userId
              ?.name ||
              "this tenant") +
            "? Their current bed will be released."
          }
          confirm
          confirmText={
            vacatingTenant
              ? "Vacating..."
              : "Vacate Tenant"
          }
          cancelText="Cancel"
          onClose={() => {
            if (
              !vacatingTenant
            ) {
              setVacateTarget(
                null
              );
            }
          }}
          onConfirm={
            confirmVacateTenant
          }
        />
      )}

      {/* DELETE */}

      {deleteTarget && (
        <MessageCard
          type="confirm"
          title="Delete Tenant?"
          message={
            "Are you sure you want to permanently delete " +
            (deleteTarget.userId
              ?.name ||
              "this tenant") +
            "? This action cannot be undone."
          }
          confirm
          confirmText={
            deletingTenant
              ? "Deleting..."
              : "Delete Tenant"
          }
          cancelText="Cancel"
          onClose={() => {
            if (
              !deletingTenant
            ) {
              setDeleteTarget(
                null
              );
            }
          }}
          onConfirm={
            confirmDeleteTenant
          }
        />
      )}

      {/* GLOBAL MESSAGE */}

      {message && (
        <MessageCard
          type={
            message.type
          }
          title={
            message.title
          }
          message={
            message.message
          }
          onClose={() =>
            setMessage(null)
          }
        />
      )}

    </div>
  );
}

export default Tenants;