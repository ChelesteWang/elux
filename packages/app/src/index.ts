import {
  env,
  getRootModuleAPI,
  buildConfigSetter,
  initApp,
  defineModuleGetter,
  setCoreConfig,
  getModule,
  IStore,
  LoadComponent,
  ModuleGetter,
  IStoreMiddleware,
  StoreBuilder,
  BStore,
  RootModuleFacade,
  RootModuleAPI,
  RootModuleActions,
  ICoreRouter,
  StoreOptions,
} from '@elux/core';

import {setRouteConfig, IBaseRouter, RouteModule, LocationTransform, routeConfig, routeMeta, RouteState} from '@elux/route';

export {
  ActionTypes,
  LoadingState,
  env,
  effect,
  errorAction,
  reducer,
  action,
  mutation,
  setLoading,
  logger,
  isServer,
  serverSide,
  clientSide,
  deepMerge,
  deepMergeState,
  exportModule,
  isProcessedError,
  setProcessedError,
  delayPromise,
  exportView,
  exportComponent,
  modelHotReplacement,
  EmptyModuleHandlers,
  CoreModuleHandlers as BaseModuleHandlers,
} from '@elux/core';
export {RouteActionTypes, createRouteModule} from '@elux/route';

export type {RootModuleFacade as Facade, Dispatch, IStore, EluxComponent} from '@elux/core';
export type {RouteState, PayloadLocation, LocationTransform, NativeLocation, PagenameMap, HistoryAction, Location, DeepPartial} from '@elux/route';

const appMeta: {
  SSRTPL: string;
  router: IBaseRouter<any, string>;
} = {
  router: null as any,
  SSRTPL: env.isServer ? env.decodeBas64('process.env.ELUX_ENV_SSRTPL') : '',
};

export const appConfig: {
  loadComponent: LoadComponent;
  useRouter: () => ICoreRouter;
  useStore: () => IStore;
} = {
  loadComponent: null as any,
  useRouter: null as any,
  useStore: null as any,
};
export const setAppConfig = buildConfigSetter(appConfig);
export interface UserConfig {
  maxHistory?: number;
  NSP?: string;
  MSP?: string;
  DepthTimeOnLoading?: number;
  indexUrl?: string;
  AppModuleName?: string;
  RouteModuleName?: string;
}
export function setUserConfig(conf: UserConfig): void {
  setCoreConfig(conf);
  setRouteConfig(conf);
}

export interface RenderOptions {
  viewName?: string;
  id?: string;
  ssrKey?: string;
}

export interface ContextWrap {}

export interface AttachMP<App> {
  (app: App, moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({
      storeOptions,
      storeCreator,
    }: StoreBuilder<O, B>): App & {
      render(): {store: IStore & B; context: ContextWrap};
    };
  };
}

export interface CreateMP {
  (moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({
      storeOptions,
      storeCreator,
    }: StoreBuilder<O, B>): {
      render(): {store: IStore & B; context: ContextWrap};
    };
  };
}

export interface CreateApp<INS = {}> {
  (moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({
      storeOptions,
      storeCreator,
    }: StoreBuilder<O, B>): INS & {
      render({id, ssrKey, viewName}?: RenderOptions): Promise<IStore & B>;
    };
  };
}

export interface CreateSSR<INS = {}> {
  (moduleGetter: ModuleGetter, url: string, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({
      storeOptions,
      storeCreator,
    }: StoreBuilder<O, B>): INS & {
      render({id, ssrKey, viewName}?: RenderOptions): Promise<string>;
    };
  };
}

export interface EluxContext {
  deps?: Record<string, boolean>;
  documentHead: string;
  router?: IBaseRouter<any, string>;
}

export function createBaseMP<INS = {}>(
  ins: INS,
  createRouter: (locationTransform: LocationTransform) => IBaseRouter<any, string>,
  render: (store: IStore, eluxContext: EluxContext, ins: INS) => any,
  moduleGetter: ModuleGetter,
  middlewares: IStoreMiddleware[] = []
): {
  useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(
    storeBuilder: StoreBuilder<O, B>
  ): INS & {
    render(): {store: IStore & B; context: ContextWrap};
  };
} {
  defineModuleGetter(moduleGetter);

  const routeModule = getModule(routeConfig.RouteModuleName) as RouteModule;
  return {
    useStore<O extends StoreOptions, B extends BStore = BStore>({storeCreator, storeOptions}: StoreBuilder<O, B>) {
      return Object.assign(ins, {
        render() {
          const router = createRouter(routeModule.locationTransform);
          appMeta.router = router;
          const baseStore = storeCreator(storeOptions);
          const {store} = initApp<B>(router, baseStore, middlewares);
          const context: ContextWrap = render(store, {deps: {}, router, documentHead: ''}, ins);
          return {store, context};
        },
      });
    },
  };
}

export function createBaseApp<INS = {}>(
  ins: INS,
  createRouter: (locationTransform: LocationTransform) => IBaseRouter<any, string>,
  render: (id: string, component: any, store: IStore, eluxContext: EluxContext, fromSSR: boolean, ins: INS) => void,
  moduleGetter: ModuleGetter,
  middlewares: IStoreMiddleware[] = []
): {
  useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(
    storeBuilder: StoreBuilder<O, B>
  ): INS & {
    render({id, ssrKey, viewName}?: RenderOptions): Promise<IStore & B>;
  };
} {
  defineModuleGetter(moduleGetter);
  const routeModule = getModule(routeConfig.RouteModuleName) as RouteModule;
  return {
    useStore<O extends StoreOptions, B extends BStore = BStore>({storeCreator, storeOptions}: StoreBuilder<O, B>) {
      return Object.assign(ins, {
        render({id = 'root', ssrKey = 'eluxInitStore', viewName = 'main'}: RenderOptions = {}) {
          const {state, components = []}: {state?: Record<string, any>; components: string[]} = env[ssrKey] || {};
          const router = createRouter(routeModule.locationTransform);
          appMeta.router = router;
          if (state) {
            storeOptions.initState = {...storeOptions.initState, ...state};
          }
          const baseStore = storeCreator(storeOptions);
          return router.initialize.then(() => {
            const {store, AppView} = initApp<B>(router, baseStore, middlewares, viewName, components);
            render(id, AppView, store, {deps: {}, router, documentHead: ''}, !!env[ssrKey], ins);
            return store;
          });
        },
      });
    },
  };
}

export function createBaseSSR<INS = {}>(
  ins: INS,
  createRouter: (locationTransform: LocationTransform) => IBaseRouter<any, string>,
  render: (id: string, component: any, store: IStore, eluxContext: EluxContext, ins: INS) => Promise<string>,
  moduleGetter: ModuleGetter,
  middlewares: IStoreMiddleware[] = []
): {
  useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(
    storeBuilder: StoreBuilder<O, B>
  ): INS & {
    render({id, ssrKey, viewName}?: RenderOptions): Promise<string>;
  };
} {
  defineModuleGetter(moduleGetter);

  const routeModule = getModule(routeConfig.RouteModuleName) as RouteModule;
  return {
    useStore<O extends StoreOptions, B extends BStore = BStore>({storeCreator, storeOptions}: StoreBuilder<O, B>) {
      return Object.assign(ins, {
        render({id = 'root', ssrKey = 'eluxInitStore', viewName = 'main'}: RenderOptions = {}) {
          const router = createRouter(routeModule.locationTransform);
          appMeta.router = router;
          const baseStore = storeCreator(storeOptions);
          return router.initialize.then(() => {
            const {store, AppView, setup} = initApp<B>(router, baseStore, middlewares, viewName);
            return setup.then(() => {
              const state = store.getState();
              const eluxContext: EluxContext = {deps: {}, router, documentHead: ''};
              return render(id, AppView, store, eluxContext, ins).then((html) => {
                const match = appMeta.SSRTPL.match(new RegExp(`<[^<>]+id=['"]${id}['"][^<>]*>`, 'm'));
                if (match) {
                  return appMeta.SSRTPL.replace(
                    '</head>',
                    `\r\n${eluxContext.documentHead}\r\n<script>window.${ssrKey} = ${JSON.stringify({
                      state,
                      components: Object.keys(eluxContext.deps!),
                    })};</script>\r\n</head>`
                  ).replace(match[0], match[0] + html);
                }
                return html;
              });
            });
          });
        },
      });
    },
  };
}
export function patchActions(typeName: string, json?: string): void {
  if (json) {
    getRootModuleAPI(JSON.parse(json));
  }
}

export type GetBaseAPP<A extends RootModuleFacade, LoadComponentOptions, R extends string = 'route'> = {
  State: {[M in keyof A]: A[M]['state']};
  RouteParams: {[M in keyof A]?: A[M]['params']};
  RouteState: RouteState<{[M in keyof A]?: A[M]['params']}>;
  Router: IBaseRouter<{[M in keyof A]: A[M]['params']}, Extract<keyof A[R]['components'], string>>;
  GetActions<N extends keyof A>(...args: N[]): {[K in N]: A[K]['actions']};
  LoadComponent: LoadComponent<A, LoadComponentOptions>;
  Modules: RootModuleAPI<A>;
  Actions: RootModuleActions<A>;
  Pagenames: {[K in keyof A[R]['components']]: K};
};

export function getApp<T extends {State: any; GetActions: any; LoadComponent: any; Modules: any; Pagenames: any; Router: any}>(): Pick<
  T,
  'GetActions' | 'LoadComponent' | 'Modules' | 'Pagenames'
> & {
  GetRouter: () => T['Router'];
  useRouter: () => T['Router'];
  useStore: () => IStore<T['State']>;
  getRouter: (moduleHandler: {router: ICoreRouter}) => T['Router'];
} {
  const modules = getRootModuleAPI();
  return {
    GetActions: (...args: string[]) => {
      return args.reduce((prev, moduleName) => {
        prev[moduleName] = modules[moduleName].actions;
        return prev;
      }, {});
    },
    useRouter: appConfig.useRouter,
    useStore: appConfig.useStore,
    getRouter: (moduleHandler) => moduleHandler.router as any,
    GetRouter: () => appMeta.router,
    LoadComponent: appConfig.loadComponent,
    Modules: modules,
    Pagenames: routeMeta.pagenames,
  };
}
