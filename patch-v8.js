const v8 = require('node:v8');

if (!v8.startupSnapshot) {
  v8.startupSnapshot = {};
}

Object.defineProperty(v8.startupSnapshot, 'isBuildingSnapshot', {
  value: () => false,
  configurable: true,
  writable: true,
});
