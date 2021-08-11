import { ComponentType } from 'react';
import { RootModuleFacade } from '@elux/core';
import { LoadComponentOptions } from '@elux/react-components';
import { CreateApp, CreateSSR, UserConfig, GetBaseAPP } from '@elux/app';
export * from '@elux/react-components';
export * from '@elux/app';
export declare type GetApp<A extends RootModuleFacade, R extends string = 'route'> = GetBaseAPP<A, LoadComponentOptions, R>;
export declare function setConfig(conf: UserConfig & {
    enableMultiPage?: boolean;
    LoadComponentOnError?: ComponentType<{
        message: string;
    }>;
    LoadComponentOnLoading?: ComponentType<{}>;
}): void;
export declare const createApp: CreateApp;
export declare const createSSR: CreateSSR;
