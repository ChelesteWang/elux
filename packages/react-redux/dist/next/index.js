import { connect } from 'react-redux';
import { exportView } from '@elux/core';
export { createStore } from '@elux/core-redux';
export const connectRedux = function (...args) {
  return function (component) {
    return exportView(connect(...args)(component));
  };
};
export { shallowEqual, connectAdvanced, batch, useSelector, createSelectorHook, Provider, connect, useStore } from 'react-redux';