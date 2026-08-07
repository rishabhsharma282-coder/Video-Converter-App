import { useState, useCallback } from 'react';

export function useHistoryState(initialState) {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex] || initialState;

  const setState = useCallback((newState) => {
    setHistory((prevHistory) => {
      const validIndex = Math.min(currentIndex, prevHistory.length - 1);
      const updatedHistory = prevHistory.slice(0, Math.max(0, validIndex + 1));
      const currentVal = updatedHistory[validIndex] || initialState;
      const nextState = typeof newState === 'function' ? newState(currentVal) : newState;
      return [...updatedHistory, nextState];
    });
    setCurrentIndex((prevIndex) => prevIndex + 1);
  }, [currentIndex, initialState]);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return [state, setState, { undo, redo, canUndo, canRedo, historyIndex: currentIndex }];
}
