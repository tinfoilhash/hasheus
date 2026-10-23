// anyone can publish an event, so its text has bidi controls removed to keep a
// right-to-left override from changing how it reads ("file\u202eosi.exe").
const BIDI_CONTROL_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g

function bidiControlStripper(text) {
  return text.replaceAll(BIDI_CONTROL_PATTERN, '')
}

export default bidiControlStripper
