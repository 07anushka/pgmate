import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sun,
  Utensils,
  Moon,
  Info,
  MapPin,
} from "lucide-react";
import "./TenantFoodMenu.css";

const MEALS = [
  {
    key: "breakfast",
    title: "Breakfast",
    time: "7:30 AM – 9:30 AM",
    Icon: Sun,
    color: "breakfast",
  },
  {
    key: "lunch",
    title: "Lunch",
    time: "12:30 PM – 2:30 PM",
    Icon: Utensils,
    color: "lunch",
  },
  {
    key: "dinner",
    title: "Dinner",
    time: "7:30 PM – 9:30 PM",
    Icon: Moon,
    color: "dinner",
  },
];

const getWeekStart = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date, options) =>
  date.toLocaleDateString("en-IN", options);

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const getMealKey = (value) => {
  const text = normalize(value);
  if (text.includes("breakfast") || text.includes("morning")) {
    return "breakfast";
  }
  if (text.includes("lunch") || text.includes("afternoon")) {
    return "lunch";
  }
  if (text.includes("dinner") || text.includes("evening") || text.includes("night")) {
    return "dinner";
  }
  return "";
};

const getItems = (meal) => {
  if (Array.isArray(meal?.items)) return meal.items;
  if (Array.isArray(meal?.foodItems)) return meal.foodItems;
  if (Array.isArray(meal?.menuItems)) return meal.menuItems;
  if (Array.isArray(meal?.dishes)) return meal.dishes;
  if (meal?.name || meal?.itemName || meal?.foodName) return [meal];
  return [];
};

const getItemName = (item) =>
  item?.name ||
  item?.itemName ||
  item?.foodName ||
  item?.title ||
  item?.food ||
  "Menu item";

const getItemDescription = (item) =>
  item?.description ||
  item?.details ||
  item?.subtitle ||
  "";

const isNonVeg = (item) => {
  const values = [
    item?.foodType,
    item?.type,
    item?.category,
    item?.dietType,
    item?.foodCategory,
    item?.dietaryType,
    item?.isVeg,
    item?.veg,
  ];

  const text = values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim().toLowerCase());

  // Explicit non-veg values
  if (
    text.some((value) =>
      [
        "non-veg",
        "non veg",
        "nonveg",
        "non_veg",
        "nonvegetarian",
        "non-vegetarian",
        "non vegetarian",
        "false",
        "0",
      ].includes(value)
    )
  ) {
    return true;
  }

  // Fallback: detect common non-veg dishes by name
  const name = normalize(getItemName(item));

  return /\b(chicken|egg|eggs|mutton|fish|prawn|prawns|seafood|beef|pork|turkey|meat|keema|biryani|biriyani)\b/.test(name);
};


const formatDay = (date) =>
  formatDate(date, { day: "2-digit", month: "short" });

const getDateFromRecord = (record) => {
  const value = record?.date || record?.menuDate || record?.dayDate;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function TenantFoodMenu({
  foodMenu = [],
  tenant = {},
  pg = {},
  loading = false,
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    return today.getDay() === 0 ? 6 : today.getDay() - 1;
  });

  const weekStart = useMemo(() => {
    const monday = getWeekStart(new Date());
    return addDays(monday, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const weekLabel = `${formatDate(weekStart, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} – ${formatDate(weekDays[6], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;

  const records = useMemo(() => {
    if (Array.isArray(foodMenu)) return foodMenu;
    if (Array.isArray(foodMenu?.menus)) return foodMenu.menus;
    if (Array.isArray(foodMenu?.data)) return foodMenu.data;
    if (Array.isArray(foodMenu?.foodMenu)) return foodMenu.foodMenu;
    return [];
  }, [foodMenu]);

  const selectedDate = weekDays[selectedDay];

  const dayRecords = useMemo(() => {
    return records.filter((record) => {
      const date = getDateFromRecord(record);
      if (date) {
        return (
          date.getFullYear() === selectedDate.getFullYear() &&
          date.getMonth() === selectedDate.getMonth() &&
          date.getDate() === selectedDate.getDate()
        );
      }

      const dayValue = normalize(
        record?.day || record?.dayOfWeek || record?.weekday
      );
      const selectedName = normalize(
        formatDate(selectedDate, { weekday: "long" })
      );

      return dayValue === selectedName ||
        dayValue === selectedName.slice(0, 3);
    });
  }, [records, selectedDate]);

  const mealGroups = useMemo(() => {
    return MEALS.map((meal) => {
      const matchingRecords = dayRecords.filter((record) => {
        const mealName =
          record?.mealType ||
          record?.meal ||
          record?.mealName ||
          record?.type;

        return getMealKey(mealName) === meal.key;
      });

      const items = matchingRecords.flatMap(getItems);

      return { ...meal, items };
    });
  }, [dayRecords]);

  const location = [
    pg?.city || tenant?.city,
    pg?.state || tenant?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="tf-page">

      <main className="tf-content">
        <div className="tf-heading-row">
          <div className="tf-heading">
            <span className="tf-eyebrow">WEEKLY MENU</span>
            <h2>Food Menu</h2>
            <p>Check this week's meals and plan your day.</p>
          </div>

          <div className="tf-week-control">
            <div className="tf-calendar-icon">
              <CalendarDays size={23} />
            </div>
            <div className="tf-week-label">
              <span>Week of</span>
              <strong>{weekLabel}</strong>
            </div>
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWeekOffset((value) => value - 1)}
            >
              <ChevronLeft size={21} />
            </button>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWeekOffset((value) => value + 1)}
            >
              <ChevronRight size={21} />
            </button>
          </div>
        </div>

        <nav className="tf-day-tabs" aria-label="Choose menu day">
          {weekDays.map((date, index) => (
            <button
              key={date.toISOString()}
              type="button"
              className={selectedDay === index ? "active" : ""}
              onClick={() => setSelectedDay(index)}
            >
              <strong>
                {formatDate(date, { weekday: "short" })}
              </strong>
              <span>{formatDay(date)}</span>
            </button>
          ))}
        </nav>

        <section className="tf-menu-panel">
          <div className="tf-selected-heading">
            <h3>
              {formatDate(selectedDate, {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <span className="tf-meal-count">
              {mealGroups.filter((meal) => meal.items.length > 0).length} meals
            </span>
          </div>

          {loading ? (
            <div className="tf-empty">
              Loading this week's menu...
            </div>
          ) : (
            <div className="tf-meals">
              {mealGroups.map((meal) => {
                const MealIcon = meal.Icon;

                return (
                  <article
                    key={meal.key}
                    className={`tf-meal-section tf-${meal.color}`}
                  >
                    <div className="tf-meal-heading">
                      <div className="tf-meal-icon">
                        <MealIcon size={28} strokeWidth={1.8} />
                      </div>
                      <div className="tf-meal-title">
                        <h4>{meal.title}</h4>
                        <span>{meal.time}</span>
                      </div>
                      <span className="tf-meal-count">
                        {meal.items.length}{" "}
                        {meal.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>

                    {meal.items.length > 0 ? (
                      <div className="tf-food-grid">
                        {meal.items.map((item, index) => {
                          const nonVeg = isNonVeg(item);

                          return (
                            <div
                              className="tf-food-item"
                              key={item?._id || item?.id || `${meal.key}-${index}`}
                            >
                              <div className="tf-food-icon">
                                <Utensils size={25} strokeWidth={1.7} />
                              </div>

                              <div className="tf-food-copy">
                                <strong>{getItemName(item)}</strong>
                                {getItemDescription(item) && (
                                  <span>{getItemDescription(item)}</span>
                                )}
                              </div>

                              <span
                                className={`tf-diet-badge ${
                                  nonVeg ? "nonveg" : "veg"
                                }`}
                              >
                                {nonVeg ? "Non-Veg" : "Veg"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="tf-no-items">
                        No {meal.title.toLowerCase()} menu added for this day.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="tf-note">
            <Info size={19} />
            <p>
              <strong>Note:</strong> Menu may vary based on availability of
              ingredients.
            </p>
          </div>
        </section>

        {location && (
          <div className="tf-location">
            <MapPin size={15} />
            <span>{location}</span>
          </div>
        )}
      </main>
    </div>
  );
}