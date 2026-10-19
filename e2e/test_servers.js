// separate ports from `npm run dev` and a local `nak serve`, so tests can run
// alongside them.
const RELAY_PORT = 10548
const APP_PORT = 5181
const RELAY_URL = `ws://localhost:${RELAY_PORT}`

export { APP_PORT, RELAY_PORT, RELAY_URL }
