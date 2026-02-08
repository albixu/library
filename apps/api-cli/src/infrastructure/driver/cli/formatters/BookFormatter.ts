/**
 * Book Formatter
 *
 * Formats book data for CLI visual output with box-drawing characters.
 * Creates a visually appealing display of book information after successful creation.
 */

/**
 * Input structure for book formatting
 */
export interface BookFormatInput {
  id: string;
  title: string;
  author: string;
  description: string;
  type: string;
  format: string;
  categories: Array<{ id: string; name: string }>;
  isbn: string | null;
  available: boolean;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Box width for the formatted output
 */
const BOX_WIDTH = 55;

/**
 * Maximum length for category list display before truncation
 */
const MAX_CATEGORIES_LENGTH = 35;

/**
 * Maximum length for path display before truncation
 */
const MAX_PATH_LENGTH = 35;

/**
 * Formats a book creation success message with visual box
 *
 * @param book - The book data to format
 * @returns Formatted string for CLI output
 */
export function formatBookCreated(book: BookFormatInput): string {
  const lines: string[] = [];

  // Success message
  lines.push('');
  lines.push('✓ Libro creado exitosamente');
  lines.push('');

  // Top border
  lines.push(`┌${'─'.repeat(BOX_WIDTH - 2)}┐`);

  // Title (centered, prominent)
  lines.push(formatBoxLine(book.title, BOX_WIDTH));

  // Separator
  lines.push(`├${'─'.repeat(BOX_WIDTH - 2)}┤`);

  // Book details
  lines.push(formatField('Autor', book.author, BOX_WIDTH));
  lines.push(formatField('Tipo', book.type, BOX_WIDTH));
  lines.push(formatField('Formato', book.format, BOX_WIDTH));
  lines.push(
    formatField('Categorías', formatCategories(book.categories), BOX_WIDTH)
  );
  lines.push(formatField('ISBN', book.isbn ?? 'N/A', BOX_WIDTH));
  lines.push(formatField('Ruta', formatPath(book.path), BOX_WIDTH));
  lines.push(
    formatField('Disponible', book.available ? '✓' : '✗', BOX_WIDTH)
  );
  lines.push(formatField('ID', book.id, BOX_WIDTH));

  // Bottom border
  lines.push(`└${'─'.repeat(BOX_WIDTH - 2)}┘`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Formats a centered line within a box
 */
function formatBoxLine(text: string, width: number): string {
  const innerWidth = width - 4; // Account for borders and padding
  const truncatedText = truncateText(text, innerWidth);
  const padding = Math.max(0, innerWidth - truncatedText.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return `│ ${' '.repeat(leftPad)}${truncatedText}${' '.repeat(rightPad)} │`;
}

/**
 * Formats a field with label and value
 */
function formatField(label: string, value: string, width: number): string {
  const labelWidth = 12;
  const innerWidth = width - 4; // Account for borders and padding
  const valueWidth = innerWidth - labelWidth - 1; // -1 for space between label and value

  const paddedLabel = label.padEnd(labelWidth);
  const truncatedValue = truncateText(value, valueWidth);
  const paddedValue = truncatedValue.padEnd(valueWidth);

  return `│ ${paddedLabel}${paddedValue} │`;
}

/**
 * Formats category list, truncating if too long
 */
function formatCategories(
  categories: Array<{ id: string; name: string }>
): string {
  const names = categories.map((c) => c.name);
  const fullText = names.join(', ');

  if (fullText.length <= MAX_CATEGORIES_LENGTH) {
    return fullText;
  }

  // Truncate and add ellipsis
  return fullText.substring(0, MAX_CATEGORIES_LENGTH - 3) + '...';
}

/**
 * Formats path, truncating if too long or showing N/A
 */
function formatPath(path: string | null): string {
  if (!path) {
    return 'N/A';
  }

  if (path.length <= MAX_PATH_LENGTH) {
    return path;
  }

  // Truncate from the beginning to show the end of the path
  return '...' + path.substring(path.length - MAX_PATH_LENGTH + 3);
}

/**
 * Truncates text to fit within a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}
