"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.RootStack = exports.HistoryStack = exports.HistoryRecord = void 0;

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@elux/core");

var _basic = require("./basic");

var RouteStack = function () {
  function RouteStack(limit) {
    (0, _defineProperty2.default)(this, "records", []);
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

var HistoryRecord = function HistoryRecord(location, historyStack) {
  (0, _defineProperty2.default)(this, "destroy", void 0);
  (0, _defineProperty2.default)(this, "pagename", void 0);
  (0, _defineProperty2.default)(this, "params", void 0);
  (0, _defineProperty2.default)(this, "key", void 0);
  (0, _defineProperty2.default)(this, "recordKey", void 0);
  this.historyStack = historyStack;
  this.recordKey = _core.env.isServer ? '0' : ++HistoryRecord.id + '';
  var pagename = location.pagename,
      params = location.params;
  this.pagename = pagename;
  this.params = params;
  this.key = [historyStack.stackkey, this.recordKey].join('-');
};

exports.HistoryRecord = HistoryRecord;
(0, _defineProperty2.default)(HistoryRecord, "id", 0);

var HistoryStack = function (_RouteStack) {
  (0, _inheritsLoose2.default)(HistoryStack, _RouteStack);

  function HistoryStack(rootStack, store) {
    var _this;

    _this = _RouteStack.call(this, 20) || this;
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "stackkey", void 0);
    _this.rootStack = rootStack;
    _this.store = store;
    _this.stackkey = _core.env.isServer ? '0' : ++HistoryStack.id + '';
    return _this;
  }

  var _proto2 = HistoryStack.prototype;

  _proto2.push = function push(routeState) {
    var newRecord = new HistoryRecord(routeState, this);

    this._push(newRecord);

    return newRecord;
  };

  _proto2.replace = function replace(routeState) {
    var newRecord = new HistoryRecord(routeState, this);

    this._replace(newRecord);

    return newRecord;
  };

  _proto2.relaunch = function relaunch(routeState) {
    var newRecord = new HistoryRecord(routeState, this);

    this._relaunch(newRecord);

    return newRecord;
  };

  _proto2.findRecordByKey = function findRecordByKey(recordKey) {
    return this.records.find(function (item) {
      return item.recordKey === recordKey;
    });
  };

  _proto2.destroy = function destroy() {
    this.store.destroy();
  };

  return HistoryStack;
}(RouteStack);

exports.HistoryStack = HistoryStack;
(0, _defineProperty2.default)(HistoryStack, "id", 0);

var RootStack = function (_RouteStack2) {
  (0, _inheritsLoose2.default)(RootStack, _RouteStack2);

  function RootStack() {
    return _RouteStack2.call(this, 10) || this;
  }

  var _proto3 = RootStack.prototype;

  _proto3.getCurrentPages = function getCurrentPages() {
    return this.records.map(function (item) {
      var store = item.store;
      var record = item.getCurrentItem();
      var pagename = record.pagename;
      return {
        pagename: pagename,
        store: store,
        page: _basic.routeMeta.pages[pagename]
      };
    });
  };

  _proto3.push = function push(routeState) {
    var curHistory = this.getCurrentItem();
    var store = (0, _core.forkStore)(curHistory.store, routeState);
    var newHistory = new HistoryStack(this, store);
    var newRecord = new HistoryRecord(routeState, newHistory);
    newHistory.startup(newRecord);

    this._push(newHistory);

    return newRecord;
  };

  _proto3.replace = function replace(routeState) {
    var curHistory = this.getCurrentItem();
    return curHistory.relaunch(routeState);
  };

  _proto3.relaunch = function relaunch(routeState) {
    var curHistory = this.getCurrentItem();
    var newRecord = curHistory.relaunch(routeState);

    this._relaunch(curHistory);

    return newRecord;
  };

  _proto3.countBack = function countBack(delta) {
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

  _proto3.testBack = function testBack(delta, rootOnly) {
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

  _proto3.findRecordByKey = function findRecordByKey(key) {
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

exports.RootStack = RootStack;