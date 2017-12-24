# Publish

## Registry

Registry is just a single YAML file contains package metadata.
Currently, Deplug supports `npm` as a source.

The official registry is here:

- Endpoint: https://deplug.net/registry/list.yml
- Repository: https://github.com/deplug/registry

Feel free to open pull requests.

## Pre-built binaries

You can distribute pre-built binaries for native packages.
Put a `deplug.binary.souece` entry into `package.json` to indicate the download source.

```json
{
    "name": "package_name",
    "version": "1.0.0",
    "deplug": {
        "binary": {
            "source": "https://deplug.net/prebuilt/"
        }
    }
}
```

The `dpm prebuilt [package-dir]` command is available to create an archive.

The name of the archive is represented as
`${this.pkg.name}-v${this.pkg.version}-abi${process.versions.modules}-${process.platform}-${process.arch}.tar.gz`.

For example, on Linux with node@8.1.2 (ABI version 57), the package installer will try to download
`https://deplug.net/prebuilt/package_name-v1.0.0-abi57-linux-x64.tar.gz` and extract it into the directory contains `package.json`.

If the archive is not available, the installer will build the native package with `node-gyp`.

Using pre-built binaries can be disabled by setting `_.package.noPrebuilt` to `true` in `config.yml`.
