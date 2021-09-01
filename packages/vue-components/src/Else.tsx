import {Fragment, h, VNode, Comment} from 'vue';

interface Props {
  elseView?: VNode;
}
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (props: Props, context: {slots: {default?: () => VNode[]; elseView?: () => VNode[]}}) {
  const arr: VNode[] = [];
  const children: VNode[] = context.slots.default ? context.slots.default() : [];
  children.forEach((item) => {
    if (item.type !== Comment) {
      arr.push(item);
    }
  });
  if (arr.length > 0) {
    return h(Fragment, null, arr);
  }

  return h(Fragment, null, props.elseView ? [props.elseView] : context.slots.elseView ? context.slots.elseView() : []);
}
