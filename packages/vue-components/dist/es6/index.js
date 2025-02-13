import { setCoreConfig } from '@elux/core';
import { reactive } from 'vue';
import AppRender from './App';
import { UseRouter, UseStore } from './base';
import { LoadComponent, LoadComponentOnError, LoadComponentOnLoading } from './LoadComponent';
setCoreConfig({
  MutableData: true,
  StoreInitState: () => reactive({}),
  UseStore,
  UseRouter,
  AppRender,
  LoadComponent,
  LoadComponentOnError,
  LoadComponentOnLoading
});
export { setVueComponentsConfig } from './base';
export { EWindow } from './EWindow';
export { RouterComponent } from './Router';
export { DocumentHead } from './DocumentHead';
export { Switch } from './Switch';
export { Else } from './Else';
export { Link } from './Link';