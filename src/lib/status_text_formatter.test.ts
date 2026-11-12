import statusTextFormatter from '@/lib/status_text_formatter'
import { describe, expect, it } from 'vite-plus/test'

describe('statusTextFormatter', () => {
  it('lowercases the text', () => {
    expect(statusTextFormatter('Unable to Connect')).toBe('unable to connect')
  })

  it('removes a final period', () => {
    expect(statusTextFormatter('the relay is down.')).toBe('the relay is down')
  })

  it('removes several final periods', () => {
    expect(statusTextFormatter('the relay is down...')).toBe('the relay is down')
  })

  it('removes a final period before trailing whitespace', () => {
    expect(statusTextFormatter('the relay is down. \n')).toBe('the relay is down')
  })

  it('keeps periods inside the text', () => {
    expect(statusTextFormatter('relay.hasheus.com is down')).toBe('relay.hasheus.com is down')
  })
})
