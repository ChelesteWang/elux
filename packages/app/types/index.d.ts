import { IStore, LoadComponent, ModuleGetter, IStoreMiddleware, StoreBuilder, BStore, RootModuleFacade, RootModuleAPI, RootModuleActions, ICoreRouter, StoreOptions } from '@elux/core';
import { IEluxRouter, LocationTransform, RouteState } from '@elux/route';
export { ActionTypes, LoadingState, env, effect, errorAction, reducer, action, mutation, setLoading, logger, isServer, serverSide, clientSide, deepMerge, deepMergeState, exportModule, isProcessedError, setProcessedError, delayPromise, exportView, exportComponent, modelHotReplacement, EmptyModuleHandlers, CoreModuleHandlers as BaseModuleHandlers, } from '@elux/core';
export { RouteActionTypes, createRouteModule } from '@elux/route';
export type { RootModuleFacade as Facade, Dispatch, IStore, EluxComponent } from '@elux/core';
export type { RouteState, PayloadLocation, LocationTransform, NativeLocation, PagenameMap, HistoryAction, Location, DeepPartial } from '@elux/route';
export declare const appConfig: {
    loadComponent: LoadComponent;
    useRouter: () => ICoreRouter;
    useStore: () => IStore;
};
export declare const setAppConfig: (config: Partial<{
    loadComponent: LoadComponent;
    useRouter: () => ICoreRouter;
    useStore: () => IStore;
}>) => void;
export interface UserConfig {
    maxHistory?: number;
    NSP?: string;
    MSP?: string;
    DepthTimeOnLoading?: number;
    indexUrl?: string;
    AppModuleName?: string;
    RouteModuleName?: string;
}
export declare function setUserConfig(conf: UserConfig): void;
export interface RenderOptions {
    viewName?: string;
    id?: string;
    ssrKey?: string;
}
export interface ContextWrap {
}
export interface AttachMP<App> {
    (app: App, moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
        useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({ storeOptions, storeCreator, }: StoreBuilder<O, B>): App & {
            render(): {
                store: IStore & B;
                context: ContextWrap;
            };
        };
    };
}
export interface CreateMP {
    (moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
        useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({ storeOptions, storeCreator, }: StoreBuilder<O, B>): {
            render(): {
                store: IStore & B;
                context: ContextWrap;
            };
        };
    };
}
export interface CreateApp<INS = {}> {
    (moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
        useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({ storeOptions, storeCreator, }: StoreBuilder<O, B>): INS & {
            render({ id, ssrKey, viewName }?: RenderOptions): Promise<IStore & B>;
        };
    };
}
export interface CreateSSR<INS = {}> {
    (moduleGetter: ModuleGetter, url: string, nativeData: any, middlewares?: IStoreMiddleware[]): {
        useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>({ storeOptions, storeCreator, }: StoreBuilder<O, B>): INS & {
            render({ id, ssrKey, viewName }?: RenderOptions): Promise<string>;
        };
    };
}
export interface EluxContext {
    deps?: Record<string, boolean>;
    documentHead: string;
    router?: IEluxRouter<any, string>;
}
export declare function createBaseMP<INS = {}>(ins: INS, createRouter: (locationTransform: LocationTransform) => IEluxRouter, render: (eluxContext: EluxContext, ins: INS) => any, moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(storeBuilder: StoreBuilder<O, B>): INS & {
        render(): {
            store: IStore & B;
            context: ContextWrap;
        };
    };
};
export declare function createBaseApp<INS = {}>(ins: INS, createRouter: (locationTransform: LocationTransform) => IEluxRouter, render: (id: string, component: any, eluxContext: EluxContext, fromSSR: boolean, ins: INS) => void, moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(storeBuilder: StoreBuilder<O, B>): INS & {
        render({ id, ssrKey, viewName }?: RenderOptions): Promise<IStore & B>;
    };
};
export declare function createBaseSSR<INS = {}>(ins: INS, createRouter: (locationTransform: LocationTransform) => IEluxRouter, render: (id: string, component: any, eluxContext: EluxContext, ins: INS) => Promise<string>, moduleGetter: ModuleGetter, middlewares?: IStoreMiddleware[]): {
    useStore<O extends StoreOptions, B extends BStore<{}> = BStore<{}>>(storeBuilder: StoreBuilder<O, B>): INS & {
        render({ id, ssrKey, viewName }?: RenderOptions): Promise<string>;
    };
};
export declare function patchActions(typeName: string, json?: string): void;
export declare type GetBaseAPP<A extends RootModuleFacade, LoadComponentOptions, R extends string = 'route', NT = unknown> = {
    State: {
        [M in keyof A]: A[M]['state'];
    };
    RouteParams: {
        [M in keyof A]?: A[M]['params'];
    };
    RouteState: RouteState<{
        [M in keyof A]?: A[M]['params'];
    }>;
    Router: IEluxRouter<{
        [M in keyof A]: A[M]['params'];
    }, Extract<keyof A[R]['components'], string>, NT>;
    GetActions<N extends keyof A>(...args: N[]): {
        [K in N]: A[K]['actions'];
    };
    LoadComponent: LoadComponent<A, LoadComponentOptions>;
    Modules: RootModuleAPI<A>;
    Actions: RootModuleActions<A>;
    Pagenames: {
        [K in keyof A[R]['components']]: K;
    };
};
export declare function getApp<T extends {
    State: any;
    GetActions: any;
    LoadComponent: any;
    Modules: any;
    Pagenames: any;
    Router: any;
}>(): Pick<T, 'GetActions' | 'LoadComponent' | 'Modules' | 'Pagenames'> & {
    GetRouter: () => T['Router'];
    useRouter: () => T['Router'];
    useStore: () => IStore<T['State']>;
};
