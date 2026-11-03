// nip-94 requires a mime type, so an unknown extension gets the generic one,
// like the cli does.
export const GENERIC_MIME_TYPE = 'application/octet-stream'
const MIME_TYPES_BY_EXTENSION = new Map([
  ['7z', 'application/x-7z-compressed'],
  ['apk', 'application/vnd.android.package-archive'],
  ['appimage', 'application/vnd.appimage'],
  ['bz2', 'application/x-bzip2'],
  ['deb', 'application/vnd.debian.binary-package'],
  ['dmg', 'application/x-apple-diskimage'],
  ['exe', 'application/vnd.microsoft.portable-executable'],
  ['gz', 'application/gzip'],
  ['iso', 'application/x-iso9660-image'],
  ['jar', 'application/java-archive'],
  ['json', 'application/json'],
  ['msi', 'application/x-msi'],
  ['pdf', 'application/pdf'],
  ['pkg', 'application/vnd.apple.installer+xml'],
  ['rpm', 'application/x-rpm'],
  ['tar', 'application/x-tar'],
  ['txt', 'text/plain'],
  ['xz', 'application/x-xz'],
  ['zip', 'application/zip'],
  ['zst', 'application/zstd'],
])

// a leading dot starts a hidden file's name rather than an extension.
function mimeTypeGuesser(filename) {
  const dotIndex = filename.lastIndexOf('.')

  if (dotIndex <= 0) {
    return GENERIC_MIME_TYPE
  }

  const extension = filename.slice(dotIndex + 1).toLowerCase()

  return MIME_TYPES_BY_EXTENSION.get(extension) ?? GENERIC_MIME_TYPE
}

export default mimeTypeGuesser
