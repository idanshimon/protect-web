# Arxan for Web Installation Manager

Integrate Arxan protection into your npm or webpack workflow.

## Prerequisites

Before you can install or use this package, you must:

1. Be a current Arxan customer.
2. Review the platform requirements in the most recent version of the *Arxan for Web* online help, which is available from Arxan.
3. Obtain an API Key, API Secret, and License Token from Arxan.
    * Make sure the API Key has the "Product download" checkbox checked.
4. Add the following environment variables:

```
A4WEB_API_KEY="myapikey"
A4WEB_API_SECRET="mysecret"
A4WEB_LICENSE_TOKEN="mylicensetoken"
```

**NOTE:** This package should not be installed globally.

## Protect

This package offers production-ready essential protection that quickly and automatically adds additional security and tamper detection to your code without any manual configuration.

To run protection, add the following code at the end of your build:

```
const {protect} = require('a4web');
const blueprint = {
    targets: {
        main: {
            "input": "./dist",
            "outputDirectory": "./dist_protected"
        }
    }
}
protect(blueprint).then((output) => {
    console.log(output.stdout);
    console.error(output.stderr);
}).catch((err) => {
    console.error(err.message);
});
```

Notice the object called `blueprint`. To apply essential protection, you only need to modify the values of `"input"` and `"outputDirectory"`, where `"./dist"` is the directory that contains your input files and `"./dist_protected"` is the directory where the final protected files will appear.

However, you can further customize your protection by modifying the `blueprint` object. For instructions, see the *Arxan for Web* online help, which is available from Arxan.


### Protect with Webpack

To run protection within a webpack bundle, add the protection code to `webpack.config.js`.

This example applies essential protection:

```
const {WebpackPlugin} = require('a4web');
module.exports = {
    plugins : [
        new WebpackPlugin()
    ]
}
```

This example uses a blueprint. If you leave the code as is, it will apply essential protection. However, you can also modify the blueprint as described previously:

```
const {WebpackPlugin} = require('a4web');
const blueprint = {
    guardConfigurations: {
        config : {
            "debugDetection": {
                "disable": true
            }
        }
    }
}
module.exports = {
    plugins : [
        new WebpackPlugin(blueprint)
    ]
}
```

## Learn More

Visit www.arxan.com to learn more about Arxan's protection solutions.
