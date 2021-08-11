export {coreConfig, mergeState, deepMergeState, setCoreConfig, buildConfigSetter, moduleExists} from './basic';
export {ActionTypes, reducer, effect, mutation, action, setLoading, logger, errorAction, routeChangeAction} from './actions';
export {getActionData, setProcessedError, isProcessedError} from './store';
export {initApp, forkStore} from './app';
export {
  loadModel,
  exportModule,
  loadComponet,
  getRootModuleAPI,
  getModule,
  getModuleList,
  getCachedModules,
  exportView,
  exportComponent,
  getComponet,
  modelHotReplacement,
  defineModuleGetter,
} from './inject';
export {CoreModuleHandlers, RouteModuleHandlers, EmptyModuleHandlers} from './router';
export {
  LoadingState,
  deepMerge,
  SingleDispatcher,
  MultipleDispatcher,
  isPromise,
  isServer,
  serverSide,
  clientSide,
  delayPromise,
  deepClone,
} from './sprite';

export {default as env} from './env';

export type {
  Action,
  EluxComponent,
  CommonModule,
  ModuleGetter,
  ICoreRouter,
  ICoreRouteState,
  IStore,
  BStore,
  IModuleHandlers,
  Dispatch,
  GetState,
  State,
  IStoreMiddleware,
  StoreBuilder,
  StoreOptions,
} from './basic';

export type {RootModuleAPI, RootModuleParams, RootModuleFacade, RootModuleActions, LoadComponent, IModuleHandlersClass} from './inject';
export type {IRouteModuleHandlersClass} from './router';
