# Notification worker

Planned: a separate Node process in the same codebase. Generate upcoming jobs from cached prayer times and user settings, then poll due jobs every 30 seconds and deliver Web Push. Use database locking, dedupe keys, status rechecks, bounded retries, and subscription cleanup.
