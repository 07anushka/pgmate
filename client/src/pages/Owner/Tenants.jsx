import {
  useEffect,
  useMemo,
  useState,
  useRef,
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
  ScanLine,
  PencilLine,
  FileImage,
  Upload,
  Camera,
  UserRound,
} from "lucide-react";

import { Eye } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import MessageCard from "../../components/MessageCard";

import "./Tenants.css";

import Tesseract from "tesseract.js";

const API_URL = "http://localhost:5000/api";

/* =====================================================
   INITIAL FORM
===================================================== */

const getInitialForm = () => ({
  name: "",
  mobile: "",
  email: "",
  password: "",
  dateOfBirth: "",
  gender: "",
  documentType: "",
  aadhaarNumber: "",
  panNumber: "",
  address: "",
  tenantPhoto: "",

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

  const [aadhaarModalTenant, setAadhaarModalTenant] = useState(null);
  const [deletingAadhaar, setDeletingAadhaar] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");

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

  const [entryMode, setEntryMode] = useState("manual");
  const [documentType, setDocumentType] = useState("aadhaar");
  const [documentPreview, setDocumentPreview] = useState("");
  const [scanningDocument, setScanningDocument] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const captureCanvasRef = useRef(null);

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

      console.log("Rent payment update response:", data);
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
     FETCH TENANTS — SELECTED PG ONLY
  =================================================== */

  const fetchTenants = async () => {
    try {
      const activePGId = localStorage.getItem("pgmate_active_pg");

      setError("");

      if (!activePGId || activePGId === "all") {
        setTenants([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const response = await fetch(
        `${API_URL}/tenants/my?pgId=${encodeURIComponent(activePGId)}`,
        {
          headers: getHeaders(),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.status === 413
            ? "The Aadhaar image is too large. Please scan again."
            : `Server returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Request failed (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tenants.");
      }

      setTenants(data.tenants || []);
    } catch (fetchError) {
      console.error("Fetch tenants error:", fetchError);
      setError(fetchError.message || "Failed to load tenants.");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };



  /* ===================================================
     FETCH PAYMENTS — SELECTED PG ONLY
  =================================================== */

  const fetchPayments = async () => {
    try {
      const activePGId = localStorage.getItem("pgmate_active_pg");

      if (!activePGId || activePGId === "all") {
        setPayments([]);
        return;
      }

      setPaymentsLoading(true);

      const response = await fetch(
        `${API_URL}/payments/my?pgId=${encodeURIComponent(activePGId)}`,
        {
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch payments.");
      }

      setPayments(data.payments || []);
    } catch (paymentError) {
      console.error("Fetch payments error:", paymentError);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };



  /* ===================================================
     INITIAL LOAD AND PG CHANGE
  =================================================== */

  useEffect(() => {
    if (!token) return;

    fetchPGs();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    fetchTenants();
    fetchPayments();

    const handlePGChanged = () => {
      fetchTenants();
      fetchPayments();
    };

    window.addEventListener("pgmate-pg-changed", handlePGChanged);
    window.addEventListener("storage", handlePGChanged);

    return () => {
      window.removeEventListener("pgmate-pg-changed", handlePGChanged);
      window.removeEventListener("storage", handlePGChanged);
    };
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

        const beds = Array.isArray(data.beds)
          ? data.beds
          : Array.isArray(data.availableBeds)
            ? data.availableBeds
            : Array.isArray(data)
              ? data
              : [];
        setAvailableBeds(beds);
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
      setEntryMode("manual");
      setDocumentType("aadhaar");
      setDocumentPreview("");
      setFrontDocumentImage("");
      setBackDocumentImage("");
      setUploadedDocuments([]); // ADD THIS LINE
      setScanStep("front");
      setDocumentVerified(false);
      setScanMessage("");
      setShowQrScanner(false);
      setShowTenantModal(true);

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

        email:
          tenant.userId
            ?.email || "",

        password: "",
        dateOfBirth: tenant.dateOfBirth
          ? new Date(tenant.dateOfBirth)
            .toISOString()
            .split("T")[0]
          : "",

        gender: tenant.gender || "",
        documentType: tenant.documentType || "",
        aadhaarNumber: tenant.aadhaarNumber || "",
        panNumber: tenant.panNumber || "",
        address: tenant.address || "",
        tenantPhoto: tenant.tenantPhoto || "",

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
      setEntryMode("manual");
      setDocumentType(tenant.documentType || "aadhaar");
      setDocumentPreview("");
      setFrontDocumentImage("");
      setBackDocumentImage("");
      setUploadedDocuments([]); // ADD THIS LINE
      setScanStep("front");
      setDocumentVerified(false);
      setScanMessage("");
      setShowQrScanner(false);
      setShowTenantModal(true);

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
      stopQrScanner();
      setEntryMode("manual");
      setDocumentType("aadhaar");
      setDocumentPreview("");
      setFrontDocumentImage("");
      setBackDocumentImage("");
      setUploadedDocuments([]); // ADD THIS LINE
      setScanStep("front");
      setDocumentVerified(false);
      setScanMessage("");
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
  /* ===================================================
     TWO-SIDED DOCUMENT CAMERA + OCR
  =================================================== */

  const [scanStep, setScanStep] = useState("front");
  const [frontDocumentImage, setFrontDocumentImage] = useState("");
  const [backDocumentImage, setBackDocumentImage] = useState("");
  const [documentVerified, setDocumentVerified] = useState(false);

  const stopQrScanner = async () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setShowQrScanner(false);
  };

  const startQrScanner = async () => {
    setScanMessage("");
    setDocumentPreview("");
    setDocumentType("aadhaar");
    setShowQrScanner(true);
    setScanningDocument(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable. Use localhost or HTTPS and a supported browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      cameraStreamRef.current = stream;
      const attachVideo = () => {
        if (!cameraVideoRef.current || !cameraStreamRef.current) return;
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        cameraVideoRef.current.play().catch((error) => console.warn("Camera playback:", error));
      };
      window.setTimeout(attachVideo, 100);
      setScanMessage(`Position the ${scanStep} side inside the frame. Hold the card flat and steady, then capture when the printed text is sharp.`);
    } catch (cameraError) {
      console.error("Could not start document camera:", cameraError);
      setShowQrScanner(false);
      setScanMessage(
        cameraError?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : cameraError.message || "Could not open the camera. Check camera access and try again."
      );
    } finally {
      setScanningDocument(false);
    }
  };

  const captureAndReadDocument = async () => {
    const video = cameraVideoRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setScanMessage("Camera is not ready yet. Wait for the live preview and try again.");
      return;
    }

    setScanningDocument(true);

    try {
      const MAX_WIDTH = 1400;
      const MAX_HEIGHT = 1400;

      // Resize the captured camera frame before saving it.
      const scale = Math.min(
        1,
        MAX_WIDTH / video.videoWidth,
        MAX_HEIGHT / video.videoHeight
      );

      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not process the Aadhaar image.");
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Compress the image to reduce the request size.
      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      // Aadhaar may need both sides; PAN details are normally on the front.
      if (documentType === "aadhaar" && scanStep === "front") {
        setFrontDocumentImage(imageData);
        setDocumentPreview(imageData);
        setForm((previous) => ({ ...previous, tenantPhoto: imageData, documentType: "aadhaar" }));
        setScanStep("back");
        setScanMessage("Front captured. Turn the Aadhaar card over and capture the address side. Keep the card flat and text sharp.");
        return;
      }

      if (documentType === "pan") {
        setFrontDocumentImage(imageData);
        setBackDocumentImage("");
        setDocumentPreview(imageData);
      } else {
        setBackDocumentImage(imageData);
        setDocumentPreview(imageData);
        setForm((previous) => ({ ...previous, tenantPhoto: frontDocumentImage || imageData, documentType: "aadhaar" }));
      }

      setScanMessage("Enhancing the captured image and reading printed text. Please wait...");

      const prepareImage = async (src) => {
        const image = new Image();
        image.src = src;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        // Upscale small images and increase contrast; never alter recognized characters.
        const workCanvas = document.createElement("canvas");
        const factor = Math.min(2, Math.max(1, 1800 / image.naturalWidth));
        workCanvas.width = Math.round(image.naturalWidth * factor);
        workCanvas.height = Math.round(image.naturalHeight * factor);

        const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, workCanvas.width, workCanvas.height);

        const pixels = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
        const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
          // Gentle contrast enhancement; retain colour-independent text visibility.
          const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.18 + 128));
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }
        ctx.putImageData(pixels, 0, 0);
        return workCanvas;
      };

      const recognizeImage = async (src) => {
        const workCanvas = await prepareImage(src);
        const result = await Tesseract.recognize(workCanvas, "eng", {
          logger: (info) => {
            if (info.status === "recognizing text") {
              setScanMessage(`Reading document text... ${Math.round((info.progress || 0) * 100)}%`);
            }
          },
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });

        return {
          text: String(result?.data?.text || ""),
          confidence: Number(result?.data?.confidence || 0),
        };
      };

      const currentText = await recognizeImage(imageData);
      let combinedText = currentText.text;
      let frontOcrText = "";
      let averageConfidence = currentText.confidence;

      if (documentType === "aadhaar") {
        if (!frontDocumentImage) {
          throw new Error("Capture the front side of Aadhaar first.");
        }

        // Read the front side separately because DOB and gender are normally printed there.
        const frontText = await recognizeImage(frontDocumentImage);
        frontOcrText = frontText.text || "";
        combinedText = `${frontOcrText}\n${currentText.text}`;
        averageConfidence = (frontText.confidence + currentText.confidence) / 2;
      }

      const text = combinedText.replace(/\r/g, "");
      const lines = text
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const cleanLine = (value) =>
        String(value || "")
          .replace(/^[\s:;|,.-]+|[\s:;|,.-]+$/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const ignoredLine =
        /AADHAAR|AADHAR|GOVERNMENT OF INDIA|UNIQUE IDENTIFICATION|AUTHORITY|ENROLMENT|ENROLLMENT|DATE OF BIRTH|YEAR OF BIRTH|MALE|FEMALE|TRANSGENDER|ADDRESS|PERMANENT|PRESENT|INCOME TAX|DEPARTMENT|भारत सरकार|ಭಾರತ ಸರ್ಕಾರ|UIDAI|WWW\.|HELP LINE/i;

      const isPlausibleName = (candidate) => {
        const value = cleanLine(candidate);
        const words = value.split(/\s+/).filter(Boolean);
        return (
          value.length >= 3 &&
          value.length <= 60 &&
          words.length >= 2 &&
          /^[A-Za-z][A-Za-z .'-]+$/.test(value) &&
          !ignoredLine.test(value) &&
          !/\d/.test(value)
        );
      };

      const validDateToInput = (candidate) => {
        if (!candidate) return "";
        let day, month, year;
        let match = candidate.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        if (match) [, day, month, year] = match;
        else {
          match = candidate.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
          if (!match) return "";
          [, year, month, day] = match;
        }
        const d = Number(day), m = Number(month), y = Number(year);
        const date = new Date(y, m - 1, d);
        if (
          y < 1900 || y > new Date().getFullYear() ||
          m < 1 || m > 12 || d < 1 || d > 31 ||
          date.getFullYear() !== y || date.getMonth() !== m - 1 ||
          date.getDate() !== d
        ) return "";
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      };

      // Aadhaar Verhoeff checksum: rejects many OCR digit substitutions.
      const verhoeffValid = (number) => {
        const d = [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
          [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
          [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
          [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
          [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
        ];
        const p = [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
          [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
          [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
          [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
        ];
        let checksum = 0;
        const digits = String(number).split("").map(Number);
        for (let i = 0; i < digits.length; i++) {
          checksum = d[checksum][p[i % 8][digits[digits.length - 1 - i]]];
        }
        return checksum === 0;
      };

      let extractedAadhaar = "";
      let extractedDob = "";
      let extractedGender = "";

      const candidates = [...text.matchAll(/(?:^|\D)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?!\d)/g)]
        .map((match) => match[1].replace(/\D/g, ""))
        .filter((value) => value.length === 12 && verhoeffValid(value));
      const uniqueCandidates = [...new Set(candidates)];
      if (uniqueCandidates.length === 1) extractedAadhaar = uniqueCandidates[0];

      // DOB and gender should be extracted from the Aadhaar front side, not the address side.
      const identityText = (documentType === "aadhaar" ? frontOcrText : currentText.text)
        .replace(/\r/g, "")
        .replace(/[|]/g, "I");

      // First try a DOB-labelled date. Allow OCR spacing and punctuation variations.
      const labelledDate = identityText.match(
        /(?:D\s*O\s*B|DATE\s*OF\s*BIRTH|BIRTH\s*DATE|जन्म\s*तिथि)\s*[:;.,\-]?\s*(\d{1,2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{4}|\d{4}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{1,2})/i
      );

      if (labelledDate) {
        extractedDob = validDateToInput(labelledDate[1].replace(/\s/g, ""));
      }

      // Fallback: only use a full date printed on the front side; never use issue dates from the back.
      if (!extractedDob) {
        const allDates = [
          ...identityText.matchAll(/\b(\d{1,2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{4}|\d{4}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{1,2})\b/g),
        ]
          .map((match) => validDateToInput(match[1].replace(/\s/g, "")))
          .filter(Boolean);

        const uniqueDates = [...new Set(allDates)];
        if (uniqueDates.length === 1) {
          extractedDob = uniqueDates[0];
        }
      }

      const normalizedGenderText = identityText
        .replace(/\bma1e\b/gi, "male")
        .replace(/\bfema1e\b/gi, "female")
        .replace(/\bfem[a4]le\b/gi, "female")
        .replace(/\s+/g, " ")
        .trim();

      if (/\b(transgender|trans\s+gender)\b/i.test(normalizedGenderText)) {
        extractedGender = "Other";
      } else if (
        /\b(female|woman)\b/i.test(normalizedGenderText) ||
        /महिला|ಸ್ತ್ರೀ/i.test(normalizedGenderText)
      ) {
        extractedGender = "Female";
      } else if (
        /\bmale\b/i.test(normalizedGenderText) ||
        /पुरुष|ಪುರುಷ/i.test(normalizedGenderText)
      ) {
        extractedGender = "Male";
      }

      // Only scan the fields requested: Aadhaar number, full DOB and gender.
      // Never infer or auto-fill tenant name, address, PAN, or other details.

      if (!text.trim()) throw new Error("No readable text was detected.");

      const detectedFields = [];
      if (extractedDob) detectedFields.push("date of birth");
      if (extractedGender) detectedFields.push("gender");
      if (extractedAadhaar) detectedFields.push("Aadhaar number");

      setForm((previous) => ({
        ...previous,
        ...(extractedDob ? { dateOfBirth: extractedDob } : {}),
        ...(extractedGender ? { gender: extractedGender } : {}),
        ...(extractedAadhaar ? { aadhaarNumber: extractedAadhaar } : {}),
        documentType: "aadhaar",
        tenantPhoto: frontDocumentImage || imageData,
      }));

      // This flag means OCR finished, not that the document was officially verified.
      setDocumentVerified(true);
      setEntryMode("scan");
      await stopQrScanner();

      const warnings = [];
      if (averageConfidence < 65) warnings.push("OCR confidence is low; review the extracted values manually");
      if (!extractedAadhaar) warnings.push("Aadhaar number was not confidently read or did not pass its checksum");
      setScanMessage(
        `${detectedFields.length ? `Extracted: ${detectedFields.join(", ")}.` : "The document was captured, but no fields were confidently extracted."} ${warnings.join("; ")}. Check every field against the physical card before saving. OCR is not identity verification.`
      );
    } catch (ocrError) {
      console.error("Document OCR error:", ocrError);
      setScanMessage(ocrError?.message || "Could not read the document. Retake it in bright, even lighting with the whole card in focus.");
    } finally {
      setScanningDocument(false);
    }
  };

  const resetDocumentScan = () => {
    setFrontDocumentImage("");
    setBackDocumentImage("");
    setDocumentPreview("");
    setScanStep("front");
    setDocumentVerified(false);
    setScanMessage("");
  };


  const [uploadedDocuments, setUploadedDocuments] = useState([]);

  const handleManualDocumentUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    // Allow selecting the same file again.
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    try {
      const processedImages = [];

      for (const file of selectedFiles) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Please upload image files only.");
        }

        const image = new Image();
        const source = URL.createObjectURL(file);

        try {
          image.src = source;

          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () =>
              reject(new Error(`Could not read ${file.name}.`));
          });

          const canvas = document.createElement("canvas");
          const maxDimension = 1400;

          const scale = Math.min(
            1,
            maxDimension /
            Math.max(image.naturalWidth, image.naturalHeight)
          );

          canvas.width = Math.round(image.naturalWidth * scale);
          canvas.height = Math.round(image.naturalHeight * scale);

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not process the image.");
          }

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          processedImages.push({
            id: `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${processedImages.length}`,
            name: file.name,
            dataUrl: canvas.toDataURL("image/jpeg", 0.75),
          });
        } finally {
          URL.revokeObjectURL(source);
        }
      }

      setUploadedDocuments((previous) => [
        ...previous,
        ...processedImages,
      ]);

      // Keep the first uploaded image in the existing field
      // for compatibility with the current tenant form.
      setForm((previous) => ({
        ...previous,
        tenantPhoto:
          previous.tenantPhoto || processedImages[0]?.dataUrl || "",
        documentType: "aadhaar",
      }));

      setDocumentPreview(
        processedImages[0]?.dataUrl || ""
      );

      setTenantError("");
      setScanMessage(
        `${processedImages.length} image(s) added successfully.`
      );
    } catch (uploadError) {
      setTenantError(
        uploadError.message ||
        "Could not process the selected images."
      );
    }
  };

  const handleDocumentScan = async (event) => {
    event?.preventDefault?.();
    if (!showQrScanner) await startQrScanner();
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  const handleSubmitTenant =
    async (event) => {
      event.preventDefault();

      setTenantError("");

      if (
        form.aadhaarNumber &&
        !/^\d{12}$/.test(form.aadhaarNumber.replace(/\s/g, ""))
      ) {
        setTenantError("Aadhaar number must contain exactly 12 digits.");
        return;
      }

      if (
        form.panNumber &&
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.replace(/\s/g, "").toUpperCase())
      ) {
        setTenantError("PAN number must be in the format ABCDE1234F.");
        return;
      }

      const missingFields = [];

      if (!form.name.trim()) missingFields.push("Full Name");
      if (!form.mobile.trim()) missingFields.push("Mobile Number");

      if (!editingTenant && !form.email.trim()) {
        missingFields.push("Email Address");
      }

      if (
        form.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ) {
        missingFields.push("Valid Email Address");
      }

      if (!form.pgId) missingFields.push("PG");
      if (!form.roomId) missingFields.push("Room");
      if (!form.bedId) missingFields.push("Bed");
      if (form.monthlyRent === "") missingFields.push("Monthly Rent");
      if (!form.rentDueDay) missingFields.push("Rent Due Day");

      if (missingFields.length > 0) {
        setTenantError(`Please check: ${missingFields.join(", ")}.`);
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
          email: form.email.trim().toLowerCase(),
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || "",
          documentType: form.documentType || "",
          aadhaarNumber: (form.aadhaarNumber || "").replace(/\s/g, ""),
          panNumber: (form.panNumber || "").replace(/\s/g, "").toUpperCase(),
          address: form.address || "",
          // Keep tenantPhoto for compatibility with existing screens.
          tenantPhoto: form.tenantPhoto || frontDocumentImage || "",
          aadhaarFrontImage: frontDocumentImage || "",
          aadhaarBackImage: backDocumentImage || "",

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

        const responseText = await response.text();

        let data;

        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            response.status === 413
              ? "Aadhaar image is too large. Please scan again."
              : `Server returned an invalid response (HTTP ${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
            data.error ||
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
                        ? `Rent marked as paid from Tenants page via ${paymentMethod ===
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
              `${tenantName}'s rent has been marked as paid via ${paymentMethod ===
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
                            <div className="tenant-footer-left">
                              <button
                                type="button"
                                className="tenant-view-aadhaar-button"
                                onClick={() => {
                                  setAadhaarError("");
                                  setAadhaarModalTenant({
                                    ...tenant,
                                    name: tenantName,
                                  });
                                }}
                              >
                                <Eye size={15} />
                                View Aadhaar
                              </button>
                            </div>

                            {tenant.status === "active" && (
                              <button
                                type="button"
                                className="tenant-vacate-button"
                                disabled={vacatingTenant === tenant._id}
                                onClick={() => handleVacateTenant(tenant)}
                              >
                                {vacatingTenant === tenant._id ? (
                                  <>
                                    <LoaderCircle
                                      size={14}
                                      className="tenant-button-spinner"
                                    />
                                    Vacating...
                                  </>
                                ) : (
                                  <>
                                    <UserX size={14} />
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

        {/* VIEW AADHAAR MODAL */}
        {aadhaarModalTenant && (
          <div
            className="aadhaar-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !deletingAadhaar) {
                setAadhaarModalTenant(null);
                setAadhaarError("");
              }
            }}
          >
            <div
              className="aadhaar-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aadhaar-modal-title"
            >
              <div className="aadhaar-modal-header">
                <div>
                  <span>TENANT DOCUMENT</span>
                  <h2 id="aadhaar-modal-title">Aadhaar Card</h2>
                  <p>{aadhaarModalTenant.name}</p>
                </div>

                <button
                  type="button"
                  className="aadhaar-modal-close"
                  aria-label="Close Aadhaar preview"
                  disabled={deletingAadhaar}
                  onClick={() => {
                    setAadhaarModalTenant(null);
                    setAadhaarError("");
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="aadhaar-modal-body">
                {(
                  aadhaarModalTenant.aadhaarFrontImage ||
                  aadhaarModalTenant.tenantPhoto ||
                  aadhaarModalTenant.aadhaarBackImage
                ) ? (
                  <div className="aadhaar-modal-images">
                    {(aadhaarModalTenant.aadhaarFrontImage || aadhaarModalTenant.tenantPhoto) && (
                      <section className="aadhaar-modal-side">
                        <h3>Front Side</h3>
                        <img
                          src={
                            aadhaarModalTenant.aadhaarFrontImage ||
                            aadhaarModalTenant.tenantPhoto
                          }
                          alt={`Aadhaar front side for ${aadhaarModalTenant.name}`}
                          className="aadhaar-modal-image"
                        />
                      </section>
                    )}

                    {aadhaarModalTenant.aadhaarBackImage && (
                      <section className="aadhaar-modal-side">
                        <h3>Back Side</h3>
                        <img
                          src={aadhaarModalTenant.aadhaarBackImage}
                          alt={`Aadhaar back side for ${aadhaarModalTenant.name}`}
                          className="aadhaar-modal-image"
                        />
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="aadhaar-no-image">
                    <Eye size={28} />
                    <h3>No Aadhaar image available</h3>
                    <p>No document image is currently saved for this tenant.</p>
                  </div>
                )}

                {aadhaarError && (
                  <div className="aadhaar-modal-error">
                    {aadhaarError}
                  </div>
                )}
              </div>

              <div className="aadhaar-modal-footer">
                <button
                  type="button"
                  className="aadhaar-delete-button"
                  disabled={
                    deletingAadhaar ||
                    !(
                      aadhaarModalTenant.tenantPhoto ||
                      aadhaarModalTenant.aadhaarFrontImage ||
                      aadhaarModalTenant.aadhaarBackImage
                    )
                  }
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Delete the saved document image for ${aadhaarModalTenant.name}? This cannot be undone.`
                    );

                    if (!confirmed) return;

                    try {
                      setDeletingAadhaar(true);
                      setAadhaarError("");

                      const response = await fetch(
                        `${API_URL}/tenants/${aadhaarModalTenant._id}/aadhaar-image`,
                        {
                          method: "DELETE",
                          headers: getHeaders(),
                        }
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data.message || "Failed to delete the image."
                        );
                      }

                      await fetchTenants();

                      setAadhaarModalTenant((previous) =>
                        previous
                          ? {
                            ...previous,
                            tenantPhoto: "",
                            aadhaarFrontImage: "",
                            aadhaarBackImage: "",
                          }
                          : null
                      );
                    } catch (error) {
                      setAadhaarError(
                        error.message || "Failed to delete the image."
                      );
                    } finally {
                      setDeletingAadhaar(false);
                    }
                  }}
                >
                  <Trash2 size={16} />
                  {deletingAadhaar ? "Deleting..." : "Delete Aadhaar"}
                </button>

                <button
                  type="button"
                  className="aadhaar-done-button"
                  disabled={deletingAadhaar}
                  onClick={() => {
                    setAadhaarModalTenant(null);
                    setAadhaarError("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
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

              <div className="tenant-entry-options">
                <button
                  type="button"
                  className={`tenant-entry-option ${entryMode === "scan" ? "active" : ""
                    }`}
                  onClick={() => { setEntryMode("scan"); if (!showQrScanner && !documentVerified) startQrScanner(); }}
                >
                  <ScanLine size={22} />
                  <span>
                    <strong>Scan Document</strong>
                    <small>Read Aadhaar number, DOB and gender only</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`tenant-entry-option ${entryMode === "manual" ? "active" : ""
                    }`}
                  onClick={() => setEntryMode("manual")}
                >
                  <PencilLine size={22} />
                  <span>
                    <strong>Enter Details Manually</strong>
                    <small>Fill in the information yourself</small>
                  </span>
                </button>
              </div>

              {entryMode === "scan" && (
                <div className="tenant-document-panel">
                  <h3>{documentType === "pan" ? "Scan PAN Card" : "Scan Aadhaar Card"}</h3>

                  <div className="tenant-document-types">
                    <button type="button" className={documentType === "aadhaar" ? "selected" : ""} onClick={() => { setDocumentType("aadhaar"); resetDocumentScan(); }}>Aadhaar Card</button>
                    <button type="button" disabled className="">PAN scanning disabled</button>
                  </div>

                  <div className="tenant-scan-steps" aria-label="Document capture steps">
                    <div className={frontDocumentImage ? "complete" : scanStep === "front" ? "current" : ""}><span>{frontDocumentImage ? "✓" : "1"}</span><strong>Front side</strong></div>
                    {documentType === "aadhaar" ? (
                      <div className={backDocumentImage ? "complete" : scanStep === "back" ? "current" : ""}><span>{backDocumentImage ? "✓" : "2"}</span><strong>Back side</strong></div>
                    ) : (
                      <div className={documentVerified ? "complete" : ""}><span>{documentVerified ? "✓" : "2"}</span><strong>Extract text</strong></div>
                    )}
                    <div className={documentVerified ? "complete" : ""}><span>{documentVerified ? "✓" : "3"}</span><strong>Review details</strong></div>
                  </div>

                  {!showQrScanner && !documentVerified && (
                    <button type="button" className="tenant-document-upload tenant-camera-start" onClick={startQrScanner} disabled={scanningDocument}>
                      <Camera size={24} />
                      <strong>{frontDocumentImage && documentType === "aadhaar" ? "Continue to Back Side" : "Start Document Camera"}</strong>
                      <small>The live camera opens directly. No QR scan is required.</small>
                    </button>
                  )}

                  {showQrScanner && (
                    <div className="tenant-qr-camera-panel">
                      <div className="tenant-camera-step-label">{scanStep === "front" ? "STEP 1 · FRONT SIDE" : "STEP 2 · BACK SIDE"}</div>
                      <div className="tenant-camera-guide">
                        <video ref={cameraVideoRef} className="tenant-document-camera-video" autoPlay muted playsInline aria-label="Live identity document camera preview" />
                      </div>
                      <canvas ref={captureCanvasRef} style={{ display: "none" }} />
                      <div className="tenant-camera-actions">
                        <button type="button" className="tenant-camera-capture" onClick={captureAndReadDocument} disabled={scanningDocument}>
                          {scanningDocument ? <LoaderCircle size={15} /> : <Camera size={15} />}
                          {scanningDocument ? "Processing..." : scanStep === "front" ? "Capture Front Side" : "Capture Back Side"}
                        </button>
                        <button type="button" className="tenant-camera-cancel" onClick={stopQrScanner}><X size={15} /> Stop Camera</button>
                      </div>
                    </div>
                  )}

                  {(frontDocumentImage || backDocumentImage) && (
                    <div className="tenant-captured-sides">
                      {frontDocumentImage && <div><strong>Front captured</strong><img src={frontDocumentImage} alt="Captured document front side" /></div>}
                      {backDocumentImage && <div><strong>Back captured</strong><img src={backDocumentImage} alt="Captured document back side" /></div>}
                    </div>
                  )}

                  {documentVerified && (
                    <div className="tenant-document-verification">
                      <CheckCircle2 size={18} />
                      <div><strong>Document text extracted</strong><span>Review the values in Tenant Information below. OCR completion is not official identity verification.</span></div>
                    </div>
                  )}

                  {scanMessage && <p className="tenant-scan-message" role="status">{scanMessage}</p>}
                  <div className="tenant-scan-actions">
                    {documentVerified && <button type="button" onClick={resetDocumentScan}>Scan Again</button>}
                    {frontDocumentImage && !documentVerified && !showQrScanner && <button type="button" onClick={() => { setScanStep("back"); startQrScanner(); }}>Capture Back Side</button>}
                    {documentVerified && <button type="button" onClick={() => { setEntryMode("manual"); stopQrScanner(); }}>Continue to Tenant Form</button>}
                  </div>
                  <p className="tenant-scan-disclaimer">OCR can misread characters. Check the Aadhaar number, full date of birth and gender against the original document. Enter the tenant name, mobile number, address and all other details manually.</p>
                </div>
              )}


              {entryMode === "manual" && (
                <div className="tenant-document-panel">
                  <h3>Add Document / Tenant Photo</h3>

                  <p>
                    Upload one or more document images. You can add more images
                    in later selections without replacing the previous ones.
                  </p>

                  <label className="tenant-document-upload">
                    <Upload size={22} />
                    <strong>Add Document</strong>
                    <small>Choose one or more images from your device</small>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleManualDocumentUpload}
                    />
                  </label>

                  {uploadedDocuments.length > 0 && (
                    <div className="tenant-captured-sides">
                      {uploadedDocuments.map((document, index) => (
                        <div
                          key={document.id}
                          className="tenant-uploaded-image"
                        >
                          <strong>{document.name}</strong>

                          <img
                            src={document.dataUrl}
                            alt={`Uploaded document ${index + 1}`}
                            className="tenant-document-preview"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setUploadedDocuments((previous) =>
                                previous.filter(
                                  (item) => item.id !== document.id
                                )
                              );
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

                    <label htmlFor="tenant-email">
                      Email Address{!editingTenant ? " *" : ""}
                    </label>

                    <input
                      id="tenant-email"
                      type="email"
                      name="email"
                      value={form.email || ""}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required={!editingTenant}
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
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth || ""}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tenant-form-group">
                    <label>Gender</label>
                    <select
                      name="gender"
                      value={form.gender || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="tenant-form-group">
                    <label>Aadhaar Number</label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      value={form.aadhaarNumber || ""}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 12);
                        setForm((previous) => ({ ...previous, aadhaarNumber: digits }));
                        setTenantError("");
                      }}
                      placeholder="12-digit Aadhaar number"
                    />
                  </div>

                  <div className="tenant-form-group">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      name="panNumber"
                      autoComplete="off"
                      maxLength={10}
                      value={form.panNumber || ""}
                      onChange={(event) => {
                        const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                        setForm((previous) => ({ ...previous, panNumber: value }));
                        setTenantError("");
                      }}
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div className="tenant-form-group tenant-address-field">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={form.address || ""}
                      onChange={handleChange}
                      rows={2}
                      maxLength={300}
                      placeholder="Address as printed on the document"
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
                              ? "No rooms with available beds"
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
                        ? `Bed ${filteredBeds.find(
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
