const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const protect = require('./protect');
const utils = require('./utils');

tmp.setGracefulCleanup();

// Iterate through directory recursively
const iterateDirectory = (directory, prefix, callback) => {
  const entries = fs.readdirSync(directory);
  entries.forEach((entry) => {
    const joinedPath = path.join(directory, entry);
    const prefixedEntry = path.join(prefix, entry);
    const stat = fs.statSync(joinedPath);
    if (stat && stat.isDirectory()) {
      iterateDirectory(joinedPath, prefixedEntry, callback);
    } else {
      callback(prefixedEntry);
    }
  });
};

class WebpackPlugin {
  constructor(blueprint) {
    if (!blueprint) {
      this.blueprint = {
        guardConfigurations: {
          guardConfiguration: {
          },
        },
      };
    } else {
      this.blueprint = blueprint;
      const targetsKey = utils.getOwnPropertyCaseInsensitive(this.blueprint, 'targets');
      if (targetsKey) {
        delete this.blueprint[targetsKey];
      }

      // Search for a target type
      const globalConfigurationKey = utils.getOwnPropertyCaseInsensitive(this.blueprint, 'globalConfiguration');
      if (globalConfigurationKey) {
        const targetTypeKey = utils.getOwnPropertyCaseInsensitive(this.blueprint[globalConfigurationKey], 'targetType');
        if (targetTypeKey) {
          this.targetType = this.blueprint[globalConfigurationKey][targetTypeKey].toLowerCase();
        }
      }
    }

    if (!this.targetType) {
      this.targetType = 'browser';
    }
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('Arxan4WebPlugin', (compilation, callback) => {
      const sources = [];

      const tempInputDirectory = tmp.dirSync({ unsafeCleanup: true });
      const tempOutputDirectory = tmp.dirSync({ unsafeCleanup: true });

      // Debug mode for Native Script requires exact folder structures
      let adjustedInputDirectory;
      let adjustedOutputDirectory;
      switch (this.targetType) {
        case 'nativescript-ios': {
          adjustedInputDirectory = path.join(tempInputDirectory.name, 'app');
          adjustedOutputDirectory = path.join(tempOutputDirectory.name, 'app');
          break;
        }

        case 'nativescript-android': {
          adjustedInputDirectory = path.join(tempInputDirectory.name, 'assets/app');
          adjustedOutputDirectory = path.join(tempOutputDirectory.name, 'assets/app');
          break;
        }

        default: {
          adjustedInputDirectory = tempInputDirectory.name;
          adjustedOutputDirectory = tempOutputDirectory.name;
        }
      }

      // First store chunks in a temporary input folder
      try {
        compilation.chunks.forEach((chunk) => {
          chunk.files.forEach((filename) => {
            if (/\.(js|html|htm|jsbundle|android\.bundle|xhtml|jsp|asp|aspx)$/.test(filename)) {
              const content = compilation.assets[filename].source();
              const tempFile = path.join(adjustedInputDirectory, filename);
              const tempDir = path.dirname(tempFile);
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              fs.writeFileSync(tempFile, content);
              sources.push(filename);
            }
          });
        });
      } catch (error) {
        callback(error.message);
      }

      const blueprint = Object.assign({}, this.blueprint);
      blueprint.targets = {
        target: {
          input: tempInputDirectory.name,
          outputDirectory: tempOutputDirectory.name,
        },
      };

      // Then protect the input folder in one swoop, replacing chunks with protected code
      try {
        protect(blueprint)
          .then(() => {
            iterateDirectory(adjustedOutputDirectory, '.', (source) => {
              const tempFile = path.join(adjustedOutputDirectory, source);
              const contents = fs.readFileSync(tempFile);
              // eslint-disable-next-line no-param-reassign
              compilation.assets[source] = {
                source() {
                  return contents;
                },
                size() {
                  return contents.length;
                },
              };
            });

            callback();
          }).catch(error => callback(error.message));
      } catch (error) {
        callback(error.message);
      }
    });
  }
}

module.exports = WebpackPlugin;
