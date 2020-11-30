const request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const querystring = require('querystring');
const path = require('path');
const dmg = require('dmg');
const configuration = require('./configuration');

const { SUPPORT_EMAIL } = configuration;

const exitWithMessage = (message) => {
  // eslint-disable-next-line no-console
  console.error(message);
  fs.removeSync(configuration.installLocation);
  process.exit(1);
};

const apiKey = process.env.A4WEB_API_KEY;
const apiSecret = process.env.A4WEB_API_SECRET;
if (!apiKey || !apiSecret) {
  exitWithMessage('Could not find environment variables required to download Arxan for Web: A4WEB_API_KEY and A4WEB_API_SECRET. Refer to README to learn how to set it up correctly.');
}

// Get an authentication token
const authenticate = (key, secret) => {
  const options = {
    method: 'POST',
    uri: `${configuration.API}/services/oauth2/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: {
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    },
    json: true,
  };

  return request(options)
    .then(response => ({
      type: response.token_type,
      token: response.access_token,
    }))
    .catch((error) => {
      exitWithMessage(`Authentication failed. Error message: ${error.message}`);
    });
};

// Get the package name given the version
const getPackageName = (accessToken) => {
  const headers = {
    product: configuration.product,
    version: '3.9.0',
  };
  const urlArguments = querystring.stringify(headers);
  const options = {
    method: 'GET',
    uri: `${configuration.API_SERVICES}download/v1/filelist?${urlArguments}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    json: true,
  };

  return request(options)
    .then((response) => {
      const filteredNames = response
        .filter(file => file.platform === configuration.platform)
        .filter(file => file.filename.startsWith('Arxan-for-Web') || file.filename.startsWith('a4web'));
      if (!filteredNames.length) {
        exitWithMessage(`Arxan for Web 3.9.0 could not be downloaded. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`);
      }
      return filteredNames[0].filename;
    })
    .catch(() => {
      exitWithMessage('Arxan for Web 3.9.0 could not be downloaded. Make sure you have the "Product download" entitlement associated with the API key.');
    });
};

const isDmgPackage = filename => filename.endsWith('.dmg');

// Get the package and extract it
const getPackage = (accessToken, filename) => {
  const headers = {
    product: configuration.product,
    version: '3.9.0',
    filename,
  };
  const urlArguments = querystring.stringify(headers);
  const options = {
    uri: `${configuration.API_SERVICES}download/v1/file?${urlArguments}`,
    headers: {
      authorization: `${accessToken.type} ${accessToken.token}`,
    },
    extract: !isDmgPackage(filename),
  };

  fs.removeSync(configuration.installLocation);
  fs.ensureDirSync(configuration.installLocation);

  return download(options.uri, configuration.installLocation, options)
    .catch((error) => {
      exitWithMessage(`Failed to download Arxan for Web 3.9.0. Error message: ${error.message}`);
    });
};

// Extract DMG into install location
const extractDmg = (filename) => {
  const downloadedFile = path.join(configuration.installLocation, filename);

  dmg.mount(downloadedFile, (mountError, mountPath) => {
    if (mountError) exitWithMessage(`Failed to mount Arxan for Web 3.9.0 DMG package. ${mountError.message}`);
    fs.copySync(mountPath, configuration.installLocation);
    dmg.unmount(mountPath, (unmountError) => {
      if (unmountError) exitWithMessage(`Failed to unmount Arxan for Web 3.9.0 DMG package. ${unmountError.message}`);
      fs.removeSync(downloadedFile);
    });
  });
};

const metadataFile = path.join(configuration.installLocation, 'metadata.json');

// Write the version of just downloaded file into a metadata file
const writeMetadataFile = () => {
  const jsonContents = {
    version: '3.9.0',
  };
  fs.writeJson(metadataFile, jsonContents)
    .catch(() => {
      exitWithMessage(`Internal error: Failed to write to metadata.json. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`);
    });
};

// Read the metadata file for the version
const readMetadataFile = () => {
  const jsonContents = fs.readJsonSync(metadataFile, { throws: false });
  if (!jsonContents) {
    return {};
  }
  return jsonContents;
};

const downloadPackage = () => {
  authenticate(apiKey, apiSecret).then((accessToken) => {
    getPackageName(accessToken).then((packageName) => {
      getPackage(accessToken, packageName).then(() => {
        if (isDmgPackage(packageName)) extractDmg(packageName);
        writeMetadataFile();
      });
    });
  });
};

const metadata = readMetadataFile();
if (metadata.version !== '3.9.0') {
  downloadPackage();
}
