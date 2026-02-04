#!/usr/bin/env node
/**
 * Patches React Native's libs.versions.toml to use AGP 8.10.1 instead of 8.11.0
 * so Android Studio (which supports up to 8.10.1) can sync. Run automatically after npm install.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'node_modules/react-native/gradle/libs.versions.toml',
  'node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml',
];

files.forEach((rel) => {
  const f = path.join(root, rel);
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes('agp = "8.11.0"')) {
      fs.writeFileSync(f, c.replace(/agp = "8.11.0"/g, 'agp = "8.10.1"'));
      console.log('patched AGP to 8.10.1:', rel);
    }
  }
});
