// @flow strict-local

import type {ViewProps} from 'react-native/Libraries/Components/View/ViewPropTypes';
import type {HostComponent} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// Touch View for monitoring whether touch events are from pen or finger
type NativeProps = $ReadOnly<{|
  ...ViewProps,
  // Forbidden touch input type
  forbidTouchType:?Int32
  // add other props here
|}>;

export default (codegenNativeComponent<NativeProps>(
   'TouchView',
): HostComponent<NativeProps>);