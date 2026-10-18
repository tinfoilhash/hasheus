import ReplaceableEventSubscriber from '@/services/replaceable_event_subscriber'
import UserEvent from '@/services/user_event'

class UserSubscriber extends ReplaceableEventSubscriber {
  static EventClass = UserEvent
}

export default UserSubscriber
