// backend/jest.config.cjs
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.jsx?$": "babel-jest" },
  moduleFileExtensions: ["js", "json"],
  testMatch: ["**/_tests_/**/*.test.js", "**/?(*.)+(spec|test).js"],
  clearMocks: true, //Limpia los mocks entre pruebas automaticamente
};
