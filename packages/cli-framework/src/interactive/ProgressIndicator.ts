/**
 * Progress indicators (progress bars and spinners)
 */

import { stdout } from 'process';
import { c } from '../utils/colors.js';
import type { ProgressOptions, SpinnerOptions } from '../types.js';

export class ProgressBar {
  private startTime: number = Date.now();

  constructor(private options: ProgressOptions) {
    if (this.options.current === undefined) {
      this.options.current = 0;
    }
    if (this.options.barLength === undefined) {
      this.options.barLength = 40;
    }
    if (this.options.showPercentage === undefined) {
      this.options.showPercentage = true;
    }
    if (this.options.showEta === undefined) {
      this.options.showEta = true;
    }
  }

  /**
   * Update progress
   */
  update(current: number): void {
    this.options.current = current;
    this.render();
  }

  /**
   * Increment progress
   */
  increment(amount = 1): void {
    this.options.current = (this.options.current || 0) + amount;
    this.render();
  }

  /**
   * Complete the progress bar
   */
  complete(): void {
    this.options.current = this.options.total;
    this.render();
    stdout.write('\n');
  }

  /**
   * Render the progress bar
   */
  private render(): void {
    const { current = 0, total, label, barLength = 40, showPercentage, showEta } = this.options;

    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((barLength * current) / total);
    const empty = barLength - filled;

    // Build bar
    const bar = c.green('█'.repeat(filled)) + c.dim('░'.repeat(empty));

    // Build parts
    const parts: string[] = [];

    if (label) {
      parts.push(label);
    }

    parts.push(`[${bar}]`);

    if (showPercentage) {
      parts.push(`${percentage.toFixed(1)}%`);
    }

    parts.push(`${current}/${total}`);

    if (showEta && current > 0 && current < total) {
      const elapsed = Date.now() - this.startTime;
      const rate = current / elapsed;
      const remaining = (total - current) / rate;
      const eta = this.formatDuration(remaining);
      parts.push(c.dim(`ETA: ${eta}`));
    }

    // Clear line and write
    stdout.clearLine(0);
    stdout.cursorTo(0);
    stdout.write(parts.join(' '));
  }

  /**
   * Format duration in ms to human readable
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

export class Spinner {
  private frames: string[];
  private interval: number;
  private currentFrame = 0;
  private timer?: NodeJS.Timeout;
  private text: string;

  constructor(options: SpinnerOptions = {}) {
    this.frames = options.frames || ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.interval = options.interval || 80;
    this.text = options.text || '';
  }

  /**
   * Start the spinner
   */
  start(text?: string): this {
    if (text) {
      this.text = text;
    }

    this.timer = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, this.interval);

    return this;
  }

  /**
   * Update spinner text
   */
  update(text: string): this {
    this.text = text;
    return this;
  }

  /**
   * Stop the spinner with a success message
   */
  success(text?: string): void {
    this.stop();
    stdout.clearLine(0);
    stdout.cursorTo(0);
    stdout.write(`${c.green('✓')} ${text || this.text}\n`);
  }

  /**
   * Stop the spinner with an error message
   */
  error(text?: string): void {
    this.stop();
    stdout.clearLine(0);
    stdout.cursorTo(0);
    stdout.write(`${c.red('✗')} ${text || this.text}\n`);
  }

  /**
   * Stop the spinner with a warning message
   */
  warning(text?: string): void {
    this.stop();
    stdout.clearLine(0);
    stdout.cursorTo(0);
    stdout.write(`${c.yellow('⚠')} ${text || this.text}\n`);
  }

  /**
   * Stop the spinner
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      stdout.clearLine(0);
      stdout.cursorTo(0);
    }
  }

  /**
   * Render the spinner
   */
  private render(): void {
    stdout.clearLine(0);
    stdout.cursorTo(0);
    const frame = c.cyan(this.frames[this.currentFrame]);
    stdout.write(`${frame} ${this.text}`);
  }
}

/**
 * Multi-line progress manager
 */
export class MultiProgress {
  private bars: Map<string, ProgressBar> = new Map();
  private lines = 0;

  /**
   * Add a progress bar
   */
  add(id: string, options: ProgressOptions): ProgressBar {
    const bar = new ProgressBar(options);
    this.bars.set(id, bar);
    this.lines++;
    return bar;
  }

  /**
   * Remove a progress bar
   */
  remove(id: string): void {
    this.bars.delete(id);
    this.lines--;
  }

  /**
   * Clear all progress bars
   */
  clear(): void {
    for (let i = 0; i < this.lines; i++) {
      stdout.moveCursor(0, -1);
      stdout.clearLine(0);
    }
    stdout.cursorTo(0);
  }
}
