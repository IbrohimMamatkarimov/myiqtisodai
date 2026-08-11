# [DEAD FILE - not imported anywhere, kept only because no delete tool was
# available to remove it]
#
# This was a duplicate group-goal chat model, written without knowing a
# concurrent session had already built the same feature as GoalMessage
# (app/models/goal_message.py, table goal_messages). That's the real one -
# it's what the API endpoints and the migration chain (0023_goal_messages)
# actually use. Nothing references GoalChatMessage or goal_chat_messages;
# safe to delete this file whenever someone has a delete tool handy.
