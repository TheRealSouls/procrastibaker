import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useTodos } from "../hooks/useTodos";
import { TODO_MAX_LENGTH } from "../services/todoService";

type TodoListProps = {
  uid?: string;
};

/** Plain to-do list: add an item, tick it off, delete it. No categories. */
export function TodoList({ uid }: TodoListProps) {
  const { t } = useTranslation();
  const { todos, addTodo, toggleTodo, removeTodo } = useTodos(uid);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const remaining = todos.filter((todo) => !todo.done).length;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();

    if (!title || busy) {
      return;
    }

    setBusy(true);

    try {
      const added = await addTodo(title);
      if (added) {
        setDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-card todo-card" aria-labelledby="todo-heading">
      <div className="section-title-row">
        <h2 id="todo-heading">{t("todos.heading")}</h2>
        <span>{t("todos.remaining", { count: remaining })}</span>
      </div>

      <form className="todo-add" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor="todo-input">
          {t("todos.addLabel")}
        </label>
        <input
          autoComplete="off"
          id="todo-input"
          maxLength={TODO_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("todos.placeholder")}
          value={draft}
        />
        <button
          className="button primary"
          disabled={busy || !draft.trim()}
          type="submit"
        >
          {t("todos.add")}
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="quiet-text todo-empty">{t("todos.empty")}</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li
              className={`todo-item${todo.done ? " is-done" : ""}`}
              key={todo.id}
            >
              <label className="todo-item__check">
                <input
                  checked={todo.done}
                  onChange={(event) =>
                    void toggleTodo(todo.id, event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{todo.title}</span>
              </label>
              <button
                aria-label={t("todos.deleteAria", { title: todo.title })}
                className="button tag-delete-button todo-item__delete"
                onClick={() => void removeTodo(todo.id)}
                type="button"
              >
                <i aria-hidden="true" className="fa-solid fa-xmark" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
