function generateOptionsString_(inputParameters = new Map()) {
  const portrait = inputParameters.has('portrait')
    ? `&portrait=${inputParameters.get('portrait')}`
    : '&portrait=false';
  const options = '&exportFormat=pdf&format=pdf' + portrait; // true: Portrait, false: Landscape
  return options;
}
function getFormattedDate_() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1 and zero-pad to two digits
  const day = String(today.getDate()).padStart(2, '0'); // Zero-pad the day to two digits

  const formattedDate = `${year}${month}${day}`;
  return formattedDate;
}
