"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface DocRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

const PAGE_SIZE = 8;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DocumentsView({ userId }: { userId: string | null }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDocs() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase
          .from("documents")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (!cancelled) setDocs((data ?? []) as DocRow[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDocs();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.file_name.toLowerCase().includes(q));
  }, [docs, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setError(null);
    try {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upError } = await supabase.storage.from("documents").upload(path, file);
      if (upError) throw upError;

      const { data, error: rowError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null,
        })
        .select()
        .single();
      if (rowError) {
        await supabase.storage.from("documents").remove([path]);
        throw rowError;
      }
      setDocs((prev) => [data as DocRow, ...prev]);
      setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(doc: DocRow) {
    const { data, error: err } = await supabase.storage.from("documents").download(doc.file_path);
    if (err) {
      setError(err.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(doc: DocRow) {
    try {
      const { error: rowError } = await supabase.from("documents").delete().eq("id", doc.id);
      if (rowError) throw rowError;
      await supabase.storage.from("documents").remove([doc.file_path]);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handleExportCsv() {
    const header = "file_name,mime_type,file_size_bytes,created_at";
    const lines = filtered.map((d) =>
      [`"${d.file_name.replace(/"/g, '""')}"`, d.mime_type ?? "", d.file_size, d.created_at].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "huntern-documents.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Upload document"
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-2"
      >
        <input
          ref={fileRef}
          type="file"
          onChange={handleUpload}
          aria-label="Choose file to upload"
          className="tnum flex-1 min-w-52 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="bg-white text-slate-700 text-sm font-semibold rounded-lg py-2 px-4 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
        >
          Export CSV
        </button>
      </section>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 rounded-xl bg-rose-50 border border-rose-200 p-4 shadow-sm">
          {error}
        </p>
      )}

      <section
        aria-label="Documents table"
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100">
          <label htmlFor="doc-search" className="sr-only">Search documents</label>
          <input
            id="doc-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search files..."
            className="w-full max-w-xl rounded-lg bg-slate-100 border border-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {["File", "Type", "Size", "Uploaded", "Actions"].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-xs text-slate-500 animate-pulse">
                    Loading documents...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-xs text-slate-500 text-center">
                    No documents found — upload transcripts, ID cards, or certificates.
                  </td>
                </tr>
              ) : (
                pageRows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <td className="text-sm font-medium text-slate-900 px-3 py-2.5 break-all">
                      {doc.file_name}
                    </td>
                    <td className="tnum text-xs text-slate-500 px-3 py-2.5">
                      {doc.mime_type ?? "—"}
                    </td>
                    <td className="tnum text-xs text-slate-500 px-3 py-2.5 whitespace-nowrap">
                      {formatSize(doc.file_size)}
                    </td>
                    <td className="tnum text-xs text-slate-500 px-3 py-2.5 whitespace-nowrap">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-indigo-700 hover:bg-indigo-50 transition-colors mr-1"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        aria-label={`Delete ${doc.file_name}`}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
          <p className="tnum text-xs text-slate-500">
            Page {safePage + 1} of {pageCount} · {filtered.length} files
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
