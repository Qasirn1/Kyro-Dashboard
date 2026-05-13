const TIMEZONE_CHOICES = [
  { name: "Karachi — Asia/Karachi", value: "Asia/Karachi" },
  { name: "Lahore — Asia/Karachi", value: "Asia/Karachi" },
  { name: "Dubai — Asia/Dubai", value: "Asia/Dubai" },
  { name: "Riyadh — Asia/Riyadh", value: "Asia/Riyadh" },
  { name: "Doha — Asia/Qatar", value: "Asia/Qatar" },
  { name: "Istanbul — Europe/Istanbul", value: "Europe/Istanbul" },
  { name: "London — Europe/London", value: "Europe/London" },
  { name: "Manchester — Europe/London", value: "Europe/London" },
  { name: "Birmingham — Europe/London", value: "Europe/London" },
  { name: "Paris — Europe/Paris", value: "Europe/Paris" },
  { name: "Berlin — Europe/Berlin", value: "Europe/Berlin" },
  { name: "Rome — Europe/Rome", value: "Europe/Rome" },
  { name: "Madrid — Europe/Madrid", value: "Europe/Madrid" },
  { name: "Amsterdam — Europe/Amsterdam", value: "Europe/Amsterdam" },
  { name: "Athens — Europe/Athens", value: "Europe/Athens" },
  { name: "Moscow — Europe/Moscow", value: "Europe/Moscow" },
  { name: "New York — America/New_York", value: "America/New_York" },
  { name: "Chicago — America/Chicago", value: "America/Chicago" },
  { name: "Denver — America/Denver", value: "America/Denver" },
  { name: "Los Angeles — America/Los_Angeles", value: "America/Los_Angeles" },
  { name: "Toronto — America/Toronto", value: "America/Toronto" },
  { name: "Vancouver — America/Vancouver", value: "America/Vancouver" },
  { name: "Mexico City — America/Mexico_City", value: "America/Mexico_City" },
  { name: "São Paulo — America/Sao_Paulo", value: "America/Sao_Paulo" },
  { name: "Buenos Aires — America/Argentina/Buenos_Aires", value: "America/Argentina/Buenos_Aires" },
  { name: "Tokyo — Asia/Tokyo", value: "Asia/Tokyo" },
  { name: "Seoul — Asia/Seoul", value: "Asia/Seoul" },
  { name: "Beijing — Asia/Shanghai", value: "Asia/Shanghai" },
  { name: "Shanghai — Asia/Shanghai", value: "Asia/Shanghai" },
  { name: "Hong Kong — Asia/Hong_Kong", value: "Asia/Hong_Kong" },
  { name: "Singapore — Asia/Singapore", value: "Asia/Singapore" },
  { name: "Bangkok — Asia/Bangkok", value: "Asia/Bangkok" },
  { name: "Jakarta — Asia/Jakarta", value: "Asia/Jakarta" },
  { name: "Delhi — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Mumbai — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Kolkata — Asia/Kolkata", value: "Asia/Kolkata" },
  { name: "Dhaka — Asia/Dhaka", value: "Asia/Dhaka" },
  { name: "Kathmandu — Asia/Kathmandu", value: "Asia/Kathmandu" },
  { name: "Colombo — Asia/Colombo", value: "Asia/Colombo" },
  { name: "Sydney — Australia/Sydney", value: "Australia/Sydney" },
  { name: "Melbourne — Australia/Melbourne", value: "Australia/Melbourne" },
  { name: "Brisbane — Australia/Brisbane", value: "Australia/Brisbane" },
  { name: "Adelaide — Australia/Adelaide", value: "Australia/Adelaide" },
  { name: "Perth — Australia/Perth", value: "Australia/Perth" },
  { name: "Auckland — Pacific/Auckland", value: "Pacific/Auckland" }
];

function searchTimezoneChoices(query) {
  const q = (query || "").toLowerCase().trim();

  if (!q) {
    return TIMEZONE_CHOICES.slice(0, 25);
  }

  return TIMEZONE_CHOICES
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    )
    .slice(0, 25);
}

module.exports = {
  TIMEZONE_CHOICES,
  searchTimezoneChoices
};