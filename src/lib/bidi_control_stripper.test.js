import bidiControlStripper from '@/lib/bidi_control_stripper'
import { describe, expect, it } from 'vitest'

describe('bidiControlStripper', () => {
  it.each([
    '\u061c',
    '\u200e',
    '\u200f',
    '\u202a',
    '\u202b',
    '\u202c',
    '\u202d',
    '\u202e',
    '\u2066',
    '\u2067',
    '\u2068',
    '\u2069',
  ])('removes %j', (character) => {
    expect(bidiControlStripper(`file${character}osi.exe`)).toBe('fileosi.exe')
  })

  it('removes every bidi control, not just the first', () => {
    expect(bidiControlStripper('\u202ea\u202eb\u2066')).toBe('ab')
  })

  it('keeps right-to-left text and other characters', () => {
    expect(bidiControlStripper('שלום café 🙂')).toBe('שלום café 🙂')
  })
})
