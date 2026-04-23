const MessageProcessor = require('./core/processor');

class TestHandler {
  constructor() {
    this.processor = new MessageProcessor({ isTest: true });
  }

  async handleTestMessage(message, phone = '+5491112345678') {
    return await this.processor.processMessage(message, 'test-jid', phone);
  }

  resetStates() {
    this.processor.resetStates();
  }

  getNotifications() {
    return this.processor.getNotifications();
  }

  markNotificationRead(id) {
    const notifications = this.processor.notifications;
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications[idx].read = true;
    }
  }
}

module.exports = new TestHandler();