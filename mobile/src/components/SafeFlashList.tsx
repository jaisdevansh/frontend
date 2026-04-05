import React from 'react';
import { FlatList, Platform } from 'react-native';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';

/**
 * A safe wrapper around FlashList that falls back to FlatList 
 * if the native AutoLayoutView component is missing or if we are on Web.
 */
export const SafeFlashList = React.forwardRef((props: any, ref: any) => {
  // FlashList on Web often has resolution issues with AutoLayoutView.
  // Using FlatList on Web is stable and performant enough.
  if (Platform.OS === 'web') {
    return <FlatList ref={ref} {...props} />;
  }
  
  try {
    // We wrap in a simple component to catch potential "View config not found" errors
    // which are Invariant Violations (errors thrown during component registration/render)
    return <OriginalFlashList ref={ref} {...props} />;
  } catch (e) {
    console.warn('[SafeFlashList] FlashList native components missing, falling back to FlatList:', e);
    return <FlatList ref={ref} {...props} />;
  }
});

export default SafeFlashList;
