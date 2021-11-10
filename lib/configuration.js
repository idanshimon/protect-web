const path = require('path');
const os = require('os');

let ADP_SERVER = 'developer.arxan.com';
if (process.env.PROTECT_LICENSE_REGION === 'Europe') {
  ADP_SERVER = ADP_SERVER.replace('.com', '.eu');
}
const API = `https://api.${ADP_SERVER}/`;
const API_SERVICES = `${API}services/`;
const SUPPORT_EMAIL = 'support@digital.ai';

let binaryName = 'protect-web';
if (os.platform() === 'win32') {
  binaryName += '.exe';
}

const platformMapping = {
  darwin: 'mac',
  win32: 'windows',
  linux: 'linux',
};
const platform = platformMapping[os.platform()];

module.exports = {
  product: 'SecureJS',
  installLocation: path.join(__dirname, '../', 'installs'),
  binaryLocation: path.join(__dirname, '../', `installs/bin/${binaryName}`),
  platform,
  ADP_SERVER,
  API,
  API_SERVICES,
  SUPPORT_EMAIL,
};
