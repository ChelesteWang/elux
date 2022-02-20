import { buildConfigSetter, env } from '@elux/core';
export var routeConfig = {
  maxHistory: 10,
  maxLocationCache: env.isServer ? 10000 : 500,
  notifyNativeRouter: {
    root: true,
    internal: false
  },
  indexUrl: '/index',
  notfoundPagename: '/404',
  paramsKey: '_'
};
export var setRouteConfig = buildConfigSetter(routeConfig);
export var routeMeta = {
  defaultParams: {},
  pageComponents: {},
  pagenameMap: {},
  pagenameList: [],
  nativeLocationMap: {}
};
export function routeJsonParse(json) {
  if (!json || json === '{}' || json.charAt(0) !== '{' || json.charAt(json.length - 1) !== '}') {
    return {};
  }

  var args = {};

  try {
    args = JSON.parse(json);
  } catch (error) {
    args = {};
  }

  return args;
}