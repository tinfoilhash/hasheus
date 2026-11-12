import type CurrentUser from '@/services/current_user'
import type FileEvent from '@/services/file_event'

// someone can verify the same file more than once, so only their first
// verification counts. events are already sorted oldest first.
function getFirstEventPerPubkey(events: FileEvent[]) {
  const seenPubkeys = new Set<string>()

  return events.filter((event) => {
    if (seenPubkeys.has(event.pubkey)) {
      return false
    }

    seenPubkeys.add(event.pubkey)

    return true
  })
}

// anyone can backdate a verification, so the description and url come from
// the url most trusted verifiers agree on, with ties going to the earliest.
function pickSource({
  verifierEvents,
  trustedEvents,
}: {
  verifierEvents: FileEvent[]
  trustedEvents: FileEvent[]
}) {
  if (!trustedEvents.length) {
    return {
      event: verifierEvents[0],
      isTrusted: false,
      agreementCount: 0,
    }
  }

  const eventsByURL = Map.groupBy(
    trustedEvents.filter((event) => event.url),
    (event) => event.url,
  )
  let agreeingEvents: FileEvent[] = []

  for (const events of eventsByURL.values()) {
    if (events.length > agreeingEvents.length) {
      agreeingEvents = events
    }
  }

  return {
    event: agreeingEvents[0] ?? trustedEvents[0],
    isTrusted: true,
    agreementCount: agreeingEvents.length,
  }
}

function verificationSorter({
  events,
  currentUser = null,
}: {
  events: FileEvent[]
  currentUser?: CurrentUser | null
}) {
  const verifierEvents = getFirstEventPerPubkey(events)
  const trustedEvents: FileEvent[] = []
  const unknownEvents: FileEvent[] = []

  for (const event of verifierEvents) {
    if (currentUser?.hasTrusted(event.pubkey)) {
      trustedEvents.push(event)
    } else {
      unknownEvents.push(event)
    }
  }

  return {
    trustedEvents,
    unknownEvents,
    source: pickSource({ verifierEvents, trustedEvents }),
  }
}

export default verificationSorter
