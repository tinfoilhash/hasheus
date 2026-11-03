import mimeTypeGuesser from '@/lib/mime_type_guesser'
import { describe, expect, it } from 'vitest'

describe('mimeTypeGuesser', () => {
  it.each([
    ['app.7z', 'application/x-7z-compressed'],
    ['app.apk', 'application/vnd.android.package-archive'],
    ['app.AppImage', 'application/vnd.appimage'],
    ['app.tar.bz2', 'application/x-bzip2'],
    ['app.deb', 'application/vnd.debian.binary-package'],
    ['app.dmg', 'application/x-apple-diskimage'],
    ['app.exe', 'application/vnd.microsoft.portable-executable'],
    ['app.tar.gz', 'application/gzip'],
    ['ubuntu.iso', 'application/x-iso9660-image'],
    ['app.jar', 'application/java-archive'],
    ['manifest.json', 'application/json'],
    ['app.msi', 'application/x-msi'],
    ['bitcoin.pdf', 'application/pdf'],
    ['app.pkg', 'application/vnd.apple.installer+xml'],
    ['app.rpm', 'application/x-rpm'],
    ['app.tar', 'application/x-tar'],
    ['SHA256SUMS.txt', 'text/plain'],
    ['app.tar.xz', 'application/x-xz'],
    ['app.zip', 'application/zip'],
    ['app.tar.zst', 'application/zstd'],
  ])('guesses %j as %s', (filename, mimeType) => {
    expect(mimeTypeGuesser(filename)).toBe(mimeType)
  })

  it('ignores the case of the extension', () => {
    expect(mimeTypeGuesser('UBUNTU.ISO')).toBe('application/x-iso9660-image')
  })

  it.each(['firmware.bin', 'README', 'file.', '.zip', 'zip'])(
    'falls back to the generic mime type for %j',
    (filename) => {
      expect(mimeTypeGuesser(filename)).toBe('application/octet-stream')
    },
  )
})
