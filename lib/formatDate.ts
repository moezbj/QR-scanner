export function getFormattedDate() {
  const today = new Date(); // Get the current date

  // Extract day, month, and year
  let day = today.getDate().toString(); // Get the day of the month (1-31)
  let month = (today.getMonth() + 1).toString(); // Get the month (0-11), so add 1
  const year = today.getFullYear(); // Get the full year (e.g., 2023)

  // Add leading zeros if necessary (for single-digit days or months)
  day = String(day).padStart(2, "0");
  month = String(month).padStart(2, "0");

  // Return the formatted date as dd/mm/yyyy
  return `~${day}-${month}-${year}`;
}
