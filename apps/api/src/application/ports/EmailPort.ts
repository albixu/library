/**
 * EmailPort (Driven/Output Port)
 *
 * Defines the contract for sending emails with file attachments.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., NodemailerEmailAdapter) will be an adapter in the infrastructure layer.
 */

/**
 * Options for sending a plain email (no attachment)
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain text body of the email */
  body: string;
}

/**
 * Options for sending an email with an attachment
 */
export interface SendEmailWithAttachmentOptions extends SendEmailOptions {
  /** Absolute file system path to the attachment */
  attachmentPath: string;
  /** Filename to use for the attachment in the email */
  attachmentFilename: string;
}

/**
 * EmailPort Interface
 *
 * Provides operations for sending emails from the application.
 */
export interface EmailPort {
  /**
   * Sends a plain email without attachments
   *
   * @param options - Email recipient, subject, and body
   * @returns Promise resolving when the email has been sent successfully
   * @throws Error if the email could not be sent
   */
  send(options: SendEmailOptions): Promise<void>;

  /**
   * Sends an email with a single file attachment
   *
   * @param options - Email recipient, subject, body, and attachment details
   * @returns Promise resolving when the email has been sent successfully
   * @throws Error if the email could not be sent
   */
  sendWithAttachment(options: SendEmailWithAttachmentOptions): Promise<void>;
}
