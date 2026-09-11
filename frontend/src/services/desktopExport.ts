import * as XLSX from "xlsx";
import { invoke } from "@tauri-apps/api/core";

export interface ExportProgress {
  pct: number;
  status: "preparing" | "saving" | "success" | "error";
  message: string;
  path?: string;
}

interface SaveResult { path: string; bytes: number; }


function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^,]*,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => { const a = new Uint8Array(2); new DataView(a.buffer).setUint16(0, v, true); return a; };
  const u32 = (v: number) => { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, v >>> 0, true); return a; };
  const concat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const part of parts) { out.set(part, at); at += part.length; } return out; };

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name);
    chunks.push(local, file.data);

    const entry = concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name);
    central.push(entry);
    offset += local.length + file.data.length;
  }

  const centralBytes = concat(...central);
  const body = concat(...chunks, centralBytes);
  const end = concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(offset), u16(0));
  return concat(body, end);
}

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
    const workbookBase64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64", compression: true });
    const zipFiles = [
      { name: filename, data: base64ToBytes(workbookBase64) },
      ...attachments.map((attachment) => ({ name: attachment.filename, data: base64ToBytes(attachment.base64_data) })),
    ];
    const zipName = filename.replace(/\.[^.]+$/, "") + "_Updated_Pricing.zip";
    const zip = makeZip(zipFiles);
    const blob = new Blob([zip], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = zipName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { path: zipName, bytes: zip.byteLength, attachments: attachments.length, attachments_dir: `${filename.replace(/\.[^.]+$/, "")}_Attachments` };
  }
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64', compression: true });
  const stem = filename.replace(/\.[^.]+$/, '');
  return invoke<SaveResult & { attachments: number; attachments_dir: string }>('save_export_bundle', {
    payload: { filename, base64_data: base64, attachments_dir: `${stem}_Attachments`, attachments },
  });
}
