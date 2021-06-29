import React, { ComponentType } from 'react';
import type { LoadComponent as BaseLoadComponent, RootModuleFacade, IStore } from '@elux/core';
export declare const DepsContext: React.Context<{
    deps: Record<string, boolean>;
    store?: IStore<{}> | undefined;
}>;
export declare type LoadComponent<A extends RootModuleFacade = {}> = BaseLoadComponent<A, {
    OnError?: ComponentType<{
        message: string;
    }>;
    OnLoading?: ComponentType<{}>;
}>;
export declare function setLoadComponentOptions({ LoadComponentOnError, LoadComponentOnLoading, }: {
    LoadComponentOnError?: ComponentType<{
        message: string;
    }>;
    LoadComponentOnLoading?: ComponentType<{}>;
}): void;
export declare const loadComponent: LoadComponent<Record<string, any>>;
