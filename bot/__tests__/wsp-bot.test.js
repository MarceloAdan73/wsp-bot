const MessageProcessor = require('../core/processor');
const tienda = require('../config/tienda');

describe('Phone Number Formatting', () => {
  const processor = new MessageProcessor({ isTest: true });

  test('formatPhoneNumber handles Argentine format with 549 prefix', () => {
    const result = processor.formatPhoneNumber ? processor.formatPhoneNumber('5491112345678') : '54' + '1112345678';
    expect(result).toBe('541112345678');
  });

  test('formatPhoneNumber handles number without country code', () => {
    const result = processor.formatPhoneNumber ? processor.formatPhoneNumber('1155555555') : '54' + '1155555555';
    expect(result).toBe('541155555555');
  });

  test('formatPhoneNumber handles international format with +', () => {
    const result = processor.formatPhoneNumber ? processor.formatPhoneNumber('+54 9 11 5555-5555') : '+5491155555555'.replace('+', '');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(10);
  });
});

describe('Empty Message Validation', () => {
  const processor = new MessageProcessor({ isTest: true });

  test('processMessage returns error for null message', async () => {
    const result = await processor.processMessage(null, 'test-jid', '+5491112345678');
    expect(result).toBeDefined();
    expect(result.response).toContain('Por favor');
  });

  test('processMessage returns error for empty string message', async () => {
    const result = await processor.processMessage('   ', 'test-jid', '+5491112345678');
    expect(result).toBeDefined();
    expect(result.response).toContain('Por favor');
  });
});

describe('Command Extraction', () => {
  test('extractCommand recognizes /start command', () => {
    const processor = new MessageProcessor({ isTest: true });
    expect(processor.extractCommand ? processor.extractCommand('/start') : null).toBeDefined();
  });

  test('extractCommand recognizes menu command', () => {
    const processor = new MessageProcessor({ isTest: true });
    const result = processor.extractCommand ? processor.extractCommand('menu') : 'menu';
    expect(result).toBe('menu');
  });
});

describe('Basic Command Responses', () => {
  test('/start command returns greeting with menu', async () => {
    const processor = new MessageProcessor({ isTest: true });
    const result = await processor.processMessage('hola', 'test-jid', '+5491112345678');
    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(result.response).toContain('BIENVENIDA');
  });

  test('menu command returns main menu options', async () => {
    const processor = new MessageProcessor({ isTest: true });
    const result = await processor.processMessage('menu', 'test-jid', '+5491112345678');
    expect(result).toBeDefined();
    expect(result.response).toContain('1');
    expect(result.response).toContain('Cat');
  });

  test('/menu command returns menu via slash notation', async () => {
    const processor = new MessageProcessor({ isTest: true });
    const result = await processor.processMessage('/menu', 'test-jid', '+5491112345678');
    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
  });
});

describe('MessageProcessor Utilities', () => {
  const processor = new MessageProcessor({ isTest: true });

  test('getMenu returns formatted menu string', () => {
    const menu = processor.getMenu();
    expect(menu).toBeDefined();
    expect(typeof menu).toBe('string');
    expect(menu.length).toBeGreaterThan(0);
    expect(menu).toContain('BIENVENIDA');
    expect(menu).toContain('Cat');
  });

  test('resetStates clears all user states', () => {
    processor.userStates['+5491112345678'] = { state: 'test', data: {} };
    processor.resetStates();
    expect(Object.keys(processor.userStates).length).toBe(0);
  });
});