import React, {useContext} from 'react';
import {env, isServer} from '@elux/core';
import {EluxContext} from '../sington';

interface Props {
  children: string;
}

let clientTimer = 0;

function setClientHead({documentHead}: {documentHead: string}) {
  if (!clientTimer) {
    clientTimer = env.setTimeout(() => {
      clientTimer = 0;
      const arr = documentHead.match(/<title>(.*)<\/title>/) || [];
      if (arr[1]) {
        env.document.title = arr[1];
      }
    }, 300);
  }
}

const Component: React.FC<Props> = ({children}) => {
  const eluxContext = useContext(EluxContext);
  eluxContext.documentHead = children;
  if (!isServer()) {
    setClientHead(eluxContext);
  }
  return null;
};

export default React.memo(Component);
