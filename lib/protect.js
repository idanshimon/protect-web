const { exec } = require('child-process-promise');
const { binaryLocation, SUPPORT_EMAIL } = require('./configuration');
const utils = require('./utils');

// Add ephemeral token inside the blueprint if none is found but it exists as env variable
const fixUpBlueprint = blueprint => new Promise((resolve, reject) => {
  const updatedBlueprint = blueprint;
  const ephemeralToken = process.env.A4WEB_LICENSE_TOKEN;

  const globalConfigurationKey = utils.getOwnPropertyCaseInsensitive(updatedBlueprint, 'globalConfiguration');
  if (!globalConfigurationKey) {
    if (ephemeralToken) {
      updatedBlueprint.globalConfiguration = {
        ephemeralMode: ephemeralToken,
      };
      resolve(updatedBlueprint);
    }
  } else {
    const ephemeralModeKey = utils.getOwnPropertyCaseInsensitive(updatedBlueprint[globalConfigurationKey], 'ephemeralMode');
    if (!ephemeralModeKey) {
      if (ephemeralToken) {
        updatedBlueprint[globalConfigurationKey].ephemeralMode = ephemeralToken;
        resolve(updatedBlueprint);
      }
    } else {
      // All good
      resolve(updatedBlueprint);
    }
  }

  reject(new Error('Could not find environment variable required to license Arxan for Web: A4WEB_LICENSE_TOKEN. Refer to README file to learn how to set it up.'));
});

const protect = blueprint => fixUpBlueprint(blueprint).then((updatedBlueprint) => {
  const blueprintStr = JSON.stringify(updatedBlueprint);
  return utils.writeTemporaryFile(blueprintStr, '.blueprint').then((blueprintObject) => {
    const cmd = `${binaryLocation} --blueprint ${blueprintObject.name}`;
    return new Promise((resolve, reject) => {
      process.env.SJS_NPM_INVOCATION = true;
      exec(cmd)
        .then(output => resolve({
          stdout: output.stdout,
          stderr: output.stderr,
        }))
        .catch((error) => {
          const errorMessage = error.stderr || `Internal error. Please contact ${SUPPORT_EMAIL} for help resolving this issue.`;
          const message = `${error.stdout}\n${errorMessage}`;
          reject(new Error(message));
        })
        .finally(() => {
          delete process.env.SJS_NPM_INVOCATION;
        });
    });
  });
});

module.exports = protect;
