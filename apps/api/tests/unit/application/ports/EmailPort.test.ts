import { describe, it, expect, vi } from 'vitest';
import type { EmailPort, SendEmailOptions } from '../../../../src/application/ports/EmailPort.js';

describe('EmailPort', () => {
  describe('contract', () => {
    it('should accept a mock implementation typed as EmailPort', () => {
      const mock: EmailPort = {
        sendWithAttachment: vi.fn().mockResolvedValue(undefined),
      };

      expect(mock).toBeDefined();
      expect(typeof mock.sendWithAttachment).toBe('function');
    });

    it('should call sendWithAttachment with the correct options shape', async () => {
      const mock: EmailPort = {
        sendWithAttachment: vi.fn().mockResolvedValue(undefined),
      };

      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Your book',
        body: 'Please find the book attached.',
        attachmentPath: '/files/book.epub',
        attachmentFilename: 'book.epub',
      };

      await mock.sendWithAttachment(options);

      expect(mock.sendWithAttachment).toHaveBeenCalledOnce();
      expect(mock.sendWithAttachment).toHaveBeenCalledWith(options);
    });

    it('should resolve to void on successful send', async () => {
      const mock: EmailPort = {
        sendWithAttachment: vi.fn().mockResolvedValue(undefined),
      };

      const result = await mock.sendWithAttachment({
        to: 'user@example.com',
        subject: 'Your book',
        body: 'Attached.',
        attachmentPath: '/files/book.epub',
        attachmentFilename: 'book.epub',
      });

      expect(result).toBeUndefined();
    });

    it('should propagate errors thrown by the implementation', async () => {
      const mock: EmailPort = {
        sendWithAttachment: vi.fn().mockRejectedValue(new Error('SMTP connection failed')),
      };

      await expect(
        mock.sendWithAttachment({
          to: 'user@example.com',
          subject: 'Subject',
          body: 'Body',
          attachmentPath: '/path/file.epub',
          attachmentFilename: 'file.epub',
        }),
      ).rejects.toThrow('SMTP connection failed');
    });
  });
});
