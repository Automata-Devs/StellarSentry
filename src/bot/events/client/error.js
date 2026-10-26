/**
 * Error Event - Client error
 */
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'error',
  once: false,
  async execute(error) {
    logger.error({ err: error }, 'Discord client error');
    eventBus.emit(EVENTS.BOT_DISCONNECT, { error: error.message });
  },
};