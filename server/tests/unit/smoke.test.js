const mongoose = require('mongoose');
const db = require('../helpers/db');

beforeAll(() => db.connect());
afterAll(() => db.disconnect());

test('in-memory database connects and is ready', () => {
  expect(mongoose.connection.readyState).toBe(1);
});
