import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";

export const TODO_MAX_LENGTH = 120;

export type TodoItem = {
  id: string;
  title: string;
  done: boolean;
};

type SyncedTodo = TodoItem & { createdAt: Timestamp | null };

// Stored per user at users/{uid}/todos, matching how tags and sessions are kept.
function todosPath(uid: string) {
  return ["users", uid, "todos"] as const;
}

export async function createTodo(uid: string, title: string): Promise<boolean> {
  const firestore = getOptionalFirestore();
  const text = title.trim().slice(0, TODO_MAX_LENGTH);

  if (!firestore || !uid.trim() || !text) {
    return false;
  }

  try {
    await setDoc(doc(firestore, ...todosPath(uid), crypto.randomUUID()), {
      title: text,
      done: false,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Create todo failed", error);
    return false;
  }
}

export async function setTodoDone(
  uid: string,
  id: string,
  done: boolean,
): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim() || !id.trim()) {
    return false;
  }

  try {
    await updateDoc(doc(firestore, ...todosPath(uid), id), { done });
    return true;
  } catch (error) {
    console.error("Update todo failed", error);
    return false;
  }
}

export async function deleteTodo(uid: string, id: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim() || !id.trim()) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, ...todosPath(uid), id));
    return true;
  } catch (error) {
    console.error("Delete todo failed", error);
    return false;
  }
}

/** Live list of the user's to-dos, oldest first so the order stays stable. */
export function listenToTodos(
  uid: string,
  callback: (todos: TodoItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    collection(firestore, ...todosPath(uid)),
    (snapshot) => {
      const todos = snapshot.docs
        .map((item) => normalizeTodo(item.id, item.data()))
        .filter((todo): todo is SyncedTodo => todo !== null)
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() ?? 0;
          const bTime = b.createdAt?.toMillis() ?? 0;
          return aTime - bTime;
        })
        .map(({ id, title, done }) => ({ id, title, done }));

      callback(todos);
    },
    (error) => {
      console.error("Listen todos failed", error);
      onError?.(error);
    },
  );
}

function normalizeTodo(
  id: string,
  value: Record<string, unknown>,
): SyncedTodo | null {
  if (typeof value.title !== "string" || !value.title.trim()) {
    return null;
  }

  return {
    id,
    title: value.title.slice(0, TODO_MAX_LENGTH),
    done: value.done === true,
    createdAt: isTimestamp(value.createdAt) ? value.createdAt : null,
  };
}

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}
