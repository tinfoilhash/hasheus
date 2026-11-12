// statuses read as one line, like a label, so an error message from anywhere
// is lowercased and loses its final period to match the rest.
const FINAL_PERIOD_PATTERN = /\.+$/

function statusTextFormatter(text: string) {
  return text.trim().toLowerCase().replace(FINAL_PERIOD_PATTERN, '')
}

export default statusTextFormatter
