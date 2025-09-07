import React, { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  text: string;
  completed: boolean;
};

const STORAGE_KEY = "checklist_app_items_v1";

export default function ChecklistApp(): JSX.Element {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function addItem() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const newItem: Item = { id: cryptoRandomId(), text: trimmed, completed: false };
    setItems(prev => [newItem, ...prev]);
    setInput("");
  }

  function addBulkItems() {
    const lines = bulkInput
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (lines.length === 0) return;

    const newItems: Item[] = lines.map(line => ({
      id: cryptoRandomId(),
      text: line,
      completed: false,
    }));

    setItems(prev => [...newItems, ...prev]);
    setBulkInput("");
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function toggleItem(id: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, completed: !i.completed } : i)));
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditingText(item.text);
  }

  function saveEdit() {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      removeItem(editingId);
    } else {
      setItems(prev => prev.map(i => (i.id === editingId ? { ...i, text: trimmed } : i)));
    }
    setEditingId(null);
    setEditingText("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  function clearCompleted() {
    setItems(prev => prev.filter(i => !i.completed));
  }

  function reorder(fromIndex: number, toIndex: number) {
    setItems(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }

  function exportJSON() {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          const normalized: Item[] = parsed
            .filter((x: any) => x && typeof x.text === "string")
            .map((x: any) => ({ id: x.id || cryptoRandomId(), text: x.text, completed: !!x.completed }));
          setItems(normalized);
        } else {
          alert("Arquivo inválido: JSON deve ser um array de itens.");
        }
      } catch (e) {
        alert("Erro ao ler arquivo: " + e);
      }
    };
    reader.readAsText(file);
  }

  const visible = items.filter(i => (filter === "all" ? true : filter === "active" ? !i.completed : i.completed));

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(from)) reorder(from, index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-gray-100 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow p-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Checklist</h1>
          <div className="text-sm text-gray-400">{items.length} itens</div>
        </header>

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") addItem();
            }}
            placeholder="Adicione uma nova tarefa e pressione Enter"
            className="flex-1 border border-gray-700 rounded px-3 py-2 bg-gray-700 text-gray-100 focus:outline-none focus:ring focus:ring-indigo-500"
          />
          <button onClick={addItem} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
            Adicionar
          </button>
        </div>

        <div className="mb-4">
          <textarea
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            placeholder="Cole várias tarefas aqui (uma por linha)"
            className="w-full border border-gray-700 rounded px-3 py-2 h-24 bg-gray-700 text-gray-100 focus:outline-none focus:ring focus:ring-green-500"
          />
          <button
            onClick={addBulkItems}
            className="mt-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Adicionar em massa
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex gap-1 bg-gray-700 rounded p-1">
            <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded ${filter === "all" ? "bg-gray-600 shadow" : ""}`}>
              Todas
            </button>
            <button onClick={() => setFilter("active")} className={`px-3 py-1 rounded ${filter === "active" ? "bg-gray-600 shadow" : ""}`}>
              Ativas
            </button>
            <button onClick={() => setFilter("completed")} className={`px-3 py-1 rounded ${filter === "completed" ? "bg-gray-600 shadow" : ""}`}>
              Concluídas
            </button>
          </div>

          <div className="ml-auto flex gap-2">
            <button onClick={clearCompleted} className="px-3 py-1 rounded border border-gray-600">Limpar concluídas</button>
            <button onClick={exportJSON} className="px-3 py-1 rounded border border-gray-600">Exportar JSON</button>
            <label className="px-3 py-1 rounded border border-gray-600 cursor-pointer">
              Importar
              <input
                type="file"
                accept="application/json"
                onChange={e => importJSON(e.target.files ? e.target.files[0] : null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <ul className="divide-y divide-gray-700">
          {visible.length === 0 && <li className="py-8 text-center text-gray-500">Nenhuma tarefa</li>}
          {visible.map((item, idx) => (
            <li
              key={item.id}
              draggable
              onDragStart={e => handleDragStart(e, items.indexOf(item))}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, items.indexOf(item))}
              className="flex items-center gap-3 py-3"
            >
              <input type="checkbox" checked={item.completed} onChange={() => toggleItem(item.id)} className="accent-indigo-500" />

              <div className="flex-1">
                {editingId === item.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 border border-gray-600 rounded px-2 py-1 bg-gray-700 text-gray-100"
                    />
                    <button onClick={saveEdit} className="px-3 py-1 border border-gray-600 rounded">Salvar</button>
                    <button onClick={cancelEdit} className="px-3 py-1 border border-gray-600 rounded">Cancelar</button>
                  </div>
                ) : (
                  <div className={`select-none ${item.completed ? "line-through text-gray-500" : ""}`}> 
                    <div className="flex items-center justify-between">
                      <span>{item.text}</span>
                      <div className="flex gap-1 ml-4">
                        <button onClick={() => startEdit(item)} className="px-2 py-1 text-sm rounded border border-gray-600">Editar</button>
                        <button onClick={() => removeItem(item.id)} className="px-2 py-1 text-sm rounded border border-gray-600">Excluir</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <footer className="mt-4 text-sm text-gray-400 flex items-center justify-between">
          <div>{items.filter(i => !i.completed).length} pendentes</div>
          <div className="text-xs">Dica: arraste para reordenar</div>
        </footer>
      </div>
    </div>
  );
}

function cryptoRandomId() {
  try {
    return (crypto as any).randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 9);
  }
}
