/**
 * Mail message type for the activity/mail stream.
 */
export interface Mail {
  id: string
  from: string
  to?: string
  subject: string
  body?: string
  preview?: string
  timestamp: string
  read: boolean
  priority?: string
  type?: string
  thread_id?: string
}

/**
 * SSE message for mail events.
 */
export interface MailReceivedEvent {
  type: 'mail_received'
  payload: Mail
}
