function getOrdinal(day) {
  if (day > 3 && day < 21) return "th";

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatTimeByTimezone(timezone, format = "12h") {
  try {
    const now = new Date();

    const options =
      format === "24h"
        ? {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {
            timeZone: timezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          };

    return new Intl.DateTimeFormat("en-US", options).format(now);
  } catch (error) {
    console.error(`[ServerStats] Failed to format time for timezone: ${timezone}`, error);
    return "Invalid Timezone";
  }
}

function formatDateByTimezone(timezone) {
  try {
    const now = new Date();

    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    }).format(now);

    const month = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
    }).format(now);

    const dayNumber = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      day: "numeric",
    }).format(now);

    const ordinal = getOrdinal(Number(dayNumber));

    return `${weekday}, ${month} ${dayNumber}${ordinal}`;
  } catch (error) {
    console.error(`[ServerStats] Failed to format date for timezone: ${timezone}`, error);
    return "Invalid Date";
  }
}

function formatDateTimeByTimezone(timezone, format = "12h") {
  const time = formatTimeByTimezone(timezone, format);
  const date = formatDateByTimezone(timezone);

  if (time === "Invalid Timezone" || date === "Invalid Date") {
    return "Invalid DateTime";
  }

  return `${date} | ${time}`;
}

module.exports = {
  formatTimeByTimezone,
  formatDateByTimezone,
  formatDateTimeByTimezone,
};