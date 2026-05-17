/**
 * GmailEmailAdapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailEmailAdapter } from '../../../../../src/infrastructure/driven/email/GmailEmailAdapter.js';
import { EmailSendError } from '../../../../../src/domain/errors/DomainErrors.js';

const mockSendMail = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import nodemailer from 'nodemailer';

describe('GmailEmailAdapter', () => {
  let adapter: GmailEmailAdapter;

  const config = {
    user: 'sender@gmail.com',
    appPassword: 'app-secret-password',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GmailEmailAdapter(config);
  });

  describe('constructor', () => {
    it('should create nodemailer transporter with gmail service and provided credentials', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.appPassword,
        },
      });
    });
  });

  describe('sendWithAttachment', () => {
    const emailOptions = {
      to: 'recipient@example.com',
      subject: 'Your book',
      body: 'Please find the attached book.',
      attachmentPath: '/books/clean-code.epub',
      attachmentFilename: 'clean-code.epub',
    };

    it('should call sendMail with the correct parameters', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'msg-123' });

      await adapter.sendWithAttachment(emailOptions);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: config.user,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.body,
        attachments: [
          {
            filename: emailOptions.attachmentFilename,
            path: emailOptions.attachmentPath,
          },
        ],
      });
    });

    it('should resolve without error when sendMail succeeds', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'msg-123' });

      await expect(adapter.sendWithAttachment(emailOptions)).resolves.toBeUndefined();
    });

    it('should throw EmailSendError when nodemailer fails', async () => {
      const nodemailerError = new Error('Invalid login: 535 credentials rejected');
      mockSendMail.mockRejectedValueOnce(nodemailerError);

      await expect(adapter.sendWithAttachment(emailOptions)).rejects.toThrow(EmailSendError);
    });

    it('should include the recipient in EmailSendError', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(adapter.sendWithAttachment(emailOptions)).rejects.toThrow(
        `Failed to send email to "${emailOptions.to}"`,
      );
    });

    it('should include the original error message as reason in EmailSendError', async () => {
      const nodemailerError = new Error('ECONNREFUSED');
      mockSendMail.mockRejectedValueOnce(nodemailerError);

      await expect(adapter.sendWithAttachment(emailOptions)).rejects.toThrow('ECONNREFUSED');
    });

    it('should throw EmailSendError even when nodemailer throws a non-Error value', async () => {
      mockSendMail.mockRejectedValueOnce('string error');

      await expect(adapter.sendWithAttachment(emailOptions)).rejects.toThrow(EmailSendError);
    });
  });
});
