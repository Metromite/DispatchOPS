import * as XLSX from "xlsx";
import { invoke } from "@tauri-apps/api/core";

export interface ExportProgress {
  pct: number;
  status: "preparing" | "saving" | "success" | "error";
  message: string;
  path?: string;
}

interface SaveResult { path: string; bytes: number; }

function isTauriDesktop(): boolean {
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

export async function saveWorkbookToDispatchFolder(
  workbook: XLSX.WorkBook,
  filename: string,
  onProgress?: (p: ExportProgress) => void,
): Promise<SaveResult> {
  try {
    onProgress?.({ pct: 15, status: "preparing", message: "Preparing Excel workbook…" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (!isTauriDesktop()) {
      onProgress?.({ pct: 65, status: "saving", message: "Saving Excel file…" });
      XLSX.writeFile(workbook, filename);
      const result = { path: filename, bytes: 0 };
      onProgress?.({ pct: 100, status: "success", message: "Excel export downloaded successfully.", path: filename });
      return result;
    }

    const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64", compression: true });
    onProgress?.({ pct: 70, status: "saving", message: "Saving to DispatchOPS Exports…" });
    const result = await invoke<SaveResult>("save_export_file", {
      payload: { filename, base64_data: base64 },
    });
    onProgress?.({ pct: 100, status: "success", message: "Excel export saved successfully.", path: result.path });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress?.({ pct: 100, status: "error", message });
    throw error;
  }
}

export async function getDispatchExportFolder(): Promise<string> {
  if (!isTauriDesktop()) return "Browser Downloads";
  return invoke<string>("get_export_folder");
}

export interface OfflineExportAttachment { filename: string; base64_data: string; }

export async function saveWorkbookWithOfflineAttachments(
  workbook: XLSX.WorkBook,
  filename: string,
  attachments: OfflineExportAttachment[],
): Promise<SaveResult & { attachments: number; attachments_dir: string }> {
  if (!isTauriDesktop()) {
    XLSX.writeFile(workbook, filename);
    return { path: filename, bytes: 0, attachments: 0, attachments_dir: '' };
  }
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64', compression: true });
  const stem = filename.replace(/\.[^.]+$/, '');
  return invoke<SaveResult & { attachments: number; attachments_dir: string }>('save_export_bundle', {
    payload: { filename, base64_data: base64, attachments_dir: `${stem}_Attachments`, attachments },
  });
}
