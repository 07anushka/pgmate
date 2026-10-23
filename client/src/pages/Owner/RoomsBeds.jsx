import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  Building2,
  BedDouble,
  CheckCircle2,
  Users,
  Wrench,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";

import {
  getMyPGsApi,
  getMyRoomsApi,
  createRoomApi,
  addBedApi,
  updateBedStatusApi,
  updateRoomApi,
  deleteRoomApi,
} from "../../services/api";

import "./RoomsBeds.css";
import MessageCard from "../../components/MessageCard";

// ======================================================
// ROOM TYPES
// ======================================================

const roomTypes = [
  {
    value: "single",
    label: "Single Sharing",
  },
  {
    value: "double",
    label: "Double Sharing",
  },
  {
    value: "triple",
    label: "Triple Sharing",
  },
  {
    value: "four_sharing",
    label: "Four Sharing",
  },
  {
    value: "five_sharing",
    label: "Five Sharing",
  },
  {
    value: "six_sharing",
    label: "Six Sharing",
  },
  {
    value: "seven_sharing",
    label: "Seven Sharing",
  },
  {
    value: "eight_sharing",
    label: "Eight Sharing",
  },
  {
    value: "nine_sharing",
    label: "Nine Sharing",
  },
  {
    value: "ten_sharing",
    label: "Ten Sharing",
  },
];

// ======================================================
// FLOOR OPTIONS
// ======================================================

const floorOptions = [
  {
    value: "ground floor",
    label: "Ground Floor",
  },
  {
    value: "first floor",
    label: "First Floor",
  },
  {
    value: "second floor",
    label: "Second Floor",
  },
  {
    value: "third floor",
    label: "Third Floor",
  },
  {
    value: "fourth floor",
    label: "Fourth Floor",
  },
  {
    value: "fifth floor",
    label: "Fifth Floor",
  },
  {
    value: "sixth floor",
    label: "Sixth Floor",
  },
  {
    value: "seventh floor",
    label: "Seventh Floor",
  },
  {
    value: "eighth floor",
    label: "Eighth Floor",
  },
  {
    value: "ninth floor",
    label: "Ninth Floor",
  },
  {
    value: "tenth floor",
    label: "Tenth Floor",
  },
];

// ======================================================
// BED STATUSES
// ======================================================

const bedStatuses = [
  {
    value: "available",
    label: "Available",
  },
  {
    value: "occupied",
    label: "Occupied",
  },
  {
    value: "booked",
    label: "Booked",
  },
  {
    value: "maintenance",
    label: "Maintenance",
  },
];

// ======================================================
// EMPTY ROOM FORM
// ======================================================

const emptyRoomForm = {
  roomNumber: "",
  roomType: "double",
  monthlyRent: "",
  floor: "ground floor",
  description: "",
  numberOfBeds: "2",
};

// ======================================================
// FLOOR ORDER
// ======================================================

const floorOrder = {
  "ground floor": 0,
  "first floor": 1,
  "second floor": 2,
  "third floor": 3,
  "fourth floor": 4,
  "fifth floor": 5,
  "sixth floor": 6,
  "seventh floor": 7,
  "eighth floor": 8,
  "ninth floor": 9,
  "tenth floor": 10,
};

// ======================================================
// HELPERS
// ======================================================

const normalizeFloor = (floor) => {
  if (!floor) {
    return "other floor";
  }

  const value = String(floor)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ");

  // Keep common spellings of the same floor under one canonical value.
  if (["ground", "ground floor", "0", "0th floor"].includes(value)) {
    return "ground floor";
  }

  const floorAliases = {
    "1": "first floor", "1st": "first floor", "1st floor": "first floor",
    "floor 1": "first floor", "first": "first floor", "first floor": "first floor",
    "2": "second floor", "2nd": "second floor", "2nd floor": "second floor",
    "floor 2": "second floor", "second": "second floor", "second floor": "second floor",
    "3": "third floor", "3rd": "third floor", "3rd floor": "third floor",
    "floor 3": "third floor", "third": "third floor", "third floor": "third floor",
    "4": "fourth floor", "4th": "fourth floor", "4th floor": "fourth floor",
    "floor 4": "fourth floor", "fourth": "fourth floor", "fourth floor": "fourth floor",
    "5": "fifth floor", "5th": "fifth floor", "5th floor": "fifth floor",
    "floor 5": "fifth floor", "fifth": "fifth floor", "fifth floor": "fifth floor",
    "6": "sixth floor", "6th": "sixth floor", "6th floor": "sixth floor",
    "floor 6": "sixth floor", "sixth": "sixth floor", "sixth floor": "sixth floor",
    "7": "seventh floor", "7th": "seventh floor", "7th floor": "seventh floor",
    "floor 7": "seventh floor", "seventh": "seventh floor", "seventh floor": "seventh floor",
    "8": "eighth floor", "8th": "eighth floor", "8th floor": "eighth floor",
    "floor 8": "eighth floor", "eighth": "eighth floor", "eighth floor": "eighth floor",
    "9": "ninth floor", "9th": "ninth floor", "9th floor": "ninth floor",
    "floor 9": "ninth floor", "ninth": "ninth floor", "ninth floor": "ninth floor",
    "nineth floor": "ninth floor",
    "10": "tenth floor", "10th": "tenth floor", "10th floor": "tenth floor",
    "floor 10": "tenth floor", "tenth": "tenth floor", "tenth floor": "tenth floor",
  };

  return floorAliases[value] || value;
};

const normalizeRoomType = (type) => {
  if (!type) return "other";

  const value = String(type)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\\s+/g, " ");

  const aliases = {
    single: "single",
    "single sharing": "single",
    double: "double",
    "double sharing": "double",
    triple: "triple",
    "triple sharing": "triple",
    "four sharing": "four_sharing",
    "4 sharing": "four_sharing",
    "four": "four_sharing",
    "five sharing": "five_sharing",
    "5 sharing": "five_sharing",
    "five": "five_sharing",
    "six sharing": "six_sharing",
    "6 sharing": "six_sharing",
    "six": "six_sharing",
    "seven sharing": "seven_sharing",
    "7 sharing": "seven_sharing",
    "seven": "seven_sharing",
    "eight sharing": "eight_sharing",
    "8 sharing": "eight_sharing",
    "eight": "eight_sharing",
    "nine sharing": "nine_sharing",
    "9 sharing": "nine_sharing",
    "nine": "nine_sharing",
    "ten sharing": "ten_sharing",
    "10 sharing": "ten_sharing",
    "ten": "ten_sharing",
  };

  return aliases[value] || value.replace(/ /g, "_");
};

const getFloorLabel = (floor) => {
  const normalized =
    normalizeFloor(floor);

  const found = floorOptions.find(
    (item) =>
      item.value === normalized
  );

  if (found) {
    return found.label;
  }

  if (!floor) {
    return "Other Floor";
  }

  return String(floor)
    .trim()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const getRoomTypeLabel = (type) => {
  const normalizedType = normalizeRoomType(type);

  return (
    roomTypes.find(
      (item) => item.value === normalizedType
    )?.label || "Other"
  );
};

const getFloorSortValue = (floor) => {
  const normalized =
    normalizeFloor(floor);

  if (
    Object.prototype.hasOwnProperty.call(
      floorOrder,
      normalized
    )
  ) {
    return floorOrder[normalized];
  }

  const numberMatch =
    normalized.match(/(\d+)/);

  if (numberMatch) {
    return (
      Number(numberMatch[1]) + 10
    );
  }

  return 999;
};

const sortRooms = (roomList) => {
  return [...roomList].sort(
    (a, b) => {
      const floorDifference =
        getFloorSortValue(a.floor) -
        getFloorSortValue(b.floor);

      if (floorDifference !== 0) {
        return floorDifference;
      }

      return String(
        a.roomNumber || ""
      ).localeCompare(
        String(
          b.roomNumber || ""
        ),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );
    }
  );
};

// ======================================================
// GENERATE BED NUMBER
// ======================================================

const getBedLetter = (index) => {
  let result = "";
  let number = index + 1;

  while (number > 0) {
    const remainder =
      (number - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) + result;

    number = Math.floor(
      (number - 1) / 26
    );
  }

  return result;
};

const generateBedNumber = (
  roomNumber,
  index
) => {
  return `${roomNumber}-${getBedLetter(
    index
  )}`;
};

// ======================================================
// COMPONENT
// ======================================================

function RoomsBeds() {
  // ====================================================
  // MESSAGE CARD
  // ====================================================

  const [message, setMessage] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  // ====================================================
  // MAIN DATA
  // ====================================================

  const [pgs, setPgs] =
    useState([]);

  const [activePG, setActivePG] =
    useState(null);

  const [rooms, setRooms] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ====================================================
  // FILTERS
  // ====================================================

  const [search, setSearch] =
    useState("");

  const [floorFilter, setFloorFilter] =
    useState("all");

  const [
    sharingFilter,
    setSharingFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  // ====================================================
  // ROOM UI
  // ====================================================

  const [
    expandedRooms,
    setExpandedRooms,
  ] = useState({});

  const [
    showRoomModal,
    setShowRoomModal,
  ] = useState(false);

  const [
    editingRoom,
    setEditingRoom,
  ] = useState(null);

  const [
    roomForm,
    setRoomForm,
  ] = useState({
    ...emptyRoomForm,
  });

  const [
    submittingRoom,
    setSubmittingRoom,
  ] = useState(false);

  const [
    deletingRoomId,
    setDeletingRoomId,
  ] = useState(null);

  // ====================================================
  // BED UI
  // ====================================================

  const [
    addingBedRoomId,
    setAddingBedRoomId,
  ] = useState(null);

  const [
    updatingBedId,
    setUpdatingBedId,
  ] = useState(null);

  const [
    showBedModal,
    setShowBedModal,
  ] = useState(false);

  const [
    bedTargetRoom,
    setBedTargetRoom,
  ] = useState(null);

  const [
    bedNumber,
    setBedNumber,
  ] = useState("");

  // ====================================================
  // ACTIVE PG
  // ====================================================

  const getStoredPGId = () => {
    return localStorage.getItem(
      "pgmate_active_pg"
    );
  };

  // ====================================================
  // LOAD DATA
  // ====================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const pgResponse =
        await getMyPGsApi();

      const pgList =
        pgResponse?.pgs || [];

      setPgs(pgList);

      if (!pgList.length) {
        setActivePG(null);
        setRooms([]);
        return;
      }

      const storedPGId =
        getStoredPGId();

      const selectedPG =
        pgList.find(
          (pg) =>
            String(pg._id) ===
            String(storedPGId)
        ) || pgList[0];

      setActivePG(selectedPG);

      localStorage.setItem(
        "pgmate_active_pg",
        selectedPG._id
      );

      const roomResponse =
        await getMyRoomsApi(
          selectedPG._id
        );

      setRooms(
        roomResponse?.rooms || []
      );
    } catch (err) {
      console.error(
        "Rooms loading error:",
        err
      );

      setError(
        err.message ||
          "Failed to load rooms."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ====================================================
  // STORAGE CHANGE
  // ====================================================

  useEffect(() => {
    const handleStorageChange =
      () => {
        loadData();
      };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // ====================================================
  // AVAILABLE FLOORS
  // ====================================================

  const availableFloors =
    useMemo(() => {
      const floors = [
        ...new Set(
          rooms
            .map((room) =>
              normalizeFloor(
                room.floor
              )
            )
            .filter(Boolean)
        ),
      ];

      return floors.sort(
        (a, b) =>
          getFloorSortValue(a) -
          getFloorSortValue(b)
      );
    }, [rooms]);

  // ====================================================
  // FILTER ROOMS
  // ====================================================

  const filteredRooms =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        rooms.filter(
          (room) => {
            const roomFloor =
              normalizeFloor(
                room.floor
              );

            const roomType =
              normalizeRoomType(room.roomType);

            const beds =
              room.beds || [];

            const matchesSearch =
              !query ||
              String(
                room.roomNumber ||
                  ""
              )
                .toLowerCase()
                .includes(query) ||
              String(
                room.floor || ""
              )
                .toLowerCase()
                .includes(query) ||
              getRoomTypeLabel(
                roomType
              )
                .toLowerCase()
                .includes(query);

            const matchesFloor =
              floorFilter === "all" ||
              roomFloor ===
                floorFilter;

            const matchesSharing =
              sharingFilter === "all" ||
              roomType ===
                sharingFilter;

            const matchesStatus =
              statusFilter === "all" ||
              beds.some(
                (bed) =>
                  bed.status ===
                  statusFilter
              );

            return (
              matchesSearch &&
              matchesFloor &&
              matchesSharing &&
              matchesStatus
            );
          }
        );

      return sortRooms(filtered);
    }, [
      rooms,
      search,
      floorFilter,
      sharingFilter,
      statusFilter,
    ]);

  // ====================================================
  // GROUP BY FLOOR
  // ====================================================

  const groupedFloors =
    useMemo(() => {
      const groups = {};

      filteredRooms.forEach(
        (room) => {
          const floor =
            normalizeFloor(
              room.floor
            );

          if (!groups[floor]) {
            groups[floor] = [];
          }

          groups[floor].push(room);
        }
      );

      return Object.entries(
        groups
      ).sort(
        ([floorA], [floorB]) =>
          getFloorSortValue(
            floorA
          ) -
          getFloorSortValue(
            floorB
          )
      );
    }, [filteredRooms]);

  // ====================================================
  // STATS
  // ====================================================

  const stats = useMemo(() => {
    let totalBeds = 0;
    let available = 0;
    let occupied = 0;
    let maintenance = 0;

    rooms.forEach(
      (room) => {
        const beds =
          room.beds || [];

        totalBeds += beds.length;

        beds.forEach(
          (bed) => {
            if (
              bed.status ===
              "available"
            ) {
              available += 1;
            }

            if (
              bed.status ===
              "occupied"
            ) {
              occupied += 1;
            }

            if (
              bed.status ===
              "maintenance"
            ) {
              maintenance += 1;
            }
          }
        );
      }
    );

    return {
      rooms: rooms.length,
      beds: totalBeds,
      available,
      occupied,
      maintenance,
    };
  }, [rooms]);

  // ====================================================
  // ROOM FORM CHANGE
  // ====================================================

  const handleRoomChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setRoomForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  // ====================================================
  // OPEN ADD ROOM
  // ====================================================

  const openAddRoom = () => {
    setEditingRoom(null);

    setRoomForm({
      ...emptyRoomForm,
      floor:
        floorFilter !== "all"
          ? floorFilter
          : "ground floor",
      numberOfBeds: "2",
    });

    setError("");
    setShowRoomModal(true);
  };

  // ====================================================
  // OPEN EDIT ROOM
  // ====================================================

  const openEditRoom = (
    room
  ) => {
    setEditingRoom(room);

    setRoomForm({
      roomNumber:
        room.roomNumber ||
        "",

      roomType:
        normalizeRoomType(room.roomType) === "other"
          ? "double"
          : normalizeRoomType(room.roomType),

      monthlyRent:
        room.monthlyRent ?? "",

      floor:
        room.floor ||
        "ground floor",

      description:
        room.description ||
        "",

      numberOfBeds:
        String(
          room.beds?.length || 0
        ),
    });

    setError("");
    setShowRoomModal(true);
  };

  // ====================================================
  // CLOSE ROOM MODAL
  // ====================================================

  const closeRoomModal = () => {
    if (submittingRoom) {
      return;
    }

    setShowRoomModal(false);
    setEditingRoom(null);

    setRoomForm({
      ...emptyRoomForm,
    });
  };

  // ====================================================
  // SAVE ROOM
  // ====================================================

  const handleRoomSubmit =
    async (event) => {
      event.preventDefault();

      if (!activePG?._id) {
        setMessage({
          type: "warning",
          title: "PG Required",
          message:
            "Please select a PG before adding a room.",
        });

        return;
      }

      if (
        !roomForm.roomNumber.trim()
      ) {
        setMessage({
          type: "warning",
          title: "Room Number Required",
          message:
            "Please enter a room number before continuing.",
        });

        return;
      }

      if (
        roomForm.monthlyRent ===
          "" ||
        Number(
          roomForm.monthlyRent
        ) < 0
      ) {
        setMessage({
          type: "warning",
          title: "Invalid Rent",
          message:
            "Please enter a valid monthly rent.",
        });

        return;
      }

      const numberOfBeds =
        Number(
          roomForm.numberOfBeds
        );

      if (
        !editingRoom &&
        (!Number.isInteger(
          numberOfBeds
        ) ||
          numberOfBeds < 1 ||
          numberOfBeds > 26)
      ) {
        setMessage({
          type: "warning",
          title: "Invalid Bed Count",
          message:
            "Please select between 1 and 26 beds for the room.",
        });

        return;
      }

      try {
        setSubmittingRoom(true);
        setError("");

        const payload = {
          pgId: activePG._id,

          roomNumber:
            roomForm.roomNumber.trim(),

          roomType:
            roomForm.roomType,

          monthlyRent:
            Number(
              roomForm.monthlyRent
            ),

          floor:
            normalizeFloor(
              roomForm.floor
            ),

          description:
            roomForm.description.trim(),
        };

        // ==================================================
        // EDIT EXISTING ROOM
        // ==================================================

        if (editingRoom) {
          await updateRoomApi(
            editingRoom._id,
            payload
          );

          setShowRoomModal(false);
          setEditingRoom(null);

          setRoomForm({
            ...emptyRoomForm,
          });

          await loadData();

          setMessage({
            type: "success",
            title: "Room Updated",
            message:
              `Room ${payload.roomNumber} has been updated successfully.`,
          });

          return;
        }

        // ==================================================
        // CREATE ROOM
        // ==================================================

        await createRoomApi(
          payload
        );

        // ==================================================
        // FETCH NEWLY CREATED ROOM
        // ==================================================

        const updatedRoomResponse =
          await getMyRoomsApi(
            activePG._id
          );

        const updatedRooms =
          updatedRoomResponse?.rooms ||
          [];

        const createdRoom =
          updatedRooms.find(
            (room) =>
              String(
                room.roomNumber
              ).toLowerCase() ===
              String(
                payload.roomNumber
              ).toLowerCase()
          );

        if (!createdRoom) {
          throw new Error(
            "Room was created, but the new room could not be found."
          );
        }

        // ==================================================
        // AUTOMATICALLY CREATE BEDS
        // ==================================================

        for (
          let index = 0;
          index < numberOfBeds;
          index += 1
        ) {
          const generatedBedNumber =
            generateBedNumber(
              payload.roomNumber,
              index
            );

          await addBedApi(
            createdRoom._id,
            {
              pgId:
                activePG._id,
              bedNumber:
                generatedBedNumber,
            }
          );
        }

        // ==================================================
        // CLOSE MODAL
        // ==================================================

        setShowRoomModal(false);
        setEditingRoom(null);

        setRoomForm({
          ...emptyRoomForm,
        });

        // ==================================================
        // REFRESH
        // ==================================================

        await loadData();

        setMessage({
          type: "success",
          title: "Room Created",
          message:
            `Room ${payload.roomNumber} and ${numberOfBeds} bed${
              numberOfBeds > 1
                ? "s"
                : ""
            } have been added successfully.`,
        });
      } catch (err) {
        console.error(
          "Room save error:",
          err
        );

        setMessage({
          type: "error",
          title: editingRoom
            ? "Update Failed"
            : "Unable to Add Room",
          message:
            err.message ||
            "Failed to save room.",
        });
      } finally {
        setSubmittingRoom(false);
      }
    };

  // ====================================================
  // DELETE ROOM
  // ====================================================

  const handleDeleteRoom = (
    room
  ) => {
    const beds =
      room.beds || [];

    const occupiedBeds =
      beds.filter(
        (bed) =>
          bed.status ===
          "occupied"
      );

    if (occupiedBeds.length) {
      setMessage({
        type: "warning",
        title: "Cannot Delete Room",
        message:
          "This room has occupied beds. Vacate the tenants before deleting the room.",
      });

      return;
    }

    setDeleteTarget(room);
  };

  // ====================================================
  // CONFIRM DELETE
  // ====================================================

  const confirmDeleteRoom =
    async () => {
      if (!deleteTarget) {
        return;
      }

      try {
        setDeletingRoomId(
          deleteTarget._id
        );

        setError("");

        await deleteRoomApi(
          deleteTarget._id
        );

        const deletedRoomNumber =
          deleteTarget.roomNumber;

        setDeleteTarget(null);

        await loadData();

        setMessage({
          type: "success",
          title: "Room Deleted",
          message:
            `Room ${deletedRoomNumber} has been deleted successfully.`,
        });
      } catch (err) {
        console.error(
          "Delete room error:",
          err
        );

        setDeleteTarget(null);

        setMessage({
          type: "error",
          title: "Delete Failed",
          message:
            err.message ||
            "Failed to delete room.",
        });
      } finally {
        setDeletingRoomId(null);
      }
    };

  // ====================================================
  // OPEN ADD BED
  // ====================================================

  const openAddBed = (
    room
  ) => {
    const existingBeds =
      room.beds || [];

    const nextNumber =
      existingBeds.length;

    const suggested =
      generateBedNumber(
        room.roomNumber,
        nextNumber
      );

    setBedTargetRoom(room);
    setBedNumber(suggested);
    setShowBedModal(true);
  };

  // ====================================================
  // CLOSE ADD BED MODAL
  // ====================================================

  const closeBedModal = () => {
    if (addingBedRoomId) {
      return;
    }

    setShowBedModal(false);
    setBedTargetRoom(null);
    setBedNumber("");
  };

  // ====================================================
  // ADD SINGLE EXTRA BED
  // ====================================================

  const handleAddBed = async (
    event
  ) => {
    event.preventDefault();

    if (!bedTargetRoom) {
      return;
    }

    if (!bedNumber.trim()) {
      setMessage({
        type: "warning",
        title: "Bed Number Required",
        message:
          "Please enter a valid bed number.",
      });

      return;
    }

    if (!activePG?._id) {
      setMessage({
        type: "warning",
        title: "PG Required",
        message:
          "Please select a PG before adding a bed.",
      });

      return;
    }

    try {
      setAddingBedRoomId(
        bedTargetRoom._id
      );

      setError("");

      await addBedApi(
        bedTargetRoom._id,
        {
          pgId:
            activePG._id,
          bedNumber:
            bedNumber.trim(),
        }
      );

      const roomNumber =
        bedTargetRoom.roomNumber;

      const newBedNumber =
        bedNumber.trim();

      setShowBedModal(false);
      setBedTargetRoom(null);
      setBedNumber("");

      await loadData();

      setMessage({
        type: "success",
        title: "Bed Added",
        message:
          `Bed ${newBedNumber} has been added to Room ${roomNumber}.`,
      });
    } catch (err) {
      console.error(
        "Add bed error:",
        err
      );

      setMessage({
        type: "error",
        title: "Unable to Add Bed",
        message:
          err.message ||
          "Failed to add bed.",
      });
    } finally {
      setAddingBedRoomId(null);
    }
  };

  // ====================================================
  // UPDATE BED STATUS
  // ====================================================

  const handleBedStatus =
    async (
      bedId,
      status
    ) => {
      try {
        setUpdatingBedId(
          bedId
        );

        setError("");

        await updateBedStatusApi(
          bedId,
          status
        );

        await loadData();
      } catch (err) {
        console.error(
          "Bed status error:",
          err
        );

        setMessage({
          type: "error",
          title: "Update Failed",
          message:
            err.message ||
            "Failed to update bed status.",
        });
      } finally {
        setUpdatingBedId(null);
      }
    };

  // ====================================================
  // EXPAND ROOM
  // ====================================================

  const toggleRoom = (
    roomId
  ) => {
    setExpandedRooms(
      (previous) => ({
        ...previous,
        [roomId]:
          !previous[roomId],
      })
    );
  };

  // ====================================================
  // CLEAR FILTERS
  // ====================================================

  const clearFilters = () => {
    setSearch("");
    setFloorFilter("all");
    setSharingFilter("all");
    setStatusFilter("all");
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="rooms-page">
        <div className="rooms-page-loading">
          <Loader2
            size={30}
            className="rooms-loading-spinner"
          />

          <p>
            Loading rooms & beds...
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN
  // ====================================================

  return (
    <div className="rooms-page">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="rooms-page-header">
        <div>
          <span className="rooms-page-eyebrow">
            PROPERTY MANAGEMENT
          </span>

         
        </div>

        <button
          className="rooms-add-button"
          onClick={
            openAddRoom
          }
          disabled={!activePG}
          type="button"
        >
          <Plus size={16} />

          <span>
            Add Room
          </span>
        </button>
      </div>

      {/* ==================================================
          PG CARD
      ================================================== */}

      {activePG && (
        <div className="rooms-pg-card">
          <div className="rooms-pg-icon">
            <Building2
              size={21}
            />
          </div>

          <div className="rooms-pg-info">
            <strong>
              {activePG.name}
            </strong>

            <span>
              <MapPin size={11} />

              {activePG.city},{" "}
              {activePG.state}
            </span>
          </div>
        </div>
      )}

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="rooms-error">
          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ==================================================
          STATS
      ================================================== */}

      <div className="rooms-stats">
        <div className="rooms-stat-card">
          <div className="rooms-stat-icon rooms-stat-green">
            <Building2 size={19} />
          </div>

          <div>
            <strong>
              {stats.rooms}
            </strong>

            <span>
              Rooms
            </span>
          </div>
        </div>

        <div className="rooms-stat-card">
          <div className="rooms-stat-icon rooms-stat-blue">
            <BedDouble size={19} />
          </div>

          <div>
            <strong>
              {stats.beds}
            </strong>

            <span>
              Total Beds
            </span>
          </div>
        </div>

        <div className="rooms-stat-card">
          <div className="rooms-stat-icon rooms-stat-available">
            <CheckCircle2
              size={19}
            />
          </div>

          <div>
            <strong>
              {stats.available}
            </strong>

            <span>
              Available
            </span>
          </div>
        </div>

        <div className="rooms-stat-card">
          <div className="rooms-stat-icon rooms-stat-occupied">
            <Users size={19} />
          </div>

          <div>
            <strong>
              {stats.occupied}
            </strong>

            <span>
              Occupied
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================
          SEARCH + FILTERS
      ================================================== */}

      <div className="rooms-toolbar">
        <div className="rooms-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search room number, floor or sharing..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
              type="button"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="rooms-filter-area">
          <div className="rooms-filter-label">
            <SlidersHorizontal
              size={14}
            />

            Filters
          </div>

          <select
            value={floorFilter}
            onChange={(event) =>
              setFloorFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Floors
            </option>

            {availableFloors.map(
              (floor) => (
                <option
                  key={floor}
                  value={floor}
                >
                  {getFloorLabel(
                    floor
                  )}
                </option>
              )
            )}
          </select>

          <select
            value={sharingFilter}
            onChange={(event) =>
              setSharingFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Sharings
            </option>

            {roomTypes.map(
              (type) => (
                <option
                  key={type.value}
                  value={
                    type.value
                  }
                >
                  {type.label}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Beds
            </option>

            {bedStatuses.map(
              (status) => (
                <option
                  key={
                    status.value
                  }
                  value={
                    status.value
                  }
                >
                  {status.label}
                </option>
              )
            )}
          </select>

          {(floorFilter !==
            "all" ||
            sharingFilter !==
              "all" ||
            statusFilter !==
              "all" ||
            search) && (
            <button
              className="rooms-clear-filter"
              onClick={
                clearFilters
              }
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ==================================================
          NO RESULTS
      ================================================== */}

      {groupedFloors.length ===
      0 ? (
        <div className="rooms-empty">
          <div className="rooms-empty-icon">
            <Building2 size={25} />
          </div>

          <h2>
            No matching rooms
          </h2>

          <p>
            No rooms match your
            current floor, sharing,
            bed status or search
            filters.
          </p>

          <button
            onClick={
              clearFilters
            }
            type="button"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="rooms-floor-list">
          {groupedFloors.map(
            ([
              floor,
              floorRooms,
            ]) => (
              <section
                className="rooms-floor-section"
                key={floor}
              >
                {/* FLOOR HEADER */}

                <div className="rooms-floor-header">
                  <div className="rooms-floor-title">
                    <div className="rooms-floor-number">
                      {getFloorSortValue(
                        floor
                      ) + 1}
                    </div>

                    <div>
                      <h2>
                        {getFloorLabel(
                          floor
                        )}
                      </h2>

                      <span>
                        {
                          floorRooms.length
                        }{" "}
                        room
                        {floorRooms.length !==
                        1
                          ? "s"
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="rooms-floor-line" />
                </div>

                {/* ROOMS GRID */}

                <div className="rooms-grid">
                  {floorRooms.map(
                    (room) => {
                      const beds =
                        room.beds ||
                        [];

                      const availableBeds =
                        beds.filter(
                          (bed) =>
                            bed.status ===
                            "available"
                        ).length;

                      const occupiedBeds =
                        beds.filter(
                          (bed) =>
                            bed.status ===
                            "occupied"
                        ).length;

                      const bookedBeds =
                        beds.filter(
                          (bed) =>
                            bed.status ===
                            "booked"
                        ).length;

                      const maintenanceBeds =
                        beds.filter(
                          (bed) =>
                            bed.status ===
                            "maintenance"
                        ).length;

                      const isExpanded =
                        Boolean(
                          expandedRooms[
                            room._id
                          ]
                        );

                      return (
                        <article
                          className="room-card"
                          key={
                            room._id
                          }
                        >
                          {/* ROOM TOP */}

                          <div className="room-card-header">
                            <div className="room-card-icon">
                              <Building2
                                size={23}
                              />
                            </div>

                            <div className="room-card-main">
                              <div className="room-card-title-row">
                                <h2>
                                  {
                                    room.roomNumber
                                  }
                                </h2>

                                <span className="room-type-badge">
                                  {getRoomTypeLabel(
                                    room.roomType
                                  )}
                                </span>
                              </div>

                              <div className="room-card-meta">
                                <span>
                                  <MapPin
                                    size={11}
                                  />

                                  {getFloorLabel(
                                    room.floor
                                  )}
                                </span>

                                <span>
                                  ₹{" "}
                                  {Number(
                                    room.monthlyRent ||
                                      0
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                  /month
                                </span>
                              </div>
                            </div>

                            <div className="room-card-summary">
                              <strong>
                                {
                                  beds.length
                                }
                              </strong>

                              <span>
                                Beds
                              </span>
                            </div>

                            <button
                              className="room-expand-icon"
                              onClick={() =>
                                toggleRoom(
                                  room._id
                                )
                              }
                              type="button"
                            >
                              {isExpanded ? (
                                <ChevronUp
                                  size={16}
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                />
                              )}
                            </button>
                          </div>

                          {/* COLLAPSED OVERVIEW: BED ICONS + RENT */}
                          {beds.length > 0 && (
                            <div
                              className="room-bed-overview"
                              aria-label={`Bed availability in room ${room.roomNumber}`}
                            >
                              <div className="room-bed-icons">
                                {beds.map((bed, index) => (
                                  <BedDouble
                                    key={bed._id || bed.bedNumber || index}
                                    className={`room-bed-overview-icon room-bed-icon-${bed.status || "available"}`}
                                    aria-label={`${bed.bedNumber || `Bed ${index + 1}`}: ${bed.status || "available"}`}
                                    title={`${bed.bedNumber || `Bed ${index + 1}`} — ${bed.status || "available"}`}
                                  />
                                ))}
                              </div>

                              <strong className="room-bed-rent">
                                ₹{Number(
                                  room.bedRent ?? room.monthlyRent ?? 0
                                ).toLocaleString("en-IN")}/bed
                              </strong>
                            </div>
                          )}

                          {/* ROOM SUMMARY */}

                          <div className="room-bed-summary">
                            <span className="bed-summary-available">
                              <CheckCircle2
                                size={11}
                              />

                              {
                                availableBeds
                              }{" "}
                              Available
                            </span>

                            <span className="bed-summary-occupied">
                              <Users
                                size={11}
                              />

                              {
                                occupiedBeds
                              }{" "}
                              Occupied
                            </span>

                            <span className="bed-summary-booked">
                              <CheckCircle2 size={11} />
                              {bookedBeds}{" "}
                              Booked
                            </span>

                            <span className="bed-summary-maintenance">
                              <Wrench
                                size={11}
                              />

                              {
                                maintenanceBeds
                              }{" "}
                              Maintenance
                            </span>
                          </div>

                          {/* EXPANDED CONTENT */}

                          {isExpanded && (
                            <div className="room-card-content">
                              {beds.length >
                              0 ? (
                                <div className="beds-list">
                                  {beds.map(
                                    (
                                      bed
                                    ) => (
                                      <div
                                        className={`bed-item bed-${bed.status}`}
                                        key={
                                          bed._id
                                        }
                                      >
                                        <div className="bed-item-icon">
                                          <BedDouble
                                            size={
                                              17
                                            }
                                          />
                                        </div>

                                        <div className="bed-item-info">
                                          <strong>
                                            {
                                              bed.bedNumber
                                            }
                                          </strong>

                                          <span>
                                            {bed.status ===
                                            "available"
                                              ? "Ready for tenant"
                                              : bed.status ===
                                                "occupied"
                                              ? "Currently occupied"
                                              : bed.status === "booked"
                                              ? "Reserved for tenant"
                                              : "Under maintenance"}
                                          </span>
                                        </div>

                                        <div className="bed-item-actions">
                                          <select
                                            value={bed.status || "available"}
                                            onChange={(event) =>
                                              handleBedStatus(
                                                bed._id,
                                                event.target.value
                                              )
                                            }
                                            disabled={updatingBedId === bed._id}
                                            aria-label={`Change status for ${bed.bedNumber}`}
                                          >
                                            {bedStatuses.map((status) => (
                                              <option
                                                key={status.value}
                                                value={status.value}
                                              >
                                                {status.label}
                                              </option>
                                            ))}
                                          </select>

                                          
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="no-beds">
                                  <BedDouble
                                    size={20}
                                  />

                                  No beds added
                                  yet.
                                </div>
                              )}

                              {/* ROOM ACTIONS */}

                              <div className="room-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditRoom(
                                      room
                                    )
                                  }
                                >
                                  <Pencil
                                    size={13}
                                  />

                                  Edit Room
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRoom(
                                      room
                                    )
                                  }
                                  disabled={
                                    deletingRoomId ===
                                    room._id
                                  }
                                  className="room-delete-action"
                                >
                                  {deletingRoomId ===
                                  room._id ? (
                                    <Loader2
                                      size={
                                        13
                                      }
                                      className="rooms-loading-spinner"
                                    />
                                  ) : (
                                    <Trash2
                                      size={
                                        13
                                      }
                                    />
                                  )}

                                  Delete Room
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddBed(
                                      room
                                    )
                                  }
                                  disabled={
                                    addingBedRoomId ===
                                    room._id
                                  }
                                >
                                  {addingBedRoomId ===
                                  room._id ? (
                                    <Loader2
                                      size={
                                        13
                                      }
                                      className="rooms-loading-spinner"
                                    />
                                  ) : (
                                    <Plus
                                      size={
                                        13
                                      }
                                    />
                                  )}

                                  Add Bed
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    }
                  )}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {/* ==================================================
          ADD / EDIT ROOM MODAL
      ================================================== */}

      {showRoomModal && (
        <div
          className="rooms-modal-overlay"
          onMouseDown={
            closeRoomModal
          }
        >
          <div
            className="rooms-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="rooms-modal-header">
              <div>
                <span>
                  ROOM MANAGEMENT
                </span>

                <h2>
                  {editingRoom
                    ? "Edit Room"
                    : "Add Room"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeRoomModal
                }
                disabled={
                  submittingRoom
                }
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="rooms-form"
              onSubmit={
                handleRoomSubmit
              }
            >
              {/* ROOM NUMBER + SHARING */}

              <div className="rooms-form-row">
                <div className="rooms-form-group">
                  <label>
                    Room Number *
                  </label>

                  <input
                    type="text"
                    name="roomNumber"
                    value={
                      roomForm.roomNumber
                    }
                    onChange={
                      handleRoomChange
                    }
                    placeholder="101"
                    required
                  />
                </div>

                <div className="rooms-form-group">
                  <label>
                    Sharing *
                  </label>

                  <div className="rooms-select-wrapper">
                    <select
                      name="roomType"
                      value={
                        roomForm.roomType
                      }
                      onChange={
                        handleRoomChange
                      }
                      required
                    >
                      {roomTypes.map(
                        (type) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
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
              </div>

              {/* FLOOR + RENT */}

              <div className="rooms-form-row">
                <div className="rooms-form-group">
                  <label>
                    Floor *
                  </label>

                  <div className="rooms-select-wrapper">
                    <select
                      name="floor"
                      value={
                        roomForm.floor
                      }
                      onChange={
                        handleRoomChange
                      }
                      required
                    >
                      {floorOptions.map(
                        (floor) => (
                          <option
                            key={
                              floor.value
                            }
                            value={
                              floor.value
                            }
                          >
                            {
                              floor.label
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

                <div className="rooms-form-group">
                  <label>
                    Monthly Rent *
                  </label>

                  <div className="rooms-input-prefix">
                    <span className="rooms-rupee">
                      ₹
                    </span>

                    <input
                      type="number"
                      name="monthlyRent"
                      min="0"
                      value={
                        roomForm.monthlyRent
                      }
                      onChange={
                        handleRoomChange
                      }
                      placeholder="12000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* NUMBER OF BEDS */}

              {!editingRoom && (
                <div className="rooms-form-group">
                  <label>
                    Number of Beds *
                  </label>

                  <div className="rooms-select-wrapper">
                    <select
                      name="numberOfBeds"
                      value={
                        roomForm.numberOfBeds
                      }
                      onChange={
                        handleRoomChange
                      }
                      required
                    >
                      {Array.from(
                        {
                          length: 10,
                        },
                        (_, index) =>
                          index + 1
                      ).map(
                        (count) => (
                          <option
                            key={count}
                            value={count}
                          >
                            {count}{" "}
                            {count ===
                            1
                              ? "Bed"
                              : "Beds"}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={14}
                    />
                  </div>
                </div>
              )}

              {/* EDIT BED INFO */}

              {editingRoom && (
                <div className="rooms-form-group">
                  <label>
                    Existing Beds
                  </label>

                  <input
                    type="text"
                    value={`${roomForm.numberOfBeds} ${
                      Number(
                        roomForm.numberOfBeds
                      ) === 1
                        ? "Bed"
                        : "Beds"
                    }`}
                    disabled
                  />

                  <small className="rooms-bed-helper">
                    Use "Add Bed" from the
                    room card to add another
                    bed.
                  </small>
                </div>
              )}

              {/* ACTIONS */}

              <div className="rooms-modal-actions">
                <button
                  type="button"
                  className="rooms-cancel-button"
                  onClick={
                    closeRoomModal
                  }
                  disabled={
                    submittingRoom
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rooms-submit-button"
                  disabled={
                    submittingRoom
                  }
                >
                  {submittingRoom ? (
                    <>
                      <Loader2
                        size={14}
                        className="rooms-loading-spinner"
                      />

                      {editingRoom
                        ? "Saving..."
                        : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingRoom ? (
                        <Pencil
                          size={14}
                        />
                      ) : (
                        <Plus
                          size={14}
                        />
                      )}

                      {editingRoom
                        ? "Save Changes"
                        : "Add Room"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          ADD EXTRA BED MODAL
      ================================================== */}

      {showBedModal &&
        bedTargetRoom && (
          <div
            className="rooms-modal-overlay"
            onMouseDown={
              closeBedModal
            }
          >
            <div
              className="rooms-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="rooms-modal-header">
                <div>
                  <span>
                    BED MANAGEMENT
                  </span>

                  <h2>
                    Add Bed
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeBedModal
                  }
                  disabled={
                    Boolean(
                      addingBedRoomId
                    )
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <form
                className="rooms-form"
                onSubmit={
                  handleAddBed
                }
              >
                <div className="rooms-form-group">
                  <label>
                    Room
                  </label>

                  <input
                    type="text"
                    value={`Room ${bedTargetRoom.roomNumber}`}
                    disabled
                  />
                </div>

                <div className="rooms-form-group">
                  <label>
                    Bed Number *
                  </label>

                  <input
                    type="text"
                    value={
                      bedNumber
                    }
                    onChange={(
                      event
                    ) =>
                      setBedNumber(
                        event.target
                          .value
                      )
                    }
                    placeholder="101-B"
                    autoFocus
                    required
                  />
                </div>

                <div className="rooms-modal-actions">
                  <button
                    type="button"
                    className="rooms-cancel-button"
                    onClick={
                      closeBedModal
                    }
                    disabled={
                      Boolean(
                        addingBedRoomId
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rooms-submit-button"
                    disabled={
                      Boolean(
                        addingBedRoomId
                      )
                    }
                  >
                    {addingBedRoomId ? (
                      <>
                        <Loader2
                          size={14}
                          className="rooms-loading-spinner"
                        />

                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus
                          size={14}
                        />

                        Add Bed
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* ==================================================
          MESSAGE CARD
      ================================================== */}

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

      {/* ==================================================
          DELETE CONFIRMATION
      ================================================== */}

      {deleteTarget && (
        <MessageCard
          type="confirm"
          title="Delete Room?"
          message={`Are you sure you want to delete Room ${deleteTarget.roomNumber}? This will also remove its beds.`}
          confirm
          confirmText={
            deletingRoomId
              ? "Deleting..."
              : "Delete"
          }
          cancelText="Cancel"
          onClose={() => {
            if (
              !deletingRoomId
            ) {
              setDeleteTarget(
                null
              );
            }
          }}
          onConfirm={
            confirmDeleteRoom
          }
        />
      )}
    </div>
  );
}

export default RoomsBeds;