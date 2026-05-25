/**
 * GmailEmailAdapter
 *
 * Implements the EmailPort using Nodemailer with Gmail's SMTP service.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * Requires a Gmail account with an App Password (not the regular account password).
 * See: https://support.google.com/accounts/answer/185833
 */

import nodemailer from 'nodemailer';
import type { SendEmailOptions, SendEmailWithAttachmentOptions, EmailPort } from '../../../application/ports/EmailPort.js';
import { EmailSendError } from '../../../domain/errors/DomainErrors.js';

/**
 * Configuration required to authenticate with Gmail SMTP
 */
export interface GmailConfig {
  user: string;
  appPassword: string;
}

/**
 * GmailEmailAdapter
 *
 * Adapter that implements EmailPort using Nodemailer configured for Gmail.
 */
export class GmailEmailAdapter implements EmailPort {
  private readonly transporter: nodemailer.Transporter;
  private readonly user: string;

  constructor(config: GmailConfig) {
    this.user = config.user;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.appPassword,
      },
    });
  }

  /**
   * Sends a plain email without attachments via Gmail SMTP.
   *
   * @param options - Email recipient, subject, and body
   * @throws EmailSendError if Nodemailer fails to send the email
   */
  async send(options: SendEmailOptions): Promise<void> {
    const { to, subject, body } = options;

    try {
      await this.transporter.sendMail({
        from: this.user,
        to,
        subject,
        text: body,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailSendError(to, reason);
    }
  }

  /**
   * Sends an email with a file attachment via Gmail SMTP.
   *
   * @param options - Email recipient, subject, body, and attachment details
   * @throws EmailSendError if Nodemailer fails to send the email
   */
  async sendWithAttachment(options: SendEmailWithAttachmentOptions): Promise<void> {
    const { to, subject, body, attachmentPath, attachmentFilename } = options;

    try {
      await this.transporter.sendMail({
        from: this.user,
        to,
        subject,
        text: body,
        attachments: [
          {
            filename: attachmentFilename,
            path: attachmentPath,
          },
        ],
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailSendError(to, reason);
    }
  }
}
