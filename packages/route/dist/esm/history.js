import _assertThisInitialized from "@babel/runtime/helpers/esm/assertThisInitialized";
import _inheritsLoose from "@babel/runtime/helpers/esm/inheritsLoose";
import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { forkStore } from '@elux/core';
import { routeMeta } from './basic';

var RouteStack = function () {
  function RouteStack(limit) {
    _defineProperty(this, "records", []);

    this.limit = limit;
  }

  var _proto = RouteStack.prototype;

  _proto.startup = function startup(record) {
    this.records = [record];
  };

  _proto.getCurrentItem = function getCurrentItem() {
    return this.records[0];
  };

  _proto.getItems = function getItems() {
    return [].concat(this.records);
  };

  _proto.getLength = function getLength() {
    return this.records.length;
  };

  _proto.getRecordAt = function getRecordAt(n) {
    if (n < 0) {
      return this.records[this.records.length + n];
    } else {
      return this.records[n];
    }
  };

  _proto._push = function _push(item) {
    var records = this.records;
    records.unshift(item);
    var delItem = records.splice(this.limit)[0];

    if (delItem && delItem !== item && delItem.destroy) {
      delItem.destroy();
    }
  };

  _proto._replace = function _replace(item) {
    var records = this.records;
    var delItem = records[0];
    records[0] = item;

    if (delItem && delItem !== item && delItem.destroy) {
      delItem.destroy();
    }
  };

  _proto._relaunch = function _relaunch(item) {
    var delList = this.records;
    this.records = [item];
    delList.forEach(function (delItem) {
      if (delItem !== item && delItem.destroy) {
        delItem.destroy();
      }
    });
  };

  _proto.back = function back(delta) {
    var delList = this.records.splice(0, delta);

    if (this.records.length === 0) {
      var last = delList.pop();
      this.records.push(last);
    }

    delList.forEach(function (delItem) {
      if (delItem.destroy) {
        delItem.destroy();
      }
    });
  };

  return RouteStack;
}();

export var HistoryRecord = function () {
  function HistoryRecord(location, historyStack) {
    _defineProperty(this, "destroy", void 0);

    _defineProperty(this, "pagename", void 0);

    _defineProperty(this, "params", void 0);

    _defineProperty(this, "recordKey", void 0);

    this.historyStack = historyStack;
    this.recordKey = ++HistoryRecord.id + '';
    var pagename = location.pagename,
        params = location.params;
    this.pagename = pagename;
    this.params = params;
  }

  var _proto2 = HistoryRecord.prototype;

  _proto2.getKey = function getKey() {
    return [this.historyStack.stackkey, this.recordKey].join('-');
  };

  return HistoryRecord;
}();

_defineProperty(HistoryRecord, "id", 0);

export var HistoryStack = function (_RouteStack) {
  _inheritsLoose(HistoryStack, _RouteStack);

  function HistoryStack(rootStack, store) {
    var _this;

    _this = _RouteStack.call(this, 20) || this;

    _defineProperty(_assertThisInitialized(_this), "stackkey", void 0);

    _this.rootStack = rootStack;
    _this.store = store;
    _this.stackkey = ++HistoryStack.id + '';
    return _this;
  }

  var _proto3 = HistoryStack.prototype;

  _proto3.push = function push(location) {
    var newRecord = new HistoryRecord(location, this);

    this._push(newRecord);

    return newRecord;
  };

  _proto3.replace = function replace(location) {
    var newRecord = new HistoryRecord(location, this);

    this._replace(newRecord);

    return newRecord;
  };

  _proto3.relaunch = function relaunch(location) {
    var newRecord = new HistoryRecord(location, this);

    this._relaunch(newRecord);

    return newRecord;
  };

  _proto3.findRecordByKey = function findRecordByKey(recordKey) {
    return this.records.find(function (item) {
      return item.recordKey === recordKey;
    });
  };

  _proto3.destroy = function destroy() {
    this.store.destroy();
  };

  return HistoryStack;
}(RouteStack);

_defineProperty(HistoryStack, "id", 0);

export var RootStack = function (_RouteStack2) {
  _inheritsLoose(RootStack, _RouteStack2);

  function RootStack() {
    return _RouteStack2.call(this, 10) || this;
  }

  var _proto4 = RootStack.prototype;

  _proto4.getCurrentPages = function getCurrentPages() {
    return this.records.map(function (item) {
      var store = item.store;
      var record = item.getCurrentItem();
      var pagename = record.pagename;
      return {
        pagename: pagename,
        store: store,
        page: routeMeta.pages[pagename]
      };
    });
  };

  _proto4.push = function push(location) {
    var curHistory = this.getCurrentItem();
    var store = forkStore(curHistory.store);
    var newHistory = new HistoryStack(this, store);
    var newRecord = new HistoryRecord(location, newHistory);
    newHistory.startup(newRecord);

    this._push(newHistory);

    return newRecord;
  };

  _proto4.replace = function replace(location) {
    var curHistory = this.getCurrentItem();
    return curHistory.relaunch(location);
  };

  _proto4.relaunch = function relaunch(location) {
    var curHistory = this.getCurrentItem();
    var newRecord = curHistory.relaunch(location);

    this._relaunch(curHistory);

    return newRecord;
  };

  _proto4.countBack = function countBack(delta) {
    var historyStacks = this.records;
    var backSteps = [0, 0];

    for (var i = 0, k = historyStacks.length; i < k; i++) {
      var _historyStack = historyStacks[i];

      var recordNum = _historyStack.getLength();

      delta = delta - recordNum;

      if (delta > 0) {
        backSteps[0]++;
      } else if (delta === 0) {
        backSteps[0]++;
        break;
      } else {
        backSteps[1] = recordNum + delta;
        break;
      }
    }

    return backSteps;
  };

  _proto4.testBack = function testBack(delta, rootOnly) {
    var overflow = false;
    var record;
    var steps = [0, 0];

    if (rootOnly) {
      if (delta < this.records.length) {
        record = this.getRecordAt(delta).getCurrentItem();
        steps[0] = delta;
      } else {
        record = this.getRecordAt(-1).getCurrentItem();
        overflow = true;
      }
    } else {
      var _this$countBack = this.countBack(delta),
          rootDelta = _this$countBack[0],
          recordDelta = _this$countBack[1];

      if (rootDelta < this.records.length) {
        record = this.getRecordAt(rootDelta).getRecordAt(recordDelta);
        steps[0] = rootDelta;
        steps[1] = recordDelta;
      } else {
        record = this.getRecordAt(-1).getRecordAt(-1);
        overflow = true;
      }
    }

    return {
      record: record,
      overflow: overflow,
      steps: steps
    };
  };

  _proto4.findRecordByKey = function findRecordByKey(key) {
    var arr = key.split('-');
    var historyStack = this.records.find(function (item) {
      return item.stackkey === arr[0];
    });

    if (historyStack) {
      return historyStack.findRecordByKey(arr[1]);
    }

    return undefined;
  };

  return RootStack;
}(RouteStack);