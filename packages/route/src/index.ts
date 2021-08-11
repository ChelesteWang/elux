import {
  isPromise,
  deepMerge,
  IStore,
  ICoreRouter,
  IModuleHandlers,
  routeChangeAction,
  CommonModule,
  coreConfig,
  exportModule,
  deepClone,
  MultipleDispatcher,
  Action,
  RouteModuleHandlers,
  IRouteModuleHandlersClass,
} from '@elux/core';

import {routeConfig, setRouteConfig, EluxLocation, PartialLocation, NativeLocation, RootParams, Location, RouteState, PayloadLocation} from './basic';
import {History, HistoryRecord} from './history';

import {
  eluxLocationToEluxUrl,
  nativeLocationToNativeUrl,
  LocationTransform,
  NativeLocationMap,
  PagenameMap,
  createLocationTransform,
} from './transform';

export {setRouteConfig, routeConfig, routeMeta} from './basic';
export {createLocationTransform, nativeUrlToNativeLocation, nativeLocationToNativeUrl} from './transform';

export type {PagenameMap, LocationTransform} from './transform';
export type {RootParams, Location, RouteState, HistoryAction, DeepPartial, PayloadLocation, NativeLocation} from './basic';

export type NativeData = {nativeLocation: NativeLocation; nativeUrl: string};

interface RouterTask {
  method: string;
}
interface NativeRouterTask {
  resolve: (nativeData: NativeData | undefined) => void;
  reject: () => void;
  nativeData: undefined | NativeData;
}
export abstract class BaseNativeRouter {
  protected curTask?: NativeRouterTask;

  protected taskList: RouterTask[] = [];

  protected router: BaseRouter<any, string> = null as any;

  // 只有当native不处理时返回void，否则必须返回NativeData，返回void会导致不依赖onChange来关闭task

  protected abstract push(getNativeData: () => NativeData, key: string): void | NativeData | Promise<NativeData>;

  protected abstract replace(getNativeData: () => NativeData, key: string): void | NativeData | Promise<NativeData>;

  protected abstract relaunch(getNativeData: () => NativeData, key: string): void | NativeData | Promise<NativeData>;

  protected abstract back(getNativeData: () => NativeData, n: number, key: string): void | NativeData | Promise<NativeData>;

  public abstract toOutside(url: string): void;

  abstract destroy(): void;

  protected onChange(key: string): boolean {
    if (this.curTask) {
      this.curTask.resolve(this.curTask.nativeData);
      this.curTask = undefined;
      return false;
    }
    return key !== this.router.routeState.key;
  }

  setRouter(router: BaseRouter<any, string>): void {
    this.router = router;
  }

  execute(method: 'relaunch' | 'push' | 'replace' | 'back', getNativeData: () => NativeData, ...args: any[]): Promise<NativeData | undefined> {
    return new Promise((resolve, reject) => {
      const task: NativeRouterTask = {resolve, reject, nativeData: undefined};
      this.curTask = task;
      const result: void | NativeData | Promise<NativeData> = this[method as string](() => {
        const nativeData = getNativeData();
        task.nativeData = nativeData;
        return nativeData;
      }, ...args);
      if (!result) {
        // 表示native不做任何处理，也不会触发onChange
        resolve(undefined);
        this.curTask = undefined;
      } else if (isPromise(result)) {
        // 存在错误时，不会触发onChange，需要手动触发，否则都会触发onChange
        result.catch((e) => {
          reject(e);
          this.curTask = undefined;
        });
      }
    });
  }
}

export abstract class BaseRouter<P extends RootParams, N extends string>
  extends MultipleDispatcher<{change: {routeState: RouteState<P>; root: boolean}}>
  implements IBaseRouter<P, N> {
  private _tid = 0;

  private curTask?: () => Promise<void>;

  private taskList: Array<() => Promise<void>> = [];

  private _nativeData: {nativeLocation: NativeLocation; nativeUrl: string} | undefined;

  private internalUrl!: string;

  public routeState!: RouteState<P>;

  public readonly name = routeConfig.RouteModuleName;

  public initialize: Promise<RouteState<P>>;

  public readonly injectedModules: {[moduleName: string]: IModuleHandlers} = {};

  public readonly history: History = new History(null);

  public latestState: Record<string, any> = {};

  constructor(url: string, public nativeRouter: BaseNativeRouter, protected locationTransform: LocationTransform) {
    super();
    nativeRouter.setRouter(this);
    const locationOrPromise = locationTransform.urlToLocation<P>(url);
    const callback = (location: Location<P>) => {
      const key = this._createKey();
      const routeState: RouteState<P> = {...location, action: 'RELAUNCH', key};
      this.routeState = routeState;
      this.internalUrl = eluxLocationToEluxUrl({pathname: routeState.pagename, params: routeState.params});
      if (!routeConfig.indexUrl) {
        setRouteConfig({indexUrl: this.internalUrl});
      }
      this.latestState = {[this.name]: routeState};
      return routeState;
    };
    if (isPromise(locationOrPromise)) {
      this.initialize = locationOrPromise.then(callback);
    } else {
      this.initialize = Promise.resolve(callback(locationOrPromise));
    }
  }
  startup(store: IStore): void {
    const historyRecord = new HistoryRecord(this.routeState, this.routeState.key, this.history, store);
    this.history.startup(historyRecord);
  }
  getCurrentStore(): IStore {
    return this.history.getCurrentRecord().store;
  }
  getStoreList(): IStore[] {
    return this.history.getRecords().map(({store}) => store);
  }
  getInternalUrl(): string {
    return this.internalUrl;
  }
  getNativeLocation(): NativeLocation {
    if (!this._nativeData) {
      this._nativeData = this.locationToNativeData(this.routeState);
    }
    return this._nativeData.nativeLocation;
  }
  getNativeUrl(): string {
    if (!this._nativeData) {
      this._nativeData = this.locationToNativeData(this.routeState);
    }
    return this._nativeData.nativeUrl;
  }
  getHistory(root?: boolean): History {
    return root ? this.history : this.history.getCurrentSubHistory();
  }
  getHistoryLength(root?: boolean): number {
    return root ? this.history.getLength() : this.history.getCurrentSubHistory().getLength();
  }
  locationToNativeData(location: PartialLocation): {nativeUrl: string; nativeLocation: NativeLocation} {
    const nativeLocation = this.locationTransform.partialLocationToNativeLocation(location);
    const nativeUrl = this.nativeLocationToNativeUrl(nativeLocation);
    return {nativeUrl, nativeLocation};
  }
  urlToLocation(url: string): Location<P> | Promise<Location<P>> {
    return this.locationTransform.urlToLocation(url);
  }
  payloadLocationToEluxUrl(data: PayloadLocation<P, N>): string {
    const eluxLocation = this.payloadToEluxLocation(data);
    return eluxLocationToEluxUrl(eluxLocation);
  }
  payloadLocationToNativeUrl(data: PayloadLocation<P, N>): string {
    const eluxLocation = this.payloadToEluxLocation(data);
    const nativeLocation = this.locationTransform.eluxLocationToNativeLocation(eluxLocation);
    return this.nativeLocationToNativeUrl(nativeLocation);
  }
  nativeLocationToNativeUrl(nativeLocation: NativeLocation): string {
    return nativeLocationToNativeUrl(nativeLocation);
  }
  private _createKey() {
    this._tid++;
    return `${this._tid}`;
  }
  private payloadToEluxLocation(payload: {
    pathname?: string;
    params?: Record<string, any>;
    extendParams?: Record<string, any> | 'current';
  }): EluxLocation {
    let params = payload.params || {};
    const extendParams = payload.extendParams === 'current' ? this.routeState.params : payload.extendParams;
    if (extendParams && params) {
      params = deepMerge({}, extendParams, params);
    } else if (extendParams) {
      params = extendParams;
    }
    return {pathname: payload.pathname || this.routeState.pagename, params};
  }
  private preAdditions(data: PayloadLocation<P, N> | string): Location<P> | Promise<Location<P>> | null {
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

  relaunch(data: PayloadLocation<P, N> | string, root = false, nativeCaller = false): void {
    this.addTask(this._relaunch.bind(this, data, root, nativeCaller));
  }

  private async _relaunch(data: PayloadLocation<P, N> | string, root: boolean, nativeCaller: boolean) {
    const preData = await this.preAdditions(data);
    if (!preData) {
      return;
    }
    const location: Location<P> = preData;
    const key = this._createKey();
    const routeState: RouteState<P> = {...location, action: 'RELAUNCH', key};
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));
    let nativeData: NativeData | undefined;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];
    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('relaunch', () => this.locationToNativeData(routeState), key);
    }
    this._nativeData = nativeData;
    this.routeState = routeState;
    this.internalUrl = eluxLocationToEluxUrl({pathname: routeState.pagename, params: routeState.params});
    if (root) {
      this.history.relaunch(location, key);
    } else {
      this.history.getCurrentSubHistory().relaunch(location, key);
    }
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    this.dispatch('change', {routeState: cloneState, root});
  }

  push(data: PayloadLocation<P, N> | string, root = false, nativeCaller = false): void {
    this.addTask(this._push.bind(this, data, root, nativeCaller));
  }

  private async _push(data: PayloadLocation<P, N> | string, root: boolean, nativeCaller: boolean) {
    const preData = await this.preAdditions(data);
    if (!preData) {
      return;
    }
    const location: Location<P> = preData;
    const key = this._createKey();
    const routeState: RouteState<P> = {...location, action: 'PUSH', key};
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));
    let nativeData: NativeData | undefined;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];
    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('push', () => this.locationToNativeData(routeState), key);
    }
    this._nativeData = nativeData;
    this.routeState = routeState;
    this.internalUrl = eluxLocationToEluxUrl({pathname: routeState.pagename, params: routeState.params});
    if (root) {
      this.history.push(location, key);
    } else {
      this.history.getCurrentSubHistory().push(location, key);
    }
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    this.dispatch('change', {routeState: cloneState, root});
  }

  replace(data: PayloadLocation<P, N> | string, root = false, nativeCaller = false): void {
    this.addTask(this._replace.bind(this, data, root, nativeCaller));
  }

  private async _replace(data: PayloadLocation<P, N> | string, root: boolean, nativeCaller: boolean) {
    const preData = await this.preAdditions(data);
    if (!preData) {
      return;
    }
    const location: Location<P> = preData;
    const key = this._createKey();
    const routeState: RouteState<P> = {...location, action: 'REPLACE', key};
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));
    let nativeData: NativeData | undefined;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];
    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('replace', () => this.locationToNativeData(routeState), key);
    }
    this._nativeData = nativeData;
    this.routeState = routeState;
    this.internalUrl = eluxLocationToEluxUrl({pathname: routeState.pagename, params: routeState.params});
    if (root) {
      this.history.replace(location, key);
    } else {
      this.history.getCurrentSubHistory().replace(location, key);
    }
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    this.dispatch('change', {routeState: cloneState, root});
  }

  back(n = 1, root = false, options?: {overflowRedirect?: boolean | string; payload?: any}, nativeCaller = false): void {
    this.addTask(this._back.bind(this, n, root, options || {}, nativeCaller));
  }

  private async _back(n = 1, root: boolean, options: {overflowRedirect?: boolean | string; payload?: any}, nativeCaller: boolean) {
    if (n < 1) {
      return undefined;
    }
    const didOverflowRedirect = !!options.overflowRedirect;
    const overflowRedirectUrl = typeof options.overflowRedirect === 'string' ? options.overflowRedirect : routeConfig.indexUrl;
    const historyRecord = root ? this.history.preBack(n, didOverflowRedirect) : this.history.getCurrentSubHistory().preBack(n, didOverflowRedirect);
    if (!historyRecord) {
      return this.relaunch(overflowRedirectUrl, root);
    }
    const {key, pagename} = historyRecord;
    const params = deepMerge({}, historyRecord.params, options.payload);
    const routeState: RouteState<P> = {key, pagename, params, action: 'BACK'};
    //const prevRootState = this.getCurrentStore().getState();
    await this.getCurrentStore().dispatch(testRouteChangeAction(routeState));
    await this.getCurrentStore().dispatch(beforeRouteChangeAction(routeState));
    let nativeData: NativeData | undefined;
    const notifyNativeRouter = routeConfig.notifyNativeRouter[root ? 'root' : 'internal'];
    if (!nativeCaller && notifyNativeRouter) {
      nativeData = await this.nativeRouter.execute('back', () => this.locationToNativeData(routeState), n, key);
    }
    this._nativeData = nativeData;
    this.routeState = routeState;
    this.internalUrl = eluxLocationToEluxUrl({pathname: routeState.pagename, params: routeState.params});
    if (root) {
      this.history.back(n);
    } else {
      this.history.getCurrentSubHistory().back(n);
    }
    const cloneState = deepClone(routeState);
    this.getCurrentStore().dispatch(routeChangeAction(cloneState));
    this.dispatch('change', {routeState, root});
  }

  private taskComplete() {
    const task = this.taskList.shift();
    if (task) {
      this.executeTask(task);
    } else {
      this.curTask = undefined;
    }
  }

  private executeTask(task: () => Promise<void>) {
    this.curTask = task;
    task().finally(this.taskComplete.bind(this));
  }

  private addTask(task: () => Promise<any>) {
    if (this.curTask) {
      this.taskList.push(task);
    } else {
      this.executeTask(task);
    }
  }

  destroy(): void {
    this.nativeRouter.destroy();
  }
}

export interface IBaseRouter<P extends RootParams, N extends string> extends ICoreRouter {
  routeState: RouteState<P>;
  initialize: Promise<RouteState<P>>;
  getHistory(root?: boolean): History;
  nativeRouter: any;
  addListener(name: 'change', callback: (data: {routeState: RouteState<P>; root: boolean}) => void): void;
  getInternalUrl(): string;
  getNativeLocation(): NativeLocation;
  getNativeUrl(): string;
  nativeLocationToNativeUrl(nativeLocation: NativeLocation): string;
  locationToNativeData(location: PartialLocation): {nativeUrl: string; nativeLocation: NativeLocation};
  getCurrentStore(): IStore;
  relaunch(data: PayloadLocation<P, N> | string, root?: boolean): void;
  push(data: PayloadLocation<P, N> | string, root?: boolean): void;
  replace(data: PayloadLocation<P, N> | string, root?: boolean): void;
  back(n?: number, root?: boolean, options?: {overflowRedirect?: boolean | string; payload?: any}): void;
  destroy(): void;
  urlToLocation(url: string): Location<P> | Promise<Location<P>>;
  payloadLocationToEluxUrl(data: PayloadLocation<P, N>): string;
  payloadLocationToNativeUrl(data: PayloadLocation<P, N>): string;
  getHistoryLength(root?: boolean): number;
}

export const RouteActionTypes = {
  TestRouteChange: `${routeConfig.RouteModuleName}${coreConfig.NSP}TestRouteChange`,
  BeforeRouteChange: `${routeConfig.RouteModuleName}${coreConfig.NSP}BeforeRouteChange`,
};
export function beforeRouteChangeAction<P extends RootParams>(routeState: RouteState<P>): Action {
  return {
    type: RouteActionTypes.BeforeRouteChange,
    payload: [routeState],
  };
}
export function testRouteChangeAction<P extends RootParams>(routeState: RouteState<P>): Action {
  return {
    type: RouteActionTypes.TestRouteChange,
    payload: [routeState],
  };
}

export type RouteModule = CommonModule & {locationTransform: LocationTransform};

const defaultNativeLocationMap: NativeLocationMap = {
  in(nativeLocation) {
    return nativeLocation;
  },
  out(nativeLocation) {
    return nativeLocation;
  },
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createRouteModule<N extends string, G extends PagenameMap>(
  moduleName: N,
  pagenameMap: G,
  nativeLocationMap: NativeLocationMap = defaultNativeLocationMap,
  notfoundPagename = '/404',
  paramsKey = '_'
) {
  const locationTransform = createLocationTransform(pagenameMap, nativeLocationMap, notfoundPagename, paramsKey);
  const routeModule = exportModule(moduleName, RouteModuleHandlers as IRouteModuleHandlersClass<RouteState>, {}, {} as {[k in keyof G]: any});
  return {...routeModule, locationTransform};
}
