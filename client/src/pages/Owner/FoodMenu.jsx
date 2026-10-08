import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  UtensilsCrossed,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

import {
  getMyFoodMenuApi,
  getFoodMenuSummaryApi,
  createFoodItemApi,
  updateFoodItemApi,
  deleteFoodItemApi,
} from "../../services/api";

import "./FoodMenu.css";

// ======================================================
// DAYS
// ======================================================

const days = [
  {
    value: "monday",
    label: "Monday",
  },
  {
    value: "tuesday",
    label: "Tuesday",
  },
  {
    value: "wednesday",
    label: "Wednesday",
  },
  {
    value: "thursday",
    label: "Thursday",
  },
  {
    value: "friday",
    label: "Friday",
  },
  {
    value: "saturday",
    label: "Saturday",
  },
  {
    value: "sunday",
    label: "Sunday",
  },
];

// ======================================================
// MEAL TYPES
// ======================================================

const mealTypes = [
  {
    value: "breakfast",
    label: "Breakfast",
    icon: Coffee,
  },
  {
    value: "lunch",
    label: "Lunch",
    icon: Sun,
  },
  {
    value: "dinner",
    label: "Dinner",
    icon: Moon,
  },
  {
    value: "snacks",
    label: "Snacks",
    icon: Cookie,
  },
];

// ======================================================
// FOOD TYPES
// ======================================================

const foodTypes = [
  {
    value: "all",
    label: "All Types",
  },
  {
    value: "veg",
    label: "Vegetarian",
  },
  {
    value: "non_veg",
    label: "Non-Vegetarian",
  },
];

// ======================================================
// DEFAULT MEAL TIMINGS
// ======================================================

const mealTimings = {
  breakfast: {
    from: "07:30 AM",
    to: "09:30 AM",
  },

  lunch: {
    from: "12:30 PM",
    to: "02:30 PM",
  },

  snacks: {
    from: "",
    to: "",
  },

  dinner: {
    from: "07:30 PM",
    to: "09:30 PM",
  },
};

// ======================================================
// EMPTY FORM
// ======================================================

const emptyForm = {
  day: "monday",
  name: "",
  mealType: "breakfast",
  foodType: "veg",
  timingFrom: mealTimings.breakfast.from,
  timingTo: mealTimings.breakfast.to,
};

// ======================================================
// TIME HELPERS
// ======================================================

const convertTo24Hour = (time) => {
  if (!time) {
    return "";
  }

  const cleaned = time
    .trim()
    .toUpperCase();

  const match = cleaned.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3];

  if (
    hour < 1 ||
    hour > 12 ||
    Number(minute) < 0 ||
    Number(minute) > 59
  ) {
    return "";
  }

  if (period === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${minute}`;
};

const convertTo12Hour = (time) => {
  if (!time) {
    return "";
  }

  const cleaned = String(time).trim();

  if (
    cleaned
      .toUpperCase()
      .includes("AM") ||
    cleaned
      .toUpperCase()
      .includes("PM")
  ) {
    return cleaned;
  }

  const match = cleaned.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (!match) {
    return "";
  }

  const hour24 = Number(match[1]);
  const minute = match[2];

  if (
    hour24 < 0 ||
    hour24 > 23
  ) {
    return "";
  }

  let hour12 = hour24 % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  const period =
    hour24 >= 12
      ? "PM"
      : "AM";

  return `${String(hour12).padStart(
    2,
    "0"
  )}:${minute} ${period}`;
};

const normalizeTimeInput = (value) => {
  if (!value) {
    return "";
  }

  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  const match = cleaned.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return `${String(hour).padStart(
    2,
    "0"
  )}:${String(minute).padStart(
    2,
    "0"
  )} ${period}`;
};

// ======================================================
// COMPONENT
// ======================================================

function FoodMenu() {
  const [foodItems, setFoodItems] =
    useState([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      veg: 0,
      nonVeg: 0,
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacks: 0,
      daysCovered: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [dayFilter, setDayFilter] =
    useState("all");

  const [mealFilter, setMealFilter] =
    useState("all");

  const [
    foodTypeFilter,
    setFoodTypeFilter,
  ] = useState("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [form, setForm] =
    useState({
      ...emptyForm,
    });

  // ====================================================
  // ACTIVE PG
  // ====================================================

  const getActivePGId = () => {
    const pgId =
      localStorage.getItem(
        "pgmate_active_pg"
      );

    if (
      !pgId ||
      pgId === "all"
    ) {
      return "";
    }

    return pgId;
  };

  // ====================================================
  // LOAD MENU
  // ====================================================

  const loadFoodMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const pgId =
        getActivePGId();

      if (!pgId) {
        setFoodItems([]);

        setSummary({
          total: 0,
          veg: 0,
          nonVeg: 0,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snacks: 0,
          daysCovered: 0,
        });

        return;
      }

      const [
        menuResponse,
        summaryResponse,
      ] = await Promise.all([
        getMyFoodMenuApi(
          pgId,
          mealFilter,
          foodTypeFilter,
          "all",
          dayFilter
        ),

        getFoodMenuSummaryApi(
          pgId
        ),
      ]);

      setFoodItems(
        menuResponse.foodItems || []
      );

      setSummary(
        summaryResponse.summary || {
          total: 0,
          veg: 0,
          nonVeg: 0,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snacks: 0,
          daysCovered: 0,
        }
      );
    } catch (err) {
      console.error(
        "Food menu loading error:",
        err
      );

      setError(
        err.message ||
          "Failed to load food menu."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoodMenu();
  }, [
    dayFilter,
    mealFilter,
    foodTypeFilter,
  ]);

  // ====================================================
  // SEARCH
  // ====================================================

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return foodItems;
      }

      return foodItems.filter(
        (item) => {
          const name =
            item.name
              ?.toLowerCase() ||
            "";

          const mealType =
            item.mealType
              ?.toLowerCase() ||
            "";

          const foodType =
            item.foodType
              ?.toLowerCase() ||
            "";

          const day =
            item.day
              ?.toLowerCase() ||
            "";

          return (
            name.includes(query) ||
            mealType.includes(query) ||
            foodType.includes(query) ||
            day.includes(query)
          );
        }
      );
    }, [
      foodItems,
      search,
    ]);

  // ====================================================
  // GROUP BY DAY
  // ====================================================

  const groupedByDay =
    useMemo(() => {
      const grouped = {};

      days.forEach(
        (day) => {
          grouped[day.value] = [];
        }
      );

      filteredItems.forEach(
        (item) => {
          if (
            grouped[item.day]
          ) {
            grouped[item.day].push(
              item
            );
          }
        }
      );

      return grouped;
    }, [filteredItems]);

  // ====================================================
  // GET MEAL ITEMS
  // ====================================================

  const getMealItems = (
    day,
    mealType
  ) => {
    return (
      groupedByDay[day]?.filter(
        (item) =>
          item.mealType ===
          mealType
      ) || []
    );
  };

  // ====================================================
  // FORM CHANGE
  // ====================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (
      name === "mealType"
    ) {
      const defaultTiming =
        mealTimings[value] || {
          from: "",
          to: "",
        };

      setForm(
        (previous) => ({
          ...previous,
          mealType: value,
          timingFrom:
            defaultTiming.from,
          timingTo:
            defaultTiming.to,
        })
      );

      return;
    }

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  // ====================================================
  // OPEN ADD
  // ====================================================

  const openAddModal = (
    day = "monday",
    mealType = "breakfast"
  ) => {
    const timing =
      mealTimings[mealType] || {
        from: "",
        to: "",
      };

    setEditingItem(null);

    setForm({
      day,
      name: "",
      mealType,
      foodType: "veg",
      timingFrom:
        timing.from,
      timingTo:
        timing.to,
    });

    setError("");
    setShowModal(true);
  };

  // ====================================================
  // OPEN EDIT
  // ====================================================

  const openEditModal = (
    item
  ) => {
    setEditingItem(item);

    setForm({
      day:
        item.day ||
        "monday",

      name:
        item.name ||
        "",

      mealType:
        item.mealType ||
        "breakfast",

      foodType:
        item.foodType ||
        "veg",

      timingFrom:
        convertTo12Hour(
          item.timingFrom
        ),

      timingTo:
        convertTo12Hour(
          item.timingTo
        ),
    });

    setError("");
    setShowModal(true);
  };

  // ====================================================
  // CLOSE MODAL
  // ====================================================

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setEditingItem(null);

    setForm({
      ...emptyForm,
    });
  };

  // ====================================================
  // GET MEAL ICON
  // ====================================================

  const getMealIcon = (
    mealType
  ) => {
    const meal =
      mealTypes.find(
        (item) =>
          item.value ===
          mealType
      );

    if (!meal) {
      return (
        <UtensilsCrossed
          size={18}
        />
      );
    }

    const Icon =
      meal.icon;

    return <Icon size={18} />;
  };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const pgId =
      getActivePGId();

    if (!pgId) {
      setError(
        "Please select a PG before adding food items."
      );

      return;
    }

    if (
      !form.name.trim()
    ) {
      setError(
        "Food name is required."
      );

      return;
    }

    if (
      !form.timingFrom ||
      !form.timingTo
    ) {
      setError(
        "Please enter both starting and ending time."
      );

      return;
    }

    const formattedFrom =
      normalizeTimeInput(
        form.timingFrom
      );

    const formattedTo =
      normalizeTimeInput(
        form.timingTo
      );

    if (
      !formattedFrom ||
      !formattedTo
    ) {
      setError(
        "Please use AM/PM format, for example 12:30 PM."
      );

      return;
    }

    const timingFrom =
      convertTo24Hour(
        formattedFrom
      );

    const timingTo =
      convertTo24Hour(
        formattedTo
      );

    if (
      !timingFrom ||
      !timingTo
    ) {
      setError(
        "Please enter valid timings."
      );

      return;
    }

    if (
      timingFrom >=
      timingTo
    ) {
      setError(
        "Ending time must be after starting time."
      );

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        pgId,
        day: form.day,
        name: form.name.trim(),
        mealType: form.mealType,
        foodType: form.foodType,
        timingFrom,
        timingTo,
      };

      if (editingItem) {
        await updateFoodItemApi(
          editingItem._id,
          payload
        );
      } else {
        await createFoodItemApi(
          payload
        );
      }

      setShowModal(false);
      setEditingItem(null);

      setForm({
        ...emptyForm,
      });

      await loadFoodMenu();
    } catch (err) {
      console.error(
        "Save food error:",
        err
      );

      setError(
        err.message ||
          "Failed to save food item."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this food item?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");

      await deleteFoodItemApi(
        id
      );

      await loadFoodMenu();
    } catch (err) {
      console.error(
        "Delete food error:",
        err
      );

      setError(
        err.message ||
          "Failed to delete food item."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="food-menu-page">

        <div className="food-loading-card">

          <div className="food-loading-icon">

            <Loader2
              size={24}
              className="food-spinner"
            />

          </div>

          <div>
            <h3>
              Loading food menu...
            </h3>

            <p>
              Fetching your PG
              weekly menu.
            </p>
          </div>

        </div>

      </div>
    );
  }

  // ====================================================
  // MAIN
  // ====================================================

  return (
    <div className="food-menu-page">

      {/* HEADER */}

      <div className="food-menu-header">

        <div>
          <span className="food-menu-eyebrow">
            MEALS
          </span>

          <h1>
            Food Menu
          </h1>

          <p>
            Manage your PG's
            weekly mess menu.
          </p>
        </div>

        <button
          className="food-add-btn"
          onClick={() =>
            openAddModal()
          }
        >
          <Plus size={18} />
          Add Food
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="food-error">

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* STATS */}

      <div className="food-stats">

        <div className="food-stat-card">
          <div className="food-stat-icon">
            <UtensilsCrossed
              size={20}
            />
          </div>

          <div>
            <span>
              Total Items
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>
        </div>

        <div className="food-stat-card">
          <div className="food-stat-icon">
            <Coffee size={20} />
          </div>

          <div>
            <span>
              Breakfast
            </span>

            <strong>
              {summary.breakfast}
            </strong>
          </div>
        </div>

        <div className="food-stat-card">
          <div className="food-stat-icon">
            <Sun size={20} />
          </div>

          <div>
            <span>
              Lunch
            </span>

            <strong>
              {summary.lunch}
            </strong>
          </div>
        </div>

        <div className="food-stat-card">
          <div className="food-stat-icon">
            <Moon size={20} />
          </div>

          <div>
            <span>
              Dinner
            </span>

            <strong>
              {summary.dinner}
            </strong>
          </div>
        </div>

      </div>

      {/* FILTERS */}

      <div className="food-toolbar">

        <div className="food-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search food..."
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>

        <div className="food-filters">

          <select
            value={dayFilter}
            onChange={(
              event
            ) =>
              setDayFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All Days
            </option>

            {days.map(
              (day) => (
                <option
                  key={
                    day.value
                  }
                  value={
                    day.value
                  }
                >
                  {day.label}
                </option>
              )
            )}

          </select>

          <select
            value={
              mealFilter
            }
            onChange={(
              event
            ) =>
              setMealFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All Meals
            </option>

            {mealTypes.map(
              (meal) => (
                <option
                  key={
                    meal.value
                  }
                  value={
                    meal.value
                  }
                >
                  {meal.label}
                </option>
              )
            )}

          </select>

          <select
            value={
              foodTypeFilter
            }
            onChange={(
              event
            ) =>
              setFoodTypeFilter(
                event.target.value
              )
            }
          >

            {foodTypes.map(
              (type) => (
                <option
                  key={
                    type.value
                  }
                  value={
                    type.value
                  }
                >
                  {type.label}
                </option>
              )
            )}

          </select>

        </div>

      </div>

      {/* ==================================================
          WEEKLY MENU
      ================================================== */}

      <div className="weekly-menu">

        {days.map(
          (day, dayIndex) => {

            if (
              dayFilter !==
                "all" &&
              dayFilter !==
                day.value
            ) {
              return null;
            }

            const dayItems =
              groupedByDay[
                day.value
              ] || [];

            const primaryMeals = [
              "breakfast",
              "lunch",
              "dinner",
            ];

            const totalMeals =
              primaryMeals.reduce(
                (
                  total,
                  mealType
                ) =>
                  total +
                  getMealItems(
                    day.value,
                    mealType
                  ).length,
                0
              );

            const snacks =
              getMealItems(
                day.value,
                "snacks"
              );

            return (
              <section
                className="day-section"
                key={
                  day.value
                }
              >

                {/* DAY HEADER */}

                <div className="day-section-header">

                  <div className="day-title-wrap">

                    <div className="day-number">
                      {dayIndex + 1}
                    </div>

                    <div>
                      <h2>
                        {day.label}
                      </h2>

                      <span>
                        {totalMeals}{" "}
                        meal
                        {totalMeals !==
                        1
                          ? "s"
                          : ""}
                        {snacks.length >
                        0
                          ? ` · ${snacks.length} snack${
                              snacks.length !==
                              1
                                ? "s"
                                : ""
                            }`
                          : ""}
                      </span>
                    </div>

                  </div>

                </div>

                {/* BREAKFAST / LUNCH / DINNER */}

                <div className="day-meals">

                  {primaryMeals.map(
                    (mealType) => {

                      const items =
                        getMealItems(
                          day.value,
                          mealType
                        );

                      const meal =
                        mealTypes.find(
                          (item) =>
                            item.value ===
                            mealType
                        );

                      return (
                        <div
                          className="meal-card"
                          key={
                            mealType
                          }
                        >

                          {/* MEAL HEADER */}

                          <div className="meal-card-header">

                            <div className="meal-heading">

                              <div
                                className={`meal-icon meal-${mealType}`}
                              >
                                {getMealIcon(
                                  mealType
                                )}
                              </div>

                              <h3>
                                {
                                  meal.label
                                }
                              </h3>

                            </div>

                            <button
                              className="meal-add-btn"
                              onClick={() =>
                                openAddModal(
                                  day.value,
                                  mealType
                                )
                              }
                              title={`Add ${meal.label}`}
                            >
                              <Plus
                                size={16}
                              />
                            </button>

                          </div>

                          {/* FOOD */}

                          {items.length >
                          0 ? (

                            <div className="meal-food-list">

                              {items.map(
                                (
                                  item
                                ) => (

                                  <div
                                    className="meal-food-item"
                                    key={
                                      item._id
                                    }
                                  >

                                    <div className="meal-food-main">

                                      <span
                                        className={`food-type-dot ${
                                          item.foodType
                                        }`}
                                      />

                                      <div className="meal-food-details">

                                        <h4>
                                          {
                                            item.name
                                          }
                                        </h4>

                                        <span className="meal-time">
                                          {convertTo12Hour(
                                            item.timingFrom
                                          )}{" "}
                                          —{" "}
                                          {convertTo12Hour(
                                            item.timingTo
                                          )}
                                        </span>

                                      </div>

                                    </div>

                                    <div className="meal-food-actions">

                                      <button
                                        onClick={() =>
                                          openEditModal(
                                            item
                                          )
                                        }
                                        title="Edit"
                                      >
                                        <Pencil
                                          size={14}
                                        />
                                      </button>

                                      <button
                                        className="meal-delete-btn"
                                        onClick={() =>
                                          handleDelete(
                                            item._id
                                          )
                                        }
                                        disabled={
                                          deletingId ===
                                          item._id
                                        }
                                        title="Delete"
                                      >
                                        {deletingId ===
                                        item._id ? (
                                          <Loader2
                                            size={14}
                                            className="food-spinner"
                                          />
                                        ) : (
                                          <Trash2
                                            size={14}
                                          />
                                        )}
                                      </button>

                                    </div>

                                  </div>

                                )
                              )}

                            </div>

                          ) : (

                            <div className="meal-empty-content">

                              <span>
                                No menu added
                              </span>

                              <button
                                onClick={() =>
                                  openAddModal(
                                    day.value,
                                    mealType
                                  )
                                }
                              >
                                Add{" "}
                                {
                                  meal.label
                                }
                              </button>

                            </div>

                          )}

                        </div>
                      );
                    }
                  )}

                </div>

                {/* SNACKS */}

                {snacks.length >
                  0 && (

                  <div className="snacks-row">

                    <div className="snacks-label">

                      <Cookie
                        size={17}
                      />

                      <span>
                        Snacks
                      </span>

                    </div>

                    <div className="snacks-items">

                      {snacks.map(
                        (item) => (

                          <div
                            className="snack-item"
                            key={
                              item._id
                            }
                          >

                            <span
                              className={`food-type-dot ${
                                item.foodType
                              }`}
                            />

                            <div>
                              <strong>
                                {
                                  item.name
                                }
                              </strong>

                              <small>
                                {convertTo12Hour(
                                  item.timingFrom
                                )}{" "}
                                —{" "}
                                {convertTo12Hour(
                                  item.timingTo
                                )}
                              </small>
                            </div>

                            <div className="snack-actions">

                              <button
                                onClick={() =>
                                  openEditModal(
                                    item
                                  )
                                }
                                title="Edit"
                              >
                                <Pencil
                                  size={13}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    item._id
                                  )
                                }
                                title="Delete"
                              >
                                <Trash2
                                  size={13}
                                />
                              </button>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                )}

              </section>
            );
          }
        )}

      </div>

      {/* ==================================================
          MODAL
      ================================================== */}

      {showModal && (

        <div
          className="food-modal-overlay"
          onMouseDown={
            closeModal
          }
        >

          <div
            className="food-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="food-modal-header">

              <div>

                <h2>
                  {editingItem
                    ? "Edit Food"
                    : "Add Food"}
                </h2>

                <p>
                  {editingItem
                    ? "Update this mess menu item."
                    : "Add a meal to your PG mess menu."}
                </p>

              </div>

              <button
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="food-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="food-form-group">

                <label>
                  Day *
                </label>

                <select
                  name="day"
                  value={
                    form.day
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  {days.map(
                    (day) => (
                      <option
                        key={
                          day.value
                        }
                        value={
                          day.value
                        }
                      >
                        {day.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="food-form-group">

                <label>
                  Food Name *
                </label>

                <input
                  name="name"
                  type="text"
                  placeholder="e.g. Idli & Sambar"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              <div className="food-form-row">

                <div className="food-form-group">

                  <label>
                    Meal Type *
                  </label>

                  <select
                    name="mealType"
                    value={
                      form.mealType
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    {mealTypes.map(
                      (meal) => (
                        <option
                          key={
                            meal.value
                          }
                          value={
                            meal.value
                          }
                        >
                          {meal.label}
                        </option>
                      )
                    )}

                  </select>

                </div>

                <div className="food-form-group">

                  <label>
                    Food Type *
                  </label>

                  <select
                    name="foodType"
                    value={
                      form.foodType
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="veg">
                      Vegetarian
                    </option>

                    <option value="non_veg">
                      Non-Vegetarian
                    </option>

                  </select>

                </div>

              </div>

              <div className="food-form-row">

                <div className="food-form-group">

                  <label>
                    Timing From *
                  </label>

                  <input
                    name="timingFrom"
                    type="text"
                    placeholder="e.g. 07:30 AM"
                    value={
                      form.timingFrom
                    }
                    onChange={
                      handleChange
                    }
                    onBlur={() => {
                      const formatted =
                        normalizeTimeInput(
                          form.timingFrom
                        );

                      if (formatted) {
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            timingFrom:
                              formatted,
                          })
                        );
                      }
                    }}
                    required
                  />

                </div>

                <div className="food-form-group">

                  <label>
                    Timing To *
                  </label>

                  <input
                    name="timingTo"
                    type="text"
                    placeholder="e.g. 09:30 AM"
                    value={
                      form.timingTo
                    }
                    onChange={
                      handleChange
                    }
                    onBlur={() => {
                      const formatted =
                        normalizeTimeInput(
                          form.timingTo
                        );

                      if (formatted) {
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            timingTo:
                              formatted,
                          })
                        );
                      }
                    }}
                    required
                  />

                </div>

              </div>

              <p className="food-time-help">
                Enter time in AM/PM format,
                for example 07:30 AM or
                12:30 PM.
              </p>

              <div className="food-form-actions">

                <button
                  type="button"
                  className="food-cancel-btn"
                  onClick={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="food-submit-btn"
                  disabled={
                    submitting
                  }
                >

                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="food-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />

                      {editingItem
                        ? "Save Changes"
                        : "Add Food"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default FoodMenu;