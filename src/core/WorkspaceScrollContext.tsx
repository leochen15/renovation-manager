import React, { createContext, useContext } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type WorkspaceScrollContextValue = {
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const noop = () => {};

const WorkspaceScrollContext = createContext<WorkspaceScrollContextValue>({
  handleScroll: noop,
});

export const WorkspaceScrollProvider = WorkspaceScrollContext.Provider;

export const useWorkspaceScroll = () => useContext(WorkspaceScrollContext);
