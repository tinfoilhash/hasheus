// someone can verify the same file more than once, so only their first
// verification counts. events are already sorted oldest first.
function getFirstEventPerPubkey(events) {
  const seenPubkeys = new Set()

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
function pickSource({ verifierEvents, trustedEvents }) {
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
  let agreeingEvents = []

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

function verificationSorter({ events, currentUser = null }) {
  const verifierEvents = getFirstEventPerPubkey(events)
  const trustedEvents = []
  const untrustedEvents = []

  for (const event of verifierEvents) {
    if (currentUser?.hasTrusted(event.pubkey)) {
      trustedEvents.push(event)
    } else {
      untrustedEvents.push(event)
    }
  }

  return {
    trustedEvents,
    untrustedEvents,
    source: pickSource({ verifierEvents, trustedEvents }),
  }
}

export default verificationSorter
