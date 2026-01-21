/**
 * Mail message type for the activity/mail stream.
 */
export interface Mail {
  id: string
  from: string
  subject: string
  preview: string
  timestamp: string
  read: boolean
}

/**
 * WebSocket message for mail events.
 */
export interface MailReceivedEvent {
  type: 'mail_received'
  payload: Mail
}
