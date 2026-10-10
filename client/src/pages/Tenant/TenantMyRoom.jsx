import React from "react";
import {
  BedDouble,
  Building2,
  UsersRound,
  Settings2,
  Wifi,
  Fan,
  Lightbulb,
  Plug,
  PanelsTopLeft,
  MapPin,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import "./TenantMyRoom.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const formatRoomType = (value) =>
  String(value || "Not specified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getInitials = (name) =>
  String(name || "Tenant")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const defaultFacilities = [
  { name: "Wi-Fi", icon: Wifi },
  { name: "Bed", icon: BedDouble },
  { name: "Wardrobe", icon: PanelsTopLeft },
  { name: "Fan", icon: Fan },
  { name: "Lights", icon: Lightbulb },
  { name: "Power Outlets", icon: Plug },
];

export default function TenantMyRoom({
  room = {},
  tenant = {},
  pg = {},
  roommates = [],
  facilities,
  loading = false,
}) {
  /*
   * Map these fields to your existing API response if your backend
   * uses different property names.
   */

  const roomNumber = firstValue(
    room.roomNumber,
    room.roomNo,
    room.name,
    room.number,
    room.room?.roomNumber,
    "Not assigned"
  );

  const bedNumber = firstValue(
    tenant.bedNumber,
    tenant.bed?.bedNumber,
    tenant.bed?.number,
    tenant.bed?.name,
    tenant.assignedBed?.bedNumber,
    tenant.assignedBed?.number,
    tenant.assignedBed?.name,
    tenant.bedId?.bedNumber,
    tenant.bedId?.number,
    room.bedNumber,
    room.bed?.bedNumber,
    room.bed?.number,
    room.bed?.name,
    "Not assigned"
  );

  const roomType = firstValue(
    room.roomType,
    room.type,
    room.sharingType,
    room.sharing,
    "Not specified"
  );

  const floor = firstValue(
    room.floorName,
    room.floor?.name,
    room.floor,
    room.floorNumber ? `Floor ${room.floorNumber}` : null,
    "Not specified"
  );

  const monthlyRent = Number(
    firstValue(
      tenant.monthlyRent,
      tenant.rent,
      tenant.bed?.rent,
      room.monthlyRent,
      room.rent,
      room.price,
      0
    )
  );

  const moveInDate = firstValue(
    tenant.joiningDate,
    tenant.moveInDate,
    tenant.checkInDate,
    tenant.createdAt,
    null
  );

  const pgName = firstValue(
    pg.name,
    tenant.pg?.name,
    room.pg?.name,
    "Your PG"
  );

  const status = firstValue(
    tenant.status,
    tenant.bed?.status,
    "Active"
  );

  const roomAddress = firstValue(
    pg.address,
    pg.location,
    tenant.pg?.address,
    tenant.pg?.location,
    ""
  );

  const roommateList = Array.isArray(roommates) ? roommates : [];

  const facilityList =
    Array.isArray(facilities) && facilities.length
      ? facilities.map((facility) =>
          typeof facility === "string"
            ? { name: facility }
            : facility
        )
      : defaultFacilities;

  const roomDetails = [
    ["Room Number", `Room ${roomNumber}`],
    ["Room Type", formatRoomType(roomType)],
    ["Floor", formatRoomType(floor)],
    ["Monthly Rent", money(monthlyRent)],
    ["Bed Number", bedNumber],
    ["Status", status],
    ["Move-in Date", formatDate(moveInDate)],
  ];

  if (loading) {
    return (
      <div className="tmr-loading">
        <div className="tmr-spinner" />
        <p>Loading your room details...</p>
      </div>
    );
  }

  return (
    <div className="tmr-page">

      {/* ROOM HERO */}

      <section className="tmr-hero">
        <div className="tmr-hero-main">
          <div className="tmr-hero-icon">
            <BedDouble size={43} strokeWidth={2} />
          </div>

          <div className="tmr-hero-copy">
            <span className="tmr-eyebrow">ROOM</span>
            <h2>Room {roomNumber}</h2>
            <p>{formatRoomType(roomType)}</p>
          </div>
        </div>

        <div className="tmr-hero-divider" />

        <div className="tmr-hero-info">
          <span className="tmr-eyebrow">BED</span>
          <strong>{bedNumber}</strong>

          <span className="tmr-rent-label">MONTHLY RENT</span>
          <span className="tmr-rent-pill">{money(monthlyRent)}</span>
        </div>
      </section>

      {/* DETAILS AND ROOMMATES */}

      <section className="tmr-content-grid">
        {/* ROOM DETAILS */}

        <article className="tmr-card tmr-details-card">
          <div className="tmr-card-heading">
            <div className="tmr-card-icon">
              <Building2 size={25} />
            </div>

            <div>
              <h3>Room Details</h3>
              <p>Complete details about your room and accommodation.</p>
            </div>
          </div>

          <div className="tmr-details-list">
            {roomDetails.map(([label, value]) => (
              <div className="tmr-detail-row" key={label}>
                <span>{label}</span>

                {label === "Status" ? (
                  <strong className="tmr-active-status">
                    <CheckCircle2 size={17} />
                    {value}
                  </strong>
                ) : (
                  <strong>{value}</strong>
                )}
              </div>
            ))}
          </div>
        </article>

        {/* RIGHT COLUMN */}

        <div className="tmr-right-column">
          {/* ROOMMATES */}

          <article className="tmr-card tmr-roommates-card">
            <div className="tmr-card-heading">
              <div className="tmr-card-icon">
                <UsersRound size={25} />
              </div>

              <div>
                <h3>Roommates</h3>
                <p>Other tenants in your room.</p>
              </div>
            </div>

            <div className="tmr-roommates-list">
              {roommateList.length > 0 ? (
                roommateList.map((roommate, index) => {
                  const name = firstValue(
                    roommate.name,
                    roommate.fullName,
                    roommate.user?.name,
                    roommate.tenant?.name,
                    "Tenant"
                  );

                  const roommateBed = firstValue(
                    roommate.bedNumber,
                    roommate.bed?.bedNumber,
                    roommate.bed?.number,
                    roommate.bed?.name,
                    roommate.bedName,
                    "—"
                  );

                  return (
                    <div
                      className="tmr-roommate-row"
                      key={
                        roommate._id ||
                        roommate.id ||
                        `${name}-${index}`
                      }
                    >
                      <div
                        className={`tmr-roommate-avatar tmr-avatar-${index % 3}`}
                      >
                        {getInitials(name)}
                      </div>

                      <strong className="tmr-roommate-name">
                        {name}
                      </strong>

                      <span className="tmr-roommate-bed">
                        {roommateBed}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="tmr-empty-state">
                  <UsersRound size={25} />
                  <span>No roommate information available.</span>
                </div>
              )}
            </div>
          </article>

          {/* FACILITIES */}

          <article className="tmr-card tmr-facilities-card">
            <div className="tmr-card-heading">
              <div className="tmr-card-icon">
                <Settings2 size={25} />
              </div>

              <div>
                <h3>Room Facilities</h3>
                <p>Facilities available in your room.</p>
              </div>
            </div>

            <div className="tmr-facilities-grid">
              {facilityList.map((facility, index) => {
                const FacilityIcon =
                  facility.iconComponent || defaultFacilities.find(
                    (item) =>
                      item.name.toLowerCase() ===
                      String(facility.name).toLowerCase()
                  )?.icon || Settings2;

                return (
                  <div
                    className="tmr-facility"
                    key={facility._id || facility.name || index}
                  >
                    <FacilityIcon size={27} strokeWidth={2.3} />
                    <span>{facility.name || "Facility"}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}