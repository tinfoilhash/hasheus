import FollowListEvent from '@/services/follow_list_event'
import ReplaceableEventSubscriber from '@/services/replaceable_event_subscriber'

class FollowListSubscriber extends ReplaceableEventSubscriber {
  static EventClass = FollowListEvent
}

export default FollowListSubscriber
