import ReplaceableEventSubscriber from '@/services/replaceable_event_subscriber'
import UserEvent from '@/services/user_event'

class UserSubscriber extends ReplaceableEventSubscriber<UserEvent> {
  readonly EventClass = UserEvent
}

export default UserSubscriber
