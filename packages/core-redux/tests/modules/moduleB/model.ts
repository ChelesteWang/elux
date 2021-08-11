import {CoreModuleHandlers, effect, IStore, reducer} from '@elux/core';
import {messages} from '../../utils';

export interface State {
  count: number;
}

// 定义本模块的Handlers
export class ModuleHandlers extends CoreModuleHandlers<State, {}> {
  constructor(moduleName: string, store: IStore) {
    super(moduleName, store, {count: 0});
  }

  @reducer
  public add(): State {
    const state = this.getState();
    return {...state, count: state.count + 1};
  }

  @reducer
  public add2(): State {
    const state = this.getState();
    state.count += 1;
    return state;
  }

  @effect()
  protected async triggerError(): Promise<void> {
    const prevState = this.getCurrentRootState();
    this.dispatch(this.actions.add());
    messages.push(['moduleB/moduleA.add', JSON.stringify(this.getRootState()), JSON.stringify(prevState)]);
  }

  @effect()
  protected async ['moduleA.add'](): Promise<void> {
    const prevState = this.getCurrentRootState();
    this.dispatch(this.actions.add());
    messages.push(['moduleB/moduleA.add', JSON.stringify(this.getRootState()), JSON.stringify(prevState)]);
  }

  @effect()
  protected async ['moduleA.add2'](): Promise<void> {
    const prevState = this.getCurrentRootState();
    this.dispatch(this.actions.add2());
    messages.push(['moduleB/moduleA.add2', JSON.stringify(this.getRootState()), JSON.stringify(prevState)]);
  }
}
