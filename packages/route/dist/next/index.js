import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { isPromise, deepMerge, routeChangeAction, coreConfig, exportModule, deepClone, MultipleDispatcher, RouteModuleHandlers, env, reinitApp } from '@elux/core';
import { routeConfig, setRouteConfig } from './basic';
import { RootStack, HistoryStack, HistoryRecord } from './history';
import { eluxLocationToEluxUrl, nativeLocationToNativeUrl, createLocationTransform } from './transform';
export { setRouteConfig, routeConfig, routeMeta } from './basic';
export { createLocationTransform, nativeUrlToNativeLocation, nativeLocationToNativeUrl } from './transform';
export class BaseNativeRouter {
  constructor() {
    _defineProperty(this, "curTask", void 0);

    _defineProperty(this, "eluxRouter", void 0);
  }

  onChange(key) {
    if (this.curTask) {
      this.curTask.resolve(this.curTask.nativeData);
      this.curTask = undefined;
      return false;
    }

    return key !== this.eluxRouter.routeState.key;
  }

  startup(router) {
    this.eluxRouter = router;
  }

  execute(method, getNativeData, ...args) {
    return new Promise((resolve, reject) => {
      const task = {
        resolve,
        reject,
        nativeData: undefined
      };
      this.curTask = task;
      const result = this[method](() => {
        const nativeData = getNativeData();
        task.nativeData = nativeData;
        return nativeData;
      }, ...args);

      if (!result) {
        resolve(undefined);
        this.curTask = undefined;
      } else if (isPromise(result)) {
        result.catch(e => {
          reject(e);
          this.curTask = undefined;
        });
      }
    });
  }

}
export class BaseEluxRouter extends MultipleDispatcher {
  constructor(url, nativeRouter, locationTransform, nativeData) {
    super();

    _defineProperty(this, "_curTask", void 0);

    _defineProperty(this, "_taskList", []);

    _defineProperty(this, "_nativeData", void 0);

    _defineProperty(this, "_internalUrl", void 0);

    _defineProperty(this, "routeState", void 0);

    _defineProperty(this, "name", routeConfig.RouteModuleName);

    _defineProperty(this, "initialize", void 0);

    _defineProperty(this, "injectedModules", {});

    _defineProperty(this, "rootStack", new RootStack());

    _defineProperty(this, "latestState", {});

    _defineProperty(this, "_taskComplete", () => {
      const task = this._taskList.shift();

      if (task) {
        this.executeTask(task);
      } else {
        this._curTask = undefined;
      }
    });

    this.nativeRouter = nativeRouter;
    this.locationTransform = locationTransform;
    this.nativeData = nativeData;
    nativeRouter.startup(this);
    const locationOrPromise = locationTransform.urlToLocation(url);

    const callback = location => {
      const routeState = { ...location,
        action: 'RELAUNCH',
        key: ''
      };
      this.routeState = routeState;
      this._internalUrl = eluxLocationToEluxUrl({
        pathname: routeState.pagename,
        params: routeState.params
      });

      if (!routeConfig.indexUrl) {
        setRouteConfig({
          indexUrl: this._internalUrl
        });
      }

      return routeState;
    };

    if (isPromise(locationOrPromise)) {
      this.initialize = locationOrPromise.then(callback);
    } else {
      this.initialize = Promise.resolve(callback(locationOrPromise));
    }
  }

  startup(store) {
    const historyStack = new HistoryStack(this.rootStack, store);
    const historyRecord = new HistoryRecord(this.routeState, historyStack);
    historyStack.startup(historyRecord);
    this.rootStack.startup(historyStack);
    this.routeState.key = historyRecord.key;
  }

  getCurrentPages() {
    return this.rootStack.getCurrentPages();
  }

  getCurrentStore() {
    return this.rootStack.getCurrentItem().store;
  }

  getStoreList() {
    return this.rootStack.getItems().map(({
      store
    }) => store);
  }

  getInternalUrl() {
    return this._internalUrl;
  }

  getNativeLocation() {
    if (!this._nativeData) {
      this._nativeData = this.locationToNativeData(this.routeState);
    }

    return this._nativeData.nativeLocation;
  }

  getNativeUrl() {
    if (!this._nativeData) {
      this._nativeData = this.locationToNativeData(this.routeState);
    }

    return this._nativeData.nativeUrl;
  }

  getHistoryLength(root) {
    return root ? this.rootStack.getLength() : this.rootStack.getCurrentItem().getLength();
  }

  locationToNativeData(location) {
    const nativeLocation = this.locationTransform.partialLocationToNativeLocation(location);
    const nativeUrl = this.nativeLocationToNativeUrl(nativeLocation);
    return {
      nativeUrl,
      nativeLocation
    };
  }

  urlToLocation(url) {
    return this.locationTransform.urlToLocation(url);
  }

  payloadLocationToEluxUrl(data) {
    const eluxLocation = this.payloadToEluxLocation(data);
    return eluxLocationToEluxUrl(eluxLocation);
  }

  payloadLocationToNativeUrl(data) {
    const eluxLocation = this.payloadToEluxLocation(data);
    const nativeLocation = this.locationTransform.eluxLocationToNativeLocation(eluxLocation);
    return this.nativeLocationToNativeUrl(nativeLocation);
  }

  nativeLocationToNativeUrl(nativeLocation) {
    return nativeLocationToNativeUrl(nativeLocation);
  }

  findRecordByKey(key) {
    return this.rootStack.findRecordByKey(key);
  }

  findRecordByStep(delta, rootOnly) {
    return this.rootStack.testBack(delta, rootOnly);
  }

  payloadToEluxLocation(payload) {
    let params = payload.params || {};
    const extendParams = payload.extendParams === 'current' ? this.routeState.params : payload.extendParams;

    if (extendParams && params) {
      params = deepMerge({}, extendParams, params);
    } else if (extendParams) {
      params = extendParams;
    }

    return {
      pathname: payload.pathname || this.routeState.pagename,
      params
    };
  }

  preAdditions(data) {
    if (typeof data === 'string') {
      if (/^[\w:]*\/\//.test(data)) {
        this.nativeRouter.toOutside(data);
        return null;
      }

      return this.locationTransform.urlToLocation(data);
    }

    const eluxLocation = this.payloadToEluxLocation(data);
    return this.locationTransform.eluxLocationToLocation(eluxLocation);
  }

  relaunch(data, root = false, nonblocking, nativeCaller = false) {
    return this.addTask(this._relaunch.bind(this, data, root, nativeCaller), nonblocking);
  }

  async _relaunch(data, root, nativeCaller) {
    const preData = await this.preAdditions(data);

    if (!preData) {
      return;
    }

    let key = '';
    const location = preData;
    const routeState = { ...location,
      action: 'RELAUNCH',
      key
    };
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));

    if (root) {
      key = this.rootStack.relaunch(routeState).key;
    } else {
      key = this.rootStack.getCurrentItem().relaunch(routeState).key;
    }

    routeState.key = key;
    let nativeData;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];

    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('relaunch', () => this.locationToNativeData(routeState), key);
    }

    this._nativeData = nativeData;
    this.routeState = routeState;
    this._internalUrl = eluxLocationToEluxUrl({
      pathname: routeState.pagename,
      params: routeState.params
    });
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    await this.dispatch('change', {
      routeState: cloneState,
      root
    });
  }

  push(data, root = false, nonblocking, nativeCaller = false) {
    return this.addTask(this._push.bind(this, data, root, nativeCaller), nonblocking);
  }

  async _push(data, root, nativeCaller) {
    const preData = await this.preAdditions(data);

    if (!preData) {
      return;
    }

    let key = '';
    const location = preData;
    const routeState = { ...location,
      action: 'PUSH',
      key
    };
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));

    if (root) {
      key = this.rootStack.push(routeState).key;
    } else {
      key = this.rootStack.getCurrentItem().push(routeState).key;
    }

    routeState.key = key;
    let nativeData;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];

    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('push', () => this.locationToNativeData(routeState), key);
    }

    this._nativeData = nativeData;
    this.routeState = routeState;
    this._internalUrl = eluxLocationToEluxUrl({
      pathname: routeState.pagename,
      params: routeState.params
    });
    const cloneState = deepClone(routeState);

    if (root) {
      await reinitApp(this.getCurrentStore());
    } else {
      this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    }

    await this.dispatch('change', {
      routeState: cloneState,
      root
    });
  }

  replace(data, root = false, nonblocking, nativeCaller = false) {
    return this.addTask(this._replace.bind(this, data, root, nativeCaller), nonblocking);
  }

  async _replace(data, root, nativeCaller) {
    const preData = await this.preAdditions(data);

    if (!preData) {
      return;
    }

    const location = preData;
    let key = '';
    const routeState = { ...location,
      action: 'REPLACE',
      key
    };
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));

    if (root) {
      key = this.rootStack.replace(routeState).key;
    } else {
      key = this.rootStack.getCurrentItem().replace(routeState).key;
    }

    routeState.key = key;
    let nativeData;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];

    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('replace', () => this.locationToNativeData(routeState), key);
    }

    this._nativeData = nativeData;
    this.routeState = routeState;
    this._internalUrl = eluxLocationToEluxUrl({
      pathname: routeState.pagename,
      params: routeState.params
    });
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    await this.dispatch('change', {
      routeState: cloneState,
      root
    });
  }

  back(n = 1, root = false, options, nonblocking, nativeCaller = false) {
    return this.addTask(this._back.bind(this, n, root, options || {}, nativeCaller), nonblocking);
  }

  async _back(n = 1, root, options, nativeCaller) {
    if (n < 1) {
      return;
    }

    const {
      record,
      overflow,
      steps
    } = this.rootStack.testBack(n, root);

    if (overflow) {
      const url = options.overflowRedirect || routeConfig.indexUrl;
      env.setTimeout(() => this.relaunch(url, root), 0);
      return;
    }

    const key = record.key;
    const pagename = record.pagename;
    const params = deepMerge({}, record.params, options.payload);
    const routeState = {
      key,
      pagename,
      params,
      action: 'BACK'
    };
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));

    if (steps[0]) {
      root = true;
      this.rootStack.back(steps[0]);
    }

    if (steps[1]) {
      this.rootStack.getCurrentItem().back(steps[1]);
    }

    let nativeData;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];

    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('back', () => this.locationToNativeData(routeState), n, key);
    }

    this._nativeData = nativeData;
    this.routeState = routeState;
    this._internalUrl = eluxLocationToEluxUrl({
      pathname: routeState.pagename,
      params: routeState.params
    });
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    await this.dispatch('change', {
      routeState,
      root
    });
  }

  executeTask(task) {
    this._curTask = task;
    task().finally(this._taskComplete);
  }

  addTask(execute, nonblocking) {
    if (env.isServer) {
      return;
    }

    if (this._curTask && !nonblocking) {
      return;
    }

    return new Promise((resolve, reject) => {
      const task = () => execute().then(resolve, reject);

      if (this._curTask) {
        this._taskList.push(task);
      } else {
        this.executeTask(task);
      }
    });
  }

  destroy() {
    this.nativeRouter.destroy();
  }

}
export const RouteActionTypes = {
  TestRouteChange: `${routeConfig.RouteModuleName}${coreConfig.NSP}TestRouteChange`,
  BeforeRouteChange: `${routeConfig.RouteModuleName}${coreConfig.NSP}BeforeRouteChange`
};
export function beforeRouteChangeAction(routeState) {
  return {
    type: RouteActionTypes.BeforeRouteChange,
    payload: [routeState]
  };
}
export function testRouteChangeAction(routeState) {
  return {
    type: RouteActionTypes.TestRouteChange,
    payload: [routeState]
  };
}
const defaultNativeLocationMap = {
  in(nativeLocation) {
    return nativeLocation;
  },

  out(nativeLocation) {
    return nativeLocation;
  }

};
export function createRouteModule(moduleName, pagenameMap, nativeLocationMap = defaultNativeLocationMap, notfoundPagename = '/404', paramsKey = '_') {
  const locationTransform = createLocationTransform(pagenameMap, nativeLocationMap, notfoundPagename, paramsKey);
  const routeModule = exportModule(moduleName, RouteModuleHandlers, {}, {});
  return { ...routeModule,
    locationTransform
  };
}