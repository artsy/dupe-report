# @artsy/dupe-report-plugin

A webpack plugin (currently building off of [inspectpack](https://github.com/FormidableLabs/inspectpack)) that generates a duplicates report for every build. This report is intended to be used with `@artsy/dupe-report` for the purposes of communicating when new duplicates are shipped in your production js bundles.

## Installation

```
yarn add --dev @artsy/dupe-report-plugin
```

## Usage

In your `webpack.config.js` file

```
const { DuplicateReportPlugin } = require("@artsy/dupe-report-plugin");

module.exports = {
  //...
  plugins: [
    new DuplicateReportPlugin(options)
  ]
}
```

## Options

| Option Key  | Type   | Default Value                            |
| ----------- | ------ | ---------------------------------------- |
| `directory` | String | `path.join(process.cwd(), ".artifacts")` |
| `fileName`  | String | `"duplicates-report"`                    |
