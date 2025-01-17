import { ESBuildPlugin, ESBuildMinifyPlugin } from "esbuild-loader";
import { ProgressPlugin } from "webpack";
import type * as webpack from "webpack";

import type { PresetOptions } from "./types";
import {
  removePlugin,
  replaceLoader,
  replaceMinimizer,
  safeAppendPlugin,
} from "./webpack";

const babelLoaderPattern = /babel-loader/;

/**
 * We can't just remove babel-laoder: since Storybook ships codes with JSX,
 * we need to transpile it in *loader phase* so webpack can handle files correctly.
 */
export function replaceBabelLoader(
  config: webpack.Configuration
): webpack.Configuration {
  return replaceLoader(
    config,
    (loader, rule) => {
      switch (typeof loader) {
        case "string":
          return babelLoaderPattern.test(loader);
        case "object":
          return !!(
            rule.test &&
            rule.test instanceof RegExp &&
            rule.test.test("foo.js") &&
            loader.loader &&
            babelLoaderPattern.test(loader.loader)
          );
        default:
          return false;
      }
    },
    () => ({
      loader: "esbuild-loader",
      options: {
        target: "es2015",
        loader: "jsx",
      },
    })
  );
}

export function appendESBuildPlugin(
  config: webpack.Configuration
): webpack.Configuration {
  return safeAppendPlugin(config, ESBuildPlugin, () => new ESBuildPlugin());
}

export function removeProgressPlugin(
  config: webpack.Configuration,
  options: PresetOptions
): webpack.Configuration {
  return options.removeProgressPlugin
    ? removePlugin(config, ProgressPlugin)
    : config;
}

/**
 * Replace webpack's default minimizer with ESBuild.
 * @param config webpack config
 * @param options preset options
 * @returns modified webpack config
 */
export function useESBuildAsMinifier(
  config: webpack.Configuration,
  options: PresetOptions
): webpack.Configuration {
  return replaceMinimizer(
    config,
    new ESBuildMinifyPlugin({
      target: "es2015",
      ...(options.esbuildMinifyOptions ?? {}),
    })
  );
}

/**
 * Disables source map generation.
 * Source map generation in production is expensive operation and does not carry much benefit to users.
 * Especially in Storybook:
 * - There are Docs Addon and Storysource Addon
 * - The number of files to build tends to be quitely large
 * @param config webpack config
 * @param options preset options
 * @returns modified webpack config
 */
export function disableSourceMap(
  config: webpack.Configuration,
  options: PresetOptions
): webpack.Configuration {
  if (!options.disableSourceMap) {
    return config;
  }

  return {
    ...config,
    devtool: false,
  };
}
