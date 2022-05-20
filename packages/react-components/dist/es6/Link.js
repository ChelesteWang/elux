import React, { useCallback, useMemo } from 'react';
import { coreConfig } from '@elux/core';
import { urlToNativeUrl, locationToUrl } from '@elux/route';
import { jsx as _jsx } from "react/jsx-runtime";
export const Link = React.forwardRef(({
  onClick: _onClick,
  disabled,
  to = '',
  action = 'push',
  classname = '',
  target = 'page',
  payload,
  ...props
}, ref) => {
  const {
    back,
    url,
    href
  } = useMemo(() => {
    let back;
    let url;
    let href;

    if (action === 'back') {
      back = to || 1;
    } else {
      url = classname ? locationToUrl({
        url: to.toString(),
        classname
      }) : to.toString();
      href = urlToNativeUrl(url);
    }

    return {
      back,
      url,
      href
    };
  }, [action, classname, to]);
  const router = coreConfig.UseRouter();
  const onClick = useCallback(event => {
    event.preventDefault();

    if (!disabled) {
      _onClick && _onClick(event);
      router[action](back || {
        url
      }, target, payload);
    }
  }, [disabled, _onClick, router, action, back, url, target, payload]);
  props['onClick'] = onClick;
  props['action'] = action;
  props['target'] = target;
  props['to'] = (back || url) + '';
  props['href'] = href;
  href && (props['href'] = href);
  classname && (props['classname'] = classname);
  disabled && (props['disabled'] = true);

  if (coreConfig.Platform === 'taro') {
    return _jsx("span", { ...props,
      ref: ref
    });
  } else {
    return _jsx("a", { ...props,
      ref: ref
    });
  }
});