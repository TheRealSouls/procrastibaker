import { useCallback, useEffect, useState } from "react";
import {
  createTodo,
  deleteTodo,
  listenToTodos,
  setTodoDone,
  type TodoItem,
} from "../services/todoService";

/** Live to-do list for the signed-in user, with add, toggle and remove. */
export function useTodos(uid?: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setTodos([]);
      return;
    }

    const unsubscribe = listenToTodos(uid, setTodos, (err) =>
      setError(err.message),
    );

    return () => unsubscribe();
  }, [uid]);

  const addTodo = useCallback(
    (title: string) => (uid ? createTodo(uid, title) : Promise.resolve(false)),
    [uid],
  );

  const toggleTodo = useCallback(
    (id: string, done: boolean) =>
      uid ? setTodoDone(uid, id, done) : Promise.resolve(false),
    [uid],
  );

  const removeTodo = useCallback(
    (id: string) => (uid ? deleteTodo(uid, id) : Promise.resolve(false)),
    [uid],
  );

  return { todos, error, addTodo, toggleTodo, removeTodo };
}
